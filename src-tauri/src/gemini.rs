use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const GEMINI_IMAGE_ENDPOINT: &str =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

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

pub async fn generate_emoji_image(prompt: &str, api_key: &str) -> Result<Vec<u8>, String> {
    let client = Client::new();

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
        .post(GEMINI_IMAGE_ENDPOINT)
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

    // Replace bright green (#00FF00) background with transparency
    for pixel in rgba.pixels_mut() {
        let Rgba([r, g, b, _]) = *pixel;
        if r < 60 && g > 200 && b < 60 {
            *pixel = Rgba([0, 0, 0, 0]);
        }
    }

    // Find bounding box of non-transparent pixels
    let (width, height) = rgba.dimensions();
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
