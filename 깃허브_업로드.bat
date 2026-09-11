@echo off
set "GITDIR=%LOCALAPPDATA%\Programs\Git\cmd"
set "PATH=%GITDIR%;%PATH%"

cd /d "%~dp0"

echo.
echo ====================================================
echo  Uploading Lovely7 Photo Album to GitHub...
echo  Target: https://github.com/yeonsuseo/lovely7-album.git
echo ====================================================
echo.

git add .
git commit -m "Update Lovely7 Photo Album"
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Code uploaded to GitHub successfully!
    echo [RENDER] Render will automatically deploy in 1-2 minutes!
) else (
    echo [ERROR] Upload failed. Please check your GitHub login or remote repository.
)
echo.
pause
