// Parties aux choix aléatoires, avec rechargements de page au hasard, touches et tailles d'écran au hasard.
// À chaque rechargement, on compare l'état avant et après reprise : rien ne doit être perdu ni compté deux fois.
// Usage : node chaos.js <parties> <décalage>
const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const BOT = fs.readFileSync(__dirname + '/bot.js', 'utf8');
const KEY = 'bpe-simulator-partie-v18';
const heroes = ['francois', 'gabriel', 'hugues', 'samuel'];
const P = `{ gap: () => 'ABC'[Math.floor(Math.random()*3)], ticket: () => Math.random()<.5?'A':'B', atelier: () => Math.random()<.5?'A':'B', direction: () => Math.random()<.3?'A':'B', gonogo: () => Math.random()<.5?'A':'B', regression: 'OK', maison: () => Math.random()<.6, dort: (g) => g.energy < 30 + Math.random()*40, reposWE: () => Math.random()<0.05, cafe: true, bw: (g) => g.boostCalls < 2 && Math.random()<0.002 }`;
const etat = (p) => p.evaluate(() => { const g = window.__api && window.__api.n.current; if (!g) return null; return { clicks: g.clicks, journal: g.journal.length, deck: g.gapDeck.length, burn: g.d.burnout, nB: g.nBurnout, jours: g.days + g.dayClick / 28, pu: g.pu, q: g.quality, tickets: g.nTickets, bw: g.boostCalls, cout: g.bwSpent, golive: g.golive }; });
(async () => {
  const b = await chromium.launch();
  const n = +process.argv[2], off = +process.argv[3];
  const vp = [[320, 568], [390, 844], [844, 390], [1280, 800]];
  for (let i = 0; i < n; i++) {
    const hero = heroes[(i + off) % 4], an = [];
    let { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', wait: 300, init: FC });
    await p.addScriptTag({ content: BOT });
    await p.evaluate((h) => { window.__res = null; window.__end = (f) => (window.__res = f); window.__start(h); }, hero);
    for (let k = 0; k < 4; k++) await p.evaluate(() => window.__adv(500));
    await p.evaluate((src) => window.__bot(eval('(' + src + ')')), P);
    let fin = null, recharges = 0, t0 = Date.now();
    while (!fin && Date.now() - t0 < 150000) {
      const pas = 5 + Math.floor(Math.random() * 40);
      for (let k = 0; k < pas && !fin; k++) fin = await p.evaluate(() => { window.__adv(1000); return window.__res; });
      if (fin) break;
      const r = Math.random();
      if (r < 0.15) await p.setViewportSize({ width: vp[Math.floor(Math.random() * 4)][0], height: vp[Math.floor(Math.random() * 4)][1] });
      else if (r < 0.3) await p.keyboard.press(['p', 'p', 'c', 'd', 'w', 'a', 'b', 'Enter', 'm'][Math.floor(Math.random() * 9)]);
      else if (r < 0.75) {
        // Rechargement : on laisse le jeu sauvegarder, puis on recharge et on reprend la partie
        const avant = await etat(p);
        if (!avant || avant.golive) continue;
        await p.reload(); recharges++;
        await p.evaluate(() => window.__adv(300));
        const save = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
        if (!save) { an.push('sauvegarde absente après rechargement'); break; }
        await p.addScriptTag({ content: BOT });
        await p.evaluate((s) => { window.__res = null; window.__end = (f) => (window.__res = f); window.__start(s.heroId, s); }, save);
        for (let k = 0; k < 3; k++) await p.evaluate(() => window.__adv(500));
        const apres = await etat(p);
        // Ce qui ne doit jamais bouger lors d'une reprise
        for (const k of ['clicks', 'journal', 'tickets', 'bw', 'cout', 'nB', 'burn']) if (apres[k] !== avant[k]) an.push(`${k} ${avant[k]} → ${apres[k]}`);
        if (apres.deck > avant.deck) an.push(`pioche ${avant.deck} → ${apres.deck}`);
        if (apres.jours < avant.jours - 1e-9) an.push(`jours ${avant.jours} → ${apres.jours}`);
        await p.evaluate((src) => window.__bot(eval('(' + src + ')')), P);
      }
    }
    console.log(JSON.stringify({ hero, recharges, fini: !!fin, total: fin && +fin.total.toFixed(1), an: [...new Set(an)].slice(0, 6), errs: errs.filter((e) => !/ResizeObserver/.test(e)).slice(0, 3) }));
    await ctx.close();
  }
  await b.close();
})();
