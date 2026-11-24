// Screenshot chapter moments of a scroll story.
//   node capture-chapters.cjs <url> <outdir> <c,c,c...> [mobile] [motion]
// Chapters are [data-ch] sections; c = chapter index + fraction through it.
// Default is reduced motion (exact frames, no camera easing); pass "motion" to see easing.
const { chromium, devices } = require('playwright');
(async () => {
  const [url, out, list, mode, motion] = process.argv.slice(2);
  const cs = list.split(',').map(Number);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const base = mode === 'mobile' ? { ...devices['Pixel 7'] } : { viewport: { width: 1280, height: 760 } };
  const ctx = await b.newContext({ ...base, reducedMotion: motion === 'motion' ? 'no-preference' : 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(9000); // real assets load after first paint
  for (const c of cs) {
    await p.evaluate((c) => {
      const s = [...document.querySelectorAll('[data-ch]')];
      const i = Math.min(s.length - 1, Math.floor(c));
      scrollTo(0, s[i].getBoundingClientRect().top + scrollY + (c - i) * s[i].offsetHeight);
    }, c);
    await p.waitForTimeout(1800);
    await p.screenshot({ path: `${out}/${mode === 'mobile' ? 'm' : 'd'}-${String(c).replace('.', '_')}.png` });
  }
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
