# ADR-006: Torman refactor — split single-file HTML

**Status:** Decided

## Context

ADR-001 sets a revisit threshold of ~1500 lines per file. `torman/index.html` is currently **2,567 lines**, well past that limit. The file has grown through iterative additions (demo sequences, audio file visualiser, transposition controls, ambience system) on top of the original DubCanvas source.

The file has three distinct layers that are entangled today:
- **Canvas / visual engine** — particle system, trail rendering, note grid, cursor animation
- **Audio engine** — bass synth, Web Audio graph, demo sequencer, ambience
- **UI / controls** — top bar, Bass Engine panel, ambience panel, event handlers

## Decision

Split `torman/index.html` into three files served by the existing nginx container:

| File | Responsibility |
|---|---|
| `torman/index.html` | HTML shell + CSS + top-level init only |
| `torman/canvas.js` | Canvas engine — particle system, trails, note grid, cursor |
| `torman/audio.js` | Audio engine — bass synth, demo sequencer, ambience, visualiser |

Use `<script type="module">` to import. The nginx container already serves the directory so `file://` ES module restrictions don't apply.

## Consequences

**Good:**
- Each file stays under ~1000 lines — navigable without search
- Canvas and audio engines become independently testable
- Shared audio primitives (`noteToFreq`, `makeImpulse`, `distCurve`) can be extracted to `core/audio.js` without touching `index.html`

**Trade-offs:**
- Requires the nginx container (already mandatory for torman — it serves multiple routes)
- Loses the single-file portability that ADR-001 values; torman already gave this up with Docker

## Revisit when

A `core/audio.js` shared module exists and torman should import from it — at that point align the split with the shared module boundary.
