import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The one badge the gallery uses (#73). Every tone was measured against the
 * surface it sits on in both themes and clears 4.5:1 (index.css lists the
 * token values):
 *
 *   neutral  --ink-2 on --panel        dark 8.8:1, light 9.6:1
 *   stage    #d4d4d4 on the preview stage, which is dark in both themes, 12.7:1
 *   warn     --warn on --warn-bg       dark 10.9:1, light 6.4:1
 */
type Tone = "neutral" | "stage" | "warn";

const TONES: Record<Tone, string> = {
  neutral: "border-line text-ink-2",
  stage: "border-neutral-700 bg-neutral-950/85 text-neutral-300",
  warn: "border-warn/50 bg-warn-bg text-warn",
};

export function Badge({ tone = "neutral", className = "", children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A toggle chip: a real button with aria-pressed, so its state is announced. */
export function Chip({
  pressed,
  onClick,
  children,
  label,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        pressed ? "border-ink bg-ink text-page" : "border-line text-ink-2 hover:border-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Copy text, falling back to a hidden textarea where the async clipboard API
 * is missing or refused (an http preview, an iframe without permission).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/** One polite live region for every confirmation, so screen readers hear it too. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    window.clearTimeout(timer.current);
    setMessage(m);
    timer.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const node = (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {message && (
        <p className="max-w-[min(36rem,100%)] truncate rounded-lg border border-line bg-raised px-4 py-2 text-sm text-ink shadow-lg">
          {message}
        </p>
      )}
    </div>
  );
  return { show, node };
}
