// Plusieurs parties d'affilée (nouvelle partie à chaque fois) : la mémoire doit rester stable
const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
(async () => {
  const b = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
  const { p, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', wait: 300, init: FC + ';window.__noDraw=false;' });
  const mes = () => p.evaluate(() => { gc(); return { heapMo: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1), dom: document.getElementsByTagName('*').length }; });
  const r = [];
  for (let k = 0; k < 15; k++) {
    await p.evaluate((h) => window.__start(h), ['francois', 'gabriel', 'hugues', 'samuel'][k % 4]);
    for (let i = 0; i < 40; i++) await p.evaluate(() => { window.__api.la(100, 100); window.__adv(250); });
    if (k % 5 === 4) r.push(await mes());
  }
  console.log('après 5, 10, 15 parties :', JSON.stringify(r), errs);
  await b.close();
})();
