---
name: motion-agent-microstate
description: Deep component state orchestration with state machines. Use for complex interactive components - buttons with idle/hover/active/loading/success/error states, form fields, toggles, accordions - defining valid transitions and state-specific animations.
---

# Microstate

Component-level state machine orchestration. Define granular states, valid transitions, and state-specific motion for interactive UI components.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| XState | State machine patterns |
| Material Design 3 | m3.material.io/styles/motion |
| ARIA | State management for accessibility |

## Quick Reference

Load from: `tokens/microstate.tokens.json`

### Core States

| State | Visual Profile | Motion | Stable? |
|-------|----------------|--------|---------|
| **idle** | Base appearance | None | Yes |
| **hover** | +2% scale, 8% state layer | 100ms | No |
| **focus** | Focus ring | 50ms | No |
| **active** | -2% scale, 12% state layer | 50ms | No |
| **disabled** | 38% opacity | None | Yes |
| **loading** | 70% opacity, pulse | 1200ms loop | No |
| **success** | Green, checkmark | 300ms spring | Transient |
| **error** | Red, shake | 400ms | Needs resolution |
| **selected** | Accent background | 150ms | Yes |
| **dragging** | +5% scale, elevated | Follow pointer | No |

## State Machine Pattern

```
                    ┌─────────────────────────────────┐
                    │                                 │
         ┌──────────▼───────────┐                     │
    ┌───►│        IDLE          │◄────────────────────┤
    │    └──────────┬───────────┘                     │
    │               │ pointerenter                    │
    │    ┌──────────▼───────────┐                     │
    │    │        HOVER         │──────┐              │
    │    └──────────┬───────────┘      │              │
    │               │ pointerdown      │ pointerleave │
    │    ┌──────────▼───────────┐      │              │
    │    │       ACTIVE         │──────┼──────────────┘
    │    └──────────┬───────────┘      │
    │               │                  │
    │    ┌──────────┼──────────┐       │
    │    │          │          │       │
    │    ▼          ▼          ▼       │
    │ SUCCESS   LOADING     ERROR      │
    │    │          │          │       │
    │    └──────────┴──────────┴───────┘
    │               │
    │               │ timeout / dismiss
    └───────────────┘
```

## Selection Guide

```
What component type?

├── Button (click action)
│   └── States: idle, hover, focus, active, loading, success, error, disabled
│
├── Form input
│   └── States: empty, focus, filled, error, success, disabled
│
├── Checkbox/Radio
│   └── States: unchecked, hover, focus, active, checked, indeterminate, disabled
│
├── Toggle switch
│   └── States: off, hover-off, on, hover-on, focus, disabled
│
├── Card (interactive)
│   └── States: idle, hover, focus, active, expanded, selected, dragging
│
├── Accordion
│   └── States: collapsed, hover, expanding, expanded, collapsing
│
└── Dropdown
    └── States: closed, opening, open, closing, disabled
```

## State Implementations

### Button State Machine

```typescript
type ButtonState = 'idle' | 'hover' | 'focus' | 'active' | 'loading' | 'success' | 'error' | 'disabled';

const buttonMachine = {
  initial: 'idle',
  states: {
    idle: {
      style: { scale: 1, opacity: 1 },
      on: {
        POINTER_ENTER: 'hover',
        FOCUS: 'focus',
        DISABLE: 'disabled'
      }
    },
    hover: {
      style: {
        scale: 1.02,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      },
      transition: { duration: 100, ease: 'standard' },
      on: {
        POINTER_LEAVE: 'idle',
        POINTER_DOWN: 'active',
        FOCUS: 'focus'
      }
    },
    focus: {
      style: { outline: '3px solid var(--focus-ring)' },
      transition: { duration: 50 },
      parallel: true, // Can coexist with hover
      on: {
        BLUR: 'idle',
        POINTER_DOWN: 'active'
      }
    },
    active: {
      style: { scale: 0.98 },
      transition: { duration: 50, ease: 'emphasized-accelerate' },
      on: {
        POINTER_UP: 'idle',
        SUBMIT: 'loading',
        SUCCESS: 'success',
        ERROR: 'error'
      }
    },
    loading: {
      style: { opacity: 0.7 },
      animation: { type: 'pulse', duration: 1200, repeat: true },
      on: {
        COMPLETE: 'success',
        FAIL: 'error'
      }
    },
    success: {
      style: { backgroundColor: 'var(--success)' },
      transition: { duration: 200, type: 'spring' },
      transient: true,
      autoExit: { to: 'idle', delay: 2000 },
      on: {}
    },
    error: {
      style: { backgroundColor: 'var(--error)' },
      animation: { type: 'shake', duration: 400 },
      on: {
        DISMISS: 'idle',
        RETRY: 'active'
      }
    },
    disabled: {
      style: { opacity: 0.38, pointerEvents: 'none' },
      on: {
        ENABLE: 'idle'
      }
    }
  }
};
```

**GSAP Implementation:**
```javascript
class ButtonStateMachine {
  constructor(element) {
    this.element = element;
    this.state = 'idle';
    this.setupListeners();
  }

  transition(newState) {
    const fromState = this.state;
    const toState = newState;

    // Kill any ongoing animations
    gsap.killTweensOf(this.element);

    // Get transition config
    const config = this.getTransitionConfig(fromState, toState);

    // Animate
    gsap.to(this.element, {
      ...config.style,
      duration: config.duration / 1000,
      ease: config.ease
    });

    // Handle special animations
    if (config.animation) {
      this.playAnimation(config.animation);
    }

    // Handle auto-exit
    if (config.autoExit) {
      setTimeout(() => {
        this.transition(config.autoExit.to);
      }, config.autoExit.delay);
    }

    this.state = newState;
  }

  getTransitionConfig(from, to) {
    const transitions = {
      'idle-hover': {
        style: { scale: 1.02, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
        duration: 100,
        ease: 'power2.out'
      },
      'hover-idle': {
        style: { scale: 1, boxShadow: 'none' },
        duration: 150,
        ease: 'power2.out'
      },
      'hover-active': {
        style: { scale: 0.98 },
        duration: 50,
        ease: 'power2.in'
      },
      'active-success': {
        style: { backgroundColor: '#4CAF50', scale: 1.05 },
        duration: 200,
        ease: 'back.out(2)',
        autoExit: { to: 'idle', delay: 2000 }
      },
      'active-error': {
        style: { backgroundColor: '#f44336' },
        duration: 150,
        animation: { type: 'shake' }
      }
    };

    return transitions[`${from}-${to}`] || { style: {}, duration: 200 };
  }

  playAnimation(config) {
    if (config.type === 'shake') {
      gsap.to(this.element, {
        x: 10,
        duration: 0.08,
        repeat: 3,
        yoyo: true,
        ease: 'power2.inOut'
      });
    } else if (config.type === 'pulse') {
      gsap.to(this.element, {
        opacity: 0.6,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }
  }

  setupListeners() {
    this.element.addEventListener('pointerenter', () => {
      if (this.state === 'idle') this.transition('hover');
    });

    this.element.addEventListener('pointerleave', () => {
      if (this.state === 'hover') this.transition('idle');
    });

    this.element.addEventListener('pointerdown', () => {
      if (['idle', 'hover'].includes(this.state)) this.transition('active');
    });

    this.element.addEventListener('pointerup', () => {
      if (this.state === 'active') this.transition('hover');
    });
  }
}
```

### Checkbox State Machine

```javascript
const checkboxMachine = {
  initial: 'unchecked',
  states: {
    unchecked: {
      style: { '--check-scale': 0 },
      on: { TOGGLE: 'checking' }
    },
    checking: {
      animation: {
        '--check-scale': [0, 1.2, 1],
        duration: 150,
        ease: 'back.out(2)'
      },
      autoTransition: { to: 'checked', delay: 150 }
    },
    checked: {
      style: { '--check-scale': 1 },
      on: { TOGGLE: 'unchecking' }
    },
    unchecking: {
      animation: {
        '--check-scale': [1, 0],
        duration: 100,
        ease: 'power2.in'
      },
      autoTransition: { to: 'unchecked', delay: 100 }
    }
  }
};

// CSS for checkbox
/*
.checkbox-mark {
  transform: scale(var(--check-scale, 0));
  transform-origin: center;
}
*/
```

### Toggle Switch

```javascript
const toggleMachine = {
  initial: 'off',
  states: {
    off: {
      style: {
        '--thumb-x': '0%',
        '--track-bg': 'var(--neutral)'
      },
      on: { TOGGLE: 'transitioning-on' }
    },
    'transitioning-on': {
      animation: {
        '--thumb-x': ['0%', '100%'],
        '--track-bg': ['var(--neutral)', 'var(--primary)'],
        duration: 200,
        ease: 'spring'
      },
      autoTransition: { to: 'on', delay: 200 }
    },
    on: {
      style: {
        '--thumb-x': '100%',
        '--track-bg': 'var(--primary)'
      },
      on: { TOGGLE: 'transitioning-off' }
    },
    'transitioning-off': {
      animation: {
        '--thumb-x': ['100%', '0%'],
        '--track-bg': ['var(--primary)', 'var(--neutral)'],
        duration: 200,
        ease: 'spring'
      },
      autoTransition: { to: 'off', delay: 200 }
    }
  }
};
```

### Form Input

```javascript
const inputMachine = {
  initial: 'empty',
  states: {
    empty: {
      style: { '--label-y': '50%', '--label-scale': 1 },
      on: {
        FOCUS: 'focus-empty',
        INPUT: 'filled'
      }
    },
    'focus-empty': {
      style: {
        '--label-y': '0%',
        '--label-scale': 0.75,
        '--border-color': 'var(--primary)'
      },
      transition: { duration: 150 },
      on: {
        BLUR: 'empty',
        INPUT: 'focus-filled'
      }
    },
    'focus-filled': {
      style: {
        '--label-y': '0%',
        '--label-scale': 0.75,
        '--border-color': 'var(--primary)'
      },
      on: {
        BLUR: 'filled',
        CLEAR: 'focus-empty'
      }
    },
    filled: {
      style: {
        '--label-y': '0%',
        '--label-scale': 0.75,
        '--border-color': 'var(--neutral)'
      },
      on: {
        FOCUS: 'focus-filled',
        CLEAR: 'empty',
        VALIDATE_ERROR: 'error',
        VALIDATE_SUCCESS: 'success'
      }
    },
    error: {
      style: {
        '--border-color': 'var(--error)',
        '--shake': 1
      },
      animation: { type: 'shake', duration: 400 },
      on: {
        FOCUS: 'focus-filled',
        INPUT: 'filled'
      }
    },
    success: {
      style: { '--border-color': 'var(--success)' },
      on: {
        FOCUS: 'focus-filled',
        INPUT: 'filled'
      }
    }
  }
};
```

### Accordion

```javascript
const accordionMachine = {
  initial: 'collapsed',
  states: {
    collapsed: {
      style: {
        '--content-height': '0px',
        '--icon-rotation': '0deg'
      },
      on: { TOGGLE: 'expanding' }
    },
    expanding: {
      animation: {
        '--content-height': ['0px', 'var(--full-height)'],
        '--icon-rotation': ['0deg', '180deg'],
        duration: 300,
        ease: 'emphasized'
      },
      autoTransition: { to: 'expanded', delay: 300 }
    },
    expanded: {
      style: {
        '--content-height': 'var(--full-height)',
        '--icon-rotation': '180deg'
      },
      on: { TOGGLE: 'collapsing' }
    },
    collapsing: {
      animation: {
        '--content-height': ['var(--full-height)', '0px'],
        '--icon-rotation': ['180deg', '0deg'],
        duration: 250,
        ease: 'emphasized-accelerate'
      },
      autoTransition: { to: 'collapsed', delay: 250 }
    }
  }
};
```

## Framer Motion Implementation

```tsx
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

function StatefulButton({ onClick, children }) {
  const [state, setState] = useState<ButtonState>('idle');
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    idle: { scale: 1, opacity: 1 },
    hover: { scale: shouldReduceMotion ? 1 : 1.02 },
    active: { scale: shouldReduceMotion ? 1 : 0.98 },
    loading: { opacity: 0.7 },
    success: { backgroundColor: '#4CAF50' },
    error: { x: [0, -10, 10, -10, 10, 0] }
  };

  return (
    <motion.button
      variants={variants}
      animate={state}
      onHoverStart={() => setState('hover')}
      onHoverEnd={() => setState('idle')}
      onTapStart={() => setState('active')}
      onTap={async () => {
        setState('loading');
        try {
          await onClick();
          setState('success');
          setTimeout(() => setState('idle'), 2000);
        } catch {
          setState('error');
        }
      }}
      transition={{
        duration: state === 'error' ? 0.4 : 0.1,
        ease: state === 'success' ? [0.34, 1.56, 0.64, 1] : 'easeOut'
      }}
    >
      {children}
    </motion.button>
  );
}
```

## Transition Priorities

When multiple state changes compete:

| Priority | Rule |
|----------|------|
| 1 | Interrupt current for `error` |
| 2 | Queue for `loading` to `success`/`error` |
| 3 | Blend for hover/focus coexistence |

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced |
|-------------|---------|
| Scale changes | Opacity only |
| Shake animation | Static error indicator |
| Spring transitions | Instant state |
| Hover elevation | Border/outline only |

## Cross-References

- See `state-layer/` for M3 state layer tokens
- See `emotion-mapping/` for emotional state profiles
- See `consequence/` for multi-component state chains
- See `accessibility/` for ARIA state management

## References

- `references/state-chart-patterns.md` — Complete state chart patterns
