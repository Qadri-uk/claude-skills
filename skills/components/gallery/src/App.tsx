import { MotionGlobalConfig } from "motion/react";
import { useEffect, useMemo } from "react";

import showpieces from "./showpieces.json";
import layouts from "./layouts.json";
import { LIVE_DEMOS, STATIC_PREVIEWS } from "./demos/index";
import { searchEntries } from "./gallery/search";
import {
  EMPTY_FILTERS,
  MotionPausedContext,
  showpieceHash,
  useFilters,
  useHashTarget,
  useMotionPaused,
  useTheme,
  type Filters,
  type Tab,
} from "./gallery/state";
import { Badge, Chip, copyText, useToast } from "./gallery/ui";

type Verification = {
  status: string;
  checkedAt: string | null;
  lastOkAt: string | null;
  pin: string | null;
};

type Entry = {
  name: string;
  library: string;
  effect: string;
  aliases: string[];
  license: string;
  deps: string[];
  ref: string;
  frameworks: string[];
  available: boolean;
  preview?: "static" | null;
  reason?: string;
  verified?: Verification | null;
};

type LayoutEntry = {
  name: string;
  kind: "web" | "video";
  description: string;
  composedFrom: string[];
  preview: string | null;
  sections?: string[];
  source?: string;
  beats?: string[];
};

const REPO = "https://github.com/AnayDhawan/Components";
const FRAMEWORKS = ["react", "vue", "svelte"];

// health-check.py runs weekly and on every deploy. A pass older than this
// means nothing has confirmed the ref still resolves for over four of those
// weeks, which is worth seeing on the card (#84).
const STALE_DAYS = 30;
const DAY_MS = 86_400_000;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });

function verificationOf(v: Verification | null | undefined, now: number) {
  if (!v) return { label: "no health check in this build", stale: false };
  if (!v.lastOkAt) {
    return {
      label: `not verified: ${v.status}${v.checkedAt ? ` on ${formatDate(v.checkedAt)}` : ""}`,
      stale: true,
    };
  }
  const days = Math.floor((now - Date.parse(v.lastOkAt)) / DAY_MS);
  const stale = days > STALE_DAYS;
  const pinned = v.pin === "match" ? ", matches its pinned receipt" : "";
  return {
    label: `verified ${formatDate(v.lastOkAt)}${stale ? `, ${days} days ago` : pinned}`,
    stale,
  };
}

function matchesFacets(e: Entry, f: Filters) {
  return (!f.libraries.length || f.libraries.includes(e.library)) && (!f.framework || e.frameworks.includes(f.framework));
}

function Card({ entry, highlighted, onCopy }: { entry: Entry; highlighted: boolean; onCopy: (e: Entry) => void }) {
  const LiveDemo = LIVE_DEMOS[entry.name];
  const StaticPreview = STATIC_PREVIEWS[entry.name];
  const v = verificationOf(entry.verified, Date.now());
  const titleId = `${entry.name}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={`overflow-hidden rounded-2xl border bg-panel transition-shadow ${
        v.stale ? "border-warn/60" : "border-line"
      } ${highlighted ? "ring-2 ring-ink ring-offset-4 ring-offset-page" : ""}`}
    >
      <div
        role="group"
        aria-label={`Preview of ${entry.name}`}
        className="preview-stage flex min-h-[22rem] items-center justify-center overflow-hidden p-6"
      >
        {entry.available && LiveDemo ? (
          <LiveDemo />
        ) : StaticPreview ? (
          <div className="relative w-full">
            <StaticPreview />
            <Badge tone="stage" className="absolute right-3 top-3 uppercase tracking-wide">
              static preview
            </Badge>
          </div>
        ) : (
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium text-neutral-200">Upstream temporarily unavailable</p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">{entry.reason}</p>
            <p className="mt-3 text-xs text-neutral-400">
              The entry is still valid; only automated fetching is blocked. Live demos are built by running the real
              registry command, so the page shows the gap instead of hiding it.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-line p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 id={titleId} className="font-mono text-base text-ink">
            <a href={showpieceHash(entry.name)} className="hover:underline" title="Link to this entry">
              {entry.name}
            </a>
          </h2>
          <Badge>{entry.library}</Badge>
          {entry.frameworks
            .filter((f) => f !== "react")
            .map((f) => (
              <Badge key={f}>{f} port</Badge>
            ))}
          <span className="text-[11px] text-ink-3">{entry.license}</span>
        </div>

        <p className="text-sm text-ink-2">{entry.effect}</p>

        <ul className="flex flex-wrap gap-1.5" aria-label="Aliases">
          {entry.aliases.slice(0, 4).map((a) => (
            <li key={a} className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-ink-2">
              "{a}"
            </li>
          ))}
        </ul>

        <div className="flex items-stretch gap-2">
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-raised p-3 text-[11px] leading-relaxed text-ink-2">
            <code>{entry.ref}</code>
          </pre>
          <button
            type="button"
            onClick={() => onCopy(entry)}
            aria-label={`Copy the install command for ${entry.name}`}
            className="shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
          >
            Copy
          </button>
        </div>

        {entry.deps.length > 0 && <p className="text-[11px] text-ink-3">deps: {entry.deps.join(", ")}</p>}

        {v.stale ? (
          <Badge tone="warn">{v.label}</Badge>
        ) : (
          <p className="text-[11px] text-ink-3">{v.label}</p>
        )}
      </div>
    </article>
  );
}

function LayoutCard({ layout }: { layout: LayoutEntry }) {
  return (
    <article
      id={`layout-${layout.name}`}
      aria-labelledby={`layout-${layout.name}-title`}
      className="overflow-hidden rounded-2xl border border-line bg-panel p-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={`layout-${layout.name}-title`} className="font-mono text-base text-ink">
          {layout.name}
        </h2>
        <Badge>{layout.kind}</Badge>
      </div>

      <p className="mt-3 text-sm text-ink-2">{layout.description}</p>

      {layout.preview === "none" && (
        <p className="mt-2 text-[11px] uppercase tracking-wide text-ink-3">no visual preview</p>
      )}

      {layout.kind === "web" && layout.sections && (
        <ul className="mt-3 list-inside list-disc text-xs text-ink-2">
          {layout.sections.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}

      {layout.kind === "video" && layout.beats && (
        <>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-ink-3">Reference pattern, not a live demo</p>
          <ol className="mt-1 list-inside list-decimal text-xs text-ink-2">
            {layout.beats.map((b, i) => (
              <li key={`${b}-${i}`}>{b}</li>
            ))}
          </ol>
          {layout.source && <p className="mt-2 text-[11px] text-ink-3">source: {layout.source}</p>}
        </>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Composed from">
        {layout.composedFrom.map((name) => (
          <li key={name}>
            {layout.kind === "web" ? (
              <a
                href={showpieceHash(name)}
                className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-ink-2 underline decoration-line hover:text-ink"
              >
                {name}
              </a>
            ) : (
              <span className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-ink-2">{name}</span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function App() {
  const entries = showpieces.entries as Entry[];
  const layoutEntries = layouts as LayoutEntry[];
  const [filters, setFilters] = useFilters();
  const [theme, setTheme] = useTheme();
  const [paused, setPaused, osReduce] = useMotionPaused();
  const target = useHashTarget();
  const toast = useToast();

  // motion-driven previews read this when an animation starts, which is why
  // the grid below remounts when it flips: an infinite animation already
  // running (background-beams) would otherwise ignore it. Set during render
  // so it is in place before any child effect starts an animation.
  MotionGlobalConfig.skipAnimations = paused;

  const libraries = useMemo(() => [...new Set(entries.map((e) => e.library))].sort(), [entries]);
  const shown = useMemo(
    () => searchEntries(entries.filter((e) => matchesFacets(e, filters)), filters.q),
    [entries, filters],
  );
  const filtered = filters.q.trim() !== "" || filters.libraries.length > 0 || filters.framework !== null;

  // #72: a #showpiece-<id> link opens the showpieces tab, clears any filter
  // that would hide that entry, scrolls it into view, and focuses it. The
  // highlight stays as long as the hash names it.
  useEffect(() => {
    if (!target || !entries.some((e) => e.name === target)) return;
    setFilters((f) => {
      const entry = entries.find((e) => e.name === target)!;
      const visible = matchesFacets(entry, f) && searchEntries([entry], f.q).length > 0;
      return { ...(visible ? f : EMPTY_FILTERS), tab: "showpieces" };
    });
  }, [target, entries, setFilters]);

  useEffect(() => {
    if (!target || filters.tab !== "showpieces") return;
    const el = document.getElementById(`showpiece-${target}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: paused ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
    // Re-run only when the target changes or it first becomes visible.
  }, [target, filters.tab, shown.some((e) => e.name === target)]);

  const setTab = (tab: Tab) => setFilters((f) => ({ ...f, tab }));
  const toggleLibrary = (lib: string) =>
    setFilters((f) => ({
      ...f,
      libraries: f.libraries.includes(lib) ? f.libraries.filter((l) => l !== lib) : [...f.libraries, lib],
    }));
  const toggleFramework = (fw: string) => setFilters((f) => ({ ...f, framework: f.framework === fw ? null : fw }));

  const onCopy = async (e: Entry) => {
    const ok = await copyText(e.ref);
    toast.show(ok ? `Copied: ${e.ref}` : "Copy failed. Select the command and copy it by hand.");
  };

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 font-medium transition-colors ${
      active ? "bg-cta text-cta-ink" : "border border-line text-ink-2 hover:text-ink"
    }`;

  return (
    <div className="min-h-screen bg-page text-ink">
      <a
        href="#gallery"
        className="sr-only rounded-lg bg-cta px-4 py-2 text-cta-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to the gallery
      </a>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-ink">components</h1>
            <p className="mt-4 text-ink-2">
              Showpiece React + Tailwind UI for AI coding agents. Describe an effect, and your agent fetches the real
              component live from its registry and adapts it to your brand tokens.
            </p>
            <p className="mt-4 text-sm text-ink-3">
              Every live demo below was pulled by running its actual <code className="text-ink-2">ref</code> command
              during this page's build. WebGL/canvas-class effects and the challenge-blocked cult-ui host render as
              hand-authored static previews, labeled as such. Nothing here is copy-pasted, which is the whole point:
              the registry stores pointers, so the code cannot go stale.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <a href={REPO} className="rounded-lg bg-cta px-4 py-2 font-medium text-cta-ink transition-opacity hover:opacity-90">
                GitHub
              </a>
              <code className="rounded-lg border border-line bg-panel px-4 py-2 text-ink-2">npx components-skill@latest add</code>
            </div>

            <p className="mt-6 text-xs text-ink-3">
              A curated window onto the 39-effect registry: live demos for the lightweight effects, static previews for
              the WebGL/canvas-class and challenge-blocked ones. The full registry has 39 showpieces and 12 plain
              fallbacks; see the{" "}
              <a href={REPO} className="underline hover:text-ink">
                README
              </a>
              .
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={paused}
                onClick={() => setPaused(!paused)}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:text-ink aria-pressed:border-ink aria-pressed:text-ink"
              >
                Pause animations
              </button>
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={`Switch to the ${theme === "dark" ? "light" : "dark"} theme`}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
              >
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </button>
            </div>
            {paused && osReduce && (
              <p className="max-w-[16rem] text-[11px] text-ink-3 md:text-right">
                Paused because your system asks for reduced motion. Press again to play.
              </p>
            )}
          </div>
        </header>

        <div role="tablist" aria-label="Gallery sections" className="mt-12 flex gap-2 text-sm">
          {(["showpieces", "layouts"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={filters.tab === t}
              aria-controls="gallery"
              onClick={() => setTab(t)}
              className={tabClass(filters.tab === t)}
            >
              {t === "showpieces" ? "Showpieces" : "Layouts"}
            </button>
          ))}
        </div>

        <section id="gallery" role="tabpanel" aria-labelledby={`tab-${filters.tab}`} tabIndex={-1} className="mt-8">
          {filters.tab === "showpieces" ? (
            <>
              <div role="search" className="space-y-3">
                <label htmlFor="gallery-search" className="sr-only">
                  Search showpieces by name, alias, or effect
                </label>
                <input
                  id="gallery-search"
                  type="search"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="Search by name, alias, or effect, e.g. marquee, text, beams"
                  className="w-full rounded-lg border border-line bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-ink-3"
                />
                <div role="group" aria-label="Filter by source library" className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-ink-3">Library</span>
                  {libraries.map((lib) => (
                    <Chip key={lib} pressed={filters.libraries.includes(lib)} onClick={() => toggleLibrary(lib)}>
                      {lib}
                    </Chip>
                  ))}
                </div>
                <div role="group" aria-label="Filter by framework" className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-ink-3">Framework</span>
                  {FRAMEWORKS.map((fw) => (
                    <Chip
                      key={fw}
                      pressed={filters.framework === fw}
                      onClick={() => toggleFramework(fw)}
                      label={`${fw}: ${entries.filter((e) => e.frameworks.includes(fw)).length} entries`}
                    >
                      {fw}
                    </Chip>
                  ))}
                </div>
                <p aria-live="polite" className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
                  <span>
                    {shown.length} of {entries.length} showpieces
                  </span>
                  {filtered && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, tab: f.tab }))}
                      className="underline hover:text-ink"
                    >
                      Clear filters
                    </button>
                  )}
                </p>
              </div>

              <MotionPausedContext.Provider value={paused}>
                <div key={paused ? "paused" : "playing"} className="mt-8 grid gap-8 md:grid-cols-2">
                  {shown.map((e) => (
                    <div id={`showpiece-${e.name}`} key={e.name} tabIndex={-1} className="scroll-mt-24 rounded-2xl focus:outline-none">
                      <Card entry={e} highlighted={target === e.name} onCopy={onCopy} />
                    </div>
                  ))}
                </div>
              </MotionPausedContext.Provider>
              {shown.length === 0 && (
                <p className="mt-8 text-sm text-ink-2">
                  Nothing matches. Try a shorter query or clear a filter. The CLI searches the full registry:{" "}
                  <code className="text-ink">npx components-skill@latest search {filters.q.trim() || "<effect>"}</code>
                </p>
              )}
            </>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {layoutEntries.map((l) => (
                <LayoutCard key={l.name} layout={l} />
              ))}
            </div>
          )}
        </section>

        <footer className="mt-16 border-t border-line pt-8 text-xs text-ink-3">
          <p>
            Each component is governed by its own upstream license, not this repo's Apache-2.0. See{" "}
            <a href={`${REPO}/blob/main/ATTRIBUTION.md`} className="underline hover:text-ink">
              ATTRIBUTION.md
            </a>
            . Demos are shown close to their upstream defaults; the skill's job at use time is to adapt them to your
            tokens and honour <code className="text-ink-2">prefers-reduced-motion</code>. Previews sit on a dark stage in
            both themes because the upstream demos are authored for dark backgrounds.
          </p>
        </footer>
      </main>
      {toast.node}
    </div>
  );
}
