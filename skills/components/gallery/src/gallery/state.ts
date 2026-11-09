import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Gallery view state. Filters live in the URL query so a filtered view
 * survives a reload and can be shared (#69); theme and motion preferences
 * live in localStorage because they belong to the viewer, not the link.
 */

export type Tab = "showpieces" | "layouts";

export type Filters = {
  q: string;
  libraries: string[];
  framework: string | null;
  tab: Tab;
};

export const EMPTY_FILTERS: Filters = { q: "", libraries: [], framework: null, tab: "showpieces" };

function readFilters(): Filters {
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get("q") ?? "",
    libraries: (p.get("library") ?? "").split(",").filter(Boolean),
    framework: p.get("framework") || null,
    tab: p.get("tab") === "layouts" ? "layouts" : "showpieces",
  };
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams(window.location.search);
  const set = (key: string, value: string | null) => (value ? p.set(key, value) : p.delete(key));
  set("q", f.q.trim() || null);
  set("library", f.libraries.length ? f.libraries.join(",") : null);
  set("framework", f.framework);
  set("tab", f.tab === "layouts" ? "layouts" : null);
  const qs = p.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, "", next);
  }
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(readFilters);
  useEffect(() => writeFilters(filters), [filters]);
  useEffect(() => {
    const onPop = () => setFilters(readFilters());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return [filters, setFilters] as const;
}

const HASH_PREFIX = "#showpiece-";

function readHashTarget(): string | null {
  const h = decodeURIComponent(window.location.hash);
  return h.startsWith(HASH_PREFIX) ? h.slice(HASH_PREFIX.length) : null;
}

/** The showpiece named by `#showpiece-<id>`, tracked across hash changes (#72). */
export function useHashTarget() {
  const [target, setTarget] = useState<string | null>(readHashTarget);
  useEffect(() => {
    const onHash = () => setTarget(readHashTarget());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return target;
}

export const showpieceHash = (name: string) => `${HASH_PREFIX}${name}`;

// Storage can throw (private windows, blocked site data). Every read and
// write is guarded, and the page works the same without it.
function stored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* preference just won't persist */
  }
}

export type Theme = "dark" | "light";
const THEME_KEY = "components-gallery-theme";

/** index.html sets data-theme before first paint from the same key, so there is no flash. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const s = stored(THEME_KEY);
    if (s === "dark" || s === "light") return s;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const choose = useCallback((t: Theme) => {
    store(THEME_KEY, t);
    setTheme(t);
  }, []);
  return [theme, choose] as const;
}

const MOTION_KEY = "components-gallery-motion";
const REDUCE = "(prefers-reduced-motion: reduce)";

/**
 * Whether previews are paused (#68). Defaults to the OS reduced-motion
 * setting and follows it live until the viewer picks explicitly; after that
 * their choice wins, since pressing "play" with reduced motion on is a
 * deliberate request to see the effect.
 */
export function useMotionPaused() {
  const [explicit, setExplicit] = useState<boolean | null>(() => {
    const s = stored(MOTION_KEY);
    return s === "paused" ? true : s === "playing" ? false : null;
  });
  const [osReduce, setOsReduce] = useState(() => window.matchMedia(REDUCE).matches);
  useEffect(() => {
    const mq = window.matchMedia(REDUCE);
    const onChange = () => setOsReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const paused = explicit ?? osReduce;
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "playing";
  }, [paused]);

  const choose = useCallback((p: boolean) => {
    store(MOTION_KEY, p ? "paused" : "playing");
    setExplicit(p);
  }, []);
  return [paused, choose, osReduce] as const;
}

/** Read by demos whose animation runs on JS timers, which a CSS pause cannot reach. */
export const MotionPausedContext = createContext(false);
export const usePaused = () => useContext(MotionPausedContext);
