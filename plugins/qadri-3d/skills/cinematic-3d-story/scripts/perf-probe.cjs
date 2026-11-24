// Per-chapter frame cost on a phone profile: wraps requestAnimationFrame before page
// scripts run, steps through the chapters and prints median and worst frame JS time.
//   node perf-probe.cjs <url> [chapters=12]
// Worst frames over ~50 ms that are not the first frame are stalls worth finding
// (shader compiles, texture uploads, environment bakes). Headless SwiftShader compiles
// lazily and is slow, so treat absolute numbers as indicative and confirm on a device.
const { chromium, devices } = require('playwright');
(async () => {
  const [url, n = '12'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript(() => {
    window.__ft = [];
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); window.__ft.push([window.__seg || 0, performance.now() - s]); });
  });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(12000);
  for (let k = 0; k <= +n * 4; k++) {
    await p.evaluate((k) => {
      window.__seg = k / 4;
      const s = [...document.querySelectorAll('[data-ch]')];
      const i = Math.min(s.length - 1, Math.floor(k / 4));
      scrollTo(0, s[i].getBoundingClientRect().top + scrollY + (k / 4 - i) * s[i].offsetHeight);
    }, k);
    await p.waitForTimeout(500);
  }
  const by = {};
  for (const [seg, d] of await p.evaluate(() => window.__ft)) (by[Math.floor(seg)] ??= []).push(d);
  for (const [c, a] of Object.entries(by)) {
    a.sort((x, y) => y - x);
    console.log(`chapter ${c}: frames=${a.length} median=${a[a.length >> 1].toFixed(1)}ms worst=${a[0].toFixed(0)}ms`);
  }
  await b.close();
})();
