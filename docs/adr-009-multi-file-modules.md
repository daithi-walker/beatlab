# ADR-009: Multi-file ES modules per page, still no build step

**Status:** Accepted
**Refines:** [ADR-007](adr-007-es-modules-and-local-server.md)

## Context

ADR-007 moved BeatLab to ES modules served over HTTP, but `CLAUDE.md` still
said "one HTML file per app, inline `<style>` and `<script>`". In practice that
rule was causing duplication rather than preventing complexity:

- Nectar has several pages (Scales, Chords, Identify), and each carries its own
  copy of the topbar CSS, volume slider, audio init and Karplus-Strong engine
  (~1,100-1,200 lines per page, much of it repeated).
- `torman/index.html` is past 2,500 lines, well over ADR-001's ~1,500-line
  revisit threshold.
- Adding Nectar Licks inline would have meant ~1,150 more lines, including a
  third guitar engine the other pages could not reuse.

The constraint that actually hurts is **code sharing between pages**, not the
lack of a framework or bundler.

## Decision

- A page may load its code from **multiple native ES modules** (e.g.
  `nectar/licks.html` + `nectar/licks/*.js` + `licks.css`). Inline `<style>`
  and `<script>` remain fine for small pages.
- Code shared **across apps** lives in `core/`. Code shared across pages of
  **one app** may live in that app's folder.
- Still **no build step, no bundler, no npm runtime dependencies**. Browsers
  load modules directly, locally via nginx and on GitHub Pages.

## Consequences

**Good:**
- Pages can share engines and renderers instead of copy-pasting them.
- Smaller files that are easier to review and to test in isolation.
- Zero tooling change: same nginx containers, same Pages deploy.

**Trade-offs:**
- More files per app. Readers follow imports instead of scrolling one file.
- Each module is a separate HTTP request (negligible at this scale).

## Revisit when (move to a Vite build)

Any one of these:
- We want npm libraries (e.g. AlphaTab) rather than CDN script tags.
- We want TypeScript or a unit-test runner across shared code.
- Shared code grows past roughly 2-3k lines with real cross-page state.

A backend (the Nectar theory-chat proxy, progress sync) is a separate small
service and is not by itself a reason to add a frontend build.
