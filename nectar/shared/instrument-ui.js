// Nectar shared instrument + tuning controls: fills #instrument-select and #tuning-select and
// switches them (persisted across Nectar pages). Pages re-render via onTuningChange().
//
//   const instrument = setupInstrument();        // expects both selects in the topbar
//   instrument.lockTuning('dropD');               // Licks: the lick sets the tuning, not editable

import { INSTRUMENTS, INSTRUMENT, TUNING, setInstrument, setTuning, onTuningChange } from './theory.js';

export function setupInstrument({ instrument = '#instrument-select', tuning = '#tuning-select' } = {}) {
  const instSel = document.querySelector(instrument);
  const tuneSel = document.querySelector(tuning);
  instSel.title = 'Instrument';
  tuneSel.title = 'Tuning';
  for (const [id, i] of Object.entries(INSTRUMENTS)) instSel.appendChild(new Option(i.name, id));

  // Tuning options depend on the instrument, so refill them on every change.
  const sync = () => {
    instSel.value = INSTRUMENT.id;
    tuneSel.replaceChildren(...Object.entries(INSTRUMENT.tunings).map(([id, t]) => new Option(t.name, id, false, id === TUNING.id)));
  };
  sync();
  onTuningChange(sync);

  instSel.addEventListener('change', (e) => { setInstrument(e.target.value); e.target.blur(); });
  tuneSel.addEventListener('change', (e) => { setTuning(e.target.value); e.target.blur(); });

  return {
    lockTuning(tuningId) {
      tuneSel.disabled = true;
      tuneSel.title = 'Set by the lick: each lick is written for one tuning';
      if (TUNING.id !== tuningId) setTuning(tuningId, { persist: false });
    },
  };
}
