const { chromium } = require('playwright');
const { partie } = require('./sim');
const { S, toSrc, w2 } = require('./strats');
(async () => {
  const b = await chromium.launch();
  const [names, heroes, n] = [process.argv[2].split(','), process.argv[3].split(','), +process.argv[4]];
  for (const s of names) for (const hero of heroes) for (let i = 0; i < n; i++) {
    const { res, errs, viol } = await partie(b, hero, toSrc(S[s]), 150000);
    if (!res || res.bloque) { console.log(JSON.stringify({ s, hero, bloque: res, errs })); continue; }
    console.log(JSON.stringify({ s, hero, score: w2(res), total: +res.total.toFixed(1), q: res.qualite, cout: res.cout, bonus: res.bonusGo, burn: res.nBurnout, gaps: res.accepted + res.refused, pieges: res.nPieges, viol: viol.length, errs: errs.length }));
  }
  await b.close();
})();
