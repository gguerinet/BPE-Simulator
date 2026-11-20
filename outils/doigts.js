// Tactile : un doigt maintenu clique ; un 2e doigt (zoom) suspend les clics ; quand il se lève, les clics reprennent sous le 1er doigt
const { chromium } = require('playwright'); const { open } = require('./harness');
(async () => { const b = await chromium.launch();
 const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: 390, height: 844 }, ctx: { hasTouch: true, isMobile: true }, wait: 800 });
 await p.evaluate(() => window.__start('gabriel')); await p.waitForTimeout(1500);
 await p.evaluate(() => { const g = window.__api.n.current; g.nextVisite = 1e9; });
 const cdp = await ctx.newCDPSession(p);
 const bb = await p.locator('canvas[data-tuto=scene]').boundingBox();
 const A = { x: bb.x + bb.width / 2, y: bb.y + bb.height * 0.6, id: 1 }, B = { x: A.x + 60, y: A.y - 40, id: 2 };
 const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
 const clics = () => p.evaluate(() => window.__api.n.current.clicks);
 await p.evaluate(() => { window.__ev = []; const c = document.querySelector('canvas[data-tuto=scene]').parentElement; for (const k of ['pointerdown','pointerup','pointercancel']) document.addEventListener(k, (e) => window.__ev.push(k + e.pointerId), true); });
 const c0 = await clics();
 await t('touchStart', [A]); await p.waitForTimeout(1000); const c1 = await clics();
 await t('touchStart', [A, B]); await p.waitForTimeout(1000); const c2 = await clics();
 await t('touchEnd', [B]); await p.waitForTimeout(100); console.log('hold après lever B', await p.evaluate(() => window.__api.n.current.holding)); await p.waitForTimeout(900); const c3 = await clics();
 await t('touchEnd', [A]); await p.waitForTimeout(800); const c4 = await clics();
 console.log(await p.evaluate(() => window.__ev.join(' '), await p.evaluate(() => 0))); console.log(JSON.stringify({ hold: await p.evaluate(() => window.__api.n.current.holding), unDoigt: c1 - c0, deuxDoigts: c2 - c1, apresLeverSecond: c3 - c2, apresToutLever: c4 - c3, errs }));
 await b.close(); })();
