#!/usr/bin/env bash
# Tentatives de triche contre la copie locale du classement (base « bpe »), avec le rôle anonyme comme le jeu
cd "$(dirname "$0")"
./sql/base-locale.sh >/dev/null 2>&1
DB() { su postgres -c "psql -d bpe -qAt" 2>&1; }
A() { printf 'begin; set local role anon; %s; commit;\n' "$1" | DB | grep -v '^SET\|^BEGIN\|^COMMIT\|^CONTEXT\|^LINE\|^ *\^' | sed 's/^psql:<stdin>:[0-9]*: //' | head -2; }
vieillir() { echo "update parties set debut = now() - interval '10 minutes'; update scores set created_at = now() - interval '10 minutes';" | DB >/dev/null; }
J1=11111111-1111-4111-8111-111111111111; J2=22222222-2222-4222-8222-222222222222
ok=0; ko=0
tb() { r=$(A "$3"); if echo "$r" | grep -qiE "$2"; then ok=$((ok+1)); s=OK; else ko=$((ko+1)); s=ÉCHEC; fi
  printf '%-6s %-62s → %s\n' "$s" "$1" "$(echo "$r" | head -1 | cut -c1-90)"; }   # sans vieillir
t() { # t "description" "attendu (motif)" "requête"  (chaque essai part d'une situation « reposée » : pas de limite de rythme)
  vieillir; r=$(A "$3"); if echo "$r" | grep -qiE "$2"; then ok=$((ok+1)); s=OK; else ko=$((ko+1)); s=ÉCHEC; fi
  printf '%-6s %-62s → %s\n' "$s" "$1" "$(echo "$r" | head -1 | cut -c1-90)"; }
P1=$(A "select commencer_partie('$J1')"); vieillir
t "Lire les joueur_id"                    "permission denied" "select joueur_id from scores"
t "Lire le détail des parties"            "permission denied" "select * from parties"
t "Modifier un score"                     "permission denied" "update scores set score = 10000"
t "Supprimer les scores"                  "permission denied" "delete from scores"
t "Vider la table"                        "permission denied" "truncate scores"
t "Écrire directement l'heure de départ"  "permission denied" "insert into parties (joueur_id, debut) values ('$J1', now() - interval '1 day')"
t "Score imposé (created_at forcé)"       "permission denied" "insert into scores (pseudo, hero, score, joueur_id, created_at) values ('X','samuel',1,'$J1', now())"
t "Partie inventée"                       "Partie inconnue"   "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pirate','samuel',10000,'$J1',gen_random_uuid(),90,100,0,'go-ok')"
t "Partie d'un autre joueur"              "Partie inconnue"   "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pirate','samuel',10000,'$J2','$P1',90,100,0,'go-ok')"
t "Héros inconnu"                         "violates check|scores_valeurs" "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pirate','yoda',10000,'$J1','$P1',90,100,0,'go-ok')"
t "Qualité impossible (80,3)"             "invalide"          "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pirate','samuel',10000,'$J1','$P1',90,80.3,0,'go-ok')"
t "Coût non multiple de 5 000"            "invalide"          "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pirate','samuel',10000,'$J1','$P1',90,100,1234,'go-ok')"
t "Délai absurde (J+5)"                   "invalide"          "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pirate','samuel',10000,'$J1','$P1',5,100,0,'go-ok')"
t "Verdict go/no-go inconnu"              "invalide"          "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pirate','samuel',10000,'$J1','$P1',90,100,0,'super-go')"
t "Pseudo de 30 caractères"               "violates check|scores_valeurs" "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('$(printf 'A%.0s' {1..30})','samuel',1,'$J1','$P1',90,100,0,'nogo')"
t "Pseudo avec caractère de contrôle"     "violates check|scores_valeurs" "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Pi' || chr(10) || 'rate','samuel',1,'$J1','$P1',90,100,0,'nogo')"
t "Pseudo HTML (<script>)"                "^$"                "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('<b>x</b>','samuel',1,'$J1','$P1',95,90,5000,'nogo')"
echo "   (le pseudo HTML est accepté : il est affiché comme du texte, jamais interprété — vérifié côté jeu)"
vieillir
t "Même partie envoyée deux fois"         "déjà envoyé|duplicate" "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('<b>x</b>','samuel',1,'$J1','$P1',95,90,5000,'nogo')"
P2=$(A "select commencer_partie('$J2')")
tb "Partie trop courte (envoi immédiat)"   "trop courte"       "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Rapide','samuel',1,'$J2','$P2',90,100,0,'go-ok')"
vieillir
t "Pseudo déjà pris par un autre joueur"  "déjà pris"         "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('<B>X</B>','samuel',1,'$J2','$P2',90,100,0,'go-ok')"
t "Score 10 000 réclamé → recalculé"      "^$"                "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('Honnete','samuel',10000,'$J2','$P2',120,70,5000,'nogo')"
echo "   score enregistré : $(echo "select score from scores where pseudo='Honnete'" | DB) (attendu 7 311 pour J+120, 70 %, 5 000 €, NO-GO)"
J3=33333333-3333-4333-8333-333333333333
for i in $(seq 1 31); do A "select commencer_partie('$J3')" >/dev/null; done
t "31e partie commencée dans l'heure"     "Trop de parties"   "select commencer_partie('$J3')"
t "commencer_partie sans joueur"          "Joueur inconnu"    "select commencer_partie(null)"
t "reserver_pseudo : injection SQL"       "^ok$"              "select reserver_pseudo(\$\$x' or 1=1 --\$\$, gen_random_uuid())"
t "reserver_pseudo : pseudo existant"     "^pris$"            "select reserver_pseudo('HONNETE', gen_random_uuid())"
t "Appeler la fonction du déclencheur"    "permission denied|trigger functions" "select scores_avant_ajout()"
# Envois simultanés de la même partie
vieillir; P4=$(A "select commencer_partie('$J1')"); vieillir
for i in 1 2 3 4 5; do A "insert into scores (pseudo,hero,score,joueur_id,partie_id,total,qualite,cout,gonogo) values ('<b>x</b>','gabriel',1,'$J1','$P4',100,80,5000,'nogo')" > /tmp/claude-0/-home-user-BPE-Simulator/6a8a30ef-9e66-572a-bd46-9c91a29cc36f/scratchpad/conc$i.txt & done; wait
n=$(echo "select count(*) from scores where partie_id = '$P4'" | DB)
if [ "$n" = "1" ]; then ok=$((ok+1)); s=OK; else ko=$((ko+1)); s=ÉCHEC; fi
printf '%-6s %-62s → %s\n' "$s" "5 envois simultanés de la même partie" "$n score(s) enregistré(s)"
echo "BILAN : $ok réussis, $ko échecs"
