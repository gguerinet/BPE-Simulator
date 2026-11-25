// Succès, pièces et objets de la boutique : gagnés et achetés sur un appareil, retrouvés sur un autre grâce au code joueur.
// Base locale : sql/base-locale.sh, puis sql/succes.sql
const { chromium } = require('playwright');
const { open } = require('./harness');
const mock = require('./mocksb');
const { execFileSync } = require('child_process');
const db = (q) => execFileSync('su', ['postgres', '-c', 'psql -d bpe -qAt'], { input: q }).toString().trim();
const ok = (c, t) => console.log((c ? 'OK  ' : 'ÉCHEC') + ' ' + t);
const K = 'bpe-simulator-succes-v1';
(async () => {
  db("delete from scores; delete from pseudos; delete from joueurs; delete from parties; delete from succes_joueurs;");
  const b = await chromium.launch();
  const appareil = () => open({ browser: b, url: 'http://bpe.test/repo/index.html', viewport: { width: 390, height: 844 }, supabase: mock(), wait: 1500, vierge: true });
  const errs = [];
  // A : nouveau joueur, des succès réclamés, des pièces de parties, un objet acheté et posé
  const A = await appareil();
  await A.p.getByRole('button', { name: 'Nouveau joueur' }).click();
  await A.p.getByLabel('Pseudo', { exact: true }).fill('Testeur'); await A.p.getByRole('button', { name: 'Valider' }).click(); await A.p.waitForTimeout(1500);
  await A.p.evaluate((K) => { localStorage.setItem(K, JSON.stringify({ ok: { golive: '2026-11-25', zen: '2026-11-25', denicheur: '2026-11-25' }, recl: { golive: 1, zen: 1 }, heros: { gabriel: { f: 1, o: 0 } }, cumul: { golive: 3, pieces: 90 }, deco: { achats: { plante: 1 }, pose: { classeur: 'plante' } } })); window.dispatchEvent(new Event('bpe-succes')); }, K);
  // une réclamation déclenche l'envoi au serveur
  await A.p.getByRole('button', { name: /^Succès/ }).click(); await A.p.waitForTimeout(400);
  await A.p.getByRole('button', { name: /Réclamer/ }).first().click(); await A.p.waitForTimeout(1500);
  const soldeA = await A.p.evaluate(() => document.querySelector('[aria-label="Succès"]').innerText.match(/(\d[\d\s ]*)\s*\n?\s*Fermer/)?.[1]?.replace(/\D/g, ''));
  const code = await A.p.evaluate(() => JSON.parse(localStorage.getItem('bpe-simulator-joueur')));
  const srv = db(`select succes from succes_joueurs where joueur_id = '${code}'`);
  ok(srv && srv.includes('denicheur') && srv.includes('plante'), 'A : succès, compteurs et objets envoyés au serveur');
  ok(soldeA && +soldeA > 0, `A : solde affiché ${soldeA} pièces`);
  errs.push(...A.errs);
  // B : nouvel appareil, « J'ai déjà joué », code de A
  const B = await appareil();
  await B.p.getByRole('button', { name: "J'ai déjà joué" }).click(); await B.p.waitForTimeout(300);
  await B.p.locator('input').first().fill(code); await B.p.getByRole('button', { name: /Valider|Utiliser|OK/ }).first().click(); await B.p.waitForTimeout(2500);
  const stB = await B.p.evaluate((K) => JSON.parse(localStorage.getItem(K) || 'null'), K);
  ok(stB && stB.ok && stB.ok.denicheur && stB.ok.zen, 'B : succès de A retrouvés');
  ok(stB && stB.recl && stB.recl.denicheur, 'B : réclamation faite sur A retrouvée');
  ok(stB && stB.cumul && stB.cumul.pieces === 90 && stB.cumul.golive === 3, 'B : compteurs et pièces de parties retrouvés');
  ok(stB && stB.deco && stB.deco.achats.plante && stB.deco.pose.classeur === 'plante', 'B : objet acheté et posé retrouvé');
  await B.p.getByRole('button', { name: /^Succès/ }).click(); await B.p.waitForTimeout(400);
  const soldeB = await B.p.evaluate(() => document.querySelector('[aria-label="Succès"]').innerText.match(/(\d[\d\s ]*)\s*\n?\s*Fermer/)?.[1]?.replace(/\D/g, ''));
  ok(soldeB === soldeA, `B : même solde que A (${soldeB} contre ${soldeA})`);
  errs.push(...B.errs);
  console.log('erreurs :', errs.filter((e) => !/favicon/.test(e)));
  await b.close();
})();
