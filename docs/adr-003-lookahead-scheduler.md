# ADR-003: Lookahead scheduler for sequenced audio

**Status:** Accepted

## Context

Web browsers are not real-time systems. If you fire a sound using `setTimeout`, the OS can delay delivery by 10–200ms depending on tab visibility, GC, or rendering. For music, even 20ms of jitter is clearly audible as a "drunk" beat.

Web Audio API provides `AudioContext.currentTime` — a high-resolution clock that runs independently of JS. Audio events scheduled against this clock are rock-solid regardless of JS thread state.

## Decision

Use the lookahead scheduler pattern (originally described by Chris Wilson / Google):

```
setInterval(tick, 25ms)

function tick() {
  while (nextBeatTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(currentStep, nextBeatTime);
    advance();
  }
}
```

- Poll every **25ms** (fast enough to catch the next event before it's due)
- Lookahead window **100ms** (far enough ahead to buffer against JS jank)
- All audio events are scheduled to `ctx.currentTime + offset`, never played immediately

## Consequences

**Good:**
- Timing is locked to the audio clock — tempo stays solid even when the tab loses focus
- Works correctly on iOS (once AudioContext is resumed by user gesture)
- Lookahead of 100ms means the scheduler can sleep for up to 100ms without dropping a beat

**Trade-offs:**
- UI feedback (step highlight) lags behind the audio by up to 100ms. Fix: schedule the visual update with `setTimeout(highlightStep, (beatTime - ctx.currentTime - 0.025) * 1000)` — fire the visual 25ms before the audio hit.
- Steps fire up to 100ms before the user expects if BPM changes mid-loop. Fine for typical use.

## Revisit when

We need sub-25ms latency for live performance (use AudioWorklet instead).
