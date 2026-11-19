// Première visite d'un nouveau joueur (navigateur vierge, téléphone) : chaque écran jusqu'aux premières visites
const { chromium, devices } = require('playwright');
const { open } = require('./harness');
(async () => {
  const b = await chromium.launch();
  const { p, errs } = await open({ browser: b, url: 'http://bpe.test/repo/index.html', viewport: { width: 390, height: 844 }, ctx: { deviceScaleFactor: 1, hasTouch: true, isMobile: true }, wait: 1500, vierge: true });
  let n = 0;
  const shot = async (nom) => { n++; await p.waitForTimeout(700); await p.screenshot({ path: `travail/onb/${String(n).padStart(2, '0')}_${nom}.png` }); const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 260)); console.log(n, nom, '|', t); };
  const clic = async (re) => { const bt = p.getByRole('button', { name: re }).first(); await bt.click(); };
  await shot('arrivee');
  await clic(/Commencer/); await shot('apres_commencer');
  const input = p.locator('input').first();
  if (await input.count()) { await input.fill('Nouveau'); await clic(/Valider/); await shot('apres_pseudo'); }
  await clic(/Commencer le projet|Nouvelle partie/); await p.waitForTimeout(1500); await shot('debut_partie');
  await clic(/Suivre le tutoriel/); 
  for (let i = 0; i < 20; i++) { await shot('tuto_' + i); const s = p.getByRole('button', { name: /^Suivant|^Commencer$/ }).first(); if (!(await s.count())) break; const txt = await s.innerText(); await s.click(); if (/Commencer/.test(txt)) break; }
  await shot('apres_tuto');
  // Premières secondes de jeu : on touche le bureau
  const sc = p.locator('canvas[data-tuto=scene]');
  for (let i = 0; i < 60; i++) { await sc.tap({ force: true }).catch(() => {}); await p.waitForTimeout(220); }
  await shot('apres_60_clics');
  console.log('erreurs', errs);
  await b.close();
})();
