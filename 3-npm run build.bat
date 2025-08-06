@echo off
cd /d "%~dp0"
echo Running: npm run tauri build in %cd%
npm run tauri build
pause