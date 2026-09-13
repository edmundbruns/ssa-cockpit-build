pub mod vault;

#[cfg(feature = "desktop-app")]
use std::sync::Mutex;
#[cfg(feature = "desktop-app")]
use tauri::Manager;

#[cfg(feature = "desktop-app")]
struct AppState(Mutex<vault::Vault>);

#[cfg(feature = "desktop-app")]
macro_rules! vault_command {
    ($name:ident ( $($arg:ident : $typ:ty),* ) => $method:ident) => {
        #[tauri::command]
        fn $name(state: tauri::State<'_, AppState>, $($arg:$typ),*) -> Result<serde_json::Value, String> {
            let mut vault = state.0.lock().map_err(|_| "Datentresor ist gesperrt".to_string())?;
            vault.$method($($arg),*).map_err(|e| e.to_string())
        }
    };
}

#[cfg(feature = "desktop-app")]
vault_command!(vault_status() => status);
#[cfg(feature = "desktop-app")]
vault_command!(setup_vault(password: String, initial_state_json: String) => setup_json);
#[cfg(feature = "desktop-app")]
vault_command!(unlock_vault(password: String) => unlock_json);
#[cfg(feature = "desktop-app")]
vault_command!(save_state(state_json: String) => save_state_json);
#[cfg(feature = "desktop-app")]
vault_command!(lock_vault() => lock_json);
#[cfg(feature = "desktop-app")]
vault_command!(list_attachments(student_id: String) => list_attachments_json);
#[cfg(feature = "desktop-app")]
vault_command!(put_attachment(student_id: String, name: String, mime_type: String, bytes: Vec<u8>) => put_attachment_json);
#[cfg(feature = "desktop-app")]
vault_command!(get_attachment(id: String) => get_attachment_json);
#[cfg(feature = "desktop-app")]
vault_command!(delete_attachment(id: String) => delete_attachment_json);
#[cfg(feature = "desktop-app")]
vault_command!(export_backup() => export_backup_json);
#[cfg(feature = "desktop-app")]
vault_command!(import_backup(payload_json: String, password: String) => import_backup_json);
#[cfg(feature = "desktop-app")]
vault_command!(change_password(old_password: String, new_password: String) => change_password_json);

#[cfg(feature = "desktop-app")]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            app.manage(AppState(Mutex::new(vault::Vault::open_at(dir.join("ssa-cockpit.db"))?)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault_status, setup_vault, unlock_vault, save_state, lock_vault,
            list_attachments, put_attachment, get_attachment, delete_attachment,
            export_backup, import_backup, change_password
        ])
        .run(tauri::generate_context!())
        .expect("SSA-Cockpit konnte nicht gestartet werden");
}

#[cfg(not(feature = "desktop-app"))]
pub fn run() {}
