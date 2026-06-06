#!/bin/bash
set -e

HOST="alexandre@berry"
REMOTE_DIR="/opt/dotastup"

echo "==> Copie des fichiers sur le Raspberry Pi..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.pdf' \
  --exclude 'readme.perso' \
  ./ "$HOST:$REMOTE_DIR/"

echo "==> Installation des dépendances Node..."
ssh "$HOST" "cd $REMOTE_DIR && npm install --omit=dev"

echo "==> Activation et redémarrage du service..."
ssh "$HOST" "sudo systemctl daemon-reload && sudo systemctl enable dotastup && sudo systemctl restart dotastup"

echo "==> Statut du service :"
ssh "$HOST" "sudo systemctl status dotastup --no-pager"

echo ""
echo "Déployé ! Vérifie sur http://dotastup.gordien.dev"
