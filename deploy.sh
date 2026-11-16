#!/bin/bash
# ==============================================================================
# MangaVerse AWS EC2 One-Click Deployment Script
# Repository: https://github.com/6832040009/Manga.git
# ==============================================================================

set -e

echo "======================================================"
echo "   🚀 Starting MangaVerse Deployment on AWS EC2"
echo "======================================================"

APP_DIR="/var/www/manga"
REPO_URL="https://github.com/6832040009/Manga.git"

# 1. Update system packages
echo "📦 Updating system packages..."
if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y curl git ufw nginx
elif command -v dnf >/dev/null 2>&1; then
    sudo dnf update -y
    sudo dnf install -y curl git nginx
elif command -v yum >/dev/null 2>&1; then
    sudo yum update -y
    sudo yum install -y curl git nginx
fi

# 2. Install Node.js (Version 20 LTS) if not installed
if ! command -v node >/dev/null 2>&1; then
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs || sudo yum install -y nodejs
fi

echo "✅ Node version: $(node -v)"
echo "✅ NPM version: $(npm -v)"

# 3. Install PM2 process manager globally
if ! command -v pm2 >/dev/null 2>&1; then
    echo "📦 Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 4. Clone or Pull from GitHub
if [ -d "$APP_DIR/.git" ]; then
    echo "🔄 Pulling latest changes from GitHub..."
    cd "$APP_DIR"
    sudo git pull origin main
else
    echo "📥 Cloning repository from GitHub..."
    sudo mkdir -p "$APP_DIR"
    sudo git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 5. Fix permissions
sudo chown -R $USER:$USER "$APP_DIR"
mkdir -p "$APP_DIR/data" "$APP_DIR/wwwroot/uploads/covers" "$APP_DIR/wwwroot/uploads/chapters"
chmod -R 755 "$APP_DIR"

# 6. Start or Restart with PM2
echo "⚡ Starting application with PM2..."
if pm2 list | grep -q "manga-app"; then
    pm2 reload ecosystem.config.js || pm2 restart manga-app
else
    pm2 start ecosystem.config.js
fi

# Save PM2 state to resurrect on system boot
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || true

# 7. Configure Nginx Reverse Proxy (Port 80 -> Port 5000)
echo "🌐 Configuring Nginx reverse proxy..."
NGINX_CONF="/etc/nginx/sites-available/manga"
if [ -d "/etc/nginx/sites-available" ]; then
    sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    sudo ln -sf /etc/nginx/sites-available/manga /etc/nginx/sites-enabled/manga
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
fi

# 8. Firewall Configuration (If UFW is installed)
if command -v ufw >/dev/null 2>&1; then
    echo "🛡️ Configuring Firewall..."
    sudo ufw allow OpenSSH || true
    sudo ufw allow 'Nginx Full' || sudo ufw allow 80 || true
    sudo ufw --force enable || true
fi

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s https://api.ipify.org || echo "YOUR-SERVER-IP")

echo ""
echo "======================================================"
echo "   🎉 MangaVerse Deployment Complete!"
echo "======================================================"
echo " 🌐 Website URL: http://${PUBLIC_IP}"
echo " 👑 Admin Login: http://${PUBLIC_IP} (Username: prct / Pass: prct2522)"
echo " 📁 App Directory: $APP_DIR"
echo " 📊 Check Logs:   pm2 logs manga-app"
echo " 🔄 Restart App:  pm2 restart manga-app"
echo "======================================================"
