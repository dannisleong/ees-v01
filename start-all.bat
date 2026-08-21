@echo off
cd /d C:\Users\danni\Documents\kimi\workspace\ees-v01-alpha
start /b node start-services.cjs > services.log 2>&1
timeout /t 10 > nul
type services.log
