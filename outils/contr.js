const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const AXE = fs.readFileSync(__dirname + '/node_modules/axe-core/axe.min.js', 'utf8');
(async () => {
  const b = await chromium.launch();
  const { p } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: 390, height: 844 }, wait: 300, init: FC + ';window.__noDraw=false;' });
  const go = async (nom) => {
    await p.waitForTimeout(800); await p.addScriptTag({ content: AXE });
    await p.evaluate(() => {
      window.__axe = null;
      axe.run(document, { runOnly: ['color-contrast'] }).then((r) => {
        window.__axe = r.violations.flatMap((v) => v.nodes.map((n) => ({ txt: (document.querySelector(n.target[0]) || {}).innerText, msg: n.any[0] && n.any[0].data })));
      });
    });
    let r = null; for (let k = 0; k < 400 && !r; k++) r = await p.evaluate(() => { window.__adv(20); return window.__axe; });
    r.forEach((x) => console.log(nom, '|', (x.txt || '').replace(/\s+/g, ' ').slice(0, 50), '|', x.msg && `${x.msg.fgColor} sur ${x.msg.bgColor}, ratio ${x.msg.contrastRatio} (min ${x.msg.expectedContrastRatio})`));
  };
  await go('accueil');
  await p.evaluate(() => window.__start('gabriel')); for (let i = 0; i < 12; i++) await p.evaluate(() => window.__adv(250));
  await p.evaluate(() => window.__api.dn({ type: 'ticket', palier: 10 })); for (let i = 0; i < 40; i++) await p.evaluate(() => window.__adv(250)); await go('fiche');
  await p.evaluate(() => window.__api.ze('A')); for (let i = 0; i < 40; i++) await p.evaluate(() => window.__adv(250));
  await p.evaluate(() => window.__api.an()); for (let i = 0; i < 4; i++) await p.evaluate(() => window.__adv(250)); await go('régression');
  await p.evaluate(() => window.__api.De('OK')); for (let i = 0; i < 20; i++) await p.evaluate(() => window.__adv(250));
  await p.keyboard.press('p'); for (let i = 0; i < 4; i++) await p.evaluate(() => window.__adv(250)); await go('pause');
  await b.close();
})();
