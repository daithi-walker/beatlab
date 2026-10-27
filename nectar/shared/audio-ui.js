// Nectar shared audio setup: one GuitarSynth per page, with the topbar Volume slider and
// Tone select persisted across all Nectar pages, plus the iOS unlock/resume rules from CLAUDE.md.
//
//   const synth = setupAudio();   // expects #vol-slider and #tone-select in the topbar

import { GuitarSynth, TONES } from './synth.js';

const KEY = 'nectar-audio';
const CSS = `
  #tone-select {
    background: var(--surface-2, #161820); color: var(--text, #d8d4c8);
    border: 1px solid var(--border, rgba(255,160,60,0.15)); border-radius: 6px;
    font: 600 0.68rem Inter, system-ui, sans-serif; letter-spacing: 0.06em; padding: 4px 6px; cursor: pointer;
  }
  #tone-select:hover, #tone-select:focus { border-color: var(--root-color, #ff9d3d); outline: none; }
`;

export function setupAudio({ volumeSlider = '#vol-slider', toneSelect = '#tone-select' } = {}) {
  const saved = { volume: 0.8, tone: 'blues', ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  const save = () => localStorage.setItem(KEY, JSON.stringify(saved));
  const synth = new GuitarSynth();
  synth.setVolume(saved.volume);
  synth.setTone(saved.tone);

  const vol = document.querySelector(volumeSlider);
  if (vol) {
    vol.value = saved.volume;
    vol.addEventListener('input', (e) => {
      saved.volume = +e.target.value;
      synth.setVolume(saved.volume);
      save();
    });
  }

  const tone = document.querySelector(toneSelect);
  if (tone) {
    if (!document.getElementById('nectar-audio-css')) {
      const style = document.createElement('style');
      style.id = 'nectar-audio-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    tone.title = 'Guitar tone';
    for (const [key, t] of Object.entries(TONES)) tone.appendChild(new Option(t.label, key, false, key === saved.tone));
    tone.addEventListener('change', (e) => {
      saved.tone = e.target.value;
      synth.setTone(saved.tone);
      save();
      e.target.blur();
    });
  }

  // iOS: create + resume the AudioContext inside the first gesture; re-resume after
  // screen lock / tab switch.
  const unlock = () => synth.ensure();
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && synth.ctx?.state === 'suspended') synth.ctx.resume();
  });

  return synth;
}
