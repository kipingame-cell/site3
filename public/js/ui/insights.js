/* ================= Личные секции: визитка, синтез, центр, прозрачность расчёта ================= */
import { ARCANA } from '../data/arcana.js';
import * as db from '../db.js';
import { block } from './cards.js';

/** Сводная карта каналов матрицы: [[значение, название канала], ...] */
export function channelMap(m) {
  const p = m.points, pr = m.purposes;
  return [
    [p.day, 'портрет личности'],
    [p.month, 'таланты'],
    [p.year, 'социум и материя'],
    [p.tail, 'кармический хвост'],
    [p.center, 'центр матрицы'],
    [m.keys.money, 'денежный ключ'],
    [m.keys.relations, 'ключ отношений'],
    [m.keys.entry, 'точка входа в канал'],
    [pr.personal, 'личное предназначение'],
    [pr.social, 'социальное предназначение'],
    [pr.general, 'общее предназначение'],
  ];
}

/** Повторяющиеся энергии: [[значение, [каналы]]] — только те, что встречаются 2+ раза. */
export function duplicatedEnergies(m) {
  const byVal = new Map();
  for (const [v, name] of channelMap(m)) {
    if (!byVal.has(v)) byVal.set(v, []);
    byVal.get(v).push(name);
  }
  return [...byVal.entries()].filter(([, ch]) => ch.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
}

/** Прозрачность расчёта: цепочка формул с реальными числами. */
export function calcTransparencyHTML(m) {
  const { day, month, year } = m.input;
  const p = m.points;
  const redSteps = (n, v) => n > 22 || n !== v ? `${n} → ${v}` : `${v}`;
  const A0 = day, C0 = String(year).split('').reduce((s, c) => s + Number(c), 0);
  const D0 = p.day + p.month + p.year;
  const E0 = D0 + p.tail;
  return `<div class="program-banner">
    <b>Откуда берутся энергии <span class="prog-codes">полная прозрачность расчёта</span></b>
    <p>Каждая цифра в вашей матрице — это сумма других цифр, сведённая к аркану (если сумма больше 22, её цифры складываются снова). Проверьте сами:</p>
    <ul class="calc-list">
      <li><b>${p.day}</b> — день рождения: ${redSteps(A0, p.day)}</li>
      <li><b>${p.month}</b> — месяц рождения</li>
      <li><b>${p.year}</b> — год: ${year} → ${C0}${C0 !== p.year ? ` → ${p.year}` : ''}</li>
      <li><b>${p.tail}</b> — кармический хвост: ${p.day} + ${p.month} + ${p.year} = ${D0}${D0 !== p.tail ? ` → ${p.tail}` : ''}</li>
      <li><b>${p.center}</b> — центр: ${p.day} + ${p.month} + ${p.year} + ${p.tail} = ${E0}${E0 !== p.center ? ` → ${p.center}` : ''}</li>
      <li><b>${p.diagonal.leftTop}</b> — род отца (дух): ${p.day} + ${p.month}</li>
      <li><b>${p.diagonal.rightTop}</b> — род матери (дух): ${p.month} + ${p.year}</li>
      <li><b>${p.diagonal.rightBottom}</b> — род отца (материя): ${p.year} + ${p.tail}</li>
      <li><b>${p.diagonal.leftBottom}</b> — род матери (материя): ${p.tail} + ${p.day}</li>
    </ul>
    <p class="prog-advice">Все остальные точки — промежуточные суммы на лучах между этими углами и центром. Никакой магии в вычислениях: только сложение и сведение к 22 арканам.</p>
  </div>`;
}

/** Блок «Визитка»: соцмаска, детство/родители, прозрачность расчёта. */
export async function vizitkaHTML(m) {
  const p = m.points, ax = m.axes;
  const mainVals = channelMap(m).map(([v]) => v);
  const has = (n) => mainVals.includes(n);
  const childhood = [];
  if (has(6)) childhood.push(`<b>Аркан 6 (Влюблённые)</b> присутствует в вашей матрице — тема отношений с матерью и первого опыта любви сильно влияет на сценарии взрослой жизни: вы ищете в партнёрах тепло и принятие, знакомые с детства.`);
  if (has(10)) childhood.push(`<b>Аркан 10 (Колесо Фортуны)</b> в матрице — влияние отца или отцовской линии: с детства усвоен урок «удача любит смелых»; во взрослой жизни это даёт лёгкость, а в минусе — ожидание, что всё решится само.`);
  if (!childhood.length) childhood.push('Арканов 6 и 10 нет в главных точках — детские сценарии влияют мягче, вы больше опираетесь на собственный опыт, чем на родительские модели.');
  const mask = await db.lichnZone('money', ax.right.inner);
  const self = await db.lichnZone('portrait', p.day);
  const card = (num, cap, e) => e ? `
    <details class="card" open>
      <summary><span class="card-num">${num}</span><span class="card-head"><span class="card-title">${cap}</span><span class="card-sub">${e.title}</span></span><span class="card-chevron">▾</span></summary>
      <div class="card-body">${block('Плюс', 'plus', e.positive)}${block('Минус', 'minus', e.negative)}${block('Совет', 'tip', e.advice)}</div>
    </details>` : '';
  return `
    ${card(ax.right.inner, 'Социальная маска — как вас видят коллеги и знакомые', mask)}
    ${card(p.day, 'Ваше «я» — как вы видите себя изнутри', self)}
    <div class="program-banner"><b>Детство и родители</b>${childhood.map((t) => `<p>${t}</p>`).join('')}</div>
    ${calcTransparencyHTML(m)}`;
}

/** Блок «Синтез энергий»: дубли, связки хвоста, пересечения родовых линий. */
export function synthesisHTML(m) {
  const p = m.points, pr = m.purposes;
  const out = [];

  // 1. Повторяющиеся энергии
  const dups = duplicatedEnergies(m);
  if (dups.length) {
    const items = dups.map(([v, ch]) => {
      const a = ARCANA[v];
      return `<p><b>Энергия ${v}${a ? ` (${a.name})` : ''}</b> звучит сразу в нескольких местах: <b>${ch.join(', ')}</b>. Это не ошибка расчёта и не «задвоение» — повтор означает, что тема аркана усилена: она работает одновременно во всех этих сферах и требует особого внимания.${a ? ` Ключ к гармонизации: ${a.advice}` : ''}</p>`;
    });
    out.push(`<div class="program-banner"><b>Повторяющиеся энергии <span class="prog-codes">усиленные темы</span></b>${items.join('')}</div>`);
  } else {
    out.push('<div class="program-banner"><b>Повторяющиеся энергии</b><p>В главных каналах нет повторов — темы распределены равномерно, каждая сфера живёт своей энергией.</p></div>');
  }

  // 2. Хвост ↔ деньги и призвание
  const tailVals = new Set(m.karmicTail);
  const moneyCh = [[m.keys.money, 'денежный ключ'], [m.keys.entry, 'точка входа'], [m.axes.right.inner, 'социум'], [m.axes.right.mid, 'денежный вход']]
    .filter(([v]) => tailVals.has(v));
  const talentCh = [[p.month, 'талант'], [m.axes.top.inner, 'связь с Духом'], [m.axes.top.mid, 'интуиция']]
    .filter(([v]) => tailVals.has(v));
  if (moneyCh.length || talentCh.length) {
    const parts = [];
    if (moneyCh.length) parts.push(`<p>Кармический хвост пересекается с денежным каналом (<b>${moneyCh.map(([, n]) => n).join(', ')}</b>): финансы для вас — способ проработки кармы. Деньги приходят ровно тогда, когда закрывается урок хвоста; саботаж в деньгах — сигнал вернуться к кармической задаче.</p>`);
    if (talentCh.length) parts.push(`<p>Кармический хвост связан с талантами (<b>${talentCh.map(([, n]) => n).join(', ')}</b>): ваше призвание рождается из проработки кармы — то, что было слабостью в прошлом, в этой жизни становится даром. Развивая талант, вы автоматически закрываете урок хвоста.</p>`);
    out.push(`<div class="program-banner"><b>Хвост ↔ деньги и призвание</b>${parts.join('')}</div>`);
  }

  // 3. Пересечения родовых линий
  const fatherVals = new Set([p.diagonal.leftTop, p.diagonal.rightBottom,
    m.rod.fatherTop.inner, m.rod.fatherTop.mid, m.rod.fatherBottom.inner, m.rod.fatherBottom.mid]);
  const motherVals = new Set([p.diagonal.rightTop, p.diagonal.leftBottom,
    m.rod.motherTop.inner, m.rod.motherTop.mid, m.rod.motherBottom.inner, m.rod.motherBottom.mid]);
  const cross = [...fatherVals].filter((v) => motherVals.has(v));
  if (cross.length) {
    const items = cross.map((v) => {
      const a = ARCANA[v];
      return `<b>${v}${a ? ` (${a.name})` : ''}</b>`;
    }).join(', ');
    out.push(`<div class="program-banner"><b>Пересечение родовых программ</b>
      <p>Род отца и род матери встречаются в энергиях: ${items}. Эти темы даны вам от обеих линий рода — они самые сильные в вашем родовом наследии.</p>
      <p class="prog-advice"><b>Практическая польза:</b> пересекающиеся энергии — ваш родовой ресурс. Работая с ними (живя их в плюсе), вы гармонизируете сразу обе линии рода и снимаете повторяющиеся семейные сценарии.</p>
    </div>`);
  }

  // 4. Род → предназначение
  const purposeCh = [[pr.personal, 'личное предназначение'], [pr.social, 'социальное предназначение'], [pr.general, 'общее предназначение']];
  const fromFather = purposeCh.filter(([v]) => fatherVals.has(v)).map(([, n]) => n);
  const fromMother = purposeCh.filter(([v]) => motherVals.has(v)).map(([, n]) => n);
  if (fromFather.length || fromMother.length) {
    const parts = [];
    if (fromFather.length) parts.push(`<p><b>${fromFather.join(', ')}</b> питается энергией рода отца: ресурс отцовской линии напрямую работает на вашу реализацию.</p>`);
    if (fromMother.length) parts.push(`<p><b>${fromMother.join(', ')}</b> питается энергией рода матери: поддержка и сценарии материнской линии влияют на вашу миссию.</p>`);
    out.push(`<div class="program-banner"><b>Род → предназначение</b>${parts.join('')}</div>`);
  }

  return out.join('');
}

/** Углублённый разбор центра матрицы. */
export function centerDeepHTML(m) {
  const c = m.points.center;
  const a = ARCANA[c];
  const repeats = channelMap(m).filter(([v, name]) => v === c && name !== 'центр матрицы').map(([, n]) => n);
  return `<div class="program-banner">
    <b>Центр матрицы — внутренний стержень <span class="prog-codes">аркан ${c}${a ? ` · ${a.name}` : ''}</span></b>
    <p>Центр — это зона комфорта, ресурс и точка сборки всей матрицы. Когда вы живёте в плюсе этой энергии, остальные каналы наполняются сами; когда в минусе — перекос идёт по всем сферам сразу.</p>
    ${repeats.length ? `<p>Центральная энергия повторяется ещё и в каналах: <b>${repeats.join(', ')}</b> — значит, её тема для вас главная в жизни, и проработка центра меняет сразу несколько сфер.</p>` : ''}
    <p class="prog-advice"><b>Как ресурситься:</b> ${a ? a.advice : ''}</p>
  </div>`;
}
