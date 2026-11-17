@echo off
chcp 65001 >nul
title Allpa
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install --legacy-peer-deps --no-audit --no-fund
  if errorlevel 1 (
    echo Fallo la instalacion.
    pause
    exit /b 1
  )
)
echo Iniciando en http://localhost:3000
start "" cmd /c "timeout /t 7 >nul & start http://localhost:3000"
call npm run dev
pause
