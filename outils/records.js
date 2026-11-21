// Records sur le serveur : envoyés depuis un appareil, récupérés et fusionnés sur un autre grâce au code joueur
const { chromium } = require('playwright');
const { open } = require('./harness');
const mock = require('./mocksb');
const { execFileSync } = require('child_process');
const db = (q) => execFileSync('su', ['postgres', '-c', 'psql -d bpe -qAt'], { input: q }).toString().trim();
const ok = (c, t) => console.log((c ? 'OK  ' : 'ÉCHEC') + ' ' + t);
const rec = (nom, score, joue) => ({ score, pseudo: 'x', joue, nom, medaille: null, delai: 100, cout: 0, qualite: 70, date: 'J+100' });
(async () => {
  db('delete from scores; delete from pseudos; delete from joueurs; delete from records_joueurs; delete from parties;');
  const b = await chromium.launch();
  const appareil = (init) => open({ browser: b, url: 'http://bpe.test/repo/index.html', viewport: { width: 390, height: 844 }, supabase: mock(), wait: 1500, vierge: true, init: init || '' });
  const L = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('bpe-simulator-records-v3') || '[]'));
  // A : records locaux de deux personnages, puis choisit un pseudo → records envoyés
  const recA = [rec('Gabriel', 8200, '2026-11-01T10:00:00Z'), rec('Hugues', 7100, '2026-11-02T10:00:00Z')];
  const A = await appareil(`try{localStorage.setItem('bpe-simulator-records-v3', ${JSON.stringify(JSON.stringify(recA))})}catch(e){}`);
  await A.p.getByRole('button', { name: 'Nouveau joueur' }).click();
  await A.p.getByLabel('Pseudo', { exact: true }).fill('Grogu'); await A.p.getByRole('button', { name: 'Valider' }).click(); await A.p.waitForTimeout(1200);
  const codeA = await A.p.evaluate(() => JSON.parse(localStorage.getItem('bpe-simulator-joueur')));
  ok(db(`select jsonb_array_length(records) from records_joueurs where joueur_id = '${codeA}'`) === '2', 'A : ses 2 records sont envoyés au serveur après le choix du pseudo');
  // B : a ses propres records (Samuel), saisit le code de A → fusion des deux
  const B = await appareil(`try{localStorage.setItem('bpe-simulator-records-v3', ${JSON.stringify(JSON.stringify([rec('Samuel', 6500, '2026-11-03T10:00:00Z')]))})}catch(e){}`);
  await B.p.getByRole('button', { name: "J'ai déjà joué" }).click();
  await B.p.getByLabel("Code d'un autre appareil").fill(codeA); await B.p.getByRole('button', { name: 'Utiliser' }).click(); await B.p.waitForTimeout(1500);
  const lb = await L(B.p);
  ok(lb.length === 3 && lb[0].score === 8200 && lb.some((x) => x.nom === 'Samuel'), 'B après le code : 3 records (ceux de A + le sien), triés');
  ok(db(`select jsonb_array_length(records) from records_joueurs where joueur_id = '${codeA}'`) === '3', 'Serveur : la fusion (3 records) est renvoyée');
  for (let k = 0; k < 4 && !/^Gabriel/m.test(await B.p.innerText('body')); k++) { await B.p.keyboard.press('ArrowRight'); await B.p.waitForTimeout(400); }
  ok(/Record\s*:\s*8\s200\s*pts/.test(await B.p.innerText('body')), "B : l'accueil affiche le record de Gabriel (8 200) sans recharger");
  // A relancé : récupère le record de Samuel venu de B
  await A.p.reload(); await A.p.waitForTimeout(1800);
  ok((await L(A.p)).some((x) => x.nom === 'Samuel' && x.score === 6500), 'A relancé : récupère le record de Samuel fait sur B');
  // Sécurité : liste falsifiée refusée, code inconnu refusé
  ok(db(`begin; set local role anon; select enregistrer_records('${codeA}', '[{"score": 99999, "nom": "Gabriel"}]'::jsonb); commit;`) === 'refuse', 'Score impossible (99 999) refusé');
  ok(db(`begin; set local role anon; select enregistrer_records(gen_random_uuid(), '[]'::jsonb); commit;`) === 'inconnu', 'Code inconnu refusé');
  const lecture = require('child_process').spawnSync('su', ['postgres', '-c', 'psql -d bpe -qAt'], { input: 'begin; set local role anon; select * from records_joueurs; commit;' });
  ok(/permission denied/.test(String(lecture.stderr)), 'Table des records illisible directement');
  console.log('erreurs :', [...A.errs, ...B.errs]);
  await b.close();
})();
