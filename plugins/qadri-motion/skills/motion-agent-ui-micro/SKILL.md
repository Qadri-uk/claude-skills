---
name: motion-agent-ui-micro
description: Micro-interaction animations for UI feedback including button states, form validation, toggles, tooltips, and haptic-feel effects. Use when adding polish to interactive elements, providing user feedback, or creating delightful UI details.
---

# UI Micro-Interactions

Small, purposeful animations that enhance user experience.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| Material Design 3 | m3.material.io/foundations/interaction |
| Apple HIG | developer.apple.com/design/human-interface-guidelines |

## Quick Reference

Uses tokens from: `tokens/motion.tokens.json`, `tokens/spring.tokens.json`

### Interaction Timings

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button press | 100ms | ease-out |
| Toggle switch | 200ms | spring |
| Tooltip show | 150ms | ease-out |
| Form error | 300ms | bounce |
| Checkbox | 200ms | ease-out |

## Selection Guide

```
What micro-interaction?
│
├── BUTTON STATES → Press feedback
│   ├── Scale down → tactile feel
│   ├── Ripple → material style
│   ├── Glow → highlight state
│   └── Color shift → state indication
│
├── FORM ELEMENTS → Input feedback
│   ├── Focus → highlight border
│   ├── Error → shake + red
│   ├── Success → checkmark + green
│   └── Loading → spinner in field
│
├── TOGGLES → State switches
│   ├── Switch → slide animation
│   ├── Checkbox → check draw
│   ├── Radio → fill animation
│   └── Segmented → indicator slide
│
├── FEEDBACK → User acknowledgment
│   ├── Success → checkmark pop
│   ├── Error → shake
│   ├── Warning → pulse
│   └── Info → subtle bounce
│
└── HOVER EFFECTS → Cursor feedback
    ├── Scale → grow on hover
    ├── Lift → shadow + translate
    ├── Glow → subtle highlight
    └── Underline → link indication
```

## Patterns

### Button Press

Tactile feedback on click.

**CSS:**
```css
.button {
  transition: transform 100ms ease-out, box-shadow 100ms ease-out;
  /* {motion.duration.short-2} */
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

**Framer Motion:**
```tsx
<motion.button
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>
```

### Material Ripple

Expanding ripple from click point.

**JavaScript:**
```javascript
function createRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');

  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: scale(0);
    pointer-events: none;
  `;

  button.style.position = 'relative';
  button.style.overflow = 'hidden';
  button.appendChild(ripple);

  ripple.animate([
    { transform: 'scale(0)', opacity: 1 },
    { transform: 'scale(2)', opacity: 0 }
  ], {
    duration: 600,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }).onfinish = () => ripple.remove();
}
```

### Toggle Switch

Smooth sliding toggle.

**CSS:**
```css
.toggle {
  width: 52px;
  height: 32px;
  background: #ccc;
  border-radius: 16px;
  padding: 2px;
  cursor: pointer;
  transition: background 200ms ease-out;
}

.toggle.active {
  background: #3b82f6;
}

.toggle-handle {
  width: 28px;
  height: 28px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  /* Spring-like easing */
}

.toggle.active .toggle-handle {
  transform: translateX(20px);
}
```

**Framer Motion:**
```tsx
const Toggle = ({ isOn, onToggle }) => (
  <motion.div
    className="toggle"
    onClick={onToggle}
    animate={{ backgroundColor: isOn ? '#3b82f6' : '#ccc' }}
  >
    <motion.div
      className="toggle-handle"
      animate={{ x: isOn ? 20 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </motion.div>
);
```

### Checkbox Animation

Checkmark draw-on effect.

**CSS:**
```css
.checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #ccc;
  border-radius: 4px;
  position: relative;
  transition: border-color 150ms, background 150ms;
}

.checkbox.checked {
  border-color: #3b82f6;
  background: #3b82f6;
}

.checkbox .checkmark {
  position: absolute;
  top: 4px;
  left: 7px;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  transform-origin: bottom right;
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.checkbox.checked .checkmark {
  transform: rotate(45deg) scale(1);
}
```

**SVG Draw-on:**
```javascript
function animateCheckmark(svg) {
  const path = svg.querySelector('path');
  const length = path.getTotalLength();

  path.style.strokeDasharray = length;
  path.style.strokeDashoffset = length;

  path.animate([
    { strokeDashoffset: length },
    { strokeDashoffset: 0 }
  ], {
    duration: 300,
    easing: 'ease-out',
    fill: 'forwards'
  });
}
```

### Input Focus

Enhanced focus state.

**CSS:**
```css
.input {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  transition: border-color 150ms, box-shadow 150ms;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

/* Label float animation */
.input-wrapper {
  position: relative;
}

.input-label {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  transition: all 150ms ease-out;
  pointer-events: none;
}

.input:focus + .input-label,
.input:not(:placeholder-shown) + .input-label {
  top: 0;
  transform: translateY(-50%) scale(0.85);
  background: white;
  padding: 0 4px;
  color: #3b82f6;
}
```

### Error Shake

Form validation feedback.

**CSS:**
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.input.error {
  border-color: #ef4444;
  animation: shake 400ms ease-in-out;
}
```

**JavaScript:**
```javascript
function shakeElement(element) {
  element.classList.add('error');

  element.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(-2px)' },
    { transform: 'translateX(2px)' },
    { transform: 'translateX(0)' }
  ], {
    duration: 400,
    easing: 'ease-in-out'
  });
}
```

### Success Feedback

Confirmation animation.

**CSS:**
```css
@keyframes success-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.success-icon {
  animation: success-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Complete success state:**
```javascript
function showSuccess(container) {
  const icon = container.querySelector('.success-icon');
  const message = container.querySelector('.success-message');

  // Icon pop
  icon.animate([
    { transform: 'scale(0)', opacity: 0 },
    { transform: 'scale(1.2)', opacity: 1 },
    { transform: 'scale(1)', opacity: 1 }
  ], {
    duration: 400,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    fill: 'forwards'
  });

  // Message fade in
  message.animate([
    { opacity: 0, transform: 'translateY(10px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], {
    duration: 300,
    delay: 200,
    easing: 'ease-out',
    fill: 'forwards'
  });
}
```

### Tooltip Animation

Smooth tooltip appearance.

**CSS:**
```css
.tooltip {
  position: absolute;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 150ms, transform 150ms;
  pointer-events: none;
}

.tooltip.visible {
  opacity: 1;
  transform: translateY(0);
}

/* With delay for hover stability */
[data-tooltip]:hover .tooltip {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 200ms;
}
```

**Framer Motion:**
```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      className="tooltip"
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

### Hover Lift

Card lift on hover.

**CSS:**
```css
.card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.07),
    0 12px 24px rgba(0, 0, 0, 0.1);
}
```

### Loading Button

Button with loading state.

**CSS:**
```css
.button-loading {
  position: relative;
  color: transparent;
}

.button-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin: -8px 0 0 -8px;
  border: 2px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Button scale | Opacity change |
| Ripple effect | Instant highlight |
| Toggle slide | Instant state change |
| Shake | Border color change |
| Tooltip animation | Instant show/hide |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .button {
    transition: opacity 100ms;
  }

  .button:active {
    transform: none;
    opacity: 0.8;
  }

  .toggle-handle {
    transition: none;
  }

  .input.error {
    animation: none;
  }
}
```

## Cross-References

- See `easing/` for spring configurations
- See `duration/` for timing standards
- See `component-animations/` for larger patterns
- See `accessibility/` for reduced motion

## References

- `references/micro-patterns.md` — Common micro-interaction patterns
