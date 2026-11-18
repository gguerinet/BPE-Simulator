# Outils d'audit

Outils utilisés pour auditer le jeu : un robot qui joue des parties entières en temps accéléré, des simulations
d'équilibrage, des tests de sauvegarde et de reprise, et des tests du classement en ligne sur une copie locale
de la base. Ils ne font pas partie du jeu publié et pourront être supprimés.

## Préparer

```bash
./installer.sh            # React et polices en local, copie instrumentée du jeu dans travail/
./sql/base-locale.sh      # facultatif : copie locale de la base du classement (PostgreSQL)
```

À relancer `python3 instrument.py` après chaque modification de `../index.html`.

## Principaux scripts (à lancer depuis ce dossier)

| Script | Rôle |
|---|---|
| `node balance.js <stratégies> <héros> <n>` | parties simulées, une ligne JSON par partie (stratégies dans `strats.js`) |
| `python3 agg.py <fichiers>` | tableau des scores moyens par stratégie et par héros |
| `node fuzz.js <n> <décalage>` | parties aux choix aléatoires, contrôle des bornes et des blocages |
| `node coherence.js <n> <décalage>` | vérifie que les chiffres du rapport de fin se recoupent |
| `node reload.js` | rechargements de page aux moments clés |
| `node vrtest.js` | reprise des sauvegardes faites avec d'anciennes listes de besoins |
| `node e2e.js` | partie complète contre la base locale |
| `node shots.js [tailles]` | captures de tous les écrans, détection des textes coupés |
| `node mem.js`, `node perf.js` | mémoire sur une longue partie, fluidité |

`harness.js` ouvre le jeu dans Chromium avec React et les polices servis en local ; `fakeclock.js` accélère
le temps ; `bot.js` est le robot ; `sim.js` joue une partie complète.
