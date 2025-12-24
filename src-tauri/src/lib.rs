mod gemini;

use base64::{engine::general_purpose::STANDARD, Engine};
use std::env;
use std::fs;

#[derive(serde::Serialize)]
struct GenerationResult {
    images: Vec<String>,
    mime_type: String,
}

#[tauri::command]
async fn generate_emoji(
    emojis: Vec<String>,
    modifier: Option<String>,
) -> Result<GenerationResult, String> {
    let api_key =
        env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY environment variable not set")?;

    let prompt = build_prompt(&emojis, modifier.as_deref());

    // Generate 4 images in parallel
    let futures: Vec<_> = (0..4)
        .map(|_| {
            let prompt = prompt.clone();
            let api_key = api_key.clone();
            async move {
                let image_bytes = gemini::generate_emoji_image(&prompt, &api_key).await?;
                let resized_bytes = gemini::resize_to_emoji(&image_bytes)?;
                Ok::<String, String>(STANDARD.encode(&resized_bytes))
            }
        })
        .collect();

    let results = futures::future::join_all(futures).await;

    let images: Vec<String> = results
        .into_iter()
        .filter_map(|r| r.ok())
        .collect();

    if images.is_empty() {
        return Err("Failed to generate any images".to_string());
    }

    Ok(GenerationResult {
        images,
        mime_type: "image/png".to_string(),
    })
}

fn build_prompt(emojis: &[String], modifier: Option<&str>) -> String {
    let emoji_str = emojis.join(" ");

    let base_prompt = format!(
        "Create a single emoji that combines these emojis into one: {}. \
         Style: Standard Unicode emoji style like Google Noto Emoji or Apple emoji. \
         3D-ish with subtle gradients and soft shadows, rounded glossy appearance, \
         warm vibrant colors. Single centered icon on a solid bright green (#00FF00) background. \
         Must look like a native system emoji, not flat or illustrated. \
         The background MUST be pure bright green (#00FF00) with no gradients or variations.",
        emoji_str
    );

    match modifier {
        Some(mod_text) if !mod_text.trim().is_empty() => {
            format!(
                "{} Additional modification: {}",
                base_prompt,
                mod_text.trim()
            )
        }
        _ => base_prompt,
    }
}

#[tauri::command]
async fn save_emoji_image(image_base64: String, file_path: String) -> Result<(), String> {
    let image_bytes = STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    fs::write(&file_path, &image_bytes).map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn check_api_key() -> bool {
    env::var("GEMINI_API_KEY").is_ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            generate_emoji,
            save_emoji_image,
            check_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
