# ADR-002: Raw Web Audio API, no audio library

**Status:** Accepted

## Context

Several JS audio libraries exist: Tone.js (abstracts Web Audio with musical primitives), p5.sound, Howler.js (sample playback). They'd reduce boilerplate.

## Decision

Use raw Web Audio API nodes directly. No audio library dependency.

## Consequences

**Good:**
- Zero bundle weight — no CDN dependency, no version drift
- We learn the actual API, which transfers to any future audio work
- Full control over the signal graph — nothing is hidden or abstracted away
- The patterns we're learning (lookahead scheduler, send/return reverb, ADSR via gain ramps) are the same ones used in production DAWs

**Trade-offs:**
- More verbose — creating a reverb means generating an impulse response buffer, not calling `reverb.wet = 0.5`
- Documentation is the W3C spec and MDN, not a friendly library README

## Revisit when

We need sample loading at scale, or MIDI device I/O, where a library would save significant time.
