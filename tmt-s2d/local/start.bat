@echo off
cd /d "%~dp0"
echo Opening HisaabDesk local demo...
where py >nul 2>&1 && py -3 -m http.server 8765 --bind 0.0.0.0 && goto :eof
where python >nul 2>&1 && python -m http.server 8765 --bind 0.0.0.0 && goto :eof
echo Python not found. Double-click ..\OPEN-APP.html instead.
pause
