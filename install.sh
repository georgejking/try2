#!/bin/bash

# webinar-app/install.sh
# Full setup script for Ubuntu 22.04

set -e

echo "🚀 Starting Webinar App Installation..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
  nginx \
  nodejs \
  npm \
  coturn \
  git \
  curl \
  ufw

# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 3478/udp  # TURN
sudo ufw allow 3478/tcp  # TURN
sudo ufw allow 49152:65535/udp  # TURN range
sudo ufw --force enable

# Install Coturn
sudo tee /etc/turnserver.conf > /dev/null <<EOL
listening-port=3478
tls-listening-port=5349
listening-ip=$(curl -s ifconfig.me)
external-ip=$(curl -s ifconfig.me)
relay-ip=$(curl -s ifconfig.me)
relay-ports=49152-65535
min-port=49152
max-port=65535
user=webinar:securepassword123
realm=webinar.example.com
no-cli
no-stdout-log
log-file=/var/log/turnserver.log
simple-log
EOL

sudo systemctl enable coturn
sudo systemctl restart coturn

# Clone app
cd /opt
sudo git clone https://github.com/georgejking/try2.git  # Replace with your repo or create locally
cd webinar-app

# Install backend
cd backend
sudo npm install
cd ..

# Build frontend
cd frontend
sudo npm install
sudo npm run build
cd ..

# Create systemd service
sudo tee /etc/systemd/system/webinar.service > /dev/null <<EOL
[Unit]
Description=Webinar App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/webinar-app/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl daemon-reload
sudo systemctl enable webinar
sudo systemctl start webinar

# Configure Nginx
sudo tee /etc/nginx/sites-available/webinar > /dev/null <<EOL
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

sudo ln -sf /etc/nginx/sites-available/webinar /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Installation complete!"
echo "👉 Access your app at http://$(curl -s ifconfig.me)"
echo "🔐 Coturn credentials: username=webinar, password=securepassword123"
echo "⚠️  Remember to replace 'securepassword123' in /etc/turnserver.conf"
