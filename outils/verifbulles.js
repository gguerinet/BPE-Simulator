// Chaque bulle « Première fois » doit être centrée devant la fenêtre qu'elle explique, avec un bouton OK ; le jeu attend le OK
const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const adv = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(250); }, n);
const scen = {
  weekend: async (p) => { await p.evaluate(() => { const g = window.__api.n.current; g.days = 4; g.dayClick = 21; g.inNight = true; g.nextVisite = 1e9; window.__api.hn(); }); },
  visiteur: async (p) => { await p.evaluate(() => window.__api.dn({ type: 'ticket', palier: 10 })); },
  nuit: async (p) => { await p.evaluate(() => { const g = window.__api.n.current; g.dayClick = 19; g.nextVisite = 1e9; g.lastClick = -1e9; window.__api.la(100, 100); }); },
  // Ces situations ne doivent plus afficher de bulle
  'sans:evenement': async (p) => { await p.evaluate(() => window.__api.an()); },
  'sans:reunion': async (p) => { await p.evaluate(() => { const g = window.__api.n.current; g.arbitrages.push({ idx: g.gapDeck[0], palier: 20 }); window.__api.Sa(false); }); },
  'sans:gonogo': async (p) => { await p.evaluate(() => { const g = window.__api.n.current; g.pu = g.puMax = 95000; window.__api.dn({ type: 'gonogo', palier: 95 }); }); },
};
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 844], [320, 568], [844, 390]]) for (const [nom, f] of Object.entries(scen)) {
    const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: w, height: h }, ctx: { deviceScaleFactor: 1 }, wait: 300, init: FC + ';window.__noDraw=false;try{localStorage.removeItem("bpe-simulator-astuces")}catch(e){}' });
    await p.evaluate(() => window.__start('gabriel')); await adv(p, 8);
    await f(p); await adv(p, 40); await p.waitForTimeout(700); await adv(p, 4);
    const m = await p.evaluate(() => {
      const t = document.querySelector('[aria-label="Première fois"]'); if (!t) return null;
      const r = t.getBoundingClientRect(), ok = [...t.querySelectorAll('button')].some((x) => x.innerText.trim() === 'OK');
      const c = document.querySelector('[data-astuce]') || document.querySelector('canvas[data-tuto=scene]'); const rc = c ? c.getBoundingClientRect() : null;
      const ecartX = rc ? Math.round(Math.abs((r.left + r.width / 2) - (rc.left + rc.width / 2))) : null;
      const ecartY = rc ? Math.round(Math.abs((r.top + r.height / 2) - Math.max(8 + r.height / 2, Math.min(innerHeight - 8 - r.height / 2, rc.top + rc.height / 2)))) : null;
      return { ecartX, ecartY, dansEcran: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, ok, enPause: window.__api.n.current.paused };
    });
    await p.screenshot({ path: `travail/bulle_${w}_${nom}.png` });
    // Après le OK, le jeu reprend
    await p.keyboard.press('Enter'); await adv(p, 2);
    m && (m.repris = await p.evaluate(() => !window.__api.n.current.paused && !document.querySelector('[aria-label="Première fois"]')));
    console.log(w, nom.padEnd(9), JSON.stringify(m), errs.length ? errs : '');
    await ctx.close();
  }
  await b.close();
})();
