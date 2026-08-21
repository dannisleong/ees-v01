@echo off
cd /d "C:\Users\danni\Documents\kimi\workspace\ees-v01-alpha"

echo [EES] Starting backend services...
echo [EES] Starting PostgreSQL...
start /b node start-pg-resume.mjs > pg.log 2>&1

timeout /t 5 /nobreak >nul

echo [EES] Starting API server...
start /b npx tsx api/src/index.ts > api.log 2>&1

timeout /t 5 /nobreak >nul

echo [EES] Backend services started.
echo [EES] PostgreSQL: 127.0.0.1:5432
echo [EES] API:        http://localhost:3001
echo.
echo You can now click the Preview link in Kimi Work.
pause
