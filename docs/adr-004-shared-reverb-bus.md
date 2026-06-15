# ADR-004: Shared convolution reverb bus

**Status:** Accepted

## Context

Convolution reverb (ConvolverNode with a real impulse response buffer) is expensive. Creating one per voice or per bank would multiply CPU cost with every bank added.

## Decision

One shared `ConvolverNode` per app. Each voice/bank has a send gain node. All send gains feed the shared convolver; the convolver output feeds masterGain.

```
voice → ... → sendGain ──┐
voice → ... → sendGain ──┤
voice → ... → sendGain ──┼──→ ConvolverNode → masterGain → destination
voice → ... → sendGain ──┘
```

The send gain level is the "reverb amount" knob per bank.

## Consequences

**Good:**
- One reverb regardless of how many banks/voices are active
- All voices share the same acoustic space — sounds cohesive
- Standard studio model (send/return / aux bus)

**Trade-offs:**
- All voices share the same IR (same "room"). Can't have a different reverb character per bank without adding more ConvolverNodes (acceptable trade-off).
- The reverb tail of a stopped bank keeps ringing. This is correct audio behaviour.
