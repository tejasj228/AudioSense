@echo off
echo Installing Python dependencies for audio visualization backend...
cd python_backend
pip install -r requirements.txt
echo.
echo Installation complete!
echo.
echo To start the Python backend server, run:
echo   cd python_backend
echo   python server.py
echo.
pause
