---
name: responsive-breakpoints
description: The mobile-first breakpoint system for this project — 600/900/1200 min-width only, never mix min-width and max-width. Use when writing or reviewing any CSS media query, adapting a layout across devices, or tempted to reach for max-width or a stray breakpoint. Enforced by tools/quality/breakpoint-check.mjs.
---

Write **mobile-first**: base CSS targets mobile; media queries only ever *add* complexity as the viewport grows. **The Breakpoint Rule** — the sanctioned set is **600px, 900px, 1200px, all `min-width`**. Never a `max-width` query, never a stray width. This mirrors aem.live's official guidance (https://www.aem.live/docs/dev-collab-and-good-practices).

## Recipe
1. Author the mobile layout with **no media query** — it is the default.
2. Layer up with `min-width` only. Either syntax is accepted by the checker:
   ```css
   @media (min-width: 600px) { … }   /* tablet   */
   @media (min-width: 900px) { … }   /* desktop  */
   @media (min-width: 1200px) { … }  /* wide     */
   /* range syntax is equivalent and allowed: */
   @media (width >= 900px) { … }
   ```
3. For values that flex continuously (font-size, padding) prefer `clamp()` — no breakpoint needed at all.
4. Run the checker after any CSS change: `node tools/quality/breakpoint-check.mjs`. It scans `blocks/**/*.css` + `styles/*.css` and **fails** on any `max-width` media query or any `min-width`/range value outside {600, 900, 1200}. <!-- rule:breakpoint-standard -->

## Pitfalls
- **Mixing `max-width`** → the classic desktop-first mistake; the checker fails the build. If you think you need `max-width`, you almost certainly want to invert to mobile-first `min-width`.
- **A "just this once" 768px or 1024px** → stray breakpoints fragment the system. Only deviate with a written reason for a genuinely exceptional component.
- **`@media` can't read a CSS `var()`** (no build step) — you can't tokenize breakpoints. Consistency is enforced by the checker, not by a token.
- **Snapping a fixed pixel value to a responsive one that shrinks** — keep icon/stat sizes that must hold their px as fixed literals.

See also: `eds-code-conventions` (broader CSS rules), `accessibility` (200%-zoom / 320px reflow requirement).
