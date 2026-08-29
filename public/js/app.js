/* ================= Матрица Судьбы — тонкий entry: bootstrap + wiring =================
   Вся разметка разбора собирается в модулях ./ui/*, расчёты — в ./core/matrixCore.js,
   этот файл только связывает DOM, барабаны дат, события и рендер-пайплайн. */
import { calcMatrix, calcCompat } from './core/matrixCore.js?v=14';
import * as db from './db.js';
import { createDrums } from './drums.js?v=14';
import { ensurePdfFonts, buildPdfDef } from './pdfExport.js?v=4';
import { shareMatrixCard } from './shareCard.js?v=4';
import { $, els, showError, toast } from './ui/dom.js';
import { store, dateKey } from './ui/store.js';
import { attachPointTip } from './ui/tip.js';
import { renderAll } from './ui/render.js';

let mode = 'single';
let lastResult = null;

/* ================= Тултип точек ================= */
const onPoint = attachPointTip(els.tip);

/* ================= События ================= */
function setMode(next) {
  if (next === mode) return;
  store.set(dateKey(mode), drums1.getValue()); // запоминаем дату уходящего режима
  mode = next;
  els.modeSingle.classList.toggle('active', mode === 'single');
  els.modeCompat.classList.toggle('active', mode === 'compat');
  els.date2Group.hidden = mode !== 'compat';
  const saved = store.get(dateKey(mode));
  if (saved) drums1.setValue(saved);
  // барабаны партнёра были скрыты — доводим скролл до выбранных значений
  if (mode === 'compat') requestAnimationFrame(() => drums2.resync());
}

els.modeSingle.addEventListener('click', () => setMode('single'));
els.modeCompat.addEventListener('click', () => setMode('compat'));

els.btnCalc.addEventListener('click', async () => {
  els.errorBox.hidden = true;
  els.tip.hidden = true;
  const d1 = drums1.getValue();
  if (!d1) { showError('Укажите дату рождения.'); return; }

  els.btnCalc.disabled = true;
  try {
    let result;
    if (mode === 'compat') {
      const d2 = drums2.getValue();
      if (!d2) { showError('Укажите дату рождения партнёра.'); return; }
      result = calcCompat(d1, d2);
      store.set('dm_d2', d2);
    } else {
      result = calcMatrix(d1);
    }
    store.set(dateKey(mode), d1);
    store.set('dm_mode', mode);

    els.result.hidden = false;
    els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await renderAll(result, renderCtx);
    lastResult = result;
  } catch (err) {
    showError(err.message);
  } finally {
    els.btnCalc.disabled = false;
  }
});

// раскрытие строк в матрице здоровья (делегирование)
els.slides.addEventListener('click', (e) => {
  const row = e.target.closest('.hrow');
  if (!row) return;
  const detail = row.nextElementSibling;
  const open = detail.hidden;
  detail.hidden = !open;
  row.classList.toggle('open', open);
  row.setAttribute('aria-expanded', open ? 'true' : 'false');
});
els.slides.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.hrow');
  if (row) { e.preventDefault(); row.click(); }
});

/* ================= PDF-отчёт (pdfmake) =================
   PDF собирается декларативно на клиенте библиотекой pdfmake (локально из /vendor)
   и скачивается файлом; одинаково работает на десктопе и телефоне. */
els.btnPrint.addEventListener('click', async () => {
  if (!lastResult) return;
  if (!window.pdfMake) { showError('PDF-модуль ещё загружается — попробуйте через пару секунд.'); return; }
  els.btnPrint.disabled = true;
  try {
    await ensurePdfFonts(); // подгружаем Serif-шрифт и регистрируем Roboto в vfs
    const d1 = drums1.getValue();
    const d2 = mode === 'compat' ? drums2.getValue() : null;
    const file = mode === 'compat' ? `matrica-sovmestimost-${d1}.pdf` : `matrica-sudby-${d1}.pdf`;
    pdfMake.createPdf(buildPdfDef(lastResult, d1, d2, mode)).download(file);
  } finally {
    els.btnPrint.disabled = false;
  }
});

/* ================= Инициализация ================= */
// миграция старых ключей
const legacyD1 = store.get('dm_date1');
if (legacyD1 && !store.get('dm_d1_single')) store.set('dm_d1_single', legacyD1);
const legacyD2 = store.get('dm_date2');
if (legacyD2 && !store.get('dm_d2')) store.set('dm_d2', legacyD2);

const urlQ = new URLSearchParams(location.search);
const initMode = urlQ.get('mode') || store.get('dm_mode') || 'single';
const drums1 = createDrums($('date1Drums'), {
  value: urlQ.get('d1') || store.get(initMode === 'compat' ? 'dm_d1_compat' : 'dm_d1_single') || '2000-01-01',
});
const drums2 = createDrums($('date2Drums'), { value: urlQ.get('d2') || store.get('dm_d2') || '2000-01-01' });

// контексты для ui-модулей: состояние живёт здесь и читается через геттеры
const savedCtx = {
  getMode: () => mode,
  getLastResult: () => lastResult,
  drums1, drums2,
  setMode,
  recalc: () => els.btnCalc.click(),
};
const renderCtx = {
  getMode: () => mode,
  onPoint,
  savedCtx,
};

(async function init() {
  if (initMode === 'compat') {
    mode = 'compat';
    els.modeSingle.classList.remove('active');
    els.modeCompat.classList.add('active');
    els.date2Group.hidden = false;
    requestAnimationFrame(() => drums2.resync());
  }
  // ссылка «поделиться» с готовыми датами — сразу считаем
  if (urlQ.get('d1')) els.btnCalc.click();

  const status = await db.dbStatus();
  // бейдж показываем только когда база полная — «краткая база» лишь путает
  els.dbBadge.hidden = !status.full;
  if (status.full) {
    els.dbBadge.textContent = 'Полная база трактовок';
    els.dbBadge.classList.add('ok');
  }
})();

/* ================= Поделиться ================= */
els.btnShare?.addEventListener('click', async () => {
  // если есть расчёт — делимся красивой карточкой со схемой (сторис 9:16)
  if (lastResult) {
    els.btnShare.disabled = true;
    try {
      const d1 = drums1.getValue();
      const d2 = mode === 'compat' ? drums2.getValue() : null;
      const how = await shareMatrixCard(lastResult, d1, d2, mode);
      if (how === 'shared') toast('Картинка отправлена вместе со ссылкой');
      if (how === 'downloaded') toast('Картинка сохранена, ссылка в буфере — отправьте их вместе');
      return;
    } catch {
      // не вышло с картинкой — уходим в шеринг ссылки
    } finally {
      els.btnShare.disabled = false;
    }
  }
  const u = new URL(location.origin + location.pathname);
  u.searchParams.set('mode', mode);
  u.searchParams.set('d1', drums1.getValue());
  if (mode === 'compat') u.searchParams.set('d2', drums2.getValue());
  const link = u.toString();
  const text = 'Матрица Судьбы — бесплатный расчёт онлайн';
  if (navigator.share) {
    try { await navigator.share({ title: text, url: link }); } catch { /* отменено */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    toast('Ссылка скопирована — отправьте её кому хотите');
  } catch {
    showError(`Скопируйте ссылку вручную: ${link}`);
  }
});

/* ================= Офлайн-баннер ================= */
// сайт считает локально, но база трактовок/шрифты требуют сеть при первом визите —
// честно предупреждаем, если интернет пропал
const offlineBar = $('offlineBar');
function syncOfflineBar() {
  if (!offlineBar) return;
  offlineBar.hidden = navigator.onLine;
}
window.addEventListener('offline', syncOfflineBar);
window.addEventListener('online', syncOfflineBar);
syncOfflineBar();
