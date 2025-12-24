mod gemini;

use base64::{engine::general_purpose::STANDARD, Engine};
use std::env;
use std::fs;
use std::path::PathBuf;

#[derive(serde::Serialize)]
struct GenerationResult {
    images: Vec<String>,
    mime_type: String,
}

/// Get the path to the API key file
fn api_key_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("mojimix").join("api_key"))
}

/// Get API key from env var first, then from config file
fn get_api_key_internal() -> Option<String> {
    // First check environment variable
    if let Ok(key) = env::var("GEMINI_API_KEY") {
        if !key.trim().is_empty() {
            return Some(key);
        }
    }

    // Then check config file
    if let Some(path) = api_key_path() {
        if let Ok(contents) = fs::read_to_string(&path) {
            let key = contents.trim().to_string();
            if !key.is_empty() {
                return Some(key);
            }
        }
    }

    None
}

#[tauri::command]
fn check_api_key() -> bool {
    get_api_key_internal().is_some()
}

#[tauri::command]
fn save_api_key(key: String) -> Result<(), String> {
    let key = key.trim().to_string();
    if key.is_empty() {
        return Err("API key cannot be empty".to_string());
    }

    let path = api_key_path().ok_or("Could not determine config directory")?;

    // Create parent directory if needed
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    fs::write(&path, &key).map_err(|e| format!("Failed to save API key: {}", e))?;

    Ok(())
}

#[tauri::command]
fn clear_api_key() -> Result<(), String> {
    if let Some(path) = api_key_path() {
        if path.exists() {
            fs::remove_file(&path).map_err(|e| format!("Failed to remove API key: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn generate_emoji(
    emojis: Vec<String>,
    modifier: Option<String>,
) -> Result<GenerationResult, String> {
    let api_key = get_api_key_internal().ok_or("No API key configured")?;

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
        "Create a single emoji combining: {}. \
         CRITICAL: Keep it SIMPLE and MINIMAL like standard Unicode emojis. \
         Copy the exact visual style of Google Noto Emoji - simple shapes, minimal details, clean lines. \
         Do NOT add extra details, textures, or creative interpretations. \
         The result should look like it belongs in the standard emoji keyboard. \
         Soft 3D with subtle gradients, bright saturated colors. \
         NO shadows, NO glow, NO complex textures. \
         Solid bright green (#00FF00) background, no variations.",
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
async fn save_emoji_image(
    image_base64: String,
    emojis: Vec<String>,
    modifier: Option<String>,
) -> Result<String, String> {
    let api_key = get_api_key_internal().ok_or("No API key configured")?;

    let image_bytes = STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    // Generate filename using Gemini
    let name = gemini::generate_filename(&emojis, modifier.as_deref(), &api_key)
        .await
        .unwrap_or_else(|_| "emoji".to_string());

    let downloads = dirs::download_dir()
        .ok_or_else(|| "Could not find Downloads directory".to_string())?;

    // Find a unique filename
    let base_name = sanitize_filename(&name);
    let mut file_path = downloads.join(format!("{}.png", base_name));
    let mut counter = 2;

    while file_path.exists() {
        file_path = downloads.join(format!("{}_{}.png", base_name, counter));
        counter += 1;
    }

    fs::write(&file_path, &image_bytes).map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .filter_map(|c| {
            if c.is_ascii_alphanumeric() {
                Some(c.to_ascii_lowercase())
            } else if c == '_' || c == '-' || c == ' ' {
                Some('_')
            } else {
                None
            }
        })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            generate_emoji,
            save_emoji_image,
            check_api_key,
            save_api_key,
            clear_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
