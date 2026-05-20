@echo off
set ROOT=%~dp0
"%ROOT%tools\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:5173 --no-autoupdate
