#!/usr/bin/env bash
# Prépare les outils d'audit : React et polices en local, copie instrumentée du jeu dans travail/
set -e
cd "$(dirname "$0")"
npm install --no-audit --no-fund >/dev/null
python3 instrument.py
echo "Outils prêts (copie instrumentée : travail/game.html)"
