#!/bin/bash
# Deploy face-recognition-service to server
# Run from local machine: bash face-recognition-service/deploy.sh

SERVER="tk@192.168.164.78"
REMOTE_DIR="/opt/facerecognition"
PW="19"

echo "=== 1. Copy service files ==="
scp -r face-recognition-service/* ${SERVER}:${REMOTE_DIR}/

echo "=== 2. Install system dependencies (cmake, dlib build deps) ==="
ssh ${SERVER} "sudo apt-get install -y build-essential cmake libopenblas-dev liblapack-dev libx11-dev"

echo "=== 3. Create venv and install Python deps ==="
ssh ${SERVER} "cd ${REMOTE_DIR} && python3 -m venv venv && venv/bin/pip install --upgrade pip && venv/bin/pip install -r requirements.txt"

echo "=== 4. Install systemd service ==="
ssh ${SERVER} "sudo cp ${REMOTE_DIR}/facerecognition.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable facerecognition && sudo systemctl restart facerecognition"

echo "=== Done ==="
ssh ${SERVER} "sudo systemctl status facerecognition --no-pager"
