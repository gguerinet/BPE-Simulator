// Bot injecté dans la page : joue selon une stratégie P
window.__bot = (P) => {
  const ch = (k, d) => (typeof P[k] === 'function' ? P[k](d) : P[k]);
  window.__log = [];
  setInterval(() => {
    const A = window.__api; if (!A || !A.n.current) return;
    const g = A.n.current;
    window.__viol = window.__viol || [];
    const mx = Math.max(20, 100 - 20 * (g.weBureau || 0));
    const v = (k) => window.__viol.length < 20 && window.__viol.push(k + ' j' + Math.floor(g.days) + ' e' + g.energy.toFixed(2) + ' mx' + mx + ' q' + g.quality + ' pu' + g.pu + ' busy' + g.busy);
    if (g.energy > mx + 0.01) v('energie>max'); if (g.energy < 0) v('energie<0'); if (g.quality < 0 || g.quality > 100) v('qualite');
    if (g.pu < 0 || g.pu > 1e5) v('pu');
    if (g.busy) { window.__bz = window.__bz || { k: g.busy, t: performance.now() }; if (window.__bz.k !== g.busy) window.__bz = { k: g.busy, t: performance.now() }; else if (performance.now() - window.__bz.t > 60000 && !window.__bzv) { window.__bzv = 1; v('busy>60s ' + g.busy); } } else window.__bz = null;
    if (g.golive) return;
    const m = A.msg();
    if (m && m.ok) { const id = m.choix && m.choix.length > 1 ? ch('regression', g) : 'OK'; A.De(id); return; }
    if (g.dilemma) { A.ze(ch(g.dilemma.kind, g)); return; }
    if (g.busy === 'reunion') { if (A.reunion()) A.Pe(); return; }
    if (g.busy === 'weekend') { if (A.we()) { const m = !!ch('maison', g); const kk = Math.floor(g.days / 5); if (window.__weK !== kk) { window.__weK = kk; window.__weM = (window.__weM || 0) + (m ? 1 : 0); window.__weB = (window.__weB || 0) + (m ? 0 : 1); } A.Oe(m); } return; }
    if (g.busy === 'sick') { if (A.sick()) A.un(); return; }
    if (g.busy) return;
    if (P.cafe && g.energy < 92) A.Xe();
    if (P.bw && ch('bw', g)) A.Ge();
    const nuit = g.inNight, we = !g.inNight && [0, 6].includes(new Date(2026, 7, 31 + Math.floor(g.days + g.dayClick / 28 + g.d.burnout)).getDay());
    if (nuit && ch('dort', g)) { A.Ue(); if (g.busy) return; }
    if (we && ch('reposWE', g)) { A.Ue(); if (g.busy) return; }
    A.la(100, 100);
  }, 60);
};
