#!/bin/bash
# deploy.sh — รันบน server หลัง git pull
set -e

APP_DIR="/opt/dutycheckin"
WEB_DIR="/var/www/dutycheckin"

echo "=== [1/4] Pull latest code ==="
cd $APP_DIR
git pull origin main

echo "=== [2/4] Install backend dependencies ==="
source $APP_DIR/venv/bin/activate
pip install -r backend/requirements.txt

echo "=== [3/4] Build frontend ==="
cd $APP_DIR/frontend
npm install
npm run build

echo "=== [4/4] Copy frontend build & restart ==="
sudo rm -rf $WEB_DIR
sudo cp -r $APP_DIR/frontend/dist $WEB_DIR
sudo systemctl restart dutycheckin
sudo systemctl reload nginx

echo "✓ Deploy done → https://tk.pmk.ac.th/dutycheckin/"
