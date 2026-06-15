# ADR-001: Single-file HTML apps, no build step

**Status:** Accepted

## Context

This project is exploratory — we're learning and iterating fast. Setting up a build pipeline (Vite, Webpack, esbuild) adds overhead: install step, config files, node_modules, a local server requirement, source maps, etc. We also want apps that are genuinely portable — drag the HTML file anywhere and open it.

## Decision

Each app lives in a single `.html` file. CSS and JS are inlined. No bundler, no npm, no node_modules.

## Consequences

**Good:**
- Zero install friction — open the file, it works
- Portable — share via email, AirDrop, GitHub Pages with a single file
- Forces discipline: if the file gets unwieldy, that's a signal to split responsibilities

**Trade-offs:**
- File grows long (multibank is ~800 lines). Editor navigation via search, not file tree.
- No tree-shaking, minification, or code-splitting. Fine at this scale.
- Shared code is copy-pasted between apps until we extract a core module (see ADR-003).

## Revisit when

Any single file exceeds ~1500 lines, or when two apps need to share more than ~50 lines of code.
