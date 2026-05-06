---
name: SmartSQL – Text-to-SQL Analytics Portal

colors:
  # ── Surfaces ────────────────────────────────────────────────────────────────
  surface:                    "#ffffff"
  surface-dim:                "#f9fafb"
  surface-bright:             "#ffffff"
  surface-container-lowest:   "#ffffff"
  surface-container-low:      "#f9fafb"
  surface-container:          "#f3f4f6"
  surface-container-high:     "#e5e7eb"
  surface-container-highest:  "#d1d5db"
  on-surface:                 "#111827"
  on-surface-variant:         "#6b7280"
  inverse-surface:            "#1f2937"
  inverse-on-surface:         "#f9fafb"
  outline:                    "#9ca3af"
  outline-variant:            "#e5e7eb"
  surface-tint:               "#2563eb"

  # ── Primary (brand blue) ────────────────────────────────────────────────────
  primary:                    "#2563eb"
  on-primary:                 "#ffffff"
  primary-container:          "#dbeafe"
  on-primary-container:       "#1d4ed8"
  inverse-primary:            "#60a5fa"
  primary-dim:                "#1d4ed8"
  primary-subtle:             "#eff6ff"

  # ── Secondary (dark sidebar / data chrome) ──────────────────────────────────
  secondary:                  "#111827"
  on-secondary:               "#f9fafb"
  secondary-container:        "#1f2937"
  on-secondary-container:     "#d1d5db"
  secondary-accent:           "#374151"

  # ── Tertiary (AI / accent violet) ───────────────────────────────────────────
  tertiary:                   "#7c3aed"
  on-tertiary:                "#ffffff"
  tertiary-container:         "#f5f3ff"
  on-tertiary-container:      "#7c3aed"

  # ── Semantic ────────────────────────────────────────────────────────────────
  error:                      "#ef4444"
  on-error:                   "#ffffff"
  error-container:            "#fee2e2"
  on-error-container:         "#b91c1c"
  success:                    "#22c55e"
  on-success:                 "#ffffff"
  success-container:          "#dcfce7"
  on-success-container:       "#15803d"
  warning:                    "#eab308"
  on-warning:                 "#ffffff"
  warning-container:          "#fef9c3"
  on-warning-container:       "#854d0e"

  # ── Background ──────────────────────────────────────────────────────────────
  background:                 "#f9fafb"
  on-background:              "#111827"

  # ── Code / terminal surface ─────────────────────────────────────────────────
  code-surface:               "#111827"
  code-surface-dim:           "#030712"
  code-surface-raised:        "#1f2937"
  on-code-surface:            "#4ade80"
  code-keyword:               "#60a5fa"
  code-function:              "#facc15"
  code-literal:               "#fb923c"
  code-muted:                 "#6b7280"

  # ── Role badges ─────────────────────────────────────────────────────────────
  role-admin-bg:              "rgba(127,29,29,0.4)"
  role-admin-text:            "#fca5a5"
  role-admin-border:          "#b91c1c"
  role-analyst-bg:            "rgba(30,58,138,0.4)"
  role-analyst-text:          "#93c5fd"
  role-analyst-border:        "#1d4ed8"
  role-viewer-bg:             "#374151"
  role-viewer-text:           "#d1d5db"
  role-viewer-border:         "#4b5563"

  # ── Chart palette ───────────────────────────────────────────────────────────
  chart-1:                    "#3b82f6"
  chart-2:                    "#10b981"
  chart-3:                    "#f59e0b"
  chart-4:                    "#ef4444"
  chart-5:                    "#8b5cf6"
  chart-6:                    "#06b6d4"
  chart-7:                    "#f97316"

typography:
  display:
    fontFamily: Inter
    fontSize: 60px
    fontWeight: "800"
    lineHeight: 66px
    letterSpacing: -0.04em

  headline-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: "700"
    lineHeight: 44px
    letterSpacing: -0.02em

  headline-md:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: "700"
    lineHeight: 36px
    letterSpacing: -0.01em

  headline-sm:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: "700"
    lineHeight: 28px

  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 28px

  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 24px

  title-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px

  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px

  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 22px

  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px

  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.05em

  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.04em

  code-md:
    fontFamily: "JetBrains Mono"
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 22px

  code-sm:
    fontFamily: "JetBrains Mono"
    fontSize: 11px
    fontWeight: "400"
    lineHeight: 18px

rounded:
  none:    "0"
  sm:      "0.25rem"
  DEFAULT: "0.5rem"
  md:      "0.5rem"
  lg:      "0.75rem"
  xl:      "1rem"
  2xl:     "1rem"
  full:    "9999px"

spacing:
  base:              8px
  xs:                4px
  sm:                12px
  md:                16px
  lg:                24px
  xl:                32px
  2xl:               40px
  3xl:               64px
  card-padding:      20px
  card-padding-lg:   24px
  page-padding:      32px
  section-gap:       24px
  nav-item-padding:  "12px 12px"
  sidebar-width:     240px
  container-max-sm:  640px
  container-max-md:  768px
  container-max-lg:  1024px
  container-max-xl:  1280px

elevation:
  0: "none"
  1: "0 1px 2px 0 rgba(0,0,0,0.05)"
  2: "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10)"
  3: "0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10)"
  4: "0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10)"
  5: "0 25px 50px -12px rgba(0,0,0,0.25)"
  hero: "0 25px 50px -12px rgba(156,163,175,0.50)"
  cta:  "0 10px 15px -3px rgba(37,99,235,0.40)"

motion:
  duration-fast:     "150ms"
  duration-base:     "200ms"
  duration-slow:     "300ms"
  easing-standard:   "ease-in-out"
  easing-decelerate: "ease-out"
  typewriter-type:   "55ms"
  typewriter-delete: "28ms"

components:
  # ── App shell ──────────────────────────────────────────────────────────────
  sidebar:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    width: "{spacing.sidebar-width}"
    borderRight: "none"

  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    typography: "{typography.title-sm}"

  nav-item-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.code-muted}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    typography: "{typography.title-sm}"

  nav-item-inactive-hover:
    backgroundColor: "{colors.secondary-accent}"
    textColor: "{colors.on-secondary}"

  # ── Cards ──────────────────────────────────────────────────────────────────
  card-surface:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.outline-variant}"
    borderWidth: "1px"
    rounded: "{rounded.lg}"
    shadow: "{elevation.1}"
    padding: "{spacing.card-padding}"

  card-feature:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.outline-variant}"
    borderWidth: "1px"
    rounded: "{rounded.xl}"
    shadow: "none"
    padding: "{spacing.card-padding-lg}"

  card-feature-hover:
    shadow: "{elevation.4}"
    borderColor: "{colors.surface-container-highest}"

  card-stat:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.outline-variant}"
    borderWidth: "1px"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"

  # ── Buttons ────────────────────────────────────────────────────────────────
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
    shadow: "none"

  button-primary-hover:
    backgroundColor: "{colors.primary-dim}"

  button-primary-hero:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    padding: "14px 28px"
    shadow: "{elevation.cta}"

  button-primary-hero-hover:
    backgroundColor: "{colors.primary-dim}"
    shadow: "0 10px 15px -3px rgba(37,99,235,0.50)"
    translateY: "-2px"

  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-variant}"
    borderColor: "{colors.outline-variant}"
    borderWidth: "1px"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: "8px 16px"

  button-outline-hover:
    backgroundColor: "{colors.surface-container-low}"
    borderColor: "{colors.surface-container-highest}"

  # ── Inputs ─────────────────────────────────────────────────────────────────
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.surface-container-highest}"
    borderWidth: "1px"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"

  input-field-focus:
    borderColor: "{colors.primary}"
    ringColor: "{colors.primary}"
    ringWidth: "2px"

  # ── Badges & status ────────────────────────────────────────────────────────
  badge-success:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.on-success-container}"
    borderColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label-sm}"

  badge-error:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.on-error-container}"
    borderColor: "{colors.error}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label-sm}"

  badge-warning:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.on-warning-container}"
    borderColor: "{colors.warning}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label-sm}"

  badge-blocked:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.on-warning-container}"
    borderColor: "{colors.warning}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label-sm}"

  # ── Code / SQL chrome ──────────────────────────────────────────────────────
  code-block:
    backgroundColor: "{colors.code-surface}"
    textColor: "{colors.on-code-surface}"
    fontFamily: "JetBrains Mono"
    fontSize: "{typography.code-md.fontSize}"
    lineHeight: "{typography.code-md.lineHeight}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"

  sql-preview-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.outline-variant}"
    rounded: "{rounded.lg}"
    shadow: "{elevation.1}"
    headerBg: "{colors.surface-container-low}"

  terminal-window:
    backgroundColor: "{colors.secondary}"
    borderColor: "{colors.secondary-accent}"
    rounded: "{rounded.xl}"
    shadow: "{elevation.hero}"

  # ── Chips / pills ──────────────────────────────────────────────────────────
  chip-suggestion:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary}"
    borderColor: "{colors.primary-container}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
    typography: "{typography.label-sm}"

  chip-suggestion-hover:
    backgroundColor: "{colors.primary-container}"

  # ── Landing page specific ──────────────────────────────────────────────────
  hero-blob:
    color: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 60%, transparent 100%)"
    blur: "96px"
    opacity: "0.6"

  navbar:
    backgroundColor: "rgba(255,255,255,0.80)"
    backdropBlur: "12px"
    borderColor: "{colors.outline-variant}"
    height: "64px"

  section-dark:
    backgroundColor: "{colors.code-surface-dim}"
    textColor: "#ffffff"
---

## Brand & Style

SmartSQL is a **professional data-intelligence tool** wrapped in a clean, approachable shell. Its design personality is precise and trustworthy — the kind of interface a data analyst would recommend to a colleague who is uncomfortable with SQL. It avoids decorative flourishes in favour of clarity, but allows itself one expressive moment: the landing page, where gradients and a typewriter animation set the stage.

The dominant aesthetic is **light, card-first minimalism on a warm off-white canvas**. The application shell (sidebar + content area) feels purposefully structured: a near-black sidebar provides strong spatial anchoring while the main content area breathes with white cards on a `gray-50` ground. The contrast between the two registers is deliberate — users always know which "zone" they are in.

The **landing page** breaks this rule intentionally. It layers soft blue/violet radial blobs behind the hero, uses gradient text for the headline, and places a syntax-highlighted dark terminal window as the hero artefact. This communicates capability without requiring the user to read a feature list first.

---

## Colors

### Primary — Brand Blue

The brand color is `#2563eb` (Tailwind `blue-600`). It appears on primary action buttons, active sidebar navigation items, focus rings, text links, and the icon containers that mark key metrics. Its tint (`#eff6ff`, `#dbeafe`) is used for suggestion chips, badge fills, and icon well backgrounds — keeping the brand present without competing for attention.

The hero gradient stretches from `#2563eb` through violet (`#7c3aed`) to cyan (`#06b6d4`). This is the only place the palette is given room to play; every other surface is neutral.

### Neutral Grays

Eight gray steps carry the entire application surface system:

- **`#f9fafb`** — page background; warm enough to feel paper-like, not cold
- **`#f3f4f6`** — card headers, table row headers, code preview header bars
- **`#e5e7eb`** — card borders and dividers throughout the app
- **`#9ca3af`** — placeholder text, disabled states, subtle secondary text
- **`#6b7280`** — body copy secondary text, subheadings, metadata
- **`#374151`** — high-contrast body text
- **`#1f2937`** — sidebar hover states, code surface elevated
- **`#111827`** — sidebar background, primary text, headings

### Semantic Colors

Status is communicated through four conventional color channels — green (success), red (error/blocked), yellow (warning/blocked queries), blue (informational insight). Each semantic color appears in three tokens: a pale container fill, a dark text color, and a medium border. They never appear as solid fills on interactive elements.

### Code Surface

SQL output, terminal windows, and code blocks live on a dedicated dark surface (`#111827` / `#030712`) completely isolated from the light application layer. Syntax is coloured with a small, purposeful palette:

- Keywords (`SELECT`, `FROM`, `WHERE`) → `#60a5fa` (blue-400)
- Functions (`COUNT`, `AVG`) → `#facc15` (yellow-400)
- Literals / numbers → `#fb923c` (orange-400)
- Output text / result values → `#4ade80` (green-400)

### Role Badges

The three RBAC roles each have a distinct tinted badge using alpha-channel background fills so they sit comfortably against the dark sidebar:

- **Admin** — muted red (`rgba(127,29,29,0.4)` fill, `#fca5a5` text)
- **Analyst** — muted blue (`rgba(30,58,138,0.4)` fill, `#93c5fd` text)
- **Viewer** — neutral gray (`#374151` fill, `#d1d5db` text)

---

## Typography

Two families carry the entire system:

**Inter** is the UI font. It is set at the body level and applies everywhere outside of code surfaces. Its geometric neutrality reads well at the small sizes used in tables and metadata, and its heavier weights (`700`, `800`) provide strong visual hierarchy for page titles and the hero headline.

**JetBrains Mono** is used exclusively for generated SQL, code blocks, terminal windows, the typewriter animation on the landing page, and any inline code reference. It is never used for prose.

### Scale & Hierarchy

| Role | Size | Weight | Usage |
|---|---|---|---|
| `display` | 60 px | 800 | Landing hero headline |
| `headline-lg` | 36 px | 700 | Page-level section headers |
| `headline-md` | 28 px | 700 | Feature grid section title |
| `headline-sm` | 22 px | 700 | Card group titles |
| `title-lg` | 18 px | 600 | Card headings, query results header |
| `title-md` | 16 px | 600 | Table column headers, sidebar section labels |
| `title-sm` | 14 px | 600 | Buttons, nav items, form labels |
| `body-lg` | 18 px | 400 | Landing page descriptive copy |
| `body-md` | 14 px | 400 | Card body text, table cells |
| `label-md` | 12 px | 600 + 0.05em tracking | Status badges, table headers (uppercase), section eyebrows |
| `code-md` | 13 px | 400 | SQL blocks, terminal |

All display and headline sizes use negative letter-spacing (`-0.04em` at display, `-0.02em` at headline-lg) to compensate for the optical looseness of Inter at large sizes.

Uppercase `label-md` is used sparingly — only for table column headers and section eyebrows on the landing page (e.g. "FEATURES", "HOW IT WORKS"). This creates a clear visual register separation from flowing text.

---

## Layout & Spacing

### Grid System

The application layout is a two-column root split: a **fixed 240 px sidebar** and a **fluid main content area**. The sidebar never collapses; the application is intentionally desktop-first.

Content within the main area uses a **max-width container** with generous side padding (`32px` / `p-8`) and a `max-w-5xl` or `max-w-6xl` constraint depending on the page's information density.

Dashboard uses a responsive CSS grid: `4 columns → 2 columns → 1 column` for stat cards, and `2 columns → 1 column` for content sections.

### Spacing Rhythm

All spacing is an **8 px base grid**. The most common increments:

- `4px` — badge inner padding, status dot size, tight icon gaps
- `8px` — gap between icon and label inside a button
- `12px` — compact list item padding, chip padding
- `16px` — standard card internal gap, grid gap between related cards
- `20px` — default card padding
- `24px` — section-level gap, page horizontal padding
- `32px` — page-level padding (`p-8`), large section gaps
- `40px` — vertical separation between page sections

### Page Anatomy

Each protected page follows the same skeleton:

1. **Header block** — page title (`headline-lg`) + subtitle (`body-md`, `on-surface-variant`)
2. **Primary action zone** — query input, form, or filter area
3. **Results zone** — SQL preview → chart → table (stacked, full-width cards)
4. **Secondary actions** — save, feedback, export (below results, left-aligned)

---

## Elevation & Depth

The app uses a restrained three-level elevation model. Depth is communicated primarily through border + background contrast rather than shadows.

| Level | Usage | Shadow |
|---|---|---|
| 0 — Ground | Page background (`gray-50`) | none |
| 1 — Raised card | All app cards, sidebar | `shadow-sm` — `0 1px 2px rgba(0,0,0,0.05)` |
| 2 — Interactive hover | Cards on hover | `shadow-lg` — `0 10px 15px -3px rgba(0,0,0,0.10)` |
| 3 — Hero artefact | Landing terminal window | `shadow-2xl` tinted with `rgba(156,163,175,0.50)` |
| 4 — CTA button | Primary hero button | `0 10px 15px -3px rgba(37,99,235,0.40)` — blue-tinted |

Hover on feature cards elevates from `shadow-none` to `shadow-lg` over `200ms ease-in-out`, creating a physical "lift" metaphor that confirms interactivity.

---

## Shapes

### Corner Radii

The shape system has three functional tiers:

- **`rounded-full` (9999 px)** — Role badges, suggestion chips, status dots, landing page eyebrow labels. Used only for pill-shaped small elements.
- **`rounded-lg` (0.75 rem / 12 px)** — All standard UI surfaces: app cards (`shadow-sm`), form inputs, primary buttons, nav items, table containers. This is the dominant radius in the application shell.
- **`rounded-xl` / `rounded-2xl` (1 rem / 16 px)** — Landing page cards, auth page card, hero demo window, insight/error banners inside the query page. Used when the surface needs to feel more "open" or when it appears on a dark or gradient background.

There is no use of square (0 px) corners anywhere in the UI. The minimum radius on any visible surface is `rounded` (4 px).

### Chart Bar Radius

Bar chart columns use a top-only radius `[4, 4, 0, 0]` applied through Recharts to soften the data without implying a capsule shape.

---

## Motion

Animation is minimal and purposeful. The system defines three durations:

- **150 ms** — Color transitions on interactive elements (buttons, nav items, table rows). Fast enough to feel instant.
- **200 ms** — Card shadow transitions on hover. Slightly slower to feel physical.
- **300 ms** — No standard use; reserved for future modal/sheet enter animations.

All transitions use `ease-in-out` easing. The one exception is the **typewriter animation** on the landing page hero, which uses a custom tick loop: 55 ms per character while typing, 28 ms per character while deleting. This asymmetry (slower type, faster delete) mirrors natural human typing rhythm and prevents the deletion phase from feeling abrupt.

The `animate-pulse` class (Tailwind's `opacity` keyframe animation) is used solely for the blinking text cursor next to the typewriter. No other element in the UI animates on a loop.

---

## Components

### Sidebar

The sidebar is a permanent dark surface (`#111827`) occupying the full left viewport height. It holds three zones: logo, navigation, and user identity. The logo zone uses a gradient-filled icon square (`from-blue-600 to-blue-800`) as the only gradient element inside the app shell. Nav items are `rounded-lg` pills; the active item fills with the primary brand blue. Inactive items use `gray-400` text and transition to `white` on hover against a `gray-800` hover fill. The user identity zone at the bottom shows name, email, a role badge, and a sign-out link that turns red on hover — the only red interactive element in the shell.

### Cards

Surface cards are the primary layout unit of the application. They are always white, `rounded-xl`, with a 1 px `gray-200` border and `shadow-sm`. Inner content uses a `gray-50` header zone separated from the body by a `gray-100` hairline. This three-zone structure (header / body / footer) is consistent across the SQL preview card, results table, chart view, and saved query list.

### SQL Preview Card

A specialised card that communicates the status of the generated SQL with a coloured badge (`success` green / `failed` red / `blocked` amber). The code block beneath uses the code surface (`#111827`), `JetBrains Mono`, and green-400 text — a deliberate visual break from the surrounding white UI to signal "this is machine output, not interface".

### Buttons

Primary actions use `bg-brand-600` with white text, `rounded-lg`, and `px-5 py-2`. On the landing page CTAs they scale up to `px-7 py-3.5 rounded-xl` with a blue-tinted `box-shadow` and a `-translate-y-0.5` lift on hover. Outline buttons have a `border-gray-300` border, white fill, and `hover:bg-gray-50`. Both use `disabled:opacity-60` to mute unavailable states. There are no icon-only buttons; icons are always paired with a text label or appear as decorative elements inside a labelled button.

### Inputs & Form Controls

All inputs share the same base: white fill, `border-gray-300`, `rounded-lg`, `px-4 py-2.5`, and a `focus:ring-2 focus:ring-brand-500` focus ring that replaces the default browser outline. The password field adds a right-aligned icon toggle using absolute positioning within a relative container. The textarea used for natural-language query input is `resize-none` and 3 rows tall, preventing layout shift.

### Status Indicators

Three patterns communicate state:

1. **Badge pill** — `rounded-full` with semantic fill + border, used inside card headers (SQL Preview, History list)
2. **Status dot** — `w-2 h-2 rounded-full` in green/yellow/red, used in dashboard activity feed inline with list item text
3. **Alert banner** — `rounded-xl` card with a left-aligned icon and soft semantic background (`bg-blue-50` for insights, `bg-red-50` for errors), used inline on the query page after execution

### Suggestion Chips

The query input shows four example questions as `rounded-full` chips in `blue-50` with `blue-700` text and a `blue-100` border. Clicking a chip pre-fills the textarea. On hover they darken to `blue-100`. These are the only elements styled with `rounded-full` outside the role badge and status dot contexts.

### Chart Switcher

The chart type toggle is a segmented control built from a `bg-gray-100 rounded-lg` pill container with individual `rounded-md` buttons. The active button lifts to `bg-white shadow` — elevation within an already-raised surface. This pattern avoids a border-based selected state, which would create visual noise adjacent to the chart area.

### Landing Page Sections

The landing page uses two alternating surface registers: **white / `gray-50`** for light sections and **`#030712`** for the "How it works" dark section. This dark section is the only full-bleed dark background in the product. Feature cards on the landing page use `rounded-2xl` (slightly more open than app cards) and no shadow at rest, elevating to `shadow-lg` on hover. The hero terminal window sits on `gray-900` with a `gray-800` chrome bar and three `opacity-70` traffic-light dots — a recognisable UI shorthand for a code editor or terminal.
---
