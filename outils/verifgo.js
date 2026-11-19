const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const adv = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(250); }, n);
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: w, height: h }, ctx: { deviceScaleFactor: 1 }, wait: 300, init: FC + ';window.__noDraw=false;' });
    await p.evaluate(() => window.__start('hugues')); await adv(p, 10);
    await p.evaluate(() => { const g = window.__api.n.current; g.quality = 72; g.pu = g.puMax = 95000; g.nextMilestone = 96; g.phaseVue = 5; window.__api.dn({ type: 'gonogo', palier: 95 }); });
    await adv(p, 40); await p.waitForTimeout(800);
    await p.screenshot({ path: `travail/go_${w}.png` });
    console.log(w, 'texte GO :', JSON.stringify(await p.evaluate(() => (document.body.innerText.match(/[^\n]*chance[^\n]*/gi) || []).slice(0, 2))), errs);
    await ctx.close();
  }
  await b.close();
})();
