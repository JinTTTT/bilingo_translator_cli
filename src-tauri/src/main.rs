#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{GlobalShortcutManager, Manager, PhysicalPosition, State, Window};

const SELECTION_SHORTCUT: &str = "Ctrl+Alt+E";
const INPUT_SHORTCUT: &str = "Ctrl+Alt+I";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TranslationRequest {
    text: String,
    auto_translate: bool,
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
        .invoke_handler(tauri::generate_handler![set_pinned])
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
