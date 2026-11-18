const { chromium, devices } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
const sizes = { p320: [320, 568], p375: [375, 667], p390: [390, 844], land: [844, 390], tab: [768, 1024], lap: [1280, 800], hd: [1920, 1080] };
fs.mkdirSync(__dirname + '/travail/shots', { recursive: true });
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(sizes);
const adv = (p, n = 10) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__adv(250); }, n);
// Détection : texte coupé (scrollWidth > clientWidth sur un élément sans défilement prévu), élément hors écran, défilement horizontal
const check = (p) => p.evaluate(() => {
  const out = []; const W = innerWidth, H = innerHeight;
  if (document.documentElement.scrollWidth > W + 1) out.push('scroll-x page ' + document.documentElement.scrollWidth);
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const t = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own && (cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 1) out.push('coupé-x «' + t + '» ' + el.scrollWidth + '>' + el.clientWidth);
    if (own && cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) out.push('coupé-y «' + t + '»');
    if (own && (r.right > W + 1 || r.left < -1) && cs.position !== 'fixed') out.push('hors écran «' + t + '» ' + Math.round(r.left) + '..' + Math.round(r.right));
  }
  return [...new Set(out)].slice(0, 12);
});
(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const sz of only) {
    const [w, h] = sizes[sz];
    const { p, ctx, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', viewport: { width: w, height: h }, ctx: { deviceScaleFactor: 1, hasTouch: w < 900, isMobile: w < 900 && h > w }, wait: 300, init: FC + ';window.__noDraw=false;' });
    await adv(p, 8);
    const shot = async (nom) => { await adv(p, 6); await p.screenshot({ path: `travail/shots/${sz}_${nom}.png` }); report[sz + ' ' + nom] = await check(p); };
    await shot('01_accueil');
    await p.getByRole('button', { name: /Commencer/ }).first().click(); await shot('02_selection');
    await p.evaluate(() => window.__start('samuel')); await adv(p, 12);
    await p.evaluate(() => { const g = window.__api.n.current; g.pu = 41500; g.puMax = 41500; g.nextMilestone = 42; g.phaseVue = 2; g.days = 31; g.dayClick = 8; g.energy = 63; g.quality = 72.5; g.bwSpent = 5000; g.dirty = true; });
    await shot('03_jeu');
    for (const [k, nom] of [['gap', '04_besoin'], ['ticket', '05_ticket'], ['atelier', '06_atelier'], ['direction', '07_direction'], ['gonogo', '08_gonogo']]) {
      await p.evaluate((k) => { const g = window.__api.n.current; window.__api.dn(k === 'gap' ? { type: 'gap', idx: 4, palier: 40 } : { type: k, palier: 41 }); }, k);
      await adv(p, 30); await shot(nom);
      await p.evaluate(() => { const A = window.__api; A.ze('B'); }); await adv(p, 40);
    }
    await p.evaluate(() => window.__api.an()); await shot('09_regression');
    await p.evaluate(() => window.__api.De('A')); await adv(p, 30);
    await p.evaluate(() => { const g = window.__api.n.current; g.arbitrages.push({ idx: 2, palier: 20 }, { idx: 5, palier: 21 }, { idx: 9, palier: 22 }); window.__api.Sa(false); }); await shot('10_reunion');
    await p.evaluate(() => window.__api.Pe()); await adv(p, 30);
    await p.keyboard.press('p'); await shot('11_pause'); await p.keyboard.press('p'); await adv(p, 4);
    await p.evaluate(() => { const g = window.__api.n.current; g.energy = 0.3; g.lastClick = -1e9; window.__api.la(100, 100); }); await shot('12_arret');
    await p.evaluate(() => window.__api.un()); await adv(p, 20);
    await p.evaluate(() => { const g = window.__api.n.current; g.gonogo = 'go'; g.quality = 85; g.pu = 1e5; g.puMax = 1e5; g.nextMilestone = 100; window.__api.ln(); }); await shot('13_golive');
    await adv(p, 40); await p.waitForTimeout(4000); await shot('14_rapport');
    report[sz + ' errs'] = errs;
    await ctx.close();
  }
  fs.writeFileSync('travail/shots/report.json', JSON.stringify(report, null, 1));
  for (const [k, v] of Object.entries(report)) if (v.length) console.log(k, JSON.stringify(v));
  await b.close();
})();
