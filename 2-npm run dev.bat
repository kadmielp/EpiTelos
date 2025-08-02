@echo off
cd /d "%~dp0"
echo Running: npm run tauri dev in %cd%
npm run tauri dev
pause