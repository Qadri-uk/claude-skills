// Open the render page, wait for the atlas and write it as PNG with its world size.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [url, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  p.on('console', (m) => /ERR/.test(m.text()) && console.log(m.text()));
  await p.goto(url);
  await p.waitForFunction(() => window.DONE, null, { timeout: 300000 });
  const d = await p.evaluate(() => window.DONE);
  fs.writeFileSync(out, Buffer.from(d.url.split(',')[1], 'base64'));
  console.log(out, JSON.stringify({ heightMetres: d.height, atlasHalfWidthMetres: d.width }));
  await b.close();
})();
