// Première visite d'un nouveau joueur (navigateur vierge, téléphone) : chaque écran jusqu'aux premières bulles d'aide
const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
(async () => {
  fs.mkdirSync(__dirname + '/travail/onb', { recursive: true });
  const b = await chromium.launch();
  const { p, errs } = await open({ browser: b, url: 'http://bpe.test/repo/index.html', viewport: { width: 390, height: 844 }, ctx: { deviceScaleFactor: 1, hasTouch: true, isMobile: true }, wait: 1500, vierge: true });
  let n = 0;
  const shot = async (nom) => { n++; await p.waitForTimeout(600); await p.screenshot({ path: `${__dirname}/travail/onb/${String(n).padStart(2, '0')}_${nom}.png` }); const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200)); console.log(n, nom, '|', t); };
  const clic = async (re) => p.getByRole('button', { name: re }).first().click();
  await shot('arrivee');
  const input = p.locator('input').first();
  if (await input.count()) { await input.fill('Nouveau'); await clic(/Valider/); await shot('apres_pseudo'); }
  await clic(/Commencer le projet|Nouvelle partie/); await p.waitForTimeout(1500); await shot('debut_partie');
  await clic(/Suivre le tutoriel/);
  for (let i = 0; i < 12; i++) { await shot('tuto_' + i); const s = p.getByRole('button', { name: /^Suivant|^Commencer$/ }).first(); if (!(await s.count())) break; const txt = await s.innerText(); await s.click(); if (/Commencer/.test(txt)) break; }
  await shot('apres_tuto');
  const sc = p.locator('canvas[data-tuto=scene]');
  const vues = new Set();
  for (let i = 0; i < 700; i++) {
    const f = await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find((x) => /1re fois/.test(x.innerText)); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
    if (f && !vues.has(f)) { vues.add(f); await shot('astuce_' + vues.size); }
    const fiche = p.getByRole('button', { name: /^A\b|Accepter|Traiter|Suivre|GO|OK|Super|Rentrer|Fermer|J'ai pris/ }).first();
    if (await p.evaluate(() => !!document.querySelector('[role=dialog]') || /Rentrer|J'ai pris|Super !|^OK$/m.test(document.body.innerText))) {
      const bt = p.locator('button').filter({ hasText: /Rentrer|J'ai pris|Super|^OK$|Accepter|Traiter nous|Accepter l'atelier|NO-GO/ }).first();
      if (await bt.count()) { await bt.click({ force: true }).catch(() => {}); await p.waitForTimeout(300); continue; }
    }
    await sc.tap({ force: true }).catch(() => {}); await p.waitForTimeout(210);
    if (vues.size >= 5) break;
  }
  console.log('bulles vues :', [...vues]);
  console.log('erreurs', errs);
  await b.close();
})();
