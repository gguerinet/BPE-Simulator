// Code joueur : réservation du pseudo, alerte au lancement si le pseudo est à un autre joueur, transfert du code
// vers un autre appareil, et mise à jour du pseudo sur tous les appareils quand il change. Base locale : sql/base-locale.sh
const { chromium } = require('playwright');
const { open } = require('./harness');
const mock = require('./mocksb');
const { execFileSync } = require('child_process');
const db = (q) => execFileSync('su', ['postgres', '-c', 'psql -d bpe -qAt'], { input: q }).toString().trim();
const ok = (c, t) => console.log((c ? 'OK  ' : 'ÉCHEC') + ' ' + t);
(async () => {
  db("delete from scores; delete from pseudos; delete from joueurs; delete from parties;");
  const b = await chromium.launch();
  const appareil = async (init) => {
    const r = await open({ browser: b, url: 'http://bpe.test/repo/index.html', viewport: { width: 390, height: 844 }, supabase: mock(), wait: 1500, vierge: true, init: init || '' });
    return r;
  };
  const choisir = async (p, nom) => { const nv = p.getByRole('button', { name: 'Nouveau joueur' }); if (await nv.count()) { await nv.click(); await p.waitForTimeout(200); } await p.getByLabel('Pseudo', { exact: true }).fill(nom); await p.getByRole('button', { name: 'Valider' }).click(); await p.waitForTimeout(800); };
  const code = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('bpe-simulator-joueur')));
  const pseudo = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('bpe-simulator-pseudo') || '""'));
  const param = async (p) => { await p.getByRole('button', { name: 'Paramètres' }).first().click(); await p.waitForTimeout(300); };

  // A : premier appareil, choisit Grogu
  const A = await appareil(); await choisir(A.p, 'Grogu');
  const codeA = await code(A.p);
  ok(db("select pseudo from joueurs where joueur_id = '" + codeA + "'") === 'Grogu', 'A réserve « Grogu » et le serveur le note comme pseudo actuel du code A');

  // B : autre appareil, tente Grogu → refusé, puis saisit le code de A dans les Paramètres
  const B = await appareil(); await choisir(B.p, 'Grogu');
  ok(/déjà pris/.test(await B.p.innerText('body')), 'B ne peut pas prendre « Grogu » (déjà pris)');
  await choisir(B.p, 'Temporaire');
  await param(B.p);
  await B.p.getByLabel("Code d'un autre appareil").fill(codeA);
  await B.p.getByRole('button', { name: 'Utiliser' }).click(); await B.p.waitForTimeout(800);
  ok(/Code reconnu/.test(await B.p.innerText('body')), 'B saisit le code de A : « Code reconnu »');
  ok((await code(B.p)) === codeA && (await pseudo(B.p)) === 'Grogu', 'B a maintenant le code de A et le pseudo « Grogu »');
  await B.p.keyboard.press('Escape');

  // A change de pseudo → B le récupère à son prochain lancement
  await A.p.reload(); await A.p.waitForTimeout(1200);
  await A.p.locator('[title*="pseudo" i], button:has-text("Grogu")').first().click().catch(() => {});
  await A.p.waitForTimeout(400);
  if (await A.p.getByLabel('Pseudo', { exact: true }).count()) await choisir(A.p, 'Baby Yoda');
  ok(db("select pseudo from joueurs where joueur_id = '" + codeA + "'") === 'Baby Yoda', 'A passe à « Baby Yoda » : le serveur met à jour le pseudo du code');
  await B.p.reload(); await B.p.waitForTimeout(1500);
  ok((await pseudo(B.p)) === 'Baby Yoda' && /mis à jour depuis ton code joueur : Baby Yoda/.test(await B.p.innerText('body')), 'B relancé : pseudo mis à jour en « Baby Yoda », avec un message');

  // C : appareil qui avait « Grogu » en local sans en être propriétaire → alerte dès le lancement
  const C = await appareil(`try{localStorage.setItem('bpe-simulator-pseudo', JSON.stringify('Grogu'));localStorage.setItem('bpe-simulator-regles-vues','true')}catch(e){}`);
  await C.p.waitForTimeout(800);
  ok(/appartient déjà à un autre joueur/.test(await C.p.innerText('body')), 'C (Grogu en local, autre code) : alerte au lancement, avant de jouer');

  // Code invalide / inconnu
  await choisir(C.p, 'Mando'); await param(C.p);
  await C.p.getByLabel("Code d'un autre appareil").fill('pas-un-code');
  await C.p.getByRole('button', { name: 'Utiliser' }).click(); await C.p.waitForTimeout(300);
  ok(/pas le bon format/.test(await C.p.innerText('body')), 'Code mal formé refusé');
  await C.p.getByLabel("Code d'un autre appareil").fill('11111111-1111-4111-8111-111111111111');
  await C.p.getByRole('button', { name: 'Utiliser' }).click(); await C.p.waitForTimeout(600);
  ok(/Code inconnu/.test(await C.p.innerText('body')) && (await pseudo(C.p)) === 'Mando', 'Code inconnu refusé, pseudo inchangé');
  // D : nouvel appareil, « J'ai déjà joué » puis code de A → récupère le pseudo actuel sans passer par la fenêtre du pseudo
  // A a coché « ne plus proposer » le tutoriel et vu la bulle de nuit : au relancement, ces préférences partent avec ses succès
  await A.p.evaluate(() => { localStorage.setItem('bpe-simulator-tuto-off', 'true'); localStorage.setItem('bpe-simulator-astuces', '["nuit"]'); localStorage.setItem('bpe-simulator-infos', '["gap","ticket"]'); });
  await A.p.reload(); await A.p.waitForTimeout(2500);
  ok(/"tuto": ?1/.test(db("select succes->'prefs' from succes_joueurs where joueur_id = '" + codeA + "'")), 'A : préférences d\'aide enregistrées avec son code (' + db("select succes->'prefs' from succes_joueurs where joueur_id = '" + codeA + "'") + ')');
  const D = await appareil();
  ok((await D.p.getByRole('button', { name: 'Nouveau joueur' }).count()) === 1 && (await D.p.getByRole('button', { name: "J'ai déjà joué" }).count()) === 1, 'D (nouvel appareil) : choix « Nouveau joueur » / « J\'ai déjà joué »');
  await D.p.getByRole('button', { name: "J'ai déjà joué" }).click();
  await D.p.getByLabel("Code d'un autre appareil").fill(codeA);
  await D.p.getByRole('button', { name: 'Utiliser' }).click(); await D.p.waitForTimeout(800);
  ok((await pseudo(D.p)) === 'Baby Yoda' && (await code(D.p)) === codeA && (await D.p.locator('[role=dialog]').count()) === 0, 'D saisit le code : pseudo « Baby Yoda », code de A, plus aucune fenêtre');
  // D récupère les préférences de A : pas de tutoriel proposé, bulle de nuit et explications déjà vues
  await D.p.waitForTimeout(1500);
  const pref = await D.p.evaluate(() => ({ tuto: JSON.parse(localStorage.getItem('bpe-simulator-tuto-off') || 'false'), astuces: JSON.parse(localStorage.getItem('bpe-simulator-astuces') || '[]'), infos: JSON.parse(localStorage.getItem('bpe-simulator-infos') || '[]') }));
  ok(pref.tuto === true && pref.astuces.includes('nuit') && pref.infos.includes('gap'), 'D : retrouve « ne plus proposer » et les aides déjà vues de A (' + JSON.stringify(pref) + ')');
  await D.p.getByRole('button', { name: /Commencer le projet/ }).click(); await D.p.waitForTimeout(1500);
  ok((await D.p.getByText('Un petit tutoriel ?').count()) === 0, 'D : la partie démarre sans proposer le tutoriel');
  // E : nouvel appareil, « Nouveau joueur » → fenêtre du pseudo seule, nouveau code attribué
  const E = await appareil();
  await E.p.getByRole('button', { name: 'Nouveau joueur' }).click(); await E.p.waitForTimeout(300);
  ok((await E.p.getByLabel('Pseudo', { exact: true }).count()) === 1 && !/code joueur/i.test(await E.p.locator('[aria-label="Ton pseudo"]').innerText()), 'E « Nouveau joueur » : fenêtre du pseudo seule, sans mention du code');
  await choisir(E.p, 'Din');
  ok((await code(E.p)) !== codeA && db("select pseudo from joueurs where joueur_id = '" + (await code(E.p)) + "'") === 'Din', 'E reçoit son propre code joueur, rattaché à « Din »');
  // G se connecte avec le code de E (qui n'a jamais refusé le tutoriel) → le tutoriel est proposé
  const codeF = await code(E.p); await E.p.reload(); await E.p.waitForTimeout(2000);
  const G = await appareil();
  await G.p.getByRole('button', { name: "J'ai déjà joué" }).click();
  await G.p.getByLabel("Code d'un autre appareil").fill(codeF);
  await G.p.getByRole('button', { name: 'Utiliser' }).click(); await G.p.waitForTimeout(2000);
  await G.p.getByRole('button', { name: /Commencer le projet/ }).click(); await G.p.waitForTimeout(1500);
  ok((await G.p.getByText('Un petit tutoriel ?').count()) === 1, 'G (code de E, qui n\'a jamais refusé le tutoriel) : le tutoriel est bien proposé');
  console.log('erreurs :', [...A.errs, ...B.errs, ...C.errs, ...D.errs, ...E.errs]);
  await b.close();
})();
