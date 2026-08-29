/* ================= Здоровье: таблица чакр + разбор ================= */
import { ARCANA } from '../data/arcana.js';
import { block } from './cards.js';

export const CHAKRA_COLORS = ['#b388ff', '#7c9aff', '#4fc3f7', '#5ce8a0', '#ffd166', '#ff9e66', '#ff6b6b'];

/** Таблица чакр + полный разбор по каждой чакре + итоговая энергия. */
export async function healthAccordion(rows, totals, getEntry, getTotalEntry, { couple = false } = {}) {
  const bodyRows = [];
  const detailCards = [];
  for (const [i, r] of rows.entries()) {
    const e = await getEntry(r);
    bodyRows.push(`
      <tr class="hrow" data-i="${i}" tabindex="0" role="button" aria-expanded="false">
        <td><span class="ch-dot" style="background:${CHAKRA_COLORS[i]}"></span><span class="ch-name">${r.name}</span><span class="h-arrow">▾</span></td>
        <td>${r.phys}</td><td>${r.energy}</td><td><b>${r.emotion}</b></td>
      </tr>
      <tr class="hrow-detail" hidden>
        <td colspan="4"><div class="hdetail">
          <p class="hdetail-title">${r.note}</p>
          ${block('Плюс', 'plus', e?.positive)}
          ${block('Минус', 'minus', e?.negative)}
          ${block('Совет', 'tip', e?.advice)}
        </div></td>
      </tr>`);
    const a = ARCANA[r.emotion];
    detailCards.push(`
      <details class="card chakra-card">
        <summary><span class="card-num" style="border-color:${CHAKRA_COLORS[i]};color:${CHAKRA_COLORS[i]}">${r.emotion}</span><span class="card-head"><span class="card-title">${r.name} <span class="prog-codes">физ ${r.phys} · эне ${r.energy} · итог ${r.emotion}</span></span><span class="card-sub">${r.note}${a ? ` · ${a.name}` : ''}</span></span><span class="card-chevron">▾</span></summary>
        <div class="card-body">
          <p class="hdetail-title">Итоговая энергия чакры — аркан ${r.emotion}${a ? ` (${a.name})` : ''}: складывается из физики (${r.phys}) и энергии (${r.energy}). Она показывает, как эта сфера организма и психики работает ${couple ? 'у пары' : 'у вас'} по умолчанию.</p>
          ${block('В плюсе', 'plus', e?.positive)}
          ${block('В минусе', 'minus', e?.negative)}
          ${block('Как гармонизировать', 'tip', e?.advice)}
        </div>
      </details>`);
  }
  const te = getTotalEntry ? await getTotalEntry(totals.emotion) : null;
  const ta = ARCANA[totals.emotion];
  return `
  <table class="health-table health-accordion">
    <thead><tr><th>Чакра</th><th>Физика</th><th>Энергия</th><th>Итог</th></tr></thead>
    <tbody>${bodyRows.join('')}</tbody>
    <tfoot><tr><td>ИТОГО</td><td>${totals.phys}</td><td>${totals.energy}</td><td>${totals.emotion}</td></tr></tfoot>
  </table>
  <div class="program-banner">
    <b>${couple ? 'Итоговая энергия здоровья пары' : 'Итоговая энергия здоровья'} — ${totals.emotion}${ta ? ` (${ta.name})` : ''} <span class="prog-codes">строка ИТОГО</span></b>
    <p>Это сумма всех семи чакр: физика сошлась в <b>${totals.phys}</b>, энергия — в <b>${totals.energy}</b>, а общий итог — в аркан <b>${totals.emotion}</b>. ${couple ? 'Она описывает базовый фон самочувствия и восстановления союза: как пара отдыхает, болеет и набирается сил вместе.' : 'Она описывает ваш базовый фон самочувствия и главный способ восстановления.'}</p>
    ${te ? `${block(couple ? 'Когда союз в ресурсе' : 'Как проявляется в ресурсе', 'plus', te.positive)}${block(couple ? 'Когда пара выгорает' : 'Когда организм сигналит', 'minus', te.negative)}${block(couple ? 'Главный рецепт восстановления пары' : 'Главный рецепт восстановления', 'tip', te.advice)}` : ''}
  </div>
  <h3 class="subhead">Разбор по каждой чакре</h3>
  ${detailCards.join('')}`;
}
