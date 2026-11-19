const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const AXE = fs.readFileSync(__dirname + '/node_modules/axe-core/axe.min.js', 'utf8');
const adv = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(250); }, n);
(async () => {
  const b = await chromium.launch();
  const { p } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: 390, height: 844 }, wait: 300, init: FC + ';window.__noDraw=false;' });
  const go = async (nom) => {
    await p.waitForTimeout(800); await p.addScriptTag({ content: AXE });
    await p.evaluate(() => { window.__axe = null; axe.run(document, { runOnly: ['color-contrast', 'scrollable-region-focusable'] }).then((r) => { window.__axe = r.violations.flatMap((v) => v.nodes.map((n) => { const el = document.querySelector(n.target[0]); return { id: v.id, html: el ? el.outerHTML.slice(0, 160) : n.target[0], d: n.any[0] && n.any[0].data }; })); }); });
    let r = null; for (let k = 0; k < 400 && !r; k++) r = await p.evaluate(() => { window.__adv(20); return window.__axe; });
    r.forEach((x) => console.log(nom, '|', x.id, '|', x.html, '|', x.d && x.d.fgColor ? `${x.d.fgColor} sur ${x.d.bgColor} ${x.d.contrastRatio}` : ''));
  };
  await p.evaluate(() => window.__start('gabriel')); await adv(p, 12);
  await p.evaluate(() => window.__api.dn({ type: 'ticket', palier: 10 })); await adv(p, 40); await go('fiche');
  await p.evaluate(() => window.__api.ze('A')); await adv(p, 40);
  await p.evaluate(() => { const g = window.__api.n.current; g.gonogo = 'nogo'; g.pu = g.puMax = 1e5; g.nextMilestone = 100; window.__api.ln(); }); await adv(p, 60); await p.waitForTimeout(3000); await go('rapport');
  await b.close();
})();
