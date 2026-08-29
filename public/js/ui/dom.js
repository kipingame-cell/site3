/* ================= DOM-база: ссылки на элементы, ошибки, тосты ================= */

export const $ = (id) => document.getElementById(id);

export const els = {
  modeSingle: $('modeSingle'),
  modeCompat: $('modeCompat'),
  date2Group: $('date2Group'),
  btnCalc: $('btnCalc'),
  errorBox: $('errorBox'),
  result: $('result'),
  svg: $('matrixSvg'),
  tip: $('pointTip'),
  legend: $('legend'),
  chakraSide: $('chakraSide'),
  tabsRow: $('tabsRow'),
  slides: $('slides'),
  dbBadge: $('dbBadge'),
  btnPrint: $('btnPrint'),
  btnShare: $('btnShare'),
};

export function showError(msg) {
  els.errorBox.textContent = msg;
  els.errorBox.hidden = false;
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}
