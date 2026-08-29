/* ================= Личные секции разбора ================= */
import { reduceArcana, yearForecast, programKeys } from '../core/matrixCore.js?v=14';
import { findKarmicTail } from '../data/arcana.js';
import * as db from '../db.js';
import { zoneCards, skeleton } from './cards.js';
import { healthAccordion } from './health.js';
import { programBanner } from './programs.js';
import { vizitkaHTML, synthesisHTML, centerDeepHTML } from './insights.js';
import { exitPlusSingleHTML } from './exitPlus.js';

export async function buildSingleSections(m) {
  const p = m.points;
  const pr = m.purposes;
  const ax = m.axes;
  const tailProg = findKarmicTail(m.karmicTail);

  // линия благополучия: центр = вход денег + вход отношений,
  // «под долларом» = вход денег + центр, «под сердцем» = вход отношений + центр
  const moneyIn = ax.right.inner;
  const relIn = ax.bottom.inner;
  const balance = reduceArcana(moneyIn + relIn);
  const dollar = reduceArcana(moneyIn + balance);
  const heart = reduceArcana(relIn + balance);

  const healthHTML = await healthAccordion(m.health.rows, m.health.totals, (r) => db.lichnHealth(r.id, r.emotion), (v) => db.lichnZone('destiny', v));

  const pk = programKeys(m);
  const [progTalents, progTail, progMoney, progRelations, progFather, progMother, progPers, progSoc] =
    await Promise.all([
      db.programCombo('talents', pk.talents),
      db.programCombo('tail', pk.tail),
      db.programCombo('money', pk.money),
      db.programCombo('relations', pk.relations),
      db.programCombo('father', pk.father),
      db.programCombo('mother', pk.mother),
      db.programCombo('purposePers', pk.purposePers),
      db.programCombo('purposeSoc', pk.purposeSoc),
    ]);

  const tailHTML = `
    ${programBanner(progTail, pk.tail)}
    ${tailProg ? `<div class="program-banner"><b>${tailProg.title}</b><p>${tailProg.text}</p></div>` : ''}
    <p class="hint">Триада хвоста читается от центра вниз: <b>${pk.tail.replace(/-/g, ' — ')}</b> (вход — опыт прошлого → усиление-привычка → главный урок)</p>
    ${await zoneCards('tail', [
      [ax.bottom.inner, 'Вход в хвост — опыт прошлого'],
      [ax.bottom.mid, 'Усиление — закрепившаяся привычка'],
      [p.tail, 'Главный урок — нижняя точка'],
    ])}`;

  const nowYear = new Date().getFullYear();
  const years = yearForecast(`${m.input.year}-${String(m.input.month).padStart(2, '0')}-${String(m.input.day).padStart(2, '0')}`, nowYear, 10);
  const forecastHTML = `
    <p class="hint">Кольцо возрастов: 64 позиции по ~1,25 года, энергия года = позиция кольца для возраста.</p>
    <div class="year-chips" id="yearChips">${years.map((f, i) => `
      <button type="button" class="chip${i === 0 ? ' active' : ''}" data-year="${f.year}" data-age="${f.age}" data-energy="${f.energy}">${f.year} · ${f.energy}</button>`).join('')}
    </div>
    <div id="forecastCard">${skeleton(1)}</div>`;

  return [
    ['portrait', 'Портрет личности', await zoneCards('portrait', [
      [p.day, 'День рождения — кто ты'],
      [ax.left.inner, 'Эмоции — сердечная чакра'],
      [ax.left.mid, 'Талант от Бога'],
    ])],
    ['talents', 'Таланты', programBanner(progTalents, pk.talents) + `<p class="hint">Триада талантов читается от большого кружка: <b>${pk.talents.replace(/-/g, ' — ')}</b> (духовный талант → интеллект → самовыражение)</p>` + await zoneCards('talents', [
      [p.month, 'Духовный талант — месяц, Ангел-хранитель'],
      [ax.top.mid, 'Талант интеллекта и типа мышления'],
      [ax.top.inner, 'Талант самовыражения и коммуникации'],
    ])],
    ['destiny', 'Задача души', centerDeepHTML(m) + await zoneCards('destiny', [
      [p.center, 'Центр — зона комфорта, душа'],
    ])],
    ['vizitka', 'Визитка', await vizitkaHTML(m)],
    ['money', 'Деньги', programBanner(progMoney, pk.money) + `<p class="hint">Денежный канал: <b>${pk.money.replace(/-/g, ' — ')}</b> (год → профессия и род деятельности → вход в канал). Центр линии благополучия: <b>${balance}</b>, точка «под долларом»: <b>${dollar}</b></p>` + await zoneCards('money', [
      [p.year, 'Год — якорь денежного канала'],
      [ax.right.mid, 'Профессия и род деятельности'],
      [ax.right.inner, 'Вход в денежный канал'],
      [dollar, 'Точка «под долларом» — материальный потенциал'],
      [balance, 'Центр линии благополучия'],
    ])],
    ['relations', 'Отношения', programBanner(progRelations, pk.relations) + `<p class="hint">Канал отношений: <b>${pk.relations.replace(/-/g, ' — ')}</b> (вход в канал → «под сердцем», образ идеального партнёра → программа близости)</p>` + await zoneCards('relations', [
      [ax.bottom.inner, 'Вход в канал отношений'],
      [heart, '«Под сердцем» — идеальный партнёр'],
      [ax.bottom.mid, 'Программа близости'],
      [p.tail, 'Карма в отношениях — якорь канала'],
    ])],
    ['tail', 'Кармический хвост', tailHTML],
    ['purpose', 'Предназначения',
      programBanner(progPers, pk.purposePers)
      + programBanner(progSoc, pk.purposeSoc)
      + `<p class="hint">Личное (20–40): <b>${pr.personal}</b> · Социальное (40–60): <b>${pr.social}</b> · Общее: <b>${pr.general}</b> · Планетарное: <b>${pr.planetary}</b></p>`
      + await zoneCards('purposePers', [
        [pr.sky, 'Небо — духовные задачи'],
        [pr.earth, 'Земля — материальные задачи'],
        [pr.personal, 'Личное (20–40 лет)'],
        [pr.general, 'Общее предназначение'],
        [pr.planetary, 'Планетарное'],
      ])
      + await zoneCards('purposeSoc', [
        [pr.fatherLine, 'Линия рода отца'],
        [pr.motherLine, 'Линия рода матери'],
        [pr.social, 'Социальное (40–60 лет)'],
      ])],
    ['father', 'Род отца', programBanner(progFather, pk.father) + `<p class="hint">Духовная программа рода (от большого кружка): <b>${pk.father.replace(/-/g, ' — ')}</b> (угол → середина → связь с родом у центра)</p>` + await zoneCards('father', [
      [p.diagonal.leftTop, 'Духовная линия рода — 1 колено'],
      [m.rod.fatherTop.mid, 'Середина духовной линии'],
      [m.rod.fatherTop.inner, 'Связь с родом — таланты по отцу'],
      [p.diagonal.rightBottom, 'Материальная линия рода'],
      [m.rod.fatherBottom.inner, 'Связь с родом (материя)'],
    ])],
    ['mother', 'Род матери', programBanner(progMother, pk.mother) + `<p class="hint">Духовная программа рода (от большого кружка): <b>${pk.mother.replace(/-/g, ' — ')}</b> (угол → середина → связь с родом у центра)</p>` + await zoneCards('mother', [
      [p.diagonal.rightTop, 'Духовная линия рода — 1 колено'],
      [m.rod.motherTop.mid, 'Середина духовной линии'],
      [m.rod.motherTop.inner, 'Связь с родом — таланты по матери'],
      [p.diagonal.leftBottom, 'Материальная линия рода'],
      [m.rod.motherBottom.inner, 'Связь с родом (материя)'],
    ])],
    ['synthesis', 'Синтез энергий', synthesisHTML(m)],
    ['health', 'Матрица здоровья', healthHTML],
    ['forecast', 'Прогноз по годам', forecastHTML],
    ['plus', 'Выход в плюс', exitPlusSingleHTML(m)],
  ];
}
