# ADR-005: Host on GitHub Pages

**Status:** Decided, not yet implemented

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

## Not yet done

Apps need more polish before publishing. This ADR records the decision; implementation happens when the suite is ready to share.
