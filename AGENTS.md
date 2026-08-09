<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Global Design System (Solid Flat UI)
Whenever building new components or updating existing ones in this project, you MUST strictly adhere to the "Solid Flat" design system defined in `src/index.css`:
1. **Solid Backgrounds Everywhere**: Use `.bg-card`, `.bg-popover`, or `.bg-sidebar` for structural containers, which will naturally use solid fill colors based on Shadcn's default variables. Avoid glassmorphism, blur, or transparency for solid layout elements.
2. **Inputs & Forms**: Use solid backgrounds for inputs. The global system handles `.border-input`, `input`, `select`, and `textarea` automatically.
3. **Buttons**: Use standard `.bg-primary` for primary actions. They are globally shaped as pills (`rounded-full`).
4. **Modals/Popovers & Containers**: The global `--radius` is set to `1rem` (16px) for cards, popovers, and all containers. Modals and Dialogs also use a `1rem` radius. Always use Shadcn `Dialog` or React Aria Components `Popover`/`Modal`.
5. **No Placeholders/Mockups**: The UI should remain clean, without dummy text unless requested.
6. **No Custom Colors**: Rely on semantic variables (`bg-primary`, `text-muted-foreground`, etc.). The global system neutralizes hardcoded Tailwind colors.
7. **Subtle Shadows**: Use Shadcn's default tight shadow depth (`shadow-sm`) globally for cards and containers. Avoid large, diffuse drop-shadows. This is handled globally in `src/index.css`.
8. **Fluid Typography**: The project uses Global Fluid Typography via `clamp()` for all headings (H1-H6) and paragraphs. Do not hardcode specific pixel or tailwind fixed text classes (like `text-2xl` or `text-4xl`) for main typography unless overriding specifically. Let the global `clamp()` handle responsive scaling.
   - Headings (H1-H6) are globally fluid via `@layer base` in `src/index.css` with `!important` — a heading tag always renders fluid no matter what classes sit on it.
   - Fluid utility scale (all in `@layer base`, `!important`): `.text-fluid-xs` clamp(0.6875-0.8125rem), `.text-fluid-sm` clamp(0.875-1rem), `.text-fluid` clamp(1-1.125rem), `.text-fluid-lg` clamp(1.125-1.5rem), `.text-fluid-xl` clamp(1.375-2rem), `.text-fluid-2xl` clamp(1.625-2.5rem), `.text-fluid-display` clamp(1.875-3.25rem) (KPI/clocks/amounts), `.text-fluid-display-xl` clamp(2.5-4.5rem) (hero). Use these for stat displays, content paragraphs, clocks. Fixed Tailwind sizes are only OK for UI chrome (badges, buttons, table cells, labels, form inputs).
   - **Page headlines** (the `<h1>` page titles like "Documents", "Dashboard", "Settings") are globally capped at `.text-fluid-xl` (clamp 1.375-2rem) — keep them that size via the `text-fluid-xl` class on the `h1`, NOT the raw `h1` element clamp (which is reserved for true hero text).
   - **Dashboard/widgets stay at page-title scale**: On the admin and teammate dashboards, widget titles (`CardTitle`/h3 section titles) AND widget stat numbers use `.text-fluid-xl` — never bigger than the page headline. Reserve `.text-fluid-display` for live clocks (attendance punch clock, GeoCheckIn time) and large standalone displays, not for widget content.
