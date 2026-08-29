/* ================= Баннеры комбинированных программ (триады) ================= */
import { ARC_PROFILES } from '../../db/programsExtra.js?v=13';

/** Баннер комбинированной программы (триада). */
export function programBanner(prog, key) {
  if (!prog) return '';
  return `<div class="program-banner">
    <b>${prog.title} <span class="prog-codes">${key.replace(/-/g, ' · ')}</span></b>
    ${plainTriad(key)}
    ${prog.text ? `<p>${prog.text}</p>` : ''}
    ${prog.advice ? `<p class="prog-advice"><b>Совет:</b> ${prog.advice}</p>` : ''}
  </div>`;
}

/** Расшифровка триады простыми словами — чтобы поняла и бабка. */
export function plainTriad(key) {
  const parts = String(key).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !ARC_PROFILES[n])) return '';
  const names = parts.map((n) => `${n} (${ARC_PROFILES[n].nm})`).join(' + ');
  const meaning = parts.map((n) => ARC_PROFILES[n].syn).join(', ');
  return `<p class="prog-plain"><b>Простыми словами:</b> это сочетание энергий ${names}. Вместе они дают ${meaning}.</p>`;
}
