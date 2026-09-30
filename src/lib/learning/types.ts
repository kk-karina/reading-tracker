import type { IconName } from '../../components/Icon'
import type { NoteTag } from '../types'

/**
 * Акценты выбираются из набора, а не пипеткой: произвольный цвет ломает
 * правило ядра — тонкое рисуется чернилами, акцент живёт в крупных заливках.
 */
export const ACCENTS = ['lemon', 'sage', 'clay', 'slate', 'plum', 'sky', 'sand', 'rose'] as const
export type Accent = (typeof ACCENTS)[number]

/**
 * Четыре вида, и у каждого своё поведение. Подкаста и «другого» здесь нет
 * намеренно: вид, который ничем не отличается от соседа кроме значка, не вид,
 * а лишний вопрос в форме.
 */
export const KINDS = ['book', 'article', 'course', 'video'] as const
export type MaterialKind = (typeof KINDS)[number]

/**
 * Четыре состояния, и каждое отвечает на свой вопрос: за это села, это ждёт,
 * это позади, это брошено.
 *
 * Бэклог был разделён на входящее, «когда-нибудь» и справку. Разбирать очередь
 * это различие не помогало: класть материал приходилось в одну из трёх корзин
 * ещё при заведении, то есть решать про него раньше, чем вообще успела на него
 * посмотреть, — а смотрят на очередь ровно затем, чтобы это решить. Осталось
 * одно «ждёт».
 */
export type MaterialStatus = 'backlog' | 'active' | 'done' | 'dropped'

/**
 * Чем меряется книга. Спрашивается явно, а не выводится из заполненного:
 * пустое поле «глав» одинаково значит «глав нет» и «не знаю сколько».
 */
export const BOOK_SCALES = ['pages', 'parts'] as const
export type BookScale = (typeof BOOK_SCALES)[number]

/** Поток — область, в которой учишься. Раньше назывался категорией и был табом. */
export interface Stream {
  id: string
  /** Адрес. Рождается из имени и при переименовании не меняется — иначе ломаются ссылки. */
  slug: string
  name: string
  icon: IconName
  accent: Accent | null
  /** Зачем этот поток. Стоит под именем на дашборде и отвечает на «а смысл». */
  goal: string | null
  /**
   * За что сесть сейчас. Указатель на стороне потока, а не флаг на материале:
   * фокус чтения один на всё приложение, фокус обучения — свой у каждого потока,
   * и флаг заставлял бы при каждой смене обходить соседей.
   */
  focus_material_id: string | null
  /** Markdown-скелет нового конспекта этого потока. Подставляется, не навязывается. */
  outline: string | null
  sort: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  stream_id: string
  title: string
  kind: MaterialKind
  author: string | null
  url: string | null
  status: MaterialStatus
  /**
   * Обложка. Достаётся по `url` — превью ролика, картинка Open Graph статьи,
   * обложка издания, — и хранится адресом, а не картинкой: чужой файл всё
   * равно живёт на чужом сервере, а протухшую ссылку рисованная обложка
   * закрывает собой.
   */
  cover_url: string | null
  /** Только у книги: по страницам или по главам. У остальных видов null. */
  scale: BookScale | null
  /** Только при scale === 'pages'. */
  pages_total: number | null
  page_current: number | null
  sort: number
  created_at: string
  updated_at: string
}

/**
 * Глава книги или лекция курса. Один список на оба вида: разница между ними
 * только в слове, которым это называют на экране.
 *
 * Отдельной коллекцией, а не полем внутри материала: у части есть `id`, за
 * который позже зацепится конспект, и отметить одну лекцию — это изменить
 * одну строку, а не переписать материал целиком.
 */
export interface MaterialPart {
  id: string
  material_id: string
  title: string
  done: boolean
  sort: number
}

/** Конспект. На главу, а не на материал: так это и пишется на самом деле. */
export interface StudyNote {
  id: string
  material_id: string
  /**
   * Часть, к которой конспект относится. Указатель, а не имя: переименованная
   * глава уносит свои конспекты с собой, а перенумерованная не оставляет за
   * собой «Главу 3» в списке из девятнадцати — см. `partLabel`.
   */
  part_id: string | null
  /**
   * Имя части текстом. Осталось от времён, когда глава набиралась руками, и
   * держит все написанные тогда конспекты. Новые пишут `part_id` и оставляют
   * это поле пустым; показывается оно только когда `part_id` нет.
   */
  part: string | null // «Глава 1. Nobody Thinks Like You»
  title: string | null
  body: string // markdown, включая ==выделение==
  /** У мысли о книге тег ровно один; конспект длинный и несёт сразу несколько. */
  tags: NoteTag[]
  date: string // YYYY-MM-DD
  sort: number
  created_at: string
  updated_at: string
}

export interface LearningSnapshot {
  streams: Stream[]
  materials: Material[]
  parts: MaterialPart[]
  notes: StudyNote[]
}

/** Фабрика, не константа: у общего экземпляра массивы мутировали бы на месте. */
export const emptyLearning = (): LearningSnapshot => ({
  streams: [],
  materials: [],
  parts: [],
  notes: [],
})
