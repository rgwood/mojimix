mod gemini;

use base64::{engine::general_purpose::STANDARD, Engine};
use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::ipc::Channel;

#[derive(serde::Serialize)]
struct ImageResult {
    flood_fill: Option<String>,
    color_key: Option<String>,
    error: Option<String>,
}

#[derive(serde::Serialize)]
struct GenerationResult {
    results: Vec<ImageResult>,
    mime_type: String,
}

#[derive(Clone, serde::Serialize)]
struct GenerationProgress {
    index: usize,
    flood_fill: Option<String>,
    color_key: Option<String>,
    error: Option<String>,
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
    fast_model: Option<bool>,
    on_progress: Channel<GenerationProgress>,
) -> Result<GenerationResult, String> {
    let api_key = get_api_key_internal().ok_or("No API key configured")?;
    let use_fast = fast_model.unwrap_or(false);

    let prompt = build_prompt(&emojis, modifier.as_deref());

    // Generate 4 images in parallel, streaming results as they complete
    let futures: Vec<_> = (0..4)
        .map(|index| {
            let prompt = prompt.clone();
            let api_key = api_key.clone();
            let channel = on_progress.clone();
            async move {
                let result = async {
                    let image_bytes =
                        gemini::generate_emoji_image(&prompt, &api_key, use_fast).await?;
                    let processed = gemini::resize_to_emoji(&image_bytes)?;
                    Ok::<(String, String), String>((
                        STANDARD.encode(&processed.flood_fill),
                        STANDARD.encode(&processed.color_key),
                    ))
                }
                .await;

                // Send progress immediately when this image completes
                let progress = match &result {
                    Ok((ff, ck)) => GenerationProgress {
                        index,
                        flood_fill: Some(ff.clone()),
                        color_key: Some(ck.clone()),
                        error: None,
                    },
                    Err(e) => GenerationProgress {
                        index,
                        flood_fill: None,
                        color_key: None,
                        error: Some(e.clone()),
                    },
                };
                let _ = channel.send(progress);

                (index, result)
            }
        })
        .collect();

    let mut indexed_results = futures::future::join_all(futures).await;

    // Sort by index to maintain order in final result
    indexed_results.sort_by_key(|(idx, _)| *idx);

    let results: Vec<ImageResult> = indexed_results
        .into_iter()
        .map(|(_, r)| match r {
            Ok((ff, ck)) => ImageResult {
                flood_fill: Some(ff),
                color_key: Some(ck),
                error: None,
            },
            Err(e) => ImageResult {
                flood_fill: None,
                color_key: None,
                error: Some(e),
            },
        })
        .collect();

    // Check if all failed
    let has_any_success = results.iter().any(|r| r.flood_fill.is_some());
    if !has_any_success {
        let first_error = results
            .iter()
            .find_map(|r| r.error.as_ref())
            .map(|e| e.as_str())
            .unwrap_or("Unknown error");
        return Err(format!("Failed to generate images: {}", first_error));
    }

    Ok(GenerationResult {
        results,
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
