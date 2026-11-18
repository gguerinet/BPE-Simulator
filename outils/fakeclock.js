(() => {
  let now = 1000, id = 1;
  const q = [];
  const d0 = Date.now();
  performance.now = () => now;
  Date.now = () => d0 + now;
  window.setTimeout = (f, ms, ...a) => { const t = { id: id++, at: now + Math.max(0, +ms || 0), f, a }; q.push(t); return t.id; };
  window.clearTimeout = window.clearInterval = (i) => { const k = q.findIndex((t) => t.id === i); if (k >= 0) q.splice(k, 1); };
  window.setInterval = (f, ms, ...a) => { const t = { id: id++, at: now + Math.max(1, +ms || 1), f, a, iv: Math.max(1, +ms || 1) }; q.push(t); return t.id; };
  window.requestAnimationFrame = (f) => window.setTimeout(() => f(now), 16);
  window.cancelAnimationFrame = window.clearTimeout;
  window.__adv = (ms) => {
    const end = now + ms;
    for (;;) {
      let b = null;
      for (const t of q) if (!b || t.at < b.at || (t.at === b.at && t.id < b.id)) b = t;
      if (!b || b.at > end) break;
      now = b.at;
      if (b.iv) b.at += b.iv; else q.splice(q.indexOf(b), 1);
      try { typeof b.f === 'function' && b.f(...b.a); } catch (e) { console.error('FAKECLOCK ' + (e && e.stack || e)); }
    }
    now = end;
  };
})();
