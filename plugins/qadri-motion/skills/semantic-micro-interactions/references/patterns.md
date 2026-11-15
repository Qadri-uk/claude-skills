# Semantic micro-interaction patterns

Select the smallest pattern that explains the transition. Combining patterns is
allowed when each has a separate job; a stack of effects with one job is noise.

| Pattern | Use when | Required behavior | Common failure |
| --- | --- | --- | --- |
| Acknowledge | Input was received but the result is not known yet | Immediate bounded press/highlight; returns to a truthful pending or rest state | Press appearance falsely reads as success |
| Confirm | A requested change completed | New state is visible independently of motion; optional status message for a real result | Confetti or sound carries the only confirmation |
| Reject | Input was invalid or an action failed | Explain the problem and recovery; focus stays useful | Repeated shake, red-only state, focus theft |
| Reveal | Content became available | Preserve source/focus order and a discoverable close/reverse action | Hover-only content or focus landing behind an overlay |
| Connect | Two states or objects need spatial continuity | Animate only the relationship that helps orientation | Everything on the screen moves together |
| Progress | Work continues over time | Use determinate semantics when progress is known; rate-limit announcements | Endless spinner with no status or recovery |
| Settle | Direct manipulation committed | Follow input during manipulation, then produce one interruptible completion | Sound or snap on every drag event |

## Timing and properties

Use existing duration and dimension tokens. If the system has no suitable role,
name the missing token for `design-tokens`; do not mint a number in this skill.
Prefer compositor-friendly opacity and transform for the full treatment, but do
not mistake technical smoothness for semantic necessity.

The state change is immediate even if its representation eases into place. A
new input interrupts or retargets the current transition rather than queuing a
backlog. Reversal returns to a valid state, not a half-interpolated appearance.

## Reduced motion

Choose a substitution by job:

- Orientation: instant placement plus restrained highlight.
- Reveal: content appears in place; optional short opacity change.
- Confirmation: icon/text/status change without travel or scale.
- Progress: static progress semantics or infrequent value changes.
- Direct manipulation: manipulation remains direct; remove inertial travel and
  animated settling where it is not essential.

Opacity is not spatial motion, but it can still distract or hide content. Keep
it restrained and never make reading depend on waiting for a fade.
