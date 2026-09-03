#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{GlobalShortcutManager, Manager, PhysicalPosition, State, Window};

const SELECTION_SHORTCUT: &str = "Ctrl+Alt+E";
const INPUT_SHORTCUT: &str = "Ctrl+Alt+I";
const API_CONFIG_DIRECTORY: &str = "bilingo";
const API_CONFIG_FILENAME: &str = "config.json";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TranslationRequest {
    text: String,
    auto_translate: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiConfiguration {
    api_key: String,
}

#[derive(Default)]
struct WindowPreferences {
    pinned: AtomicBool,
    positioned: AtomicBool,
}

#[tauri::command]
fn set_pinned(pinned: bool, preferences: State<'_, WindowPreferences>) {
    preferences.pinned.store(pinned, Ordering::Relaxed);
}

#[tauri::command]
fn get_api_key() -> Result<String, String> {
    let config_directory = tauri::api::path::config_dir()
        .ok_or_else(|| "Could not locate the user configuration directory.".to_string())?
        .join(API_CONFIG_DIRECTORY);
    let config_path = config_directory.join(API_CONFIG_FILENAME);

    if !config_path.exists() {
        fs::create_dir_all(&config_directory)
            .map_err(|error| format!("Could not create the Bilingo config directory: {error}"))?;
        fs::write(&config_path, "{\n  \"apiKey\": \"sk-your-api-key\"\n}\n")
            .map_err(|error| format!("Could not create the Bilingo config file: {error}"))?;
    }

    #[cfg(unix)]
    fs::set_permissions(&config_path, fs::Permissions::from_mode(0o600))
        .map_err(|error| format!("Could not secure the Bilingo config file: {error}"))?;

    let contents = fs::read_to_string(&config_path)
        .map_err(|error| format!("Could not read {}: {error}", config_path.display()))?;
    let configuration: ApiConfiguration = serde_json::from_str(&contents)
        .map_err(|error| format!("Invalid JSON in {}: {error}", config_path.display()))?;
    let api_key = configuration.api_key.trim();

    if api_key.is_empty() || api_key == "sk-your-api-key" {
        return Err(format!(
            "Add your DeepSeek API key to {}.",
            config_path.display()
        ));
    }

    Ok(api_key.to_string())
}

fn position_top_right(window: &Window) {
    let Ok(Some(monitor)) = window.primary_monitor() else {
        return;
    };
    let Ok(window_size) = window.outer_size() else {
        return;
    };

    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let margin = 16;
    let x = monitor_position.x
        + monitor_size.width.saturating_sub(window_size.width) as i32
        - margin;
    let y = monitor_position.y + margin;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

fn show_translation(app: &tauri::AppHandle, text: String, auto_translate: bool) {
    let Some(window) = app.get_window("translate") else {
        return;
    };

    let preferences = window.state::<WindowPreferences>();
    if !preferences.positioned.swap(true, Ordering::Relaxed) {
        position_top_right(&window);
    }
    let _ = window.set_always_on_top(true);

    if let Err(error) = window.show() {
        eprintln!("failed to show translation window: {error}");
    }
    if let Err(error) = window.set_focus() {
        eprintln!("failed to focus translation window: {error}");
    }

    let _ = window.emit(
        "translation-request",
        TranslationRequest {
            text,
            auto_translate,
        },
    );
}

fn main() {
    tauri::Builder::default()
        .manage(WindowPreferences::default())
        .invoke_handler(tauri::generate_handler![get_api_key, set_pinned])
        .setup(|app| {
            let selection_app = app.handle();
            app.global_shortcut_manager().register(SELECTION_SHORTCUT, move || {
                let text = selection::get_text();
                let should_translate = !text.trim().is_empty();
                show_translation(&selection_app, text, should_translate);
            })?;

            let input_app = app.handle();
            app.global_shortcut_manager().register(INPUT_SHORTCUT, move || {
                show_translation(&input_app, String::new(), false);
            })?;

            Ok(())
        })
        .on_window_event(|event| {
            match event.event() {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = event.window().hide();
                }
                tauri::WindowEvent::Focused(false) => {
                    let window = event.window().clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(Duration::from_millis(120));
                        let preferences = window.state::<WindowPreferences>();
                        let is_pinned = preferences.pinned.load(Ordering::Relaxed);
                        let is_focused = window.is_focused().unwrap_or(false);
                        if !is_pinned && !is_focused {
                            let _ = window.hide();
                        }
                    });
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Bilingo");
}
