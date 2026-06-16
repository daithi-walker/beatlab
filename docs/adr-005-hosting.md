# ADR-005: Host on GitHub Pages

**Status:** Implemented

## Context

Apps need to be publicly accessible without requiring users to clone a repo or run a local server.

## Decision

Host on GitHub Pages from the `main` branch root. No build step required — static HTML files are served directly.

Each app is accessible at:
```
username.github.io/music/multibank/
username.github.io/music/synth/
username.github.io/music/nectar/
```

A root `index.html` will serve as the landing page.

## Consequences

**Good:**
- Free hosting, zero infrastructure
- Deploys automatically on push to main
- ES module imports (`import from '../core/audio.js'`) work natively — Pages is HTTP, not file://, so no bundler needed even when we extract shared code

**Trade-offs:**
- Public repo required for free Pages (or a paid GitHub plan)
- No server-side logic — fully static. Fine for Web Audio apps.
- Custom domain optional (CNAME file in repo root)

## Revisit when

We need user accounts, saved state server-side, or a backend. For now, localStorage is sufficient for pattern persistence.

## Implementation

- `.github/workflows/pages.yml` — deploys on push to `main` via GitHub Actions
- `index.html` at repo root — landing page linking all four apps
- GitHub Pages must be enabled in the repo settings: **Settings → Pages → Source → GitHub Actions**

The `core/audio.js` imports use relative paths (`../core/audio.js`) which work both locally via Docker and on Pages (`daithi-walker.github.io/beatlab/`) since browsers resolve relative module specifiers from the importing file's URL.
