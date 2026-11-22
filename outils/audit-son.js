// Audit son : partie réelle (horloge réelle) avec musique et clics, processeur ralenti comme sur téléphone.
// Mesure : notes démarrées en retard, longues tâches du jeu, sons créés par seconde, niveau de sortie (crête, saturation, sauts brusques).
// Usage : node audit-son.js [ralentissement CPU] [secondes] [page]
const { chromium } = require('playwright');
const { open } = require('./harness');
const lent = +(process.argv[2] || 4), duree = +(process.argv[3] || 40), page = process.argv[4] || 'son_audit.html';
const ESPION = `(() => {
  const st = window.__son = { tard: 0, notes: 0, noeuds: 0, crete: 0, sature: 0, sauts: 0, echant: 0, longues: 0, longuesMs: 0, maxTache: 0 };
  const AC = window.AudioContext;
  for (const m of ['createOscillator', 'createBufferSource', 'createGain', 'createBiquadFilter'])
    { const o = AC.prototype[m]; AC.prototype[m] = function () { st.noeuds++; return o.apply(this, arguments); }; }
  for (const P of [OscillatorNode.prototype, AudioBufferSourceNode.prototype]) {
    const s = P.start; P.start = function (w) { st.notes++; if (w !== undefined && w > 0 && w < this.context.currentTime - 0.003) st.tard++; return s.apply(this, arguments); };
  }
  // Prise de son à la sortie : tout ce qui va vers les haut-parleurs passe par un analyseur
  const c0 = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d) {
    if (d instanceof AudioDestinationNode && !this.__espion) {
      const ctx = this.context, sp = ctx.createScriptProcessor(2048, 1, 1); let prec = 0;
      sp.onaudioprocess = (e) => { const x = e.inputBuffer.getChannelData(0); for (let i = 0; i < x.length; i++) { const v = x[i], a = Math.abs(v); st.echant++; if (a > st.crete) st.crete = a; if (a >= 0.99) st.sature++; if (Math.abs(v - prec) > 0.5) st.sauts++; prec = v; } };
      c0.call(this, sp); c0.call(sp, d); sp.__espion = true; return d;
    }
    return c0.apply(this, arguments);
  };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { st.longues++; st.longuesMs += e.duration; st.maxTache = Math.max(st.maxTache, e.duration); })).observe({ entryTypes: ['longtask'] });
})();`;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/' + page, viewport: { width: 390, height: 844 }, ctx: { deviceScaleFactor: 3, isMobile: true, hasTouch: true }, wait: 800, init: ESPION + ';window.__noDraw=false' });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: lent });
  await p.evaluate(() => { window.__start('gabriel'); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__vt.demarrer(); window.__vt.menu(false); });
  await p.waitForTimeout(1000);
  await p.evaluate(() => Object.assign(window.__son, { tard: 0, notes: 0, noeuds: 0, crete: 0, sature: 0, sauts: 0, echant: 0, longues: 0, longuesMs: 0, maxTache: 0 }));
  // Le joueur garde le doigt appuyé ; les fiches et messages reçoivent une réponse automatique
  const t0 = Date.now();
  while (Date.now() - t0 < duree * 1000) {
    await p.evaluate(() => { const g = window.__api.n.current, A = window.__api; g.energy = Math.max(g.energy, 40); if (g.dilemma) A.ze('A'); else if (A.msg()) A.De('OK'); else if (g.busy === 'reunion') A.Pe(); else if (g.busy === 'weekend') A.Oe(true); g.holding = true; g.holdSrc = 'key'; });
    await p.waitForTimeout(250);
  }
  const r = await p.evaluate(() => window.__son);
  const s = duree;
  console.log(JSON.stringify({ page, cpu: '÷' + lent, notesParS: +(r.notes / s).toFixed(1), noeudsParS: +(r.noeuds / s).toFixed(1), notesEnRetard: r.tard, tachesLongues: r.longues, tempsBloqueMs: Math.round(r.longuesMs), plusLongueMs: Math.round(r.maxTache), creteSortie: +r.crete.toFixed(3), echantSatures: r.sature, sautsBrusques: r.sauts, echantillons: r.echant, erreurs: errs.slice(0, 2) }));
  await b.close();
})();
