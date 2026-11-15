# Interaction-map contract

The map is a design and verification contract, not runtime configuration. An
implementation may adapt it to CSS, Web Animations, GSAP, Framer Motion or a
native platform without changing its semantic fields.

```json
{
  "version": 1,
  "name": "checkout-feedback",
  "motionMode": "system",
  "interactions": [
    {
      "id": "order-confirmed",
      "trigger": "completion",
      "intent": "confirm",
      "state": {"from": "submitting", "to": "confirmed", "meaning": "The order was accepted"},
      "consequence": "persistent-state-change",
      "commitPhase": "activation",
      "feedback": {
        "full": {"pattern": "confirm", "properties": ["opacity", "transform"], "durationToken": "motion.micro"},
        "reduced": {"pattern": "highlight"},
        "none": {"pattern": "instant-state"},
        "semanticAnnouncement": "status",
        "soundEvent": "action.confirmed"
      },
      "equivalents": {"keyboard": "Activate the submit button", "singlePointer": "Tap the submit button"},
      "behavior": {"interruptible": true, "oncePerAction": true, "rateLimitMs": 300},
      "essential": false
    }
  ]
}
```

## Stable invariants

- `version` is `1`; `interactions` is non-empty; every `id` is non-empty and
  unique.
- `trigger` is semantic: `activate`, `focus`, `hover`, `state-change`,
  `validation`, `completion`, or `gesture-end`.
- `intent` is `acknowledge`, `confirm`, `reject`, `reveal`, `connect`,
  `progress`, or `settle`.
- Required content or functionality is never hover-only. A state-changing hover
  interaction names focus/activation or a separate control equivalent.
- Non-essential transform, position, scale, rotation, parallax or path movement
  has a reduced or no-motion representation that removes the spatial travel.
- `essential: true` carries `essentialReason`; do not use the boolean as an
  escape hatch.
- A destructive, submission, navigation or persistent change does not commit on
  pointer-down unless `undo.enabled` or a genuine essential exception is named.
- Sound is only `feedback.soundEvent`, plus an optional rate-limit hint. Asset
  paths, autoplay, provider, volume and playback objects are invalid here.

## Accessibility basis

- WCAG 2.2 SC 2.1.1: keyboard operation.
- SC 2.5.1 and 2.5.7: simple-pointer alternatives and non-dragging operation.
- SC 2.5.2: cancellation of down-event activation.
- SC 1.4.13: hover/focus disclosures remain dismissible, hoverable and
  persistent where applicable.
- SC 4.1.3: real status messages are programmatically determinable.
- SC 2.3.3: non-essential interaction-triggered motion can be disabled. This is
  Level AAA; Humane adopts the stronger behavior as product policy and does not
  mislabel it an AA requirement.
