// Affiche le texte complet des règles (tous les volets ouverts) et signale toute valeur manquante
const { chromium } = require('playwright');
const { open } = require('./harness');
(async () => {
  const b = await chromium.launch();
  const { p, errs } = await open({ browser: b, url: 'http://bpe.test/repo/index.html', viewport: { width: 390, height: 844 }, wait: 1500, init: "try{localStorage.setItem('bpe-simulator-pseudo', JSON.stringify('Lecteur'))}catch(e){}" });
  // Les règles s'ouvrent depuis le bouton Paramètres de l'accueil
  await p.getByRole('button', { name: 'Paramètres' }).click();
  await p.getByRole('button', { name: /Règles détaillées/ }).click();
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  const t = await p.evaluate(() => document.querySelector('[role=dialog]').innerText);
  console.log(/undefined|NaN|\$\{/.test(t) ? 'PROBLÈME : valeur manquante' : 'aucune valeur manquante', '|', t.split(/\s+/).length, 'mots', errs);
  console.log(t);
  await b.close();
})();
