@echo off
title Stop Network Monitoring System (NMS)
echo Stopping NMS processes...

taskkill /F /IM mongod.exe 2>nul
taskkill /F /FI "WINDOWTITLE eq NMS*" 2>nul

echo NMS services stopped.
pause
