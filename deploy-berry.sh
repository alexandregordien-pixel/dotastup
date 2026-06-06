#!/bin/bash
set -e

# ──────────────────────────────────────────────────────────────────────────────
# DEPLOY DOTASTUP — BRANCHE BERRY
# À lancer depuis berry directement
# Usage : bash deploy-berry.sh
# ──────────────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

REMOTE_DIR="/opt/dotastup"
PORT="3000"
DOMAIN="dotastup.gordien.dev"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DÉPLOIEMENT DOTASTUP SUR BERRY (branche berry)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ──────────────────────────────────────────────────────────────────────────────
# 1. Cloner la branche berry
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}1️⃣  Clonage branche berry...${NC}"
sudo rm -rf $REMOTE_DIR
sudo git clone -b berry https://github.com/alexandregordien-pixel/dotastup.git $REMOTE_DIR
sudo chown -R alexandre:alexandre $REMOTE_DIR

# ──────────────────────────────────────────────────────────────────────────────
# 2. Installer les dépendances
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}2️⃣  Installation des dépendances...${NC}"
cd $REMOTE_DIR
npm install --omit=dev

# ──────────────────────────────────────────────────────────────────────────────
# 3. Service systemd
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}3️⃣  Configuration service systemd...${NC}"
sudo tee /etc/systemd/system/dotastup.service > /dev/null << EOF
[Unit]
Description=Dotastup — Remplissage commande stupéfiants
After=network.target

[Service]
Type=simple
User=alexandre
WorkingDirectory=$REMOTE_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# ──────────────────────────────────────────────────────────────────────────────
# 4. Config Nginx
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}4️⃣  Configuration Nginx...${NC}"
sudo tee /etc/nginx/sites-available/dotastup > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dotastup /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# ──────────────────────────────────────────────────────────────────────────────
# 5. Cloudflare Tunnel DNS
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}5️⃣  Route DNS Cloudflare...${NC}"
cloudflared tunnel route dns berry $DOMAIN 2>/dev/null || echo "  (route déjà configurée)"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Démarrer le service
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}6️⃣  Démarrage du service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable dotastup
sudo systemctl restart dotastup
sudo systemctl status dotastup --no-pager

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DOTASTUP DÉPLOYÉ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🌐  https://$DOMAIN"
echo "  📍  Port : $PORT"
echo "  🔄  Auto-redémarrage activé"
echo ""
echo "Commandes utiles :"
echo "  sudo systemctl status dotastup"
echo "  sudo systemctl restart dotastup"
echo "  sudo journalctl -u dotastup -f"
echo ""
