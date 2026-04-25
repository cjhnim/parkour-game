// Debug tuning panel. Side-effectful DOM manipulation.
// Returns a toggle() function to show/hide the panel.

import { config, DEFAULTS, resetToDefaults } from './tuning.js';
import { validateStage } from './validator.js';

const SLIDERS = [
  { key: 'gravity',      label: 'Gravity',          min: 0.1, max: 2.0, step: 0.05 },
  { key: 'jumpVelocity', label: 'Jump Height',      min: -20, max: -4,  step: 0.5  },
  { key: 'moveSpeed',    label: 'Move Speed',       min: 1,   max: 12,  step: 0.5  },
  { key: 'wallJumpVx',   label: 'Wall Jump H-Kick', min: 1,   max: 15,  step: 0.5  },
  { key: 'wallJumpVy',   label: 'Wall Jump V-Kick', min: -20, max: -4,  step: 0.5  },
];

export function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'tuning-panel';
  panel.style.cssText = `
    display: none;
    flex-direction: column;
    gap: 10px;
    width: 220px;
    min-width: 220px;
    padding: 16px 14px;
    background: #12121c;
    border: 1px solid #2a2a3a;
    border-radius: 6px;
    font-family: monospace;
    font-size: 12px;
    color: #ccc;
    align-self: flex-start;
  `;

  const title = document.createElement('div');
  title.textContent = 'TUNING';
  title.style.cssText = 'font-weight: bold; font-size: 13px; color: #5fc4ff; letter-spacing: 1px; margin-bottom: 4px;';
  panel.appendChild(title);

  const valueEls = {};

  for (const s of SLIDERS) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 3px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between;';

    const lbl = document.createElement('span');
    lbl.textContent = s.label;

    const val = document.createElement('span');
    val.style.cssText = 'color: #f5d76e;';
    val.textContent = config[s.key];
    valueEls[s.key] = val;

    labelRow.appendChild(lbl);
    labelRow.appendChild(val);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = s.min;
    slider.max = s.max;
    slider.step = s.step;
    slider.value = config[s.key];
    slider.style.cssText = 'width: 100%; accent-color: #5fc4ff;';

    slider.addEventListener('input', () => {
      config[s.key] = parseFloat(slider.value);
      val.textContent = slider.value;
    });

    row.appendChild(labelRow);
    row.appendChild(slider);
    panel.appendChild(row);

    panel._sliders = panel._sliders ?? {};
    panel._sliders[s.key] = slider;
  }

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.textContent = '↺ Reset to defaults';
  resetBtn.style.cssText = `
    margin-top: 6px;
    padding: 6px;
    background: #1e1e2e;
    border: 1px solid #3a3a5a;
    border-radius: 4px;
    color: #aaa;
    cursor: pointer;
    font-family: monospace;
    font-size: 12px;
  `;
  resetBtn.addEventListener('click', () => {
    resetToDefaults();
    for (const s of SLIDERS) {
      panel._sliders[s.key].value = config[s.key];
      valueEls[s.key].textContent = config[s.key];
    }
    refreshValidation();
  });
  panel.appendChild(resetBtn);

  // Validation section
  const divider = document.createElement('div');
  divider.style.cssText = 'border-top: 1px solid #2a2a3a; margin: 4px 0;';
  panel.appendChild(divider);

  const validationTitle = document.createElement('div');
  validationTitle.style.cssText = 'font-weight: bold; font-size: 11px; color: #888; letter-spacing: 1px;';
  validationTitle.textContent = 'CLEARABILITY';
  panel.appendChild(validationTitle);

  const validationEl = document.createElement('div');
  validationEl.style.cssText = 'font-size: 11px; line-height: 1.6;';
  panel.appendChild(validationEl);

  function refreshValidation() {
    // Validation is per-stage; call this when stage changes or config changes.
    // We store the current stage on the panel so index.html can update it.
    const stage = panel._currentStage;
    if (!stage) { validationEl.textContent = '—'; return; }

    const r = validateStage(stage, config);
    const cap = r.capabilities;

    if (r.clearable) {
      validationEl.innerHTML =
        `<span style="color:#5fc4ff">✔ Clearable</span><br>` +
        `<span style="color:#888">Jump: ${cap.maxJumpHeight.toFixed(0)}px &nbsp; Reach: ${cap.maxHorizontalReach.toFixed(0)}px</span>`;
    } else {
      const issueLines = r.issues.map(i =>
        `<span style="color:#f5a623">✖ ${i.step.label}<br>&nbsp;&nbsp;` +
        `${i.type === 'too_high' ? 'Height' : 'Reach'}: need ${i.required}px, have ${i.available.toFixed(0)}px</span>`
      ).join('<br>');
      validationEl.innerHTML =
        `<span style="color:#e74c3c">✖ Not clearable</span><br>` +
        `<span style="color:#888">Jump: ${cap.maxJumpHeight.toFixed(0)}px &nbsp; Reach: ${cap.maxHorizontalReach.toFixed(0)}px</span><br>` +
        issueLines;
    }
  }

  // Re-validate whenever a slider changes
  for (const s of SLIDERS) {
    panel._sliders[s.key].addEventListener('input', refreshValidation);
  }

  panel._refreshValidation = refreshValidation;
  return panel;
}

export function createToggleButton(panel) {
  const btn = document.createElement('button');
  btn.textContent = '⚙ Tuning';
  btn.style.cssText = `
    padding: 5px 12px;
    background: #1e1e2e;
    border: 1px solid #3a3a5a;
    border-radius: 4px;
    color: #aaa;
    cursor: pointer;
    font-family: monospace;
    font-size: 12px;
    align-self: flex-start;
  `;
  btn.addEventListener('click', () => {
    const visible = panel.style.display === 'flex';
    panel.style.display = visible ? 'none' : 'flex';
    btn.style.color = visible ? '#aaa' : '#5fc4ff';
    btn.style.borderColor = visible ? '#3a3a5a' : '#5fc4ff';
  });
  return btn;
}
