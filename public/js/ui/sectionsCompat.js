/* ================= Секции совместимости ================= */
import { reduceArcana } from '../core/matrixCore.js?v=14';
import { findKarmicTail } from '../data/arcana.js';
import * as db from '../db.js';
import { compatBlockCard } from './cards.js';
import { healthAccordion } from './health.js';
import { plainTriad } from './programs.js';
import { exitPlusCompatHTML } from './exitPlus.js';

/** Полоски совместимости в процентах (как в тиктоке): каждая сфера считается
    из реальных энергий матрицы пары — чем сильнее связка, тем выше процент. */
function compatChemistryHTML(c) {
  const p = c.points;
  // процент из пары энергий: сводим сумму к аркану (1–22) и растягиваем в 54–98
  const pct = (a, b) => 54 + Math.round((reduceArcana(a + b) / 22) * 44);
  const rows = [
    ['Любовь', c.keys.relations, p.center],
    ['Страсть', c.keys.entry, p.day],
    ['Секс', c.axes.bottom.inner, c.keys.relations],
    ['Дети', c.axes.bottom.mid, p.center],
    ['Деньги', c.keys.money, c.axes.right.inner],
    ['Верность', p.tail, p.center],
    ['Духовная связь', c.axes.top.inner, p.month],
    ['Общие цели', c.purposes.social, c.purposes.general],
    ['Быт и уют', p.day, c.axes.left.inner],
    ['Взаимопонимание', c.axes.top.mid, p.month],
  ].map(([label, a, b]) => [label, pct(a, b), a, b])
   .sort((x, y) => y[1] - x[1]);
  return `<div class="program-banner">
    <b>Химия пары в процентах <span class="prog-codes">считается из энергий вашей матрицы</span></b>
    <p>Каждая полоска — это сила связки двух реальных точек вашей общей матрицы. Процент не «оценка отношений», а показатель, где у пары природный ресурс, а где — зона роста: низкую полоску легко поднять, проживая её энергии в плюсе.</p>
  </div>
  <div class="chem-list">
    ${rows.map(([label, val, a, b]) => `
    <div class="chem-row">
      <div class="chem-head"><span class="chem-label">${label} <span class="chem-nums">${a} + ${b}</span></span><b class="chem-val">${val}%</b></div>
      <div class="chem-track"><div class="chem-fill" style="--pct:${val}%"><i></i></div></div>
    </div>`).join('')}
  </div>
  <p class="hint">Процент = энергии, указанные рядом с названием (числа с диаграммы пары), сведённые к аркану. У одной и той же пары цифры всегда одинаковые — это не случайность, а отпечаток союза.</p>`;
}

export async function buildCompatSections(c) {
  const p = c.points;
  const tailProg = findKarmicTail(c.karmicTail);

  const arc = (n) => db.compatArcana(n);
  // Триады программ пары читаем С ДИАГРАММЫ совместимости (поузловые суммы),
  // а не пересчётом — иначе в программах появляются числа, которых нет на схеме.
  const d = c.points.diagonal;
  const pk = {
    talents: `${c.points.month}-${c.axes.top.mid}-${c.axes.top.inner}`,
    tail: `${c.axes.bottom.inner}-${c.axes.bottom.mid}-${c.points.tail}`,
    money: `${c.points.year}-${c.axes.right.mid}-${c.axes.right.inner}`,
    relations: `${c.axes.bottom.inner}-${c.keys.relations}-${c.axes.bottom.mid}`,
    father: `${d.leftTop}-${c.rod.fatherTop.mid}-${c.rod.fatherTop.inner}`,
    mother: `${d.rightTop}-${c.rod.motherTop.mid}-${c.rod.motherTop.inner}`,
    purposePers: `${c.purposes.sky}-${c.purposes.personal}-${c.purposes.earth}`,
    purposeSoc: `${c.purposes.fatherLine}-${c.purposes.motherLine}-${c.purposes.social}`,
  };
  const [tRel, tMoney, tTail, tSoc] = await Promise.all([
    db.programCombo('relations', pk.relations),
    db.programCombo('money', pk.money),
    db.programCombo('tail', pk.tail),
    db.programCombo('purposeSoc', pk.purposeSoc),
  ]);
  // В совместимости нельзя показывать тексты личных комбо-программ («в детстве…»,
  // «твои предки…») — берём только название программы, смысл даём парный.
  const compatBanner = (prog, key, coupleText) => {
    if (!prog && !key) return '';
    return `<div class="program-banner">
      <b>${prog?.title || 'Программа пары'} <span class="prog-codes">${key.replace(/-/g, ' · ')}</span></b>
      ${plainTriad(key)}
      <p>${coupleText}</p>
    </div>`;
  };
  const [
    arcCenter, arcRel, arcDay, arcYear, arcTail,
    arcBottomInner, arcBottomMid, arcRightInner, arcRightMid, arcLeftInner,
    arcFatherLine, arcMotherLine, arcSocial,
  ] = await Promise.all([
    arc(p.center), arc(c.keys.relations), arc(p.day), arc(p.year), arc(p.tail),
    arc(c.axes.bottom.inner), arc(c.axes.bottom.mid), arc(c.axes.right.inner), arc(c.axes.right.mid), arc(c.axes.left.inner),
    arc(c.purposes.fatherLine), arc(c.purposes.motherLine), arc(c.purposes.social),
  ]);

  const healthHTML = await healthAccordion(c.health.rows, c.health.totals, (r) => db.compatHealth(r.id, r.emotion), (v) => db.compatArcana(v).then((a) => a?.general ?? a), { couple: true });

  return [
    ['essence', 'Суть пары', compatBlockCard(p.center, 'general', 'Общая энергия пары', arcCenter)],
    ['love', 'Любовь и чувства',
      compatBanner(tRel, pk.relations, 'Совместная программа любви: как вы входите в близость, что является якорем союза и какой сценарий близости разворачивается между вами. Разбор каждого числа триады — в карточках ниже.')
      + `<p class="hint">Триада отношений пары: <b>${pk.relations.replace(/-/g, ' — ')}</b> (вход в канал → ключ отношений → программа близости). Все числа — с диаграммы пары.</p>`
      + compatBlockCard(c.axes.bottom.inner, 'love', 'Вход в канал отношений', arcBottomInner)
      + compatBlockCard(c.keys.relations, 'love', 'Ключ отношений — якорь союза', arcRel)
      + compatBlockCard(c.axes.bottom.mid, 'love', 'Программа близости', arcBottomMid)],
    ['finance', 'Финансы',
      compatBanner(tMoney, pk.money, 'Совместная денежная программа: как союз зарабатывает, через какой род деятельности приходят общие деньги и что открывает финансовый поток пары. Разбор каждого числа — ниже.')
      + `<p class="hint">Денежная триада пары: <b>${pk.money.replace(/-/g, ' — ')}</b> (год пары → профессия и род деятельности → вход в канал). Все числа — с диаграммы пары.</p>`
      + compatBlockCard(p.year, 'finance', 'Год пары — якорь денежного канала', arcYear)
      + compatBlockCard(c.axes.right.mid, 'finance', 'Профессия и род деятельности', arcRightMid)
      + compatBlockCard(c.axes.right.inner, 'finance', 'Вход в денежный канал', arcRightInner)],
    ['family', 'Семья и быт',
      compatBlockCard(p.day, 'family', 'Семейная жизнь', arcDay)
      + compatBlockCard(c.axes.left.inner, 'family', 'Эмоции в быту', arcLeftInner)],
    ['social', 'Социум',
      compatBanner(tSoc, pk.purposeSoc, 'Совместная социальная миссия: что вы как пара приносите миру и людям, когда союз работает в плюсе. Энергии родовых линий обоих партнёров складываются в общую задачу.')
      + `<p class="hint">Социальное предназначение пары: <b>${pk.purposeSoc.replace(/-/g, ' — ')}</b> (линия рода отца → линия рода матери → социальное).</p>`
      + compatBlockCard(c.purposes.fatherLine, 'social', 'Линия рода отца', arcFatherLine)
      + compatBlockCard(c.purposes.motherLine, 'social', 'Линия рода матери', arcMotherLine)
      + compatBlockCard(c.purposes.social, 'social', 'Социальное предназначение пары', arcSocial)],
    ['karma', 'Кармическая задача',
      compatBanner(tTail, pk.tail, 'Совместная кармическая задача — урок, ради которого вы встретились. Пока пара проживает эти энергии в минусе, отношения проверяются на прочность; в плюсе они становятся главным цементом союза.')
      + `${tailProg ? `<div class="program-banner"><b>${tailProg.title} <span class="prog-codes">архетип хвоста пары</span></b><p>${tailProg.text}</p><p class="prog-advice"><b>Для пары:</b> это общий урок — проживайте его вместе, а не перекладывайте друг на друга.</p></div>` : ''}
       <p class="hint">Триада хвоста пары: <b>${c.karmicTail.join(' — ')}</b> (вход → усиление → главный урок — нижняя точка диаграммы)</p>`
      + compatBlockCard(c.karmicTail[0], 'karma', 'Вход в хвост — опыт прошлого', arcBottomInner)
      + compatBlockCard(c.karmicTail[1], 'karma', 'Усиление — закрепившаяся привычка', arcBottomMid)
      + compatBlockCard(p.tail, 'karma', 'Главный урок пары', arcTail)],
    ['crisis', 'Кризисы и выход', compatBlockCard(p.center, 'crisis', 'Как пара проходит кризисы', arcCenter)],
    ['advice', 'Совет паре', compatBlockCard(p.center, 'advice', 'Главный совет', arcCenter)],
    ['health', 'Здоровье пары', healthHTML],
    ['plus', 'Выход в плюс', exitPlusCompatHTML(c)],
    ['chemistry', 'Совместимость в %', compatChemistryHTML(c)],
  ];
}
