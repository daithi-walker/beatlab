# ADR-007: ES modules with nginx local server, replacing single-file HTML

**Status:** Accepted
**Supersedes:** [ADR-001](adr-001-single-file-html.md)

## Context

ADR-001 established a single-file HTML approach so apps could be opened directly from `file://` with zero setup. Two things broke that constraint:

1. **`core/audio.js` extraction** — once shared utilities (`noteToFreq`, `makeImpulse`, `distCurve`, noise buffers) were pulled into a shared module, apps need `<script type="module">` to import them. Browsers block ES module imports from `file://` for security reasons, so a local server became mandatory.

2. **File size** — `torman/index.html` reached 2,567 lines (ADR-001 set a ~1,500-line revisit threshold). The single-file constraint was already under pressure before the module extraction.

The portability goal — "drag the file anywhere and open it" — is no longer achievable once shared code is involved.

## Decision

Each app is served by a local nginx container (Docker Compose). Apps use `<script type="module">` and import shared utilities from `../core/audio.js`. All docker-compose files mount the repo root so the relative import path resolves consistently.

| App | Port |
|---|---|
| multibank | 8768 |
| synth | 8769 |
| torman | 8766 |
| nectar | 8767 |

On GitHub Pages, the same relative import paths work natively — Pages is HTTP, not `file://`, so no bundler is needed.

## Consequences

**Good:**
- Shared code lives in one place — `core/audio.js` is the single source of truth for audio primitives
- ES modules are the platform standard; no bundler or transpilation needed
- GitHub Pages deployment is equivalent to local dev — same paths, same behaviour
- Each container mounts the repo root, so adding more shared modules in `core/` costs nothing

**Trade-offs:**
- Docker is now a requirement for local development (was zero-dependency before)
- Apps can no longer be shared as single files via AirDrop or email
- `file://` opening is broken — must use `docker compose up`

## Revisit when

The shared `core/` module grows large enough to warrant splitting, or when apps need to share more than utilities (e.g. shared UI components, state management). At that point, a lightweight bundler (Vite, esbuild) may be worth adding.
