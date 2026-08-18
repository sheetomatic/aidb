@echo off
cd /d "%~dp0"
echo Opening wiring preview on http://127.0.0.1:8877/wired.html
where py >nul 2>&1 && py -3 -m http.server 8877 --bind 0.0.0.0 && goto :eof
where python >nul 2>&1 && python -m http.server 8877 --bind 0.0.0.0 && goto :eof
echo Python not found. Double-click ..\OPEN-WIRING.html instead.
pause
