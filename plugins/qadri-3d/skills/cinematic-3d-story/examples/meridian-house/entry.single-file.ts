import * as towerMod from '../../src/lib/three/tower';
    import type { Phases } from '../../src/lib/three/tower';
    const FLOORS = 16;
    const N = 12;

    const host = document.querySelector<HTMLElement>('[data-scene="tower"]')!;
    const story = document.querySelector<HTMLElement>('[data-story]')!;
    const sections = [...story.querySelectorAll<HTMLElement>('[data-ch]')];
    const log = document.querySelector<HTMLElement>('[data-log]')!;
    const progress = document.querySelector<HTMLElement>('[data-progress]')!;
    const floorBox = document.querySelector<HTMLElement>('[data-floor]')!;
    const floorNum = document.querySelector<HTMLElement>('[data-floor-num]')!;
    const rail = [...document.querySelectorAll<HTMLAnchorElement>('.mh-rail [data-goto]')];
    const counters = sections.map((s) => [...s.querySelectorAll<HTMLElement>('[data-count]')]);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ss = (x: number, a: number, b: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };

    // Scroll position → story clock c: chapter index plus progress through it.
    let tops: number[] = [];
    let heights: number[] = [];
    const measure = () => {
      tops = sections.map((s) => s.getBoundingClientRect().top + scrollY);
      heights = sections.map((s) => s.offsetHeight);
    };
    measure();
    addEventListener('resize', measure);
    addEventListener('load', measure);
    const clock = () => {
      const y = scrollY;
      let c = 0;
      for (let i = 0; i < sections.length; i++) {
        if (y >= tops[i]) c = i + Math.min(1, (y - tops[i]) / heights[i]);
      }
      return Math.min(N, c);
    };

    // Each chapter's copy: blur in, hold while its scene plays, fade out.
    const fmt = (v: number, d: number) => v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
    const paintCopy = (c: number) => {
      sections.forEach((s, i) => {
        const local = c - i;
        if (local < -1 || local > 2) {
          s.style.setProperty('--vis', '0');
          return;
        }
        const vin = i === 0 ? 1 : ss(local, -0.02, 0.18);
        const vout = i === N - 1 ? 1 : 1 - ss(local, 0.78, 0.96);
        const read = i === 0 ? 1 : ss(local, 0.02, 0.42);
        s.style.setProperty('--vis', (vin * vout).toFixed(3));
        s.style.setProperty('--in', vin.toFixed(3));
        s.style.setProperty('--read', read.toFixed(3));
        const k = i === 0 ? 1 : ss(local, 0.04, 0.38);
        counters[i].forEach((el) => {
          el.textContent = fmt(+el.dataset.count! * k, +(el.dataset.dec ?? 0));
        });
      });
    };

    const day = (d: number) => `DAY ${String(Math.round(d)).padStart(3, '0')}`;
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const describe = (c: number, p: Phases) => {
      if (c < 0.9) return 'REV C · CONCEPT DESIGN';
      if (c < 1.9) return `${day(1 + (c - 0.9) * 20)} · SET-OUT`;
      if (c < 2.9) return `${day(21 + p.dig * 70)} · EXCAVATION ${pct(p.dig)}`;
      if (c < 3.9) return `${day(91 + (c - 2.9) * 60)} · PILES ${Math.round(p.piles * 49)}/49 · RAFT ${pct(p.pour)}`;
      if (c < 5.0) return `${day(151 + p.frame * 330)} · LEVEL ${Math.max(1, Math.ceil(p.frame * FLOORS))} OF ${FLOORS}`;
      if (c < 5.95) return `${day(481 + p.glass * 300)} · GLAZING ${pct(p.glass)}`;
      if (c < 7.2) return 'DAY 940 · PRACTICAL COMPLETION';
      if (c < 10.2) return 'OCCUPIED · GROUND FLOOR';
      return 'OCCUPIED · LEVEL 16';
    };

    let lastLog = '';
    let lastActive = -1;
    let assetsNote = '';
    const onAssets = (done: number, total: number) => {
      assetsNote = done < total ? ` · LOADING REAL SKIES & MATERIALS ${done}/${total}` : '';
      lastLog = '';
    };
    const bars = document.querySelector<HTMLElement>('.mh-bars')!;
    // Model → reality: dissolve to each chapter's visualisation, with a slow push-in.
    const plateEls = [...document.querySelectorAll<HTMLElement>('[data-plate]')].map((el) => ({ el, ch: +el.dataset.plate! }));
    let covered = false;
    let towerRef: { setOccluded(o: boolean): void } | null = null;
    const paintPlates = (c: number) => {
      let top = 0;
      for (const { el, ch } of plateEls) {
        const local = c - ch;
        const o = local < 0.3 || local > 1.05 ? 0 : ss(local, 0.42, 0.56) * (1 - ss(local, 0.9, 1.02));
        if (o <= 0) {
          if (el.style.opacity !== '0') el.style.opacity = '0';
          continue;
        }
        top = Math.max(top, o);
        el.style.opacity = o.toFixed(3);
        el.style.setProperty('--push', (reduce ? 0 : ss(local, 0.35, 1.05)).toFixed(4));
      }
      // Nothing to see behind an opaque plate: let the GPU rest.
      const now = top > 0.995;
      if (now !== covered && towerRef) {
        covered = now;
        towerRef.setOccluded(now);
      }
    };
    addEventListener('scroll', () => paintPlates(clock()), { passive: true });
    paintPlates(clock());

    const onFrame = (c: number, p: Phases) => {
      // Letterbox in for the walk-through: we've stepped from the brochure into the film.
      bars.style.setProperty('--bars', (ss(c, 7.15, 7.6) * (1 - ss(c, 10.85, 11.3))).toFixed(3));
      const text = describe(c, p) + assetsNote;
      if (text !== lastLog) log.textContent = lastLog = text;
      progress.style.transform = `scaleX(${(c / N).toFixed(4)})`;
      const active = Math.min(N - 1, Math.floor(c));
      if (active !== lastActive) {
        lastActive = active;
        rail.forEach((b, i) => (i === active ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      }
      const riding = c > 9.3 && c < 10.15;
      floorBox.hidden = !riding;
      if (riding) {
        const k = Math.min(1, Math.max(0, (c - 9.45) / 0.4));
        const f = Math.round(k * (FLOORS - 1));
        floorNum.textContent = f === 0 ? 'G' : String(f + 1).padStart(2, '0');
      }
      host.classList.toggle('is-done', story.getBoundingClientRect().bottom < innerHeight * 0.5);
    };

    // Copy follows the raw scroll (crisp), the camera follows an eased clock.
    const onScroll = () => paintCopy(clock());
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    rail.forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const i = +a.dataset.goto!;
        scrollTo({ top: tops[i] + heights[i] * 0.22, behavior: reduce ? 'auto' : 'smooth' });
      }),
    );

    Promise.resolve(towerMod)
      .then(({ mount }) => {
        const tower = mount(host, onFrame, onAssets);
        towerRef = tower;
        if (!tower) {
          host.dataset.state = 'nogl';
          return;
        }
        const sync = (jump = false) => tower.setTarget(clock(), jump);
        sync(true);
        addEventListener('scroll', () => sync(), { passive: true });
        addEventListener('resize', () => sync());
      })
      .catch((err) => {
        console.error(err);
        host.dataset.state = 'nogl';
      });