// Son : compte les notes de musique jouées en retard quand le fil principal est bloqué (source de crépitements). Prépare son_ref.html / son_new.html (window.__vt exposé, compteurs __notes/__tard).
const { chromium } = require('playwright'); const { open } = require('./harness');
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
 for (const f of ['son_ref.html', 'son_new.html']) {
  const { p } = await open({ browser: b, url: 'http://bpe.test/' + f, wait: 800 });
  await p.evaluate(() => window.__start('gabriel')); await p.waitForTimeout(800);
  await p.evaluate(() => window.__vt.demarrer());
  await p.waitForTimeout(1500);
  const r0 = await p.evaluate(() => [window.__notes || 0, window.__tard || 0]);
  // Simule un téléphone qui rame : le fil principal est bloqué 400 ms, 6 fois
  for (let k = 0; k < 6; k++) { await p.evaluate(() => { const t = performance.now(); while (performance.now() - t < 400); }); await p.waitForTimeout(300); }
  const r1 = await p.evaluate(() => [window.__notes || 0, window.__tard || 0]);
  console.log(f, 'notes jouées', r1[0] - r0[0], '| notes en retard (crépitements possibles)', r1[1] - r0[1]);
 }
 await b.close(); })();
