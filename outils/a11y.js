// Accessibilité : axe-core sur l'accueil, le jeu, une fiche, une bannière d'événement et le rapport de fin
const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const AXE = fs.readFileSync(__dirname + '/node_modules/axe-core/axe.min.js', 'utf8');
const adv = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(250); }, n);
(async () => {
  const b = await chromium.launch();
  const res = {};
  const { p, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: 390, height: 844 }, wait: 300, init: FC + ';window.__noDraw=false;' });
  const audit = async (nom) => {
    await p.waitForTimeout(800);
    await p.addScriptTag({ content: AXE });
    // axe-core utilise des minuteries : on fait avancer l'horloge simulée pendant l'analyse
    await p.evaluate(() => { window.__axe = null; axe.run(document, { resultTypes: ['violations'] }).then((r) => (window.__axe = r.violations.map((v) => ({ id: v.id, impact: v.impact, aide: v.help, n: v.nodes.length, exemple: (v.nodes[0] && v.nodes[0].target.join(' ')) || '' })))); });
    let r = null;
    for (let k = 0; k < 400 && !r; k++) r = await p.evaluate(() => { window.__adv(20); return window.__axe; });
    res[nom] = r;
  };
  await audit('accueil');
  await p.evaluate(() => window.__start('gabriel')); await adv(p, 12); await audit('jeu');
  await p.evaluate(() => window.__api.dn({ type: 'ticket', palier: 10 })); await adv(p, 40); await audit('fiche ticket');
  await p.evaluate(() => window.__api.ze('A')); await adv(p, 40);
  await p.evaluate(() => window.__api.an()); await adv(p, 4); await audit('bannière régression');
  await p.evaluate(() => window.__api.De('OK')); await adv(p, 20);
  await p.keyboard.press('p'); await adv(p, 4); await audit('pause'); await p.keyboard.press('p'); await adv(p, 4);
  await p.evaluate(() => { const g = window.__api.n.current; g.gonogo = 'nogo'; g.pu = g.puMax = 1e5; g.nextMilestone = 100; window.__api.ln(); }); await adv(p, 60); await p.waitForTimeout(3000); await audit('rapport de fin');
  fs.writeFileSync(__dirname + '/travail/nuit/a11y.json', JSON.stringify(res, null, 1));
  for (const [k, v] of Object.entries(res)) console.log(k, '→', v.length ? v.map((x) => `${x.impact} ${x.id} ×${x.n}`).join(' | ') : 'aucune violation');
  console.log(errs);
  await b.close();
})();
