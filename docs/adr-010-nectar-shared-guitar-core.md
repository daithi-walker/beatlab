# ADR-010: Nectar shared guitar core

**Status:** Accepted
**Builds on:** [ADR-009](adr-009-multi-file-modules.md), [ADR-003](adr-003-lookahead-scheduler.md)

## Context

Scales, Chords and Identify each had their own copy of the same canvas
`FretboardRenderer`, AudioWorklet Karplus-Strong synth, note constants and
strum/tap handlers (the worklet code was ~95% identical across the three
pages). Licks then arrived with a fourth, better implementation: an SVG neck,
a buffer-based KS synth that can bend, slide and do vibrato, amp tones, and a
look-ahead scheduler. Each copy drifted: different fret counts and spacing, a
different sound per page, strumming on some pages and not others, and two
string-index conventions (0 = low E vs 1 = high e).

## Decision

All Nectar pages use one shared guitar core in `nectar/shared/`:

| Module | Owns |
|---|---|
| `theory.js` | Tuning, note names, `SCALES`, interval colours/symbols, `positionsInScale` |
| `neck.js` | `Neck`: the SVG fretboard (dot layers, box frame, mute markers, active/next notes, flash) and its strum/tap interaction |
| `synth.js` | `GuitarSynth`: Karplus-Strong strings + amp/cab tones (`TONES`) |
| `player.js` | `Player`: look-ahead scheduler for any timed playback |
| `audio-ui.js` | `setupAudio()`: Volume + Tone topbar controls (persisted across pages) and iOS unlock |

One string convention everywhere: `{ string, fret }`, string 1 = high e ...
6 = low E, matching tab.

Pages own only their domain logic and data (chord definitions and voicing,
chord templates and scoring, the lick library, cards and controls).

## Consequences

**Good:**
- Every page looks, sounds and responds the same; improvements to the neck or
  synth land on all pages at once.
- Scales/Chords/Identify each shrank by ~500-600 lines.
- Scales/Chords/Identify gained amp tones, a shared volume/tone setting,
  audio-clock timing (Scales' run no longer uses `setTimeout`), and a neck with
  real fret spacing.
- `nectar/tests/smoke.py` exercises the core through every page.

**Trade-offs:**
- A change to the core can break any page, so the smoke test should be run after
  touching `nectar/shared/`.
- Visual changes from the old canvas neck: real (tapered) fret spacing, inlays
  on the neck instead of under it, all fret numbers shown.

## Rules

- Do not draw a fretboard, synthesise a note, or schedule notes inside a page.
  Use the core.
- If the core can't do something, extend it (new option, layer or method) in a
  backwards-compatible way. Don't fork a page-local copy.
