<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

# Global Design System: **MonoGlass** — Apple Ultra-Liquid Glass UI + Micro-interactions (iOS 26+ Standard)

> **Official name: MonoGlass.** When the user or agents say "MonoGlass", they mean THIS design system — and nothing else. It is the one and only design system in this project.

Whenever creating new components, pages, widgets, or modifying existing ones in this project, you **MUST STRICTLY ADHERE** to MonoGlass (Apple Ultra-Liquid Glass). All styling is centralized in `src/index.css` with semantic utility tokens.

---

## 1. Core Material Architecture (Ultra-Liquid Glass)

### Layered Translucency & Optical Refraction
- **Backdrop Filter**: `backdrop-filter: saturate(190%) blur(28px - 36px)` on all primary glass containers (`.glass-kormiis`).
- **Base Translucency Gradients**:
  - **Light Mode**: High-clarity 22%–48% opacity: `linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.42) 100%)`.
  - **Dark Mode**: High-clarity smoky 30%–45% opacity: `linear-gradient(135deg, rgba(28, 28, 40, 0.42) 0%, rgba(14, 14, 22, 0.30) 100%)`.
- **Borders & Continuous Curvature**:
  - Border: 1px solid `rgba(0, 0, 0, 0.12 - 0.15)` in Light Mode, `rgba(255, 255, 255, 0.15)` in Dark Mode.
  - Corner Radii: Continuous squircle corners — `rounded-2xl` to `rounded-3xl` (20px–32px) for cards/panels, `rounded-2xl` or `rounded-full` (16px–24px) for buttons/pills.
- **Universal Zero-Shadow Standard**:
  - **Strictly NO depth shadows, drop shadows, ambient shadows, or cast shadows** anywhere in the application (`box-shadow: none !important;`).
  - Containers, modals, dialogs, drawers, cards, buttons, and popovers rely purely on optical translucency, continuous curvature, and crisp contrast borders with zero shadow artifacts.

---

## 2. Button Component & Micro-interactions

Buttons use physical tactile spring curves (`cubic-bezier(0.34, 1.56, 0.64, 1)`):

- **Default State** (`.liquid-glass-btn`, `.apple-glass-btn`):
  Translucent glass gradient, crisp border, 90% opacity label text, zero shadow.
- **Hover State**:
  Scale `1.02`, brightness `+5%`, zero shadow, smooth cursor pointer.
- **Pressed State**:
  Scale `0.97`, brightness `-5%`, zero shadow, tactile release feel.
- **Release (Spring Overshoot)**:
  Returns with slight spring overshoot (scale `1.02 -> 1.0`) over 400–500ms.
- **Focus-Visible**:
  `2px ring rgba(255, 255, 255, 0.6)` + zero harsh outlines.
- **Icon Buttons** (`.liquid-icon-btn`):
  On press, icon scales to 0.9 and rotates -3deg, then springs back smoothly.
- **Loading State** (`.liquid-spinner`):
  Label fades to spinning liquid glass indicator.

---

## 3. Form Controls & Inputs

- **Dimensions**: Minimum height `h-11` (44px) to satisfy touch target standards.
- **Padding**: Horizontal `px-4`, vertical `py-2.5`.
- **Icons in Inputs**: 
  - Left-aligned icon placed at `absolute left-3.5 top-1/2 -translate-y-1/2`.
  - Input field MUST use `!pl-10.5` or `pl-11` to prevent text overlap.
  - Icon colors match container tone (`text-white/60` in dark/landing modals, `text-muted-foreground` in light mode).
- **Light Mode Inputs**:
  - `rgba(255, 255, 255, 0.85)` background, `1px solid rgba(0, 0, 0, 0.15)` border, subtle inset shadow `inset 0 1px 2px rgba(0, 0, 0, 0.04)` for instant visual distinction.
- **Dark Mode Inputs**:
  - `rgba(255, 255, 255, 0.07)` background, `1px solid rgba(255, 255, 255, 0.14)` border, `inset 0 1px 1.5px rgba(0, 0, 0, 0.3)`.

---

## 4. Modals, Popovers & Dialogs

- **Class**: `.glass-kormiis`.
- **Corner Radius**: `rounded-[28px]` / `rounded-3xl` (1.75rem).
- **Padding**: Internal padding minimum `p-6 sm:p-8`.
- **Headers & Footers**:
  - Seamless unified canvas or crisp separators where appropriate.
- **Backdrop**: Smooth dark blur `backdrop-blur-md bg-black/40` or `bg-black/60`.

---

## 5. Spacing, Padding & Layout Breathing Room

- **Cards & Panels**: Internal padding minimum `p-6` (24px). Never place text flush against container borders.
- **Card Headers**: Line height `leading-snug`, space `space-y-2` between title and description.
- **Tables**:
  - Header cells: `h-12 px-5 py-3 text-xs uppercase font-semibold text-muted-foreground`.
  - Body cells: `px-5 py-4 text-sm`.
- **Interactive Elements**: Touch targets minimum `44px x 44px` (`h-11`, `min-h-[44px]`).

---

## 6. Fluid Typography Hierarchy

Global fluid typography uses `clamp()` in `@layer base`:

| Class / Role | Clamp Definition | Target Usage |
|---|---|---|
| `.text-fluid-xs` | `clamp(0.70rem, 0.66rem + 0.2vw, 0.78rem)` | Badges, footnotes, timestamps |
| `.text-fluid-sm` | `clamp(0.80rem, 0.75rem + 0.25vw, 0.88rem)` | Body secondary, table cells |
| `.text-fluid` | `clamp(0.90rem, 0.85rem + 0.25vw, 1.00rem)` | Default body text, form inputs |
| `.text-fluid-lg` | `clamp(1.05rem, 0.98rem + 0.35vw, 1.20rem)` | Card subtitles, section labels |
| `.text-fluid-xl` | `clamp(1.25rem, 1.12rem + 0.65vw, 1.55rem)` | Page titles (`<h1>`), widget stats |
| `.text-fluid-2xl` | `clamp(1.50rem, 1.30rem + 1.0vw, 2.00rem)` | Modal hero headers |
| `.text-fluid-display` | `clamp(2.00rem, 1.50rem + 2.5vw, 3.25rem)` | Standalone live clocks, KPI banners |

---

## 7. Motion Tokens & Accessibility

- **Motion Durations**:
  - Standard Micro-interactions: `250ms` (`--duration-micro`).
  - Container / Card Transitions: `400ms` (`cubic-bezier(0.175, 0.885, 0.32, 1.15)`).
  - Modals & Sheets: `600ms` (`--duration-modal`).
- **Reduced Motion**:
  Under `@media (prefers-reduced-motion: reduce)`, spring physics are replaced by simple `150ms` linear opacity transitions with no scaling or bounce.

---

## 8. Unified Navigation Bar Standard (Top Horizontal Page Headlines)

- **Layout Structure**: Top unified horizontal navigation stream in `.glass-kormiis` containing Brand Logo (left), scrollable horizontal page headlines/tabs (center), and Action Tools (theme toggle, notification badge, profile avatar on right).
- **Tab Styles**:
  - **Active Tab**: Apple high-contrast pill (`bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border border-white/20 font-bold`).
  - **Inactive Tab**: Frosted glass pill (`text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10`).
- **Device Breakpoints**:
  - **Mobile Handsets**: `< 640px` (`< sm`). Mobile header + horizontal tab bar + bottom floating dock.
  - **Tablets & iPads (including iPad Pro 1024x1366)**: `640px` to `1024px`. Unified top navigation bar with horizontal page headline stream.
  - **Desktop & Widescreen Laptops**: `> 1024px` (`xl:` / `≥ 1025px`). Spacious top navigation bar with centered horizontal page headline stream.

---

## 9. Universal Global Scrollbar Rule (Minimal Solid Standard)

Scrollbars across the entire application **MUST STRICTLY** follow this minimal solid standard (centralized in `src/index.css`):

- **Default Idle State**: **Completely Invisible** (`background: transparent !important`, border `none`, track `transparent`). No scrollbars should ever be visible when the mouse is resting or outside a scrollable container.
- **Container Hover State**: Visible **ONLY** when the mouse hovers over the scrollable container or page (`*:hover::-webkit-scrollbar-thumb`).
  - **Light Mode**: Clean minimal solid capsule (`#cbd5e1` with `border: none`).
  - **Dark Mode**: Clean minimal solid capsule (`#475569` with `border: none`).
- **Direct Thumb Hover & Dragging / Selection State**: Responsive solid feedback (`#94a3b8` in light mode, `#64748b` in dark mode) with zero borders, zero glass layers, and zero smear/glare artifacts.
- **Mouse Leave**: Instantly disappears (`transition: none !important` with 0ms delay).
- **No Stepper Arrows**: Up/down and left/right arrows are completely eliminated (`::-webkit-scrollbar-button { display: none !important; width: 0; height: 0; }`).
- **No Glass Layers or Inner Strokes**: No white border, no translucent layer stacking, no backdrop filters on scrollbars to avoid rendering glitches/glare.
- **DO NOT** add custom inline or per-component scrollbars that leave a visible bar in the default idle state. Always inherit or use the centralized standard.

