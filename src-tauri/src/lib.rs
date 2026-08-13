use tauri::Manager;

/// The registry value name under `HKCU\...\Run`.
///
/// Set explicitly rather than left to default so that exactly one string
/// identifies the entry in three places: the key this app writes, the key the
/// NSIS uninstaller deletes (`windows/hooks.nsi`), and the name a user sees in
/// Task Manager's Startup tab. A drifting default would strand the entry after
/// uninstall, leaving Windows to launch a binary that no longer exists.
const AUTOSTART_ENTRY: &str = "Mission Control";

pub fn run() {
    tauri::Builder::default()
        // Registered first, deliberately: plugins initialise in insertion order,
        // and this one decides whether the process is entitled to run at all.
        // Without it, signing in while the app is already open — or double
        // clicking the icon out of habit — starts a rival process writing to the
        // same store file, and the last writer silently wins.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // The second launch hands its intent to the instance already running
            // and exits. Surface that window instead of doing nothing, so the
            // click is not experienced as the app failing to open.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name(AUTOSTART_ENTRY)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running Mission Control");
}
