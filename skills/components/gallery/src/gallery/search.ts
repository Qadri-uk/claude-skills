/**
 * The gallery's search box scores entries the same way `components-skill
 * search` does (cli/src/commands/search.js): every query term must match
 * something (AND across terms), and a name hit ranks above an alias hit,
 * which ranks above a hit in the effect description or library. Ported
 * rather than imported because the CLI reads its registry from disk.
 */

export type Searchable = {
  name: string;
  library: string;
  effect: string;
  aliases: string[];
};

export function terms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchScore(entry: Searchable, queryTerms: string[]): number {
  const name = entry.name.toLowerCase();
  const aliases = entry.aliases.map((a) => a.toLowerCase());
  const hay = [name, entry.library.toLowerCase(), entry.effect.toLowerCase(), ...aliases];
  let score = 0;
  for (const term of queryTerms) {
    if (name.includes(term)) score += 3;
    else if (aliases.some((a) => a.includes(term))) score += 2;
    else if (hay.some((h) => h.includes(term))) score += 1;
    else return 0;
  }
  return score;
}

/** Entries matching `query`, best first. An empty query keeps the original order. */
export function searchEntries<T extends Searchable>(entries: T[], query: string): T[] {
  const t = terms(query);
  if (!t.length) return entries;
  return entries
    .map((entry) => ({ entry, score: matchScore(entry, t) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .map((r) => r.entry);
}
