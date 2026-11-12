@echo off
chcp 65001 > nul
title Pocket-Depo (Mobil Stok ve Sayım Asistanı)
cd /d "C:\Users\orhan şahin\Desktop\Projelerim\pocket-depo"

echo ========================================================
echo       POCKET-DEPO (OFFLINE-FIRST MOBİL STOK)
echo ========================================================
echo.
echo Geliştirme sunucusu başlatılıyor...
echo Tarayıcınızda veya yerel ağdaki telefonunuzda açabilirsiniz:
echo   - Bilgisayardan: http://localhost:5173
echo   - Telefondan: Bilgisayarınızın yerel IP adresi:5173
echo.
echo Kapatmak için bu pencereyi kapatabilirsiniz.
echo ========================================================
echo.

npm run dev
pause
