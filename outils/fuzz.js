const { chromium } = require('playwright');
const { partie } = require('./sim');
const heroes = ['francois', 'gabriel', 'hugues', 'samuel'];
const P = `{ gap: () => 'ABC'[Math.floor(Math.random()*3)], ticket: () => Math.random()<.5?'A':'B', atelier: () => Math.random()<.5?'A':'B', direction: () => Math.random()<.5?'A':'B', gonogo: () => Math.random()<.5?'A':'B', regression: () => Math.random()<.5?'A':'B', maison: () => Math.random()<.5, dort: (g) => Math.random()<0.02 + (g.energy<15?0.05:0), reposWE: () => Math.random()<0.01, cafe: true, bw: () => Math.random()<0.002 }`;
(async () => {
  const b = await chromium.launch();
  const n = +process.argv[2], off = +process.argv[3];
  for (let i = 0; i < n; i++) {
    const hero = heroes[(i + off) % 4];
    const { res, errs, real, viol } = await partie(b, hero, P, 120000);
    console.log(JSON.stringify(res && !res.bloque ? { hero, total: +res.total.toFixed(1), q: res.qualite, cout: res.cout, burn: res.nBurnout, gonogo: res.gonogoChoix, real, errs, viol } : { hero, res, real, errs, viol }));
  }
  await b.close();
})();
