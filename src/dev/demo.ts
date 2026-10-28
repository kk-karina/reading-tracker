/**
 * Образец данных для локального режима: полка с сессиями и мыслями и поток
 * обучения с материалами на изучении, главами, занятиями и конспектами.
 *
 * Пишется прямо в хранилище браузера, а не через сторы: здесь нужен готовый
 * срез «как после трёх недель жизни», с датами в прошлом, а сторы ставят
 * сегодняшнюю. Id постоянные — повторный запуск не плодит копий, а заменяет
 * образец на свежий и не трогает то, что человек завёл сам.
 *
 * Открывается только из dev-сервера (`/demo.html`), в сборку не попадает.
 */
import { SEED_BOOKS } from '../lib/seed'
import type { Book, Note, Session, Snapshot } from '../lib/types'
import type {
  LearningSnapshot,
  Material,
  MaterialPart,
  Stream,
  StreamStep,
  StudyNote,
  StudySession,
} from '../lib/learning/types'

const READING_KEY = 'readingtracker.v1'
const LEARNING_KEY = 'readingtracker.learning.v3'
const PREFIX = 'demo-'

/** Дата за `n` дней до сегодня, YYYY-MM-DD по местному времени. */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const stamp = (n: number, hour = 20) => `${daysAgo(n)}T${String(hour).padStart(2, '0')}:00:00.000Z`

/* ---------------------------------------------------------------- чтение */

function reading(): Snapshot {
  const books: Book[] = SEED_BOOKS.map(({ page_to: _, ...b }, i) => ({
    ...b,
    id: `${PREFIX}book-${i}`,
    url: null,
    is_focus: b.title === 'Dune',
    rating: b.status === 'finished' ? [5, 4, 5, 4][i % 4] : null,
    review: null,
    started_at: b.status === 'want' ? null : daysAgo(40 + i),
    finished_at: b.status === 'finished' ? daysAgo(10 + i * 3) : null,
    created_at: stamp(60 + i),
    updated_at: stamp(5),
  }))
  const id = (title: string) => books.find((b) => b.title === title)!.id

  // Шаги по дням: так у журнала, ритма и стрика есть что показать.
  const steps: [string, number, number, number | null, number | null, number][] = [
    ['Dune', 0, 64, 45, 4, 20],
    ['Dune', 64, 118, 50, 5, 15],
    ['Dune', 118, 170, 40, 3, 9],
    ['Dune', 170, 212, 35, 4, 2],
    ['The Left Hand of Darkness', 0, 52, 40, 4, 18],
    ['The Left Hand of Darkness', 52, 96, null, 5, 4],
    ['The Overstory', 0, 41, 30, 3, 12],
    ['The Overstory', 41, 88, 45, 4, 1],
  ]
  const sessions: Session[] = steps.map(([title, from, to, minutes, rating, ago], i) => ({
    id: `${PREFIX}session-${i}`,
    book_id: id(title),
    date: daysAgo(ago),
    page_from: from,
    page_to: to,
    minutes,
    rating,
    created_at: stamp(ago),
  }))

  const thoughts: [string, number | null, Note['tag'], string, number | null, number][] = [
    [
      'Dune',
      1,
      'quote',
      'I must not fear.\nFear is the mind-killer.\nFear is the little-death that brings total obliteration.',
      9,
      19,
    ],
    [
      'Dune',
      1,
      'idea',
      'Вода здесь — не ресурс, а валюта, этика и религия одновременно.\nИнтересно, как экономика планеты пишет её мораль.',
      14,
      19,
    ],
    ['Dune', 2, 'question', 'Почему Бене Гессерит доверяют Джессике, если она уже раз нарушила их план?', 98, 15],
    [
      'Dune',
      3,
      'feeling',
      'Сцена в пустыне после бегства — первый раз за книгу стало по-настоящему тревожно.',
      160,
      9,
    ],
    ['Dune', null, 'disagree', 'Пауль слишком быстро принимает роль мессии. Хочется больше сомнений.', 200, 3],
    [
      'The Left Hand of Darkness',
      4,
      'quote',
      'Light is the left hand of darkness\nand darkness the right hand of light.',
      44,
      18,
    ],
    [
      'The Left Hand of Darkness',
      null,
      'idea',
      'Шифгретор — это про лицо и честь, но без иерархии.\nПочти невозможно перевести, и Ле Гуин этого не скрывает.',
      80,
      6,
    ],
    ['The Overstory', 7, 'feeling', 'Глава про каштан Хоэлов — сто лет одной семьи в фотографиях одного дерева.', 30, 1],
    ['Sapiens', null, 'disagree', 'Слишком смелое обобщение про аграрную революцию как «величайшее мошенничество».', null, 25],
  ]
  const notes: Note[] = thoughts.map(([title, s, tag, body, page, ago], i) => ({
    id: `${PREFIX}note-${i}`,
    book_id: id(title),
    session_id: s === null ? null : `${PREFIX}session-${s}`,
    page,
    tag,
    body,
    created_at: stamp(ago, 21),
  }))

  return { books, sessions, notes }
}

/* -------------------------------------------------------------- обучение */

function learning(): LearningSnapshot {
  const now = stamp(0)
  const stream = (n: number, slug: string, name: string, accent: Stream['accent'], goal: string): Stream => ({
    id: `${PREFIX}stream-${slug}`,
    slug,
    name,
    accent,
    goal,
    focus_material_id: null,
    outline: null,
    sort: n,
    archived: false,
    created_at: stamp(50),
    updated_at: now,
  })
  const ui = stream(0, 'interfaces', 'Интерфейсы', 'lemon', 'Собирать экраны, которые не надо объяснять')
  const mind = stream(1, 'psychology', 'Психология', 'sage', 'Понимать, почему люди решают так, как решают')

  const material = (
    slug: string,
    s: Stream,
    m: Partial<Material> & Pick<Material, 'title' | 'kind'>,
    n: number,
  ): Material => ({
    id: `${PREFIX}mat-${slug}`,
    stream_id: s.id,
    author: null,
    url: null,
    status: 'backlog',
    cover_url: null,
    scale: null,
    pages_total: null,
    page_current: null,
    book_id: null,
    sort: n,
    created_at: stamp(45 - n),
    updated_at: now,
    ...m,
  })

  const refactoring = material(
    'refactoring-ui',
    ui,
    { title: 'Refactoring UI', kind: 'book', author: 'Adam Wathan, Steve Schoger', scale: 'parts', status: 'active' },
    0,
  )
  const course = material(
    'motion',
    ui,
    { title: 'Анимация в интерфейсах', kind: 'course', author: 'Emil Kowalski', status: 'active' },
    1,
  )
  const article = material(
    'laws-of-ux',
    ui,
    { title: 'Laws of UX', kind: 'article', author: 'Jon Yablonski', url: 'https://lawsofux.com', status: 'active' },
    2,
  )
  const video = material(
    'inventing-on-principle',
    ui,
    { title: 'Inventing on Principle', kind: 'video', author: 'Bret Victor', status: 'backlog' },
    3,
  )
  const kahneman = material(
    'thinking-fast',
    mind,
    {
      title: 'Thinking, Fast and Slow',
      kind: 'book',
      author: 'Daniel Kahneman',
      scale: 'pages',
      pages_total: 528,
      page_current: 142,
      status: 'active',
      cover_url: 'https://covers.openlibrary.org/b/id/13290711-L.jpg',
    },
    0,
  )
  const influence = material(
    'influence',
    mind,
    { title: 'Influence', kind: 'book', author: 'Robert Cialdini', scale: 'pages', pages_total: 336, status: 'backlog' },
    1,
  )
  ui.focus_material_id = refactoring.id
  mind.focus_material_id = kahneman.id

  const parts: MaterialPart[] = []
  const chapters = (m: Material, titles: string[], done: number, started = 0) =>
    titles.map((title, i) => {
      const p: MaterialPart = {
        id: `${m.id}-p${i}`,
        material_id: m.id,
        title,
        done: i < done,
        started: i >= done && i < done + started,
        sort: i,
      }
      parts.push(p)
      return p
    })
  const ch = chapters(
    refactoring,
    ['Starting from Scratch', 'Hierarchy is Everything', 'Layout and Spacing', 'Designing Text', 'Working with Color', 'Creating Depth', 'Working with Images', 'Finishing Touches'],
    3,
    1,
  )
  const lec = chapters(
    course,
    ['Зачем анимировать', 'Кривые и длительность', 'Пружины', 'Жесты и прерывание', 'Анимации списков'],
    2,
  )

  const session = (
    n: number,
    m: Material,
    ago: number,
    s: Partial<StudySession> = {},
  ): StudySession => ({
    id: `${PREFIX}study-${n}`,
    material_id: m.id,
    date: daysAgo(ago),
    page_from: null,
    page_to: null,
    part_ids: [],
    started_ids: [],
    completed: false,
    minutes: null,
    rating: null,
    book_session_id: null,
    created_at: stamp(ago, 19),
    ...s,
  })
  const sessions: StudySession[] = [
    session(0, refactoring, 16, { part_ids: [ch[0].id], minutes: 40, rating: 4 }),
    session(1, refactoring, 11, { part_ids: [ch[1].id], minutes: 55, rating: 5 }),
    session(2, refactoring, 3, { part_ids: [ch[2].id], started_ids: [ch[3].id], minutes: 70, rating: 4 }),
    session(3, course, 8, { part_ids: [lec[0].id], minutes: 25, rating: 3 }),
    session(4, course, 2, { part_ids: [lec[1].id], minutes: 35, rating: 5 }),
    session(5, kahneman, 13, { page_from: 0, page_to: 74, minutes: 60, rating: 4 }),
    session(6, kahneman, 5, { page_from: 74, page_to: 142, minutes: 50, rating: 4 }),
  ]

  const note = (
    n: number,
    m: Material,
    ago: number,
    body: string,
    s: Partial<StudyNote> = {},
  ): StudyNote => ({
    id: `${PREFIX}sn-${n}`,
    material_id: m.id,
    session_id: null,
    part_id: null,
    part: null,
    title: null,
    body,
    tags: [],
    date: daysAgo(ago),
    sort: n,
    created_at: stamp(ago, 22),
    updated_at: stamp(ago, 22),
    ...s,
  })

  const notes: StudyNote[] = [
    note(
      0,
      refactoring,
      16,
      [
        'Начинать с ==функции, а не с оболочки==: сначала одна фича, потом навигация и каркас.',
        'Детали — потом. Серый прямоугольник честнее, чем красивая кнопка, которая ещё ничего не делает.',
        '',
        '- Проектировать в оттенках серого, цвет добавлять последним',
        '- Не выбирать шрифт, пока нет текста',
        '- =={mint}Личность системы== задают углы, шрифт и цвет — решить один раз',
      ].join('\n'),
      { session_id: sessions[0].id, part_id: ch[0].id, title: 'Сначала функция' },
    ),
    note(
      1,
      refactoring,
      11,
      [
        '## Иерархия',
        'Не все элементы равны. Главное делать ==тяжелее==, второстепенное — =={sky}тише цветом, а не меньше кеглем==.',
        '> Emphasize by de-emphasizing.',
        'Лейблы — последнее средство: «Janet Doe» без подписи «Имя» и так понятно.',
        '',
        '1. Вес и цвет вместо размера',
        '2. Серый на цветном фоне — не серый, а __тот же оттенок с прозрачностью__',
        '3. Кнопка-действие ≠ кнопка-разрушение: =={pink}опасное не обязано быть красным и большим==',
      ].join('\n'),
      { session_id: sessions[1].id, part_id: ch[1].id, title: 'Hierarchy is Everything' },
    ),
    note(
      2,
      refactoring,
      3,
      [
        'Начинать с ==слишком большого== пустого места и убирать, а не наоборот.',
        'Система отступов: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 — соседние значения должны различаться минимум на 25%.',
        '=={peach}Ширина колонки== не обязана заполнять экран: форма в 600px на мониторе в 1440 — нормально.',
        '',
        '### Вопрос себе',
        'Где у меня в трекере сетка заполняет ширину просто потому, что может? Проверить `.store-grid`.',
      ].join('\n'),
      { session_id: sessions[2].id, part_id: ch[2].id, title: 'Пространство' },
    ),
    note(
      3,
      refactoring,
      1,
      'Высота строки обратно пропорциональна кеглю: крупному — меньше, мелкому — больше.\n=={mint}Длина строки 45–75 знаков==.\nБазовая линия важнее центрирования, когда шрифты разного размера стоят в ряд.',
      { part_id: ch[3].id },
    ),
    note(
      4,
      course,
      8,
      [
        'Анимация должна ==отвечать на вопрос «зачем»==: связь, обратная связь, внимание. Если ответа нет — не анимировать.',
        'Частые действия (командная палитра, переключение табов) — =={pink}без анимации вовсе==.',
        '*Ощущение скорости важнее самой скорости.*',
      ].join('\n'),
      { session_id: sessions[3].id, part_id: lec[0].id, title: 'Зачем' },
    ),
    note(
      5,
      course,
      2,
      [
        '## Кривые',
        '- **ease-out** — для входа: быстро стартует, мягко садится',
        '- **ease-in-out** — для перемещения уже видимого',
        '- =={sky}ease-in почти никогда== — ощущается тормозом',
        '',
        'Длительность UI-анимаций — до 300 мс. Модалка 200–250, тултип 150.',
        '> Кастомные кривые сильнее встроенных — `cubic-bezier(0.23, 1, 0.32, 1)`.',
      ].join('\n'),
      { session_id: sessions[4].id, part_id: lec[1].id, title: 'Кривые и длительность' },
    ),
    note(
      6,
      article,
      6,
      [
        '**Закон Хика** — время решения растёт с числом вариантов. Отсюда ==не больше четырёх== на точке выбора.',
        '**Закон Фиттса** — =={peach}цель ближе и крупнее — попадание быстрее==.',
        '**Закон Якоба** — люди проводят больше времени на чужих сайтах и ждут, что твой работает так же.',
        '',
        'Источник: [lawsofux.com](https://lawsofux.com)',
      ].join('\n'),
      { title: 'Три закона на каждый день' },
    ),
    note(
      7,
      kahneman,
      13,
      [
        'Система 1 — быстрая, автоматическая, ==работает всегда==.',
        'Система 2 — медленная, ленивая, =={sky}включается, только когда первая не справилась==.',
        '> A reliable way to make people believe in falsehoods is frequent repetition.',
        'Когнитивная лёгкость = ощущение правды. __Знакомое кажется верным.__',
      ].join('\n'),
      { session_id: sessions[5].id, title: 'Две системы' },
    ),
    note(
      8,
      kahneman,
      5,
      'Якорение: любое число, увиденное до оценки, тянет оценку к себе — даже ==заведомо случайное==.\nПроверить на себе: цены в магазине, оценки сроков в работе.\n=={pink}Не согласна с выводом про экспертов — у пожарных интуиция работает.==',
      { session_id: sessions[6].id, title: 'Якоря' },
    ),
  ]

  return {
    streams: [ui, mind],
    materials: [refactoring, course, article, video, kahneman, influence],
    parts,
    sessions,
    notes,
    // Лесенка к цели «Интерфейсов»: первый шаг пройден, второй — текущий.
    steps: (
      [
        ['Пройти курс по сетке', 'Ужин в любимом месте', 'Обязательно сходи и отпразднуй, какая ты молодец', 'h02', 12],
        ['Собрать дашборд с нуля', 'Вечер кино с попкорном', 'Тот фильм, который давно откладывала', 'h17', null],
        ['Прочитать «Refactoring UI»', 'Новая книжка', 'Ту самую, из бэклога', 'h08', null],
        ['Показать работу на ревью', 'День спа', 'Ты заслужила тишину и тёплую воду', 'h06', null],
        ['Выпустить свой интерфейс', 'Что-то ценное', 'Ты это заслужила, выбирай без оглядки', 'h03', null],
      ] as const
    ).map(
      ([title, prize, wish, image, ago], i): StreamStep => ({
        id: `${PREFIX}step-${i}`,
        stream_id: ui.id,
        title,
        prize,
        wish,
        image,
        sort: i,
        done_on: ago === null ? null : daysAgo(ago),
        created_at: stamp(40),
      }),
    ),
  }
}

/* ------------------------------------------------------------ запись */

type WithId = { id: string }

/** Своё оставить, прежний образец заменить свежим. */
function merge<T extends Record<string, WithId[]>>(key: string, fresh: T): T {
  let stored: Partial<T> = {}
  try {
    stored = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<T>
  } catch {
    /* битое — пишем поверх */
  }
  const out = { ...stored } as T
  for (const k of Object.keys(fresh) as (keyof T)[]) {
    const mine = (Array.isArray(stored[k]) ? (stored[k] as WithId[]) : []).filter((x) => !x.id.startsWith(PREFIX))
    out[k] = [...mine, ...fresh[k]] as T[keyof T]
  }
  localStorage.setItem(key, JSON.stringify(out))
  return out
}

export function plantDemo() {
  const r = merge(READING_KEY, reading() as unknown as Record<string, WithId[]>)
  const l = merge(LEARNING_KEY, learning() as unknown as Record<string, WithId[]>)
  return {
    books: r.books.length,
    thoughts: r.notes.length,
    materials: l.materials.length,
    notes: l.notes.length,
  }
}
