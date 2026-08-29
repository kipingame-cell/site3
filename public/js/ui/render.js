/* ================= Рендер результата: схема, чакры, табы, прогноз ================= */
import * as db from '../db.js';
import { renderOctagram, LEGEND, ZONE_COLORS } from '../octagram.js?v=20';
import { $, els } from './dom.js';
import { section, skeleton, entryCard } from './cards.js';
import { CHAKRA_COLORS } from './health.js';
import { buildSingleSections } from './sectionsSingle.js';
import { buildCompatSections } from './sectionsCompat.js';
import { renderSavedSlide } from './saved.js';

/**
 * Полный рендер результата.
 * ctx: { getMode, onPoint, savedCtx } — savedCtx прокидывается в «Мои матрицы».
 */
export async function renderAll(result, ctx) {
  // схема
  renderOctagram(els.svg, result, { onPointClick: ctx.onPoint });
  els.legend.innerHTML = LEGEND.map(([k, label]) =>
    `<span class="legend-item"><i style="background:${ZONE_COLORS[k]}"></i>${label}</span>`).join('');

  // боковая панель чакр (+ строка «Сумма» со всеми тремя итогами)
  const ht = result.health.totals;
  els.chakraSide.innerHTML = `
    <h3>Чакры</h3>
    ${result.health.rows.map((r, i) => `
      <div class="chakra-row">
        <span class="ch-dot" style="background:${CHAKRA_COLORS[i]}"></span>
        <span class="ch-name">${r.name}</span>
        <span class="ch-vals"><i>${r.phys}</i><i>${r.energy}</i><b>${r.emotion}</b></span>
      </div>`).join('')}
    <div class="chakra-row chakra-total">
      <span class="ch-dot ch-dot-sum"></span>
      <span class="ch-name">Сумма</span>
      <span class="ch-vals"><i>${ht.phys}</i><i>${ht.energy}</i><b>${ht.emotion}</b></span>
    </div>`;

  // секции
  els.slides.innerHTML = '';
  els.tabsRow.innerHTML = '';
  const build = ctx.getMode() === 'compat' ? buildCompatSections : buildSingleSections;
  els.slides.innerHTML = skeleton(4);

  const sections = await build(result);
  els.slides.innerHTML = sections.map(([key, title, html]) => section(key, title, html)).join('');

  // левая колонка табов: переключаем панели, не скроллим простыню
  const activate = (key) => {
    els.slides.querySelectorAll('.slide').forEach((s) => s.classList.toggle('active', s.dataset.key === key));
    els.tabsRow.querySelectorAll('.tab-item').forEach((t) => t.classList.toggle('active', t.dataset.key === key));
  };
  for (const [key, title] of sections) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip tab-item';
    b.dataset.key = key;
    b.textContent = title;
    b.addEventListener('click', () => activate(key));
    els.tabsRow.appendChild(b);
  }
  // --- вкладка «Мои матрицы»: сохранённые расчёты ---
  const savedSlide = document.createElement('section');
  savedSlide.className = 'slide';
  savedSlide.dataset.key = 'saved';
  savedSlide.id = 'sec-saved';
  els.slides.appendChild(savedSlide);
  const savedTab = document.createElement('button');
  savedTab.type = 'button';
  savedTab.className = 'chip tab-item';
  savedTab.dataset.key = 'saved';
  savedTab.textContent = 'Мои матрицы';
  savedTab.addEventListener('click', () => { renderSavedSlide(ctx.savedCtx); activate('saved'); });
  els.tabsRow.appendChild(savedTab);
  renderSavedSlide(ctx.savedCtx);

  activate(sections[0][0]);

  // прогноз: клики по годам
  const chips = $('yearChips');
  if (chips) {
    chips.addEventListener('click', async (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const card = $('forecastCard');
      card.innerHTML = skeleton(1);
      const entry = await db.lichnZone('forecast', Number(btn.dataset.energy));
      card.innerHTML = `<h3 class="forecast-title">${btn.dataset.year} год — аркан ${btn.dataset.energy}</h3>` + entryCard(Number(btn.dataset.energy), entry, { open: true });
    });
    // сразу показать текущий год
    const first = chips.querySelector('.chip');
    if (first) {
      const entry = await db.lichnZone('forecast', Number(first.dataset.energy));
      $('forecastCard').innerHTML = `<h3 class="forecast-title">${first.dataset.year} год — аркан ${first.dataset.energy}</h3>` + entryCard(Number(first.dataset.energy), entry, { open: true });
    }
  }
}
