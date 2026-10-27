// Nectar shared look-ahead scheduler (ADR-003 pattern): plays a song on the audio clock.
// song = { events: [{ beat, dur, notes: [{ string, fret, ... }] }], loopBeats, swing }
// An event with no notes is a rest (mutes ringing strings). A `grace` event (dur 0) sounds on
// its beat for `player.graceSec` and pushes the following note back by that much.

// Swing: the off-beat eighth is pushed late to 2/3 of the beat.
const SWING_RATIO = 2 / 3;

function swingBeat(b, swing) {
  if (!swing) return b;
  const n = Math.floor(b + 1e-9);
  const fr = b - n;
  return n + (fr <= 0.5 ? fr * (SWING_RATIO / 0.5) : SWING_RATIO + (fr - 0.5) * ((1 - SWING_RATIO) / 0.5));
}

export class Player {
  constructor(synth) {
    this.synth = synth;
    this.playing = false;
    this.loop = true;
    this.metronome = false;
    this.graceSec = 0.2; // grace-note length; capped at 70% of the note it leads into
    this.onEvent = () => {};
    this.onFrame = () => {};
    this.onCount = () => {};
    this.onLoop = () => null; // may return a new bpm, applied from the start of the next loop
    this.onStop = () => {};
  }

  load(song) {
    this.stop();
    this.song = song;
  }

  timeAt(beat) {
    return this.anchorTime + ((beat - this.anchorBeat) * 60) / this.bpm;
  }

  beatAt(time) {
    return this.anchorBeat + ((time - this.anchorTime) * this.bpm) / 60;
  }

  setBpm(bpm, atBeat = null) {
    if (this.playing) {
      const beat = atBeat ?? this.beatAt(this.synth.ctx.currentTime);
      this.anchorTime = this.timeAt(beat);
      this.anchorBeat = beat;
    }
    this.bpm = bpm;
  }

  start({ bpm, loop, countIn, metronome }) {
    const ctx = this.synth.ensure();
    this.stop();
    this.bpm = bpm;
    this.loop = loop;
    this.metronome = metronome;
    this.bus = this.synth.newBus();
    this.anchorTime = ctx.currentTime + 0.15;
    this.anchorBeat = countIn ? -4 : 0;
    this.nextClick = this.anchorBeat;
    this.iter = 0;
    this.idx = 0;
    this.graceShift = 0;
    this.finished = false;
    this.eventQueue = [];
    this.countQueue = [];
    this.current = null;
    this.playing = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    cancelAnimationFrame(this.rafId);
    this.synth.releaseBus(this.bus);
    this.onStop();
  }

  scheduleEvent(ev, t0, t1) {
    if (!ev.notes.length) {
      this.synth.muteAll(this.bus, t0);
      return;
    }
    for (const n of ev.notes) {
      this.synth.pluck(this.bus, n, t0, t1 - t0);
    }
  }

  tick() {
    const ctx = this.synth.ctx;
    const horizon = ctx.currentTime + 0.12;
    const s = this.song;

    while (!this.finished) {
      const ev = s.events[this.idx];
      const base = this.iter * s.loopBeats;
      const t0 = this.timeAt(base + swingBeat(ev.beat, s.swing)) + this.graceShift;
      if (t0 > horizon) break;
      const next = s.events[this.idx + 1];
      const grace = Math.min(this.graceSec, 0.7 * ((next?.dur ?? 1) * 60) / this.bpm);
      const t1 = ev.grace ? t0 + grace : this.timeAt(base + swingBeat(ev.beat + ev.dur, s.swing));
      this.scheduleEvent(ev, t0, t1);
      this.eventQueue.push({ time: t0, end: t1, i: this.idx });
      this.graceShift = ev.grace ? this.graceShift + grace : 0;
      if (++this.idx >= s.events.length) {
        if (this.loop) {
          this.idx = 0;
          this.iter++;
          const bpm = this.onLoop(this.iter);
          if (bpm) this.setBpm(bpm, this.iter * s.loopBeats);
        } else {
          this.finished = true;
          this.endTime = this.timeAt(base + s.loopBeats);
        }
      }
    }

    for (;;) {
      const t = this.timeAt(this.nextClick);
      if (t > horizon) break;
      const counting = this.nextClick < 0;
      const beforeEnd = !this.finished || t < this.endTime - 0.01;
      if (counting || (this.metronome && beforeEnd)) {
        this.synth.click(this.bus, t, ((this.nextClick % 4) + 4) % 4 === 0);
      }
      if (counting) this.countQueue.push({ time: t, n: this.nextClick + 5 });
      this.nextClick++;
    }

    if (this.finished && ctx.currentTime > this.endTime + 0.2) this.stop();
  }

  frame = () => {
    if (!this.playing) return;
    const now = this.synth.ctx.currentTime;
    while (this.countQueue.length && this.countQueue[0].time <= now) this.onCount(this.countQueue.shift().n);
    while (this.eventQueue.length && this.eventQueue[0].time <= now) {
      this.current = this.eventQueue.shift();
      this.onEvent(this.current.i);
    }
    if (this.current) {
      const c = this.current;
      this.onFrame(c.i, Math.min(1, Math.max(0, (now - c.time) / (c.end - c.time))));
    }
    this.rafId = requestAnimationFrame(this.frame);
  };
}
