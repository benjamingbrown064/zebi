# Zebi Design System
**Philosophy:** Calm, spacious, refined. Apple/Linear/Arc/Things 3 aesthetic.

---

## Design Principles (Priority Order)
1. **Clarity** - Information must be instantly scannable
2. **Hierarchy** - Typography and space create structure, not decoration
3. **Spacing** - Generous whitespace, never cramped
4. **Simplicity** - Remove unnecessary elements
5. **Consistency** - Design tokens applied uniformly
6. **Subtle Polish** - Refinement through restraint

---

## Colour Tokens

### Neutrals (Soft, Calm Palette)
```css
--bg-primary: #FAFAFA        /* Main background - soft light grey */
--bg-secondary: #FFFFFF      /* Cards, elevated surfaces */
--bg-tertiary: #F5F5F5       /* Subtle contrast areas */

--text-primary: #1A1A1A      /* Headings, strong text (not pure black) */
--text-secondary: #525252    /* Body text, labels */
--text-tertiary: #A3A3A3     /* Subtle text, hints */

--border-subtle: #E5E5E5     /* Minimal borders only when needed */
--border-medium: #D4D4D4     /* Interactive element borders */
```

### Accent (Single Colour System)
```css
--accent: #DD3A44            /* Zebi red - PRIMARY ONLY */
--accent-hover: #C7333D      /* Hover state */
--accent-light: #FEF2F2      /* Backgrounds, badges */
--accent-border: #FECACA     /* Borders when needed */
```

### Status (Minimal, Clear)
```css
--success: #10B981           /* Green - achievements */
--success-bg: #ECFDF5
--warning: #F59E0B           /* Amber - caution */
--warning-bg: #FFFBEB
--error: #EF4444             /* Red - blocks */
--error-bg: #FEF2F2
```

**Rule:** Use accent for actions/selection only. Status colours only for semantic meaning.

---

## Typography Scale

### Headings (Clear Hierarchy)
```css
--text-3xl: 30px / 36px      /* Page titles */
--text-2xl: 24px / 32px      /* Section headers */
--text-xl: 20px / 28px       /* Card headers */
--text-lg: 18px / 28px       /* Subheadings */
```

### Body Text (Comfortable Reading)
```css
--text-base: 15px / 24px     /* Primary body */
--text-sm: 13px / 20px       /* Labels, metadata */
--text-xs: 12px / 16px       /* Captions, hints */
```

### Weights
- **Regular (400)** - Default for body text
- **Medium (500)** - Headings, emphasis
- **Semibold (600)** - Page titles only

**Rule:** Avoid bold (700+) except for rare emphasis.

---

## Spacing System (8px Grid)

### Base Scale
```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
```

### Layout Application
- **Component padding:** 16-24px (space-4 to space-6)
- **Card padding:** 20-24px (space-5 to space-6)
- **Section spacing:** 32-48px (space-8 to space-12)
- **Page margins:** 48-64px (space-12 to space-16)

**Rule:** Always use 8px increments. Prefer generous spacing over cramped.

---

## Radius System

```css
--radius-sm: 6px             /* Chips, badges */
--radius-md: 10px            /* Buttons, inputs */
--radius-lg: 14px            /* Cards, modals */
--radius-xl: 18px            /* Large containers */
```

**Rule:** Soft corners everywhere. No sharp edges (border-radius < 6px).

---

## Shadow System (Minimal)

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04)              /* Subtle lift */
--shadow-md: 0 2px 8px rgba(0,0,0,0.06)              /* Cards on hover */
--shadow-lg: 0 4px 16px rgba(0,0,0,0.08)             /* Modals only */
```

**Rule:** Shadows are rare. Use only for depth hierarchy (modals > cards > flat).

---

## Surface System

### Elevation Layers
1. **Base (--bg-primary)** - Page background
2. **Raised (--bg-secondary)** - Cards, containers
3. **Floating (--bg-secondary + shadow-md)** - Modals, popovers

**Rule:** Maximum 2 elevation levels visible at once. Avoid "floating card on floating card".

---

## Component Styling Rules

### Buttons
```tsx
// Primary (accent colour only)
<Button className="bg-accent hover:bg-accent-hover text-white rounded-[10px] px-5 py-2.5 font-medium">

// Secondary (subtle, calm)
<Button className="bg-transparent border border-border-medium hover:bg-bg-tertiary text-text-secondary rounded-[10px] px-5 py-2.5">

// Ghost (minimal)
<Button className="bg-transparent hover:bg-bg-tertiary text-text-secondary rounded-[10px] px-3 py-2">
```

**Rule:** Primary buttons are rare. Most actions are secondary/ghost.

### Inputs
```tsx
<Input 
  className="border border-border-medium focus:border-accent rounded-[10px] px-4 py-3 text-[15px]"
  classNames={{
    inputWrapper: "bg-white shadow-none border-border-medium hover:border-border-medium",
    input: "text-text-primary placeholder:text-text-tertiary"
  }}
/>
```

**Rule:** Clean, spacious, easy to scan. No heavy focus rings.

### Cards
```tsx
<Card className="bg-white border border-border-subtle rounded-[14px] p-6 hover:shadow-md transition-shadow">
```

**Rule:** Soft separation. Minimal borders. Hover states are subtle.

### Navigation
```tsx
// Active state
<div className="bg-accent-light text-accent border-l-2 border-accent">

// Inactive state  
<div className="text-text-secondary hover:bg-bg-tertiary">
```

**Rule:** Extremely clear active state. Minimal decoration when inactive.

---

## Layout Guidelines

### Grid System
- **Max content width:** 1280px (centered)
- **Page padding:** 48-64px horizontal
- **Section spacing:** 48px vertical
- **Card grid gaps:** 24px

### Vertical Rhythm
```
Page Title (space-12 bottom)
  ↓
Section Header (space-6 bottom)
  ↓
Content Grid (space-6 gap)
  ↓
Next Section (space-12 top)
```

### Column Layouts
- **Prefer:** Single column, 2-column max
- **Avoid:** 3+ columns (feels cramped)
- **Exception:** Dashboard stats (max 4 columns, generous gaps)

**Rule:** Spacious > Dense. Prefer clear vertical flow.

---

## Interaction States

### Hover
- Buttons: Background colour shift (subtle)
- Cards: Soft shadow lift
- Links: Underline or colour change (never both)

### Active/Selected
- Background: `--accent-light`
- Border: `--accent` (left border, 2px)
- Text: `--accent`

### Focus
- Ring: `--accent` (2px, 2px offset)
- No heavy blue browser default

### Disabled
- Opacity: 0.5
- Cursor: not-allowed
- No interaction

**Rule:** All states must be clear but never loud.

---

## Anti-Patterns (DO NOT USE)

❌ **Heavy borders** - Use `border-border-subtle` or none
❌ **Deep shadows** - Max `shadow-md` for cards
❌ **Gradient backgrounds** - Solid colours only
❌ **Multiple accent colours** - One accent (#DD3A44)
❌ **Sharp corners** - Min radius 6px
❌ **Dense layouts** - Generous spacing always
❌ **Excessive bold text** - Medium (500) is max for most text
❌ **Cluttered dashboards** - Simplify, remove, breathe
❌ **Inconsistent spacing** - Always 8px grid
❌ **Unnecessary UI elements** - If it doesn't add clarity, remove it

---

## HeroUI Configuration

### tailwind.config.ts Theme
```typescript
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#DD3A44',
        foreground: '#FFFFFF',
      },
      background: '#FAFAFA',
      foreground: '#1A1A1A',
    },
    borderRadius: {
      small: '6px',
      medium: '10px',
      large: '14px',
    },
    fontSize: {
      base: ['15px', '24px'],
      sm: ['13px', '20px'],
      xs: ['12px', '16px'],
    },
  }
}
```

### HeroUI Component Defaults
```tsx
// Apply via classNames prop
<HeroUIProvider>
  <Button size="md" radius="md" color="primary" />
  <Input variant="bordered" radius="md" />
  <Card shadow="none" radius="lg" />
</HeroUIProvider>
```

---

## Design Review Checklist

Before shipping any UI:

**Clarity**
- [ ] Can I scan the page in 3 seconds and understand the structure?
- [ ] Is the most important information immediately visible?

**Hierarchy**  
- [ ] Do headings clearly separate sections?
- [ ] Is spacing driving the visual structure?

**Spacing**
- [ ] Does the page feel spacious or cramped?
- [ ] Are all gaps using the 8px grid?

**Simplicity**
- [ ] Can I remove any elements without losing functionality?
- [ ] Is every UI element necessary?

**Consistency**
- [ ] Are all colours from the design tokens?
- [ ] Are all spacing values from the 8px scale?
- [ ] Do all similar components look identical?

**Polish**
- [ ] Are corners consistently rounded?
- [ ] Are shadows minimal and purposeful?
- [ ] Do hover states feel smooth and subtle?

**Anti-Pattern Check**
- [ ] No heavy borders?
- [ ] No sharp corners?
- [ ] No gradient backgrounds?
- [ ] No colour noise?
- [ ] No dense layouts?

---

**Last Updated:** 2026-03-07  
**Status:** Active design system for all Zebi UI components
