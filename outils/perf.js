const { chromium } = require('playwright');
const { open } = require('./harness');
(async () => {
  const b = await chromium.launch();
  for (const thr of [1, 4]) {
    const t0 = Date.now();
    const { p, ctx } = await open({ browser: b, url: 'http://bpe.test/game.html', wait: 10, viewport: { width: 390, height: 844 }, init: 'window.__noDraw=false;' });
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
    await p.reload(); 
    await p.waitForSelector('text=Commencer');
    const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0) }; });
    await p.evaluate(() => window.__start('gabriel'));
    await p.waitForTimeout(1500);
    // Mesure des images en jeu pendant 6 s de clics continus
    const r = await p.evaluate(() => new Promise((res) => {
      const ts = []; let stop = false; const A = window.__api;
      const iv = setInterval(() => A.la(100, 100), 200);
      const f = (t) => { ts.push(t); if (!stop) requestAnimationFrame(f); };
      requestAnimationFrame(f);
      const h0 = performance.memory && performance.memory.usedJSHeapSize;
      setTimeout(() => { stop = true; clearInterval(iv); const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b);
        res({ fps: Math.round(1000 * (ts.length - 1) / (ts[ts.length - 1] - ts[0])), p50: d[d.length >> 1].toFixed(1), p95: d[Math.floor(d.length * 0.95)].toFixed(1), max: d[d.length - 1].toFixed(0), heapMo: (performance.memory.usedJSHeapSize / 1e6).toFixed(1) }); }, 6000);
    }));
    console.log('CPU /' + thr, JSON.stringify(nav), JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
