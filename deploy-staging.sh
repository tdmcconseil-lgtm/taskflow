#!/usr/bin/env bash
# Met à jour la PRÉPRODUCTION (https://staging.getrida.com) à partir de la
# branche "staging" : récupère le code, reconstruit et redémarre la stack de
# préprod. N'affecte PAS la production. À lancer dans ~/taskflow-staging.
set -euo pipefail

cd "$(dirname "$0")"

echo "→ Récupération de la branche staging…"
git fetch origin
git checkout staging
git pull --ff-only origin staging

echo "→ Reconstruction et redémarrage de la préprod…"
docker compose -f docker-compose.staging.yml up -d --build

echo "→ État des services de préprod :"
docker compose -f docker-compose.staging.yml ps
echo "✓ Préproduction à jour : https://staging.getrida.com"
