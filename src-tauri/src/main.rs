// Verhindert unter Windows ein zusätzliches schwarzes Konsolenfenster im Release-Build.
// Diese Zeile nicht entfernen. Im Entwicklungsmodus (tauri dev) bleibt die Konsole absichtlich sichtbar.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ssa_cockpit_lib::run();
}
