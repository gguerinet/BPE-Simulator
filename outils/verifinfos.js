// Bouton « i » des fenêtres : présent, clignotant la première fois, explication lisible dans la fenêtre, « Compris » pour revenir,
// le jeu ne bouge pas pendant la lecture, et le bouton ne clignote plus ensuite.
const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const adv = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(250); }, n);
const dn = (type, palier = 10) => async (p) => { await p.evaluate(([t, pa]) => { const g = window.__api.n.current; g.nextVisite = 1e9; if (t === 'gonogo') g.pu = g.puMax = 95000; window.__api.dn(t === 'gap' ? { type: t, idx: g.gapDeck.shift(), palier: pa } : { type: t, palier: pa }); }, [type, palier]); };
const scen = {
  gap: dn('gap'), ticket: dn('ticket'), atelier: dn('atelier'), direction: dn('direction', 60), gonogo: dn('gonogo', 95),
  'sans:regression': async (p) => { await p.evaluate(() => { window.__api.n.current.nextVisite = 1e9; window.__api.an(); }); },
  'sans:imprevu': async (p) => { await p.evaluate(() => { window.__api.n.current.nextVisite = 1e9; window.__api.imp(); }); },
  'sans:bonne': async (p) => { await p.evaluate(() => { window.__api.n.current.nextVisite = 1e9; window.__api.bnv(); }); },
  reunion: async (p) => { await p.evaluate(() => { const g = window.__api.n.current; g.nextVisite = 1e9; g.arbitrages.push({ idx: g.gapDeck[0], palier: 20 }); window.__api.Sa(false); }); },
  weekend: async (p) => { await p.evaluate(() => { const g = window.__api.n.current; g.days = 4; g.dayClick = 21; g.inNight = true; g.nextVisite = 1e9; window.__api.hn(); }); },
};
(async () => {
  const b = await chromium.launch();
  const only = process.argv[2];
  for (const [w, h] of [[390, 844], [320, 568], [844, 390], [1280, 800]]) for (const [nom, f] of Object.entries(scen)) {
    if (only && only !== nom) continue;
    const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: w, height: h }, ctx: { deviceScaleFactor: 1 }, wait: 300, init: FC + ';window.__noDraw=false;try{localStorage.removeItem("bpe-simulator-infos")}catch(e){}' });
    await p.evaluate(() => window.__start('gabriel')); await adv(p, 8);
    await f(p); await adv(p, 40); await p.waitForTimeout(500); await adv(p, 4);
    const bouton = p.locator('button[title="Comment ça marche ?"]');
    const r = { n: await bouton.count() };
    if (r.n === 1) {
      r.clignote = await bouton.evaluate((x) => x.classList.contains('jde-info-new'));
      await p.screenshot({ path: `travail/info_${w}_${nom}_a.png` });
      const avant = await p.evaluate(() => { const g = window.__api.n.current; return [g.clicks, g.energy, g.pu, g.journal.length].join('|'); });
      await bouton.click({ force: true }); await adv(p, 2);
      const pan = p.locator('[role=dialog]').filter({ has: p.locator('text=Compris') }).last();
      const bb = await pan.boundingBox();
      r.panneau = !!bb; r.dansEcran = bb && bb.y >= 0 && bb.y + bb.height <= h + 1 && bb.x >= 0 && bb.x + bb.width <= w + 1;
      await p.screenshot({ path: `travail/info_${w}_${nom}_b.png` });
      // Les touches A, B, C, D, P ne doivent rien déclencher pendant la lecture
      for (const k of ['a', 'b', 'c', 'd', 'p', 'Space']) await p.keyboard.press(k);
      await adv(p, 20);
      r.fige = (await p.evaluate(() => { const g = window.__api.n.current; return [g.clicks, g.energy, g.pu, g.journal.length].join('|'); })) === avant && !(await p.evaluate(() => window.__api.n.current.paused && document.querySelector('[aria-label="Pause"]')));
      await p.keyboard.press('Escape'); await adv(p, 2);
      r.ferme = (await p.locator('text=Compris').count()) === 0;
      r.fenetreToujours = (await bouton.count()) === 1;
      r.plusClignote = r.fenetreToujours && !(await bouton.evaluate((x) => x.classList.contains('jde-info-new')));
    }
    console.log(w, nom.padEnd(10), JSON.stringify(r), errs.length ? errs.slice(0, 2) : '');
    await ctx.close();
  }
  await b.close();
})();
