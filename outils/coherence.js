// Vérifie que les chiffres du rapport de fin se recoupent, sur des parties aux choix aléatoires
const { chromium } = require('playwright');
const { partie } = require('./sim');
const heroes = ['francois', 'gabriel', 'hugues', 'samuel'];
const P = `{ gap: () => 'ABC'[Math.floor(Math.random()*3)], ticket: () => Math.random()<.5?'A':'B', atelier: () => Math.random()<.5?'A':'B', direction: () => Math.random()<.3?'A':'B', gonogo: () => Math.random()<.5?'A':'B', regression: () => Math.random()<.5?'A':'B', maison: () => Math.random()<.6, dort: (g) => g.energy < 30 + Math.random()*40, reposWE: () => Math.random()<0.05, cafe: true, bw: (g) => g.boostCalls < 2 && Math.random()<0.002 }`;
(async () => {
  const b = await chromium.launch();
  const n = +process.argv[2], off = +process.argv[3];
  for (let i = 0; i < n; i++) {
    const hero = heroes[(i + off) % 4];
    const { res: t, errs } = await partie(b, hero, P, 150000);
    if (!t || t.bloque) { console.log(JSON.stringify({ hero, bloque: t })); continue; }
    const mv = t.mouvAv || {}, an = [];
    const gains = (t.gainJ || 0) + (t.gainN || 0) + (t.gainW || 0), pertes = Object.values(mv).reduce((a, b) => a + b, 0);
    if (Math.abs(gains - pertes - 1e5) > 2) an.push(`avancement : gains ${gains} − pertes ${pertes} ≠ 100000`);
    const dq = Object.values(t.dq || {}).reduce((a, b) => a + b, 0);
    if (Math.abs(50 + dq - t.qualite) > 0.01) an.push(`qualité : 50 + ${dq} ≠ ${t.qualite}`);
    if ((t.piegesEvites || 0) > (t.nPieges || 0)) an.push('pièges déjoués > pièges');
    const j = t.journal || [], acc = j.filter((x) => /ccepte/.test(x.choix)).length, ref = j.filter((x) => /efuse/.test(x.choix)).length;
    const titres = new Set(j.map((x) => x.titre));
    if (acc + ref + j.filter((x) => x.choix === 'arbitre').length < j.length) an.push('journal : choix inconnu');
    const fin = new Map(); j.forEach((x) => fin.set(x.titre, x.choix));
    const fa = [...fin.values()], nA = fa.filter((c) => /ccepte/.test(c)).length, nR = fa.filter((c) => /efuse/.test(c)).length, nP = fa.filter((c) => c === 'arbitre').length;
    if (nA !== t.accepted || nR !== t.refused) an.push(`compteurs besoins ${t.accepted}/${t.refused} ≠ journal ${nA}/${nR}`);
    if (nP) an.push(`${nP} besoin(s) jamais arbitré(s)`);
    if (t.nTicketsTMA > t.nTickets) an.push('TMA > tickets');
    const last = t.curve[t.curve.length - 1];
    if (Math.abs(last[1] - t.total) > 0.11) an.push(`courbe : dernier jour ${last[1]} ≠ total ${t.total}`);
    if (t.burnout !== 4 * t.nBurnout) an.push(`arrêts : ${t.burnout} j pour ${t.nBurnout} arrêts`);
    console.log(JSON.stringify({ hero, total: +t.total.toFixed(1), q: t.qualite, an, errs: errs.slice(0, 2) }));
  }
  await b.close();
})();
