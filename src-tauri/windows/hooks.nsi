; NSIS installer hooks for Mission Control.
;
; Uninstalling must also withdraw the startup registration. The bundler removes
; the files it installed, but it has no knowledge of the HKCU Run value written
; at runtime by tauri-plugin-autostart. Left behind, Windows would go on trying
; to launch a binary that is no longer on disk at every sign-in — silently, but
; permanently, and visible to the user as a dead entry in Task Manager's Startup
; tab that they cannot easily explain.
;
; The value name must match AUTOSTART_ENTRY in src-tauri/src/lib.rs exactly.
;
; HKCU, not HKLM: the entry is per-user, so removing it needs no elevation.

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mission Control"
!macroend
