use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const GEMINI_API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models";

// Image generation models
const MODEL_PRO: &str = "gemini-3-pro-image-preview";    // Nano Banana Pro - higher quality
const MODEL_FAST: &str = "gemini-2.5-flash-image"; // Nano Banana - faster/cheaper

const GEMINI_TEXT_ENDPOINT: &str =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<Content>,
    #[serde(rename = "generationConfig")]
    generation_config: GenerationConfig,
}

#[derive(Serialize)]
struct Content {
    parts: Vec<Part>,
}

#[derive(Serialize)]
struct Part {
    text: String,
}

#[derive(Serialize)]
struct GenerationConfig {
    #[serde(rename = "responseModalities")]
    response_modalities: Vec<String>,
    #[serde(rename = "imageConfig")]
    image_config: ImageConfig,
}

#[derive(Serialize)]
struct ImageConfig {
    #[serde(rename = "aspectRatio")]
    aspect_ratio: String,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Vec<Candidate>,
}

#[derive(Deserialize)]
struct Candidate {
    content: ContentResponse,
}

#[derive(Deserialize)]
struct ContentResponse {
    parts: Vec<PartResponse>,
}

#[derive(Deserialize)]
struct PartResponse {
    #[serde(rename = "inlineData")]
    inline_data: Option<InlineData>,
}

#[derive(Deserialize)]
struct InlineData {
    #[serde(rename = "mimeType")]
    mime_type: String,
    data: String,
}

pub async fn generate_emoji_image(prompt: &str, api_key: &str, use_fast_model: bool) -> Result<Vec<u8>, String> {
    let client = Client::new();

    let model = if use_fast_model { MODEL_FAST } else { MODEL_PRO };
    let endpoint = format!("{}/{}:generateContent", GEMINI_API_BASE, model);

    let request = GeminiRequest {
        contents: vec![Content {
            parts: vec![Part {
                text: prompt.to_string(),
            }],
        }],
        generation_config: GenerationConfig {
            response_modalities: vec!["IMAGE".to_string()],
            image_config: ImageConfig {
                aspect_ratio: "1:1".to_string(),
            },
        },
    };

    let response = client
        .post(&endpoint)
        .header("x-goog-api-key", api_key)
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    for candidate in gemini_response.candidates {
        for part in candidate.content.parts {
            if let Some(inline_data) = part.inline_data {
                if inline_data.mime_type.starts_with("image/") {
                    let image_bytes = STANDARD
                        .decode(&inline_data.data)
                        .map_err(|e| format!("Failed to decode base64: {}", e))?;
                    return Ok(image_bytes);
                }
            }
        }
    }

    Err("No image found in response".to_string())
}

pub fn resize_to_emoji(image_bytes: &[u8]) -> Result<Vec<u8>, String> {
    use image::{ImageFormat, Rgba, RgbaImage};
    use std::io::Cursor;

    let img = image::load_from_memory(image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let mut rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    // Sample the 4 corners to detect background color
    let corners = [
        rgba.get_pixel(0, 0),
        rgba.get_pixel(width - 1, 0),
        rgba.get_pixel(0, height - 1),
        rgba.get_pixel(width - 1, height - 1),
    ];

    // Check all corners are similar (within tolerance)
    let tolerance = 50i16;
    let ref_pixel = corners[0];
    for (i, corner) in corners.iter().enumerate().skip(1) {
        let dr = (corner.0[0] as i16 - ref_pixel.0[0] as i16).abs();
        let dg = (corner.0[1] as i16 - ref_pixel.0[1] as i16).abs();
        let db = (corner.0[2] as i16 - ref_pixel.0[2] as i16).abs();
        if dr > tolerance || dg > tolerance || db > tolerance {
            return Err(format!(
                "Background inconsistent: corner 0 is ({},{},{}), corner {} is ({},{},{})",
                ref_pixel.0[0], ref_pixel.0[1], ref_pixel.0[2],
                i, corner.0[0], corner.0[1], corner.0[2]
            ));
        }
    }

    // Use average of corners as background color
    let bg_r = corners.iter().map(|c| c.0[0] as u16).sum::<u16>() / 4;
    let bg_g = corners.iter().map(|c| c.0[1] as u16).sum::<u16>() / 4;
    let bg_b = corners.iter().map(|c| c.0[2] as u16).sum::<u16>() / 4;

    // Verify background is green-dominant
    if bg_g <= bg_r || bg_g <= bg_b {
        return Err(format!(
            "Background not green-dominant: ({},{},{})",
            bg_r, bg_g, bg_b
        ));
    }

    // Flood fill from edges to remove background (preserves interior greens)
    let bg_tolerance = 40i16;
    let mut visited = vec![vec![false; height as usize]; width as usize];
    let mut stack: Vec<(u32, u32)> = Vec::new();

    // Helper to check if pixel matches background
    let matches_bg = |pixel: &Rgba<u8>| {
        let dr = (pixel.0[0] as i16 - bg_r as i16).abs();
        let dg = (pixel.0[1] as i16 - bg_g as i16).abs();
        let db = (pixel.0[2] as i16 - bg_b as i16).abs();
        dr < bg_tolerance && dg < bg_tolerance && db < bg_tolerance
    };

    // Seed flood fill from all edge pixels
    for x in 0..width {
        stack.push((x, 0));
        stack.push((x, height - 1));
    }
    for y in 1..height - 1 {
        stack.push((0, y));
        stack.push((width - 1, y));
    }

    // Flood fill
    while let Some((x, y)) = stack.pop() {
        if x >= width || y >= height {
            continue;
        }
        if visited[x as usize][y as usize] {
            continue;
        }
        visited[x as usize][y as usize] = true;

        let pixel = rgba.get_pixel(x, y);
        if !matches_bg(pixel) {
            continue;
        }

        // Mark as transparent
        rgba.put_pixel(x, y, Rgba([0, 0, 0, 0]));

        // Add neighbors
        if x > 0 { stack.push((x - 1, y)); }
        if x < width - 1 { stack.push((x + 1, y)); }
        if y > 0 { stack.push((x, y - 1)); }
        if y < height - 1 { stack.push((x, y + 1)); }
    }

    // Find bounding box of non-transparent pixels
    let mut min_x = width;
    let mut min_y = height;
    let mut max_x = 0u32;
    let mut max_y = 0u32;

    for (x, y, pixel) in rgba.enumerate_pixels() {
        if pixel.0[3] > 10 {
            min_x = min_x.min(x);
            min_y = min_y.min(y);
            max_x = max_x.max(x);
            max_y = max_y.max(y);
        }
    }

    // Crop to bounding box with small padding
    let padding = 4u32;
    let crop_x = min_x.saturating_sub(padding);
    let crop_y = min_y.saturating_sub(padding);
    let crop_w = (max_x - min_x + 1 + padding * 2).min(width - crop_x);
    let crop_h = (max_y - min_y + 1 + padding * 2).min(height - crop_y);

    let cropped = if crop_w > 0 && crop_h > 0 && max_x >= min_x && max_y >= min_y {
        image::imageops::crop_imm(&rgba, crop_x, crop_y, crop_w, crop_h).to_image()
    } else {
        rgba
    };

    // Resize to 128x128, maintaining aspect ratio and centering
    let (cw, ch) = cropped.dimensions();
    let scale = (120.0 / cw as f32).min(120.0 / ch as f32);
    let new_w = (cw as f32 * scale) as u32;
    let new_h = (ch as f32 * scale) as u32;

    let scaled = image::imageops::resize(&cropped, new_w, new_h, image::imageops::FilterType::Lanczos3);

    // Center on 128x128 canvas
    let mut final_img = RgbaImage::new(128, 128);
    let offset_x = (128 - new_w) / 2;
    let offset_y = (128 - new_h) / 2;

    for (x, y, pixel) in scaled.enumerate_pixels() {
        final_img.put_pixel(offset_x + x, offset_y + y, *pixel);
    }

    let mut output = Cursor::new(Vec::new());
    final_img.write_to(&mut output, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    Ok(output.into_inner())
}

#[derive(Serialize)]
struct TextRequest {
    contents: Vec<Content>,
}

#[derive(Deserialize)]
struct TextResponse {
    candidates: Vec<TextCandidate>,
}

#[derive(Deserialize)]
struct TextCandidate {
    content: TextContent,
}

#[derive(Deserialize)]
struct TextContent {
    parts: Vec<TextPart>,
}

#[derive(Deserialize)]
struct TextPart {
    text: String,
}

pub async fn generate_filename(
    emojis: &[String],
    modifier: Option<&str>,
    api_key: &str,
) -> Result<String, String> {
    let client = Client::new();

    let emoji_str = emojis.join(" ");
    let prompt = match modifier {
        Some(m) if !m.trim().is_empty() => format!(
            "Generate a short filename (2-4 words, snake_case, no extension) for an emoji that combines: {} with style: {}. Reply with ONLY the filename, nothing else.",
            emoji_str, m.trim()
        ),
        _ => format!(
            "Generate a short filename (2-4 words, snake_case, no extension) for an emoji that combines: {}. Reply with ONLY the filename, nothing else.",
            emoji_str
        ),
    };

    let request = TextRequest {
        contents: vec![Content {
            parts: vec![Part { text: prompt }],
        }],
    };

    let response = client
        .post(GEMINI_TEXT_ENDPOINT)
        .header("x-goog-api-key", api_key)
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        return Err("API error".to_string());
    }

    let text_response: TextResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(candidate) = text_response.candidates.first() {
        if let Some(part) = candidate.content.parts.first() {
            return Ok(part.text.trim().to_string());
        }
    }

    Err("No text in response".to_string())
}
