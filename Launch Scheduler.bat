@echo off
SET "NODE_PATH=C:\Program Files\nodejs\"
SET "PATH=%NODE_PATH%;%PATH%"

echo Cleaning up old sessions...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul

echo.
echo Launching Omniscient AI Scheduler...
echo ------------------------------------
echo [INFO] Access via http://localhost:5173
echo [INFO] Mobile Public Link will take 20s to activate.
echo.

call npm run dev
