/* ================= Мои матрицы (сохранённые расчёты) ================= */
import { $ } from './dom.js';
import { store } from './store.js';
import { toast } from './dom.js';

function savedList() {
  try { return JSON.parse(store.get('dm_saved') || '[]'); } catch { return []; }
}
function savedWrite(list) {
  store.set('dm_saved', JSON.stringify(list.slice(0, 20)));
}

/**
 * Рендер вкладки «Мои матрицы».
 * ctx: { getMode, getLastResult, drums1, drums2, setMode, recalc } —
 * геттеры нужны, потому что состояние живёт в app.js и меняется между вызовами.
 */
export function renderSavedSlide(ctx) {
  const slide = $('sec-saved');
  if (!slide) return;
  const mode = ctx.getMode();
  const lastResult = ctx.getLastResult();
  const list = savedList();
  slide.innerHTML = `
    <h2 class="zone-title">Мои матрицы</h2>
    <p class="hint">Сохраняйте расчёты близких и переключайтесь между ними в один тап. Всё хранится только в вашем браузере.</p>
    <div class="saved-actions">
      <button id="btnSaveCurrent" class="btn-primary btn-sm" type="button" ${lastResult ? '' : 'disabled'}>＋ Сохранить текущий расчёт</button>
    </div>
    <div class="saved-list">
      ${list.length ? '' : '<p class="hint">Пока пусто. Сделайте расчёт и нажмите «Сохранить текущий расчёт».</p>'}
      ${list.map((e, i) => `
        <div class="saved-item">
          <button class="chip saved-open" type="button" data-i="${i}">
            <b>${e.label}</b>
            <span>${e.mode === 'compat' ? `${e.d1} + ${e.d2}` : e.d1}${e.mode === 'compat' ? ' · совместимость' : ''}</span>
          </button>
          <button class="saved-del" type="button" data-i="${i}" title="Удалить" aria-label="Удалить">✕</button>
        </div>`).join('')}
    </div>`;

  slide.querySelector('#btnSaveCurrent')?.addEventListener('click', () => {
    if (!ctx.getLastResult()) return;
    const d1 = ctx.drums1.getValue();
    const d2 = ctx.getMode() === 'compat' ? ctx.drums2.getValue() : null;
    const def = ctx.getMode() === 'compat' ? `${d1} + ${d2}` : d1;
    const label = (prompt('Имя для этого расчёта (например, «Мама» или «Мы с Игорем»):', def) || '').trim() || def;
    const cur = ctx.getMode();
    const list = savedList().filter((e) => !(e.mode === cur && e.d1 === d1 && e.d2 === d2));
    list.unshift({ label, mode: cur, d1, d2, ts: Date.now() });
    savedWrite(list);
    renderSavedSlide(ctx);
    toast(`«${label}» сохранено в Мои матрицы`);
  });

  slide.querySelectorAll('.saved-open').forEach((b) => b.addEventListener('click', () => {
    const e = savedList()[Number(b.dataset.i)];
    if (!e) return;
    ctx.setMode(e.mode === 'compat' ? 'compat' : 'single');
    ctx.drums1.setValue(e.d1);
    if (e.mode === 'compat' && e.d2) ctx.drums2.setValue(e.d2);
    ctx.recalc();
  }));

  slide.querySelectorAll('.saved-del').forEach((b) => b.addEventListener('click', () => {
    const list = savedList();
    list.splice(Number(b.dataset.i), 1);
    savedWrite(list);
    renderSavedSlide(ctx);
  }));
}
