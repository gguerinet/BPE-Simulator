// Stratégies types (chaînes évaluées dans la page)
const base = { ticket: 'A', atelier: 'A', direction: 'B', regression: 'A', cafe: true };
const S = {
  prudent:   { ...base, gap: 'A', gonogo: 'B', maison: true, dort: true, reposWE: true, bw: false },
  refuse:    { ...base, gap: 'B', gonogo: 'B', maison: true, dort: true, reposWE: true, bw: false },
  arbitre:   { ...base, gap: 'C', gonogo: 'B', maison: true, dort: true, reposWE: true, bw: false },
  forcat:    { ...base, gap: 'B', gonogo: 'B', maison: false, dort: '(g) => g.energy < 25', reposWE: false, bw: false },
  nuits:     { ...base, gap: 'B', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: false },
  nuitsBW1:  { ...base, gap: 'B', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  nuitsBW2:  { ...base, gap: 'B', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 2' },
  nuitsGO:   { ...base, gap: 'B', gonogo: '(g) => g.quality >= 75 ? "A" : "B"', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  tma:       { ...base, ticket: 'B', atelier: 'B', regression: 'B', gap: 'B', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  arbNuits:  { ...base, gap: 'C', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  accNuits:  { ...base, gap: 'A', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smart:     { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartGO:   { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: '(g) => g.quality >= 80 ? "A" : "B"', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartGO70: { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: '(g) => g.quality >= 70 ? "A" : "B"', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smart0BW:  { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: false },
  smart2BW:  { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 2' },
  smartD25:  { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 25', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartD60:  { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 60', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartBur:  { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: false, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartTMA:  { ...base, ticket: 'B', gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartAtB:  { ...base, atelier: 'B', gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartRegB: { ...base, regression: 'B', gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  smartDirA: { ...base, direction: 'A', gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  sainSmart: { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: true, reposWE: false, bw: '(g) => g.boostCalls < 1' },
  sainRef:   { ...base, gap: 'B', gonogo: 'B', maison: true, dort: true, reposWE: false, bw: '(g) => g.boostCalls < 1' },
  sainSmBW2: { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: true, dort: true, reposWE: false, bw: '(g) => g.boostCalls < 2' },
  smartArb:  { ...base, gap: '(g) => (window.__piege(g) ? "C" : "A")', gonogo: 'B', maison: true, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
  humain:    { ...base, ticket: '() => (Math.random() < 0.8 ? "A" : "B")', atelier: '() => (Math.random() < 0.8 ? "A" : "B")', gap: '(g) => (window.__piege(g) ? (Math.random() < 2 / 3 ? "B" : "A") : (Math.random() < 0.85 ? "A" : "C"))', gonogo: '(g) => g.quality >= 80 ? "A" : "B"', regression: '() => (Math.random() < 0.6 ? "A" : "B")', maison: '() => Math.random() < 0.8', dort: '(g) => g.energy < 35 + Math.random() * 30', reposWE: false, bw: '(g) => g.boostCalls < 1 && g.pu > 20000' },
  debutant:  { ...base, gap: 'A', ticket: '() => (Math.random() < 0.5 ? "A" : "B")', atelier: '() => (Math.random() < 0.5 ? "A" : "B")', direction: '() => (Math.random() < 0.5 ? "A" : "B")', gonogo: 'A', regression: 'A', maison: '() => Math.random() < 0.5', dort: '(g) => g.energy < 20', reposWE: false, bw: '(g) => g.boostCalls < 3 && Math.random() < 0.003' },
  bureau:    { ...base, gap: '(g) => (window.__piege(g) ? "B" : "A")', gonogo: 'B', maison: false, dort: '(g) => g.energy < 40', reposWE: false, bw: '(g) => g.boostCalls < 1' },
};
const toSrc = (o) => '{' + Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'string' && v.startsWith('(') ? v : JSON.stringify(v)}`).join(', ') + '}';
const C2 = (t) => { const r = (i) => Math.max(0, Math.min(100, i)); return { qualite: r(((t.qualite - 40) / 50) * 100), budget: [100, 95, 85, 65, 25][Math.round((t.cout || 0) / 5e3)] ?? 0, delai: r(((170 - Math.max(90, t.total)) / 80) * 100) }; };
const w2 = (t) => { const r = C2(t); const b = Math.round(1e4 * Math.cbrt((r.qualite / 100) * (r.budget / 100) * (r.delai / 100))); return b > 0 ? Math.max(0, Math.min(1e4, b + (t.bonusGo || 0))) : 0; };
module.exports = { S, toSrc, w2, C2 };
