/* ================= Тултип точек октаграммы (общий для app и landing) ================= */
import { ARCANA } from '../data/arcana.js';

/** Подключает всплывающую подсказку к элементу и возвращает обработчик onPointClick. */
export function attachPointTip(tip) {
  const onPoint = (node, e) => {
    if (!tip) return;
    if (!node) { tip.hidden = true; return; }
    const a = ARCANA[node.value];
    tip.innerHTML = `<b>${node.label}</b>Аркан ${node.value} — ${a ? `${a.name} · ${a.archetype}` : ''}`;
    tip.hidden = false;
    const x = e.clientX ?? 0;
    const y = e.clientY ?? 0;
    tip.style.left = `${Math.min(x + 16, window.innerWidth - 280)}px`;
    tip.style.top = `${Math.max(y - 24, 8)}px`;
  };
  document.addEventListener('click', () => { if (tip) tip.hidden = true; });
  return onPoint;
}
