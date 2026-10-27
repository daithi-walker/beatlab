// Nectar shared tuning control: fills #tuning-select from the current instrument's tunings
// and switches tuning (persisted across Nectar pages). Pages re-render via onTuningChange().
//
//   const tuning = setupTuning();     // expects #tuning-select in the topbar
//   tuning.lock('dropD');             // Licks: show + use the lick's tuning, not editable

import { INSTRUMENT, TUNING, setTuning } from './theory.js';

export function setupTuning(selector = '#tuning-select') {
  const select = document.querySelector(selector);
  select.title = 'Tuning';
  for (const [id, t] of Object.entries(INSTRUMENT.tunings)) select.appendChild(new Option(t.name, id, false, id === TUNING.id));
  select.addEventListener('change', (e) => {
    setTuning(e.target.value);
    e.target.blur();
  });

  return {
    lock(id) {
      select.value = id;
      select.disabled = true;
      select.title = 'This lick is written for this tuning';
      if (TUNING.id !== id) setTuning(id, { persist: false });
    },
  };
}
