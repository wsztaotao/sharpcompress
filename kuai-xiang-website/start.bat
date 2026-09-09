@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  软件快响模版本地预览
echo  目录: %cd%
echo.
echo  请用浏览器打开:
echo    http://127.0.0.1:8080/index-a.html
echo    http://127.0.0.1:8080/index-b.html
echo    http://127.0.0.1:8080/index-c.html
echo.
echo  也可直接双击 index-a.html / index-b.html / index-c.html
echo  按 Ctrl+C 可停止服务
echo.
start "" "http://127.0.0.1:8080/index-a.html"
python -m http.server 8080 --bind 127.0.0.1
if errorlevel 1 py -3 -m http.server 8080 --bind 127.0.0.1
pause
