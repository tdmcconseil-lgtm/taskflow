#!/usr/bin/env bash
# Met à jour l'application sur le serveur : récupère le code, reconstruit et
# redémarre. Les migrations de base s'appliquent au démarrage du conteneur app.
set -euo pipefail

cd "$(dirname "$0")"

echo "→ Récupération du code…"
git pull --ff-only

echo "→ Reconstruction et redémarrage…"
docker compose -f docker-compose.prod.yml up -d --build

echo "→ État des services :"
docker compose -f docker-compose.prod.yml ps
echo "✓ Déploiement terminé."
