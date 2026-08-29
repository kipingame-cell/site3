/* ================= Карточки и типовые блоки разбора ================= */
import { ARCANA } from '../data/arcana.js';
import * as db from '../db.js';

export function block(label, cls, text) {
  if (!text) return '';
  return `<div class="blk"><span class="blk-label ${cls}">${label}</span><p>${text}</p></div>`;
}

export function entryCard(num, entry, { open = false, caption = '' } = {}) {
  if (!entry) return '';
  const a = ARCANA[num];
  const sub = [caption, a ? a.keywords : ''].filter(Boolean).join(' · ');
  return `
  <details class="card" ${open ? 'open' : ''}>
    <summary>
      <span class="card-num">${num}</span>
      <span class="card-head">
        <span class="card-title">${entry.title || (a ? `${a.name} — ${a.archetype}` : `Аркан ${num}`)}</span>
        <span class="card-sub">${sub}</span>
      </span>
      <span class="card-chevron">▾</span>
    </summary>
    <div class="card-body">
      ${block('Плюсовое проявление', 'plus', entry.positive)}
      ${block('Минусовое проявление', 'minus', entry.negative)}
      ${block('Совет', 'tip', entry.advice)}
      ${block('Важно', 'warn', entry.warning)}
    </div>
  </details>`;
}

/** Карточки всех арканов зоны: [[число, подпись], ...] → HTML */
export async function zoneCards(zone, nums, openFirst = true) {
  const out = [];
  for (const [i, [num, caption]] of nums.entries()) {
    const entry = await db.lichnZone(zone, num);
    out.push(entryCard(num, entry, { open: openFirst && i === 0, caption }));
  }
  return out.join('');
}

export function compatBlockCard(num, blockName, title, data) {
  const b = data?.[blockName];
  if (!b) return '';
  const a = ARCANA[num];
  return `
  <details class="card">
    <summary>
      <span class="card-num">${num}</span>
      <span class="card-head">
        <span class="card-title">${title}</span>
        <span class="card-sub">${data.name || (a ? a.name : '')} · ${data.archetype || ''}</span>
      </span>
      <span class="card-chevron">▾</span>
    </summary>
    <div class="card-body">
      ${block('Плюс', 'plus', b.positive)}
      ${block('Минус', 'minus', b.negative)}
      ${block('Совет', 'tip', b.advice)}
      ${block('Важно', 'warn', b.warning)}
    </div>
  </details>`;
}

export function section(key, title, inner) {
  return `<section class="slide" id="sec-${key}" data-key="${key}">
    <h2 class="zone-title">${title}</h2>${inner}</section>`;
}

export function skeleton(n = 2) {
  return Array.from({ length: n }, () => '<div class="card skel"><div class="skel-line w60"></div><div class="skel-line"></div><div class="skel-line w80"></div></div>').join('');
}
