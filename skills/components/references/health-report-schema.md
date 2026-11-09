# health-report.json schema

`scripts/health-check.py` writes two files at the repo root on every run: `health-report.md` for people, and `health-report.json` for tools. Both are generated and gitignored. The gallery build runs the check and reads the JSON to show a "last verified" date on each card.

Use it to answer "did this entry's upstream respond the last time anyone checked?" It does not prove the component builds; `scripts/smoke-test.mjs` does that.

## Top level

| Field | Type | Meaning |
|---|---|---|
| `schema_version` | integer | `1`. Bumped only on a breaking change to this shape. |
| `generated_at` | string | ISO 8601 UTC time the report was written, e.g. `2026-11-05T15:38:06Z`. |
| `summary` | object | Counts, below. |
| `targets` | array | One record per probed URL, below. |
| `page_urls` | array | 21st.dev page-fetch URL checks (#40), below. |

## `summary`

| Field | Meaning |
|---|---|
| `targets` | Number of URLs probed. |
| `ok`, `rate_limited`, `challenged`, `dead`, `drifted`, `error` | Count per status. |
| `needs_attention` | Failures not covered by a `known_issues[]` record. This is the number the weekly workflow opens an issue on. |
| `known_issues` | Failures that match a documented `known_issues[]` record exactly (same host, same status). |

## `targets[]`

| Field | Type | Meaning |
|---|---|---|
| `kind` | string | `showpiece`, `variant`, `library site`, or `library mirror`. |
| `label` | string | Display name, e.g. `magicui/marquee` or `vue-bits/blur-text [vue]`. Unique within a report. |
| `entry` | string or null | The `showpiece[].name` this target belongs to. `null` for library sites and mirrors. |
| `library` | string | The library the URL belongs to (the variant's library for a `variant`). |
| `framework` | string or null | `react` for a top-level showpiece, the `frameworks` key for a variant, `null` for library targets. |
| `url` | string or null | The URL probed. `null` when the entry had no URL to probe. |
| `status` | string | `ok`, `rate-limited`, `challenged`, `dead`, `drifted`, or `error`. See the script's `probe()` and `check_pin()`. `drifted` means the URL resolves but its registry item no longer matches the entry's `fetch.pin` (#64). |
| `detail` | string | Short reason, e.g. `HTTP 200` or `HTTP 429 (bot-challenge page, not throttling)`. |
| `known_issue` | integer or null | Issue number from `known_issues[]` when this failure is already documented. |
| `pin` | string or null | `match` or `drifted` when the entry carries a `fetch.pin`, `unreadable` when the body was not JSON, `null` when there is no pin or the URL did not resolve. |
| `checked_at` | string | ISO 8601 UTC time this target was probed. |
| `last_ok_at` | string or null | Last time this target returned `ok`. Equal to `checked_at` on success. On a failure it carries over from the previous `health-report.json` in the same checkout, or is `null` when there is none. |

A showpiece with framework variants produces one `showpiece` record and one `variant` record per framework, all with the same `entry`.

## `page_urls[]`

| Field | Meaning |
|---|---|
| `entry` | `showpiece[].name`. |
| `stored_url` | The page URL typed into `ref`. |
| `status` | `match`, `drifted`, or `unverifiable`. |
| `detail` | What the registry reports instead, or why it could not be checked. |
