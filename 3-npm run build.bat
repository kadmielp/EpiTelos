@echo off
cd /d "%~dp0"
echo Running: npm run build:installer in %cd%
npm run build:installer
pause
