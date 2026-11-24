// Usage: node sim.js '<json stratégie>' hero n  -> lignes JSON de résultats
const { open } = require('./harness');
const fs = require('fs');
async function partie(b, hero, P, maxReal = 400000) {
  const { p, errs, ctx } = await open({ browser: b, url: 'http://bpe.test/' + (process.env.GAME || 'game.html'), wait: 300, init: fs.readFileSync(__dirname + '/fakeclock.js', 'utf8') });
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/bot.js', 'utf8') });
  await p.evaluate((h) => { window.__res = null; window.__end = (f) => (window.__res = f); window.__start(h); }, hero);
  for (let i = 0; i < 4; i++) { await p.evaluate(() => window.__adv(500)); }
  await p.evaluate((src) => window.__bot(eval('(' + src + ')')), P);
  const t0 = Date.now(); let res = null, stuck = 0, last = -1;
  while (Date.now() - t0 < maxReal) {
    const st = await p.evaluate(() => { window.__adv(1000); const g = window.__api.n.current; return { r: window.__res, k: g.clicks + g.dayClick + g.days * 100 + (g.busy ? 1 : 0) }; });
    if (st.r) { res = st.r; break; }
    stuck = st.k === last ? stuck + 1 : 0; last = st.k;
    if (stuck > 300) { res = { bloque: await p.evaluate(() => { const g = window.__api.n.current; return { busy: g.busy, dil: !!g.dilemma, msg: !!window.__api.msg(), pu: g.pu, j: g.days, paused: g.paused, att: g.attenteOK, q: g.queue.map((x) => x.type) }; }) }; break; }
  }
  const viol = await p.evaluate(() => window.__viol || []);
  if (res && !res.bloque) Object.assign(res, await p.evaluate(() => { const g = window.__api.n.current; return { xCafe: g.coffeeCount, xWeM: window.__weM || 0, xWeB: window.__weB || 0 }; }));
  await ctx.close();
  return { res, viol, errs, real: (Date.now() - t0) / 1000 };
}
module.exports = { partie };
if (require.main === module) (async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const [P, hero, n] = [process.argv[2], process.argv[3] || 'gabriel', +(process.argv[4] || 1)];
  for (let i = 0; i < n; i++) {
    const { res, errs, real } = await partie(b, hero, P);
    const o = res && !res.bloque ? { hero, total: +res.total.toFixed(1), q: res.qualite, cout: res.cout, bonus: res.bonusGo, gonogo: res.gonogoChoix, burn: res.nBurnout, acc: res.accepted, ref: res.refused } : res;
    console.log(JSON.stringify({ ...o, real, errs: errs.slice(0, 3) }));
  }
  await b.close();
})();
