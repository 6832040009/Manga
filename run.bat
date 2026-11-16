@echo off
chcp 65001 > nul
title MangaVerse - Manga & Manhwa Reader Web App
echo ===================================================
echo     MangaVerse - ระบบเว็บอ่านมังงะและมังฮวา
echo ===================================================
echo.
echo กำลังเริ่มต้นเซิร์ฟเวอร์...
echo.

set NODE_PATH=node

where node >nul 2>nul
if %errorlevel% equ 0 (
    set NODE_PATH=node
    goto RUN
)

if exist "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" (
    set "NODE_PATH=C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe"
    goto RUN
)

if exist "C:\Program Files\Adobe\Adobe Photoshop 2020\node.exe" (
    set "NODE_PATH=C:\Program Files\Adobe\Adobe Photoshop 2020\node.exe"
    goto RUN
)

echo [คำเตือน] ไม่พบ Node.js ใน PATH จะลองรันด้วย dotnet...
dotnet run
goto END

:RUN
echo เปิดเซิร์ฟเวอร์ที่: http://127.0.0.1:5000
echo ชื่อผู้ใช้แอดมิน: prct
echo รหัสผ่านแอดมิน: prct2522
echo.
start http://127.0.0.1:5000
"%NODE_PATH%" server.js

:END
pause
