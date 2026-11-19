// Ouvre le jeu avec React et les polices servis en local, Supabase simulé.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = __dirname + '/node_modules/';
const T = __dirname + '/travail/';
const fontCss = () => {
  const f = (fam, w, st, file) => `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:swap;src:url(https://fonts.gstatic.com/local/${file}) format('woff2');}`;
  return [f('Pixelify Sans',500,'normal','pixelify-sans/files/pixelify-sans-latin-500-normal.woff2'),
    f('Pixelify Sans',700,'normal','pixelify-sans/files/pixelify-sans-latin-700-normal.woff2'),
    f('Space Mono',400,'normal','space-mono/files/space-mono-latin-400-normal.woff2'),
    f('Space Mono',700,'normal','space-mono/files/space-mono-latin-700-normal.woff2'),
    f('Space Mono',400,'italic','space-mono/files/space-mono-latin-400-italic.woff2'),
    f('Space Mono',700,'italic','space-mono/files/space-mono-latin-700-italic.woff2')].join('\n');
};
async function open(opts = {}) {
  const b = opts.browser || await chromium.launch();
  const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 800 }, ...(opts.ctx || {}) });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => m.type() === 'error' && errs.push('CONSOLE ' + m.text()));
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (u.includes('react-dom.production')) return r.fulfill({ path: D + 'react-dom/umd/react-dom.production.min.js', contentType: 'application/javascript' });
    if (u.includes('react.production')) return r.fulfill({ path: D + 'react/umd/react.production.min.js', contentType: 'application/javascript' });
    if (u.startsWith('https://fonts.googleapis.com/css')) return r.fulfill({ body: fontCss(), contentType: 'text/css' });
    if (u.startsWith('https://fonts.gstatic.com/local/')) return r.fulfill({ path: D + '@fontsource/' + u.split('/local/')[1], contentType: 'font/woff2' });
    if (u.includes('supabase.co')) return opts.supabase ? opts.supabase(r) : r.fulfill({ status: 200, body: '[]', contentType: 'application/json' });
    if (u.startsWith('file://')) return r.continue();
    if (u.startsWith('http://bpe.test/')) return r.fulfill({ path: u.startsWith('http://bpe.test/repo/') ? path.join(__dirname, '..', u.slice(21)) : T + u.slice(16), contentType: 'text/html; charset=utf-8' });
    return r.abort();
  });
  await p.addInitScript((vierge) => { try { vierge || localStorage.setItem('bpe-simulator-tuto-off', 'true'); } catch (e) {} window.__noDraw = !vierge; }, !!opts.vierge);
  if (opts.init) await p.addInitScript(opts.init);
  if (opts.clock) await p.clock.install();
  await p.goto(opts.url || 'http://bpe.test/repo/index.html');
  opts.clock ? await p.clock.runFor(opts.wait || 1500) : await p.waitForTimeout(opts.wait || 1500);
  return { b, ctx, p, errs };
}
module.exports = { open };
if (require.main === module) (async () => {
  const { b, p, errs } = await open();
  await p.screenshot({ path: T + 'accueil.png' });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
