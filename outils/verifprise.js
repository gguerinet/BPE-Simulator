// Vérifie l'invitation, les notes du Comex, le badge ×2/×4 et une bulle « Première fois » à plusieurs tailles
const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const adv = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(250); }, n);
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
    const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: w, height: h }, ctx: { deviceScaleFactor: 1 }, wait: 300, init: FC + ';window.__noDraw=false;try{localStorage.removeItem("bpe-simulator-astuces")}catch(e){}' });
    await p.evaluate(() => window.__start('samuel')); await adv(p, 8); await p.waitForTimeout(400);
    await p.screenshot({ path: `travail/prise_${w}_a_invitation.png` });
    await p.evaluate(() => { const g = window.__api.n.current; g.pu = g.puMax = 41500; g.nextMilestone = 42; g.phaseVue = 2; g.days = 33; g.dayClick = 19; g.quality = 72; g.nextVisite = 1e9; g.lastClick = -1e9; window.__api.la(100, 100); });
    await adv(p, 8); await p.waitForTimeout(600);
    await p.screenshot({ path: `travail/prise_${w}_b_nuit.png` });
    const t = await p.evaluate(() => ({ notes: (document.querySelector('[data-tuto=notes]') || {}).innerText, badge: [...document.querySelectorAll('[data-tuto=energie] span')].map((x) => x.innerText).join(' '), bulle: [...document.querySelectorAll('button')].some((x) => /1re fois/.test(x.innerText)) }));
    console.log(w, JSON.stringify(t), errs);
    await ctx.close();
  }
  await b.close();
})();
