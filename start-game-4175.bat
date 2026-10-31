@echo off
chcp 65001 >nul
setlocal
rem 双击启动本地游戏：固定4175端口，并从脚本所在目录加载服务。
title 森林巡游 - 4175
pushd "%~dp0"
if errorlevel 1 (
  echo 无法进入游戏目录，请确认脚本位于项目根目录。
  pause
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo 未找到 Node.js，请先安装 Node.js 并重新打开此脚本。
  popd
  pause
  exit /b 1
)
set "PORT=4175"
echo 游戏地址：http://localhost:4175
echo 请保持此窗口开启；关闭窗口或按 Ctrl+C 可停止服务。
node server.mjs
set "gameExitCode=%errorlevel%"
rem 启动失败时保留错误，便于检查端口占用或运行环境。
if not "%gameExitCode%"=="0" (
  echo 启动失败，请查看上方错误；如果4175端口已被占用，请关闭已有服务后重试。
  pause
)
popd
endlocal & exit /b %gameExitCode%
