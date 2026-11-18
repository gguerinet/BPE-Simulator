const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const KEY = 'bpe-simulator-partie-v18';
const adv = (p, n = 10) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(500); }, n);
const snap = (p) => p.evaluate(() => { const g = window.__api.n.current; return { pu: g.pu, q: g.quality, e: +g.energy.toFixed(2), days: g.days, dc: g.dayClick, burn: g.d.burnout, nB: g.nBurnout, deck: g.gapDeck.length, queue: g.queue.map((x) => x.type + (x.idx ?? '')).join(','), busy: g.busy, golive: g.golive, gonogo: g.gonogo }; });
async function scen(b, nom, prep, apres = 6) {
  const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', wait: 300, init: FC });
  await p.evaluate(() => window.__start('gabriel'));
  await adv(p, 6);
  // Un peu de jeu pour avoir un état non trivial
  await p.evaluate(() => { const A = window.__api, g = A.n.current; g.pu = 30000; g.puMax = 30000; g.nextMilestone = 31; g.days = 20; g.dayClick = 5; g.energy = 60; g.dirty = true; });
  await adv(p, 4);
  await prep(p);
  const avant = await snap(p);
  const k0 = await p.evaluate((k) => !!localStorage.getItem(k), KEY);
  await p.reload();
  const k1 = await p.evaluate((k) => !!localStorage.getItem(k), KEY);
  await adv(p, 2);
  const save = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  if (!save) { console.log(JSON.stringify({ nom, avant, apres: 'AUCUNE SAUVEGARDE', k0, k1, errs })); await ctx.close(); return; }
  await p.evaluate((s) => window.__start(s.heroId, s), save);
  await adv(p, apres);
  console.log(JSON.stringify({ nom, avant, apres: await snap(p), errs }));
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  await scen(b, 'regression en attente', async (p) => { await p.evaluate(() => window.__api.an()); await adv(p, 3); });
  await scen(b, 'fiche besoin ouverte', async (p) => { await p.evaluate(() => { const g = window.__api.n.current; window.__api.dn({ type: 'gap', idx: g.gapDeck.shift(), palier: 30 }); }); await adv(p, 8); });
  await scen(b, 'nuit en cours', async (p) => { await p.evaluate(() => { const A = window.__api, g = A.n.current; g.inNight = true; g.dayClick = 21; A.Ue(); }); await adv(p, 1); });
  await scen(b, 'café en cours', async (p) => { await p.evaluate(() => { const A = window.__api, g = A.n.current; g.coffeeReadyDay = 0; A.Xe(); }); await adv(p, 1); });
  await scen(b, 'arrêt maladie', async (p) => { await p.evaluate(() => { const A = window.__api, g = A.n.current; g.energy = 0.3; g.lastClick = -1e9; A.la(100, 100); }); await adv(p, 2); });
  await scen(b, 'réunion ouverte', async (p) => { await p.evaluate(() => { const A = window.__api, g = A.n.current; g.arbitrages.push({ idx: g.gapDeck.shift(), palier: 20 }, { idx: g.gapDeck.shift(), palier: 21 }); A.Sa(false); }); await adv(p, 3); });
  await scen(b, 'week-end maison', async (p) => { await p.evaluate(() => { const A = window.__api, g = A.n.current; g.days = 19; g.dayClick = 22; g.inNight = true; A.hn(); }); await adv(p, 3); await p.evaluate(() => window.__api.Oe(true)); await adv(p, 1); });
  await scen(b, 'go-live (confettis)', async (p) => { await p.evaluate(() => { const A = window.__api, g = A.n.current; g.gonogo = 'go'; g.pu = 1e5; g.puMax = 1e5; g.nextMilestone = 100; A.ln(); }); await adv(p, 2); }, 14);
  await b.close();
})();
