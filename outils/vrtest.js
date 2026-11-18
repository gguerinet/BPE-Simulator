const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const get = (src) => { const a = src.indexOf('vr = ['); const e = src.indexOf('di = (t) =>', a); return eval(src.slice(a + 5, e).trim().replace(/,\s*$/, '')); };
const cur = get(fs.readFileSync(__dirname + '/../index.html', 'utf8'));
const norm = (s) => s.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
const ancien = (c) => get(require('child_process').execSync('git show ' + c + ':index.html', { cwd: __dirname + '/..', maxBuffer: 64e6 }).toString()),
  listes = { 38: ancien('53edf30'), 31: ancien('ea0607c'), 30: ancien('8303dfa'), 27: cur };
const sh = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Correspondance attendue (titre, ou service + réplique pour le besoin renommé)
const attendu = (o) => { let k = cur.findIndex((x) => norm(x[1]) === norm(o[1])); if (k < 0) k = cur.findIndex((x) => x[0] === o[0] && norm(x[2]) === norm(o[2])); return k; };
function fabrique(L) {
  const r = sh(L.map((x, i) => i).filter((i) => L[i][3] === 'reel')), p = sh(L.map((x, i) => i).filter((i) => L[i][3] === 'piege'));
  const deck = Array.from({ length: r.length + p.length }, () => ((Math.random() < 0.2 && p.length) || !r.length ? p.shift() : r.shift()));
  const k = Math.floor(Math.random() * (L.length - 1)), vus = deck.splice(0, k);
  const arb = vus.splice(0, Math.min(vus.length, Math.floor(Math.random() * 3))).map((idx) => ({ idx, palier: 20 }));
  const file = vus.length && Math.random() < 0.5 ? [{ type: 'gap', idx: vus.pop(), palier: 30 }] : [];
  const journal = vus.map((idx) => ({ palier: 10, service: L[idx][0], titre: L[idx][1], choix: 'accepte', piege: L[idx][3] === 'piege' }));
  return { deck, arb, file, journal };
}
(async () => {
  const b = await chromium.launch();
  const { p } = await open({ browser: b, url: 'http://bpe.test/game.html', wait: 300, init: FC });
  const bilan = {};
  for (const [n, L] of Object.entries(listes)) for (let t = 0; t < 25; t++) {
    const f = fabrique(L);
    const save = { heroId: 'gabriel', savedAt: 1, pu: 30000, puMax: 30000, days: 20, dayClick: 3, energy: 70, quality: 55, d: { imprevus: 0, burnout: 0, gaps: 0, ateliers: 0, gonogo: 0 }, gapDeck: f.deck, arbitrages: f.arb, queue: f.file, journal: f.journal, nextMilestone: 31, phaseVue: 2 };
    if (n === '27' && t % 2) save.vrV = 2;
    await p.evaluate((s) => { window.__start(s.heroId, s); }, save);
    await p.waitForTimeout(60);
    const g = await p.evaluate(() => { window.__adv(10); const g = window.__api.n.current; return { deck: g.gapDeck, arb: g.arbitrages.map((x) => x.idx), file: g.queue.filter((x) => x.type === 'gap').map((x) => x.idx), vrV: g.vrV }; });
    const exp = (ids) => ids.map((i) => attendu(L[i])).filter((x) => x >= 0);
    const ok = JSON.stringify(g.deck) === JSON.stringify(exp(f.deck)) && JSON.stringify(g.arb) === JSON.stringify(exp(f.arb.map((x) => x.idx))) && JSON.stringify(g.file) === JSON.stringify(exp(f.file.map((x) => x.idx))) && g.vrV === 2;
    bilan[n] = bilan[n] || { ok: 0, ko: 0 }; bilan[n][ok ? 'ok' : 'ko']++;
    if (!ok && bilan[n].ko <= 2) console.log('échec', n, 'vus', f.journal.length, JSON.stringify({ obtenu: g.deck.slice(0, 8), attendu: exp(f.deck).slice(0, 8) }));
  }
  console.log(JSON.stringify(bilan));
  await b.close();
})();
