# ADR-008: Vendored lamejs for MP3 export (external-dependency exception)

**Status:** Accepted
**Relates to:** [ADR-001](adr-001-single-file-html.md), [ADR-007](adr-007-es-modules-and-local-server.md); CLAUDE.md "One HTML file per app" / "no external JS deps"

## Context

BeatLab exports audio via `core/export.js` — all hand-written byte encoders with
zero dependencies: WAV (16-bit PCM), MIDI (Standard MIDI File), and a stored-ZIP
writer for stems. Those cover the lossless and DAW-interchange cases.

Users also asked for MP3 — the format you attach to a message or upload to a
sharing site. MP3 cannot reasonably be hand-rolled: a compliant encoder
(psychoacoustic model, MDCT, Huffman tables) is thousands of lines. The two
realistic options were:

1. **AAC via the WebCodecs `AudioEncoder`** — dependency-free, but support is
   patchy and unreliable on iOS/Safari, which is a first-class target here.
2. **`lamejs`** — a pure-JavaScript LAME port (no WASM), reliable across every
   browser we care about including iOS Safari.

CLAUDE.md forbids external JS dependencies without discussion. This was raised
with the maintainer and MP3 via lamejs was explicitly approved.

## Decision

Vendor `lamejs@1.2.1` as `core/vendor/lamejs.min.js` (~156 KB, committed to the
repo — no runtime CDN fetch, stays offline-capable). It is loaded as a classic
`<script>` before the module script in the apps that offer MP3 export (Drums,
Multibank), exposing the global `window.lamejs`. `core/export.js` gains
`audioBufferToMp3(buf, kbps)`, which reads `window.lamejs` at call time and
throws a clear error if it is absent.

This is a deliberate, scoped exception to the "no external JS deps" rule — the
**only** dependency in the project, and only on the pages that export MP3. Apps
that don't load lamejs (e.g. Voice Lab) never call the encoder and are unaffected.

## Consequences

**Good:**
- Reliable MP3 on every target browser, including iOS Safari (pure JS, no WASM).
- Vendored, so it works offline and on GitHub Pages with no CDN dependency.
- Isolated: one file in `core/vendor/`, referenced only where needed. WAV/MIDI/
  stem export remain fully dependency-free.

**Trade-offs:**
- First third-party runtime code in the repo; the "no external JS deps" rule now
  has a documented exception rather than being absolute.
- ~156 KB added to the page weight on Drums and Multibank (deferred: the encoder
  only runs when the user clicks MP3).
- lamejs is unmaintained; if a bug surfaces we own the vendored copy.

## Revisit when

WebCodecs AAC gains reliable cross-browser support (especially iOS), at which
point a dependency-free encoder could replace lamejs; or if a second dependency
is ever proposed — that should not lean on this ADR as precedent without its own
discussion.
