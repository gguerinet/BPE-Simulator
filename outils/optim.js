// Recherche de stratégie dominante : configurations de jeu tirées au hasard, puis les meilleures rejouées.
// Usage : node optim.js tirage <configs> <parties par config> <graine>   |   node optim.js confirme <fichier json> <parties>
const { chromium } = require('playwright');
const { partie } = require('./sim');
const { w2 } = require('./strats');
const heroes = ['francois', 'gabriel', 'hugues', 'samuel'];
let graine = 1;
const rnd = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];
function tirer() {
  return { dort: 15 + Math.floor(rnd() * 56), maison: rnd() < 0.7, bwN: pick([0, 1, 1, 2, 3]), bwPu: pick([0, 20000, 50000]), go: pick([60, 70, 75, 80, 85, 90, 999]), gap: pick(['smart', 'A', 'C']), ticket: pick(['A', 'A', 'B']), atelier: pick(['A', 'A', 'B']), direction: pick(['A', 'B', 'B']) };
}
const src = (c) => `{ gap: ${c.gap === 'smart' ? '(g) => (window.__piege(g) ? "B" : "A")' : JSON.stringify(c.gap)}, ticket: '${c.ticket}', atelier: '${c.atelier}', direction: '${c.direction}', regression: 'OK', gonogo: (g) => (g.quality >= ${c.go} ? 'A' : 'B'), maison: ${c.maison}, dort: (g) => g.energy < ${c.dort}, reposWE: false, cafe: true, bw: (g) => g.boostCalls < ${c.bwN} && g.pu >= ${c.bwPu} }`;
(async () => {
  const b = await chromium.launch();
  const [mode, a1, a2, a3] = process.argv.slice(2);
  const confs = mode === 'tirage' ? ((graine = +a3 || 1), Array.from({ length: +a1 }, tirer)) : JSON.parse(require('fs').readFileSync(a1, 'utf8'));
  const n = mode === 'tirage' ? +a2 : +a2;
  for (const c of confs) {
    const sc = [];
    for (let i = 0; i < n; i++) {
      const { res } = await partie(b, heroes[i % 4], src(c), 150000);
      if (res && !res.bloque) sc.push(w2(res));
    }
    console.log(JSON.stringify({ c, sc, moy: Math.round(sc.reduce((x, y) => x + y, 0) / Math.max(1, sc.length)) }));
  }
  await b.close();
})();
