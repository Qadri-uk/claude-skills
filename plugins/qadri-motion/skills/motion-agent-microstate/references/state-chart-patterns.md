# State Chart Patterns

Comprehensive state machine patterns for interactive UI components.

## Pattern Library

### Complete Button State Chart

```
╔══════════════════════════════════════════════════════════════════╗
║                         BUTTON STATE CHART                        ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║    ┌────────────────────────────────────────────────────────┐    ║
║    │                     ENABLED                            │    ║
║    │                                                        │    ║
║    │    ┌─────────┐  pointerenter  ┌─────────┐             │    ║
║    │    │  IDLE   │───────────────►│  HOVER  │             │    ║
║    │    └────┬────┘◄───────────────└────┬────┘             │    ║
║    │         │      pointerleave        │                  │    ║
║    │         │                          │ pointerdown      │    ║
║    │         │                     ┌────▼────┐             │    ║
║    │         │                     │ ACTIVE  │             │    ║
║    │         │                     └────┬────┘             │    ║
║    │         │                          │                  │    ║
║    │         │        ┌─────────────────┼─────────────┐    │    ║
║    │         │        │                 │             │    │    ║
║    │    ┌────▼────┐   │   ┌────────┐   │  ┌────────┐ │    │    ║
║    │    │ SUCCESS │◄──┴───│LOADING │◄──┴──│  ERROR │ │    │    ║
║    │    └─────────┘       └────────┘      └────────┘ │    │    ║
║    │         │                                │      │    │    ║
║    │         └──────────────┬─────────────────┘      │    ║
║    │                        │                        │    ║
║    └────────────────────────┼────────────────────────┘    ║
║                             │                             ║
║    ┌────────────────────────▼────────────────────────┐    ║
║    │                    DISABLED                      │    ║
║    │                 (terminal state)                 │    ║
║    └──────────────────────────────────────────────────┘    ║
║                                                           ║
╚══════════════════════════════════════════════════════════════════╝
```

### State Definitions

```javascript
const buttonStates = {
  // ═══════════════════════════════════════════════════
  // IDLE - Default resting state
  // ═══════════════════════════════════════════════════
  idle: {
    entry: ['resetStyles'],
    style: {
      scale: 1,
      opacity: 1,
      backgroundColor: 'var(--button-bg)',
      boxShadow: 'var(--elevation-1)'
    },
    on: {
      POINTER_ENTER: { target: 'hover' },
      FOCUS: { target: 'idle.focused' },
      DISABLE: { target: 'disabled' }
    },
    states: {
      unfocused: {},
      focused: {
        style: { outline: '3px solid var(--focus-ring)' },
        on: { BLUR: { target: '#idle.unfocused' } }
      }
    }
  },

  // ═══════════════════════════════════════════════════
  // HOVER - Pointer over state
  // ═══════════════════════════════════════════════════
  hover: {
    entry: ['playHoverIn'],
    exit: ['playHoverOut'],
    style: {
      scale: 1.02,
      boxShadow: 'var(--elevation-2)',
      stateLayer: 0.08
    },
    transition: {
      duration: 100,
      ease: 'power2.out'
    },
    on: {
      POINTER_LEAVE: { target: 'idle' },
      POINTER_DOWN: { target: 'active' },
      FOCUS: { actions: ['addFocusRing'] }
    }
  },

  // ═══════════════════════════════════════════════════
  // ACTIVE - Being pressed
  // ═══════════════════════════════════════════════════
  active: {
    entry: ['playPressDown'],
    style: {
      scale: 0.98,
      stateLayer: 0.12
    },
    transition: {
      duration: 50,
      ease: 'power2.in'
    },
    on: {
      POINTER_UP: [
        { target: 'loading', cond: 'hasAsyncAction' },
        { target: 'success', cond: 'isSyncSuccess' },
        { target: 'hover' }
      ],
      POINTER_LEAVE: { target: 'idle' }
    }
  },

  // ═══════════════════════════════════════════════════
  // LOADING - Async operation in progress
  // ═══════════════════════════════════════════════════
  loading: {
    entry: ['startSpinner', 'disableInteraction'],
    exit: ['stopSpinner', 'enableInteraction'],
    style: {
      opacity: 0.7,
      cursor: 'wait'
    },
    animation: {
      type: 'pulse',
      duration: 1200,
      repeat: Infinity
    },
    on: {
      RESOLVE: { target: 'success' },
      REJECT: { target: 'error' }
    },
    after: {
      10000: { target: 'error', actions: ['setTimeoutError'] }
    }
  },

  // ═══════════════════════════════════════════════════
  // SUCCESS - Action completed successfully
  // ═══════════════════════════════════════════════════
  success: {
    entry: ['playSuccessAnimation', 'showCheckmark'],
    exit: ['hideCheckmark'],
    style: {
      backgroundColor: 'var(--success)',
      scale: 1.05
    },
    transition: {
      duration: 200,
      type: 'spring',
      stiffness: 300,
      damping: 15
    },
    after: {
      2000: { target: 'idle' }
    }
  },

  // ═══════════════════════════════════════════════════
  // ERROR - Action failed
  // ═══════════════════════════════════════════════════
  error: {
    entry: ['playErrorAnimation', 'showErrorIcon'],
    exit: ['hideErrorIcon'],
    style: {
      backgroundColor: 'var(--error)'
    },
    animation: {
      type: 'shake',
      x: [-10, 10, -10, 10, 0],
      duration: 400
    },
    on: {
      DISMISS: { target: 'idle' },
      RETRY: { target: 'active' }
    },
    after: {
      5000: { target: 'idle', cond: 'autoRecover' }
    }
  },

  // ═══════════════════════════════════════════════════
  // DISABLED - Non-interactive
  // ═══════════════════════════════════════════════════
  disabled: {
    entry: ['disableInteraction'],
    exit: ['enableInteraction'],
    style: {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none'
    },
    on: {
      ENABLE: { target: 'idle' }
    }
  }
};
```

### Form Input State Chart

```javascript
const inputStates = {
  // Empty, no value
  empty: {
    style: {
      labelPosition: 'inside',
      labelScale: 1,
      borderColor: 'var(--neutral)'
    },
    on: {
      FOCUS: 'focused.empty',
      SET_VALUE: 'filled'
    }
  },

  // Has value but not focused
  filled: {
    style: {
      labelPosition: 'above',
      labelScale: 0.75,
      borderColor: 'var(--neutral)'
    },
    on: {
      FOCUS: 'focused.filled',
      CLEAR: 'empty',
      VALIDATE: [
        { target: 'valid', cond: 'isValid' },
        { target: 'invalid', cond: 'isInvalid' }
      ]
    }
  },

  // Focused states (parallel)
  focused: {
    style: {
      borderColor: 'var(--primary)',
      borderWidth: 2
    },
    states: {
      empty: {
        style: {
          labelPosition: 'above',
          labelScale: 0.75
        },
        on: {
          BLUR: 'empty',
          INPUT: 'focused.filled'
        }
      },
      filled: {
        on: {
          BLUR: 'filled',
          CLEAR: 'focused.empty'
        }
      }
    }
  },

  // Validation states
  valid: {
    style: {
      borderColor: 'var(--success)',
      showSuccessIcon: true
    },
    on: {
      FOCUS: 'focused.filled',
      INPUT: 'filled'
    }
  },

  invalid: {
    entry: ['shakeField', 'showError'],
    style: {
      borderColor: 'var(--error)',
      showErrorIcon: true
    },
    on: {
      FOCUS: 'focused.filled',
      INPUT: 'filled'
    }
  }
};
```

### Dropdown State Chart

```javascript
const dropdownStates = {
  closed: {
    style: {
      menuHeight: 0,
      menuOpacity: 0,
      iconRotation: 0
    },
    on: {
      OPEN: 'opening',
      FOCUS: 'closed.focused'
    },
    states: {
      unfocused: {},
      focused: {
        on: {
          ENTER: 'opening',
          ARROW_DOWN: 'opening'
        }
      }
    }
  },

  opening: {
    animation: {
      menuHeight: [0, 'auto'],
      menuOpacity: [0, 1],
      iconRotation: [0, 180],
      duration: 200,
      ease: 'emphasized-decelerate'
    },
    after: {
      200: 'open'
    }
  },

  open: {
    style: {
      menuHeight: 'auto',
      menuOpacity: 1,
      iconRotation: 180
    },
    on: {
      CLOSE: 'closing',
      SELECT: { actions: ['selectItem'], target: 'closing' },
      ESCAPE: 'closing',
      CLICK_OUTSIDE: 'closing'
    }
  },

  closing: {
    animation: {
      menuHeight: ['auto', 0],
      menuOpacity: [1, 0],
      iconRotation: [180, 0],
      duration: 150,
      ease: 'emphasized-accelerate'
    },
    after: {
      150: 'closed'
    }
  }
};
```

## Animation Actions

```javascript
const actions = {
  playHoverIn: (context, event) => {
    gsap.to(context.element, {
      scale: 1.02,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      duration: 0.1,
      ease: 'power2.out'
    });
  },

  playHoverOut: (context, event) => {
    gsap.to(context.element, {
      scale: 1,
      boxShadow: 'none',
      duration: 0.15,
      ease: 'power2.out'
    });
  },

  playPressDown: (context, event) => {
    gsap.to(context.element, {
      scale: 0.98,
      duration: 0.05,
      ease: 'power2.in'
    });
  },

  playSuccessAnimation: (context, event) => {
    const tl = gsap.timeline();

    tl.to(context.element, {
      backgroundColor: '#4CAF50',
      scale: 1.05,
      duration: 0.2,
      ease: 'back.out(2)'
    });

    tl.to(context.checkmark, {
      scale: 1,
      opacity: 1,
      duration: 0.15,
      ease: 'back.out(2)'
    }, '-=0.1');

    return tl;
  },

  playErrorAnimation: (context, event) => {
    gsap.to(context.element, {
      x: 10,
      duration: 0.08,
      repeat: 3,
      yoyo: true,
      ease: 'power2.inOut'
    });
  },

  shakeField: (context, event) => {
    gsap.to(context.element, {
      x: [-5, 5, -5, 5, 0],
      duration: 0.4,
      ease: 'power2.inOut'
    });
  },

  startSpinner: (context, event) => {
    context.spinnerTween = gsap.to(context.spinner, {
      rotate: 360,
      duration: 1,
      repeat: -1,
      ease: 'linear'
    });
  },

  stopSpinner: (context, event) => {
    if (context.spinnerTween) {
      context.spinnerTween.kill();
    }
  }
};
```

## Transition Timing Reference

| Transition | Duration | Easing |
|------------|----------|--------|
| idle → hover | 100ms | power2.out |
| hover → idle | 150ms | power2.out |
| hover → active | 50ms | power2.in |
| active → loading | 100ms | standard |
| loading → success | 200ms | spring |
| loading → error | 150ms | standard |
| success → idle | 300ms | ease-out |
| error → idle | 200ms | ease-out |

## Guards and Conditions

```javascript
const guards = {
  hasAsyncAction: (context) => {
    return typeof context.onClick === 'function' &&
           context.onClick.constructor.name === 'AsyncFunction';
  },

  isSyncSuccess: (context, event) => {
    return event.type === 'POINTER_UP' && context.syncResult === 'success';
  },

  isValid: (context) => {
    return context.validationResult === true;
  },

  isInvalid: (context) => {
    return context.validationResult === false;
  },

  autoRecover: (context) => {
    return context.autoRecoverEnabled === true;
  }
};
```
