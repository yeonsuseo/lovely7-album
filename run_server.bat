@echo off
chcp 65001 >nul
title 몽글몽글 대고련 7기 사진첩 서버
cd /d "%~dp0"
set PATH=C:\Users\user\.local\bin;%PATH%

echo ============================================================
echo  몽글몽글 대고련 7기 감성 사진첩 서버를 실행합니다...
echo  저장 위치: %~dp0Anti_PIC
echo  로컬 마스터 주소: http://localhost:8000
echo  평생 영구 고정 주소: https://trimness-thirsty-culminate.ngrok-free.dev
echo  (컴퓨터를 껐다 켜도 주소가 절대 바뀌지 않습니다!)
echo ============================================================

uv run --with "fastapi,uvicorn,python-multipart,requests,pillow,pillow-heif,pyngrok" python server.py
pause
