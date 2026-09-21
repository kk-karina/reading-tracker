# Learning Hub, Итерация 1 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Раздел «Обучение» с тремя уровнями — категория → материал → конспект, — где конспект это лист markdown с тегами и текстовыделителем.

**Architecture:** Три сущности в `localStorage` за интерфейсом `LearningStore` (тот же приём, что `DataStore` в ядре). Отдельный `LearningContext`, не трогающий `DataContext`. Свой рендерер markdown без библиотек. Визуально — продолжение бумажного словаря `.thought-card`, крупным форматом.

**Tech Stack:** React 19, react-router-dom 7 (HashRouter), motion, vitest. Новых зависимостей ноль.

**Spec:** `docs/superpowers/specs/2026-09-20-learning-hub-design.md`, раздел **§0 «Итерация 1»**. Всё ниже §1 в этой спеке — горизонт, к реализации не относится.

## Global Constraints

- **Новых npm-зависимостей — ноль.** Markdown рендерится своим кодом.
- **Каждая строка интерфейса идёт в оба языка.** `satisfies Dict` уронит `tsc` на пропущенном переводе. Считаемые существительные хранят объект с формами `one/few/many` для ru и `one/other` для en.
- **Хранилище — только `localStorage`.** Ключ `readingtracker.learning.v1`, отдельный от `readingtracker.v1`. Supabase в этой итерации не участвует.
- **Рабочее дерево грязное:** 11 изменённых файлов — незавершённая работа над лентой полки. **Ничего из этого не коммитить и не откатывать.** `src/index.css` и `src/lib/i18n/dict.ts` изменяются только дописыванием в конец файла или заменой последних строк; существующие хунки не трогать. `Charts.tsx` в этой итерации не трогается вовсе. **`git add -A` не использовать никогда** — только перечисление файлов.
- **Тесты покрывают только `lib/`.** Интерфейс тестами не покрывается — правило ядра.
- **Базовая линия:** `npm test` → 133 passed, `npx tsc -b --noEmit` → пусто. После каждой задачи должно оставаться так же, плюс новые тесты.
- **Node не в PATH.** Перед командами: `export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"`.
- **Цвета акцентов — из набора**, не пипеткой: `lemon sage clay slate plum sky sand rose`. Правило ядра: тонкое рисуется чернилами, акцент живёт в крупных заливках.

---

## Структура файлов

**Создаются:**

| Файл | Отвечает за |
|---|---|
| `src/lib/learning/types.ts` | Три сущности, снимок, набор акцентов |
| `src/lib/learning/store/types.ts` | Интерфейс `LearningStore` и типы `New*` |
| `src/lib/learning/store/local.ts` | Реализация на `localStorage` |
| `src/lib/learning/store/index.ts` | Выбор реализации — одна строка, точка будущего расширения |
| `src/lib/learning/store/local.test.ts` | Тесты хранилища |
| `src/lib/learning/markdown.ts` | Рендерер markdown → HTML |
| `src/lib/learning/markdown.test.ts` | Тесты рендерера |
| `src/lib/learning/metrics.ts` | Прогресс материала |
| `src/lib/learning/metrics.test.ts` | Тесты прогресса |
| `src/lib/i18n/learning.ts` | Ключи словаря раздела — отдельным файлом, чтобы не растить `dict.ts` |
| `src/state/LearningContext.tsx` | Загрузка снимка и мутации |
| `src/pages/Learning.tsx` | Табы категорий, список материалов |
| `src/pages/Material.tsx` | Материал и стопка конспектов |
| `src/pages/StudyNote.tsx` | Лист конспекта: чтение и правка |
| `src/components/CategoryForm.tsx` | Форма категории |
| `src/components/MaterialForm.tsx` | Форма материала |
| `src/components/NoteEditor.tsx` | Редактор конспекта с текстовыделителем |

**Изменяются:**

| Файл | Что именно |
|---|---|
| `src/lib/i18n/dict.ts` | Строка 8 и последние три строки: литерал переименовывается в `BASE`, в конце `DICT` собирается из `BASE` и `LEARNING`. Хунки пользователя в середине файла не затрагиваются |
| `src/App.tsx` | `LearningProvider` и три роута |
| `src/components/Shell.tsx` | Пятый пункт меню |
| `src/components/Icon.tsx` | Иконки `plus`, `pen`, `car`, `chat` |
| `src/index.css` | Новая секция **в конце файла** |

---

## Task 1: Типы и хранилище обучения

**Files:**
- Create: `src/lib/learning/types.ts`
- Create: `src/lib/learning/store/types.ts`
- Create: `src/lib/learning/store/local.ts`
- Create: `src/lib/learning/store/index.ts`
- Test: `src/lib/learning/store/local.test.ts`

**Interfaces:**
- Consumes: `NoteTag` из `src/lib/types.ts`, `IconName` из `src/components/Icon.tsx`
- Produces: `LearningCategory`, `Material`, `StudyNote`, `LearningSnapshot`, `emptyLearning()`, `ACCENTS`, `Accent`, `MaterialKind`, `MaterialStatus`, `NewCategory`, `NewMaterial`, `NewStudyNote`, `LearningStore`, `learningStore`

- [ ] **Step 1: Написать типы**

`src/lib/learning/types.ts`:

```ts
import type { IconName } from '../../components/Icon'
import type { NoteTag } from '../types'

/** Акценты выбираются из набора, а не пипеткой: произвольный цвет ломает
    правило ядра — тонкое рисуется чернилами, акцент живёт в крупных заливках. */
export const ACCENTS = ['lemon', 'sage', 'clay', 'slate', 'plum', 'sky', 'sand', 'rose'] as const
export type Accent = (typeof ACCENTS)[number]

export type MaterialKind = 'book' | 'article' | 'course' | 'video' | 'podcast' | 'other'
export type MaterialStatus = 'inbox' | 'active' | 'done' | 'reference' | 'dropped'

/** Категория — таб раздела. Позже вырастет в поток, добавив поля, а не таблицу. */
export interface LearningCategory {
  id: string
  name: string
  icon: IconName
  accent: Accent | null
  /** Markdown-скелет нового конспекта этой категории. Подставляется, не навязывается. */
  outline: string | null
  sort: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  category_id: string
  title: string
  kind: MaterialKind
  author: string | null
  url: string | null
  status: MaterialStatus
  /** Сколько всего глав или частей. У статьи пусто. */
  parts_total: number | null
  sort: number
  created_at: string
  updated_at: string
}

/** Конспект. На главу, а не на материал: так это и пишется на самом деле. */
export interface StudyNote {
  id: string
  material_id: string
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
  categories: LearningCategory[]
  materials: Material[]
  notes: StudyNote[]
}

/** Фабрика, не константа: у общего экземпляра массивы мутировали бы на месте. */
export const emptyLearning = (): LearningSnapshot => ({
  categories: [],
  materials: [],
  notes: [],
})
```

- [ ] **Step 2: Написать интерфейс хранилища**

`src/lib/learning/store/types.ts`:

```ts
import type { LearningCategory, LearningSnapshot, Material, StudyNote } from '../types'

export type NewCategory = Pick<LearningCategory, 'name' | 'icon' | 'accent' | 'outline' | 'sort'>
export type NewMaterial = Pick<
  Material,
  'category_id' | 'title' | 'kind' | 'author' | 'url' | 'status' | 'parts_total' | 'sort'
>
export type NewStudyNote = Pick<
  StudyNote,
  'material_id' | 'part' | 'title' | 'body' | 'tags' | 'date' | 'sort'
>

export interface LearningStore {
  load(): Promise<LearningSnapshot>

  addCategory(item: NewCategory): Promise<LearningCategory>
  updateCategory(id: string, patch: Partial<LearningCategory>): Promise<void>
  /** Каскадом уносит материалы категории и их конспекты. */
  deleteCategory(id: string): Promise<void>

  addMaterial(item: NewMaterial): Promise<Material>
  updateMaterial(id: string, patch: Partial<Material>): Promise<void>
  /** Каскадом уносит конспекты материала. */
  deleteMaterial(id: string): Promise<void>

  addNote(item: NewStudyNote): Promise<StudyNote>
  updateNote(id: string, patch: Partial<StudyNote>): Promise<void>
  deleteNote(id: string): Promise<void>
}
```

- [ ] **Step 3: Написать падающий тест**

`src/lib/learning/store/local.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { localLearning } from './local'

/** Node без DOM: свой localStorage, чтобы тест не зависел от окружения. */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
  clear() { this.map.clear() }
  key(i: number) { return [...this.map.keys()][i] ?? null }
  get length() { return this.map.size }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as unknown as Storage
})

const aCategory = {
  name: 'Professional Growth',
  icon: 'compass' as const,
  accent: null,
  outline: null,
  sort: 0,
}

describe('localLearning', () => {
  it('начинает с пустого снимка', async () => {
    expect(await localLearning.load()).toEqual({ categories: [], materials: [], notes: [] })
  })

  it('заводит категорию и возвращает её из load', async () => {
    const made = await localLearning.addCategory(aCategory)
    expect(made.id).toBeTruthy()
    expect(made.archived).toBe(false)
    const snap = await localLearning.load()
    expect(snap.categories).toEqual([made])
  })

  it('правит категорию, не трогая created_at', async () => {
    const made = await localLearning.addCategory(aCategory)
    await localLearning.updateCategory(made.id, { name: 'Рост' })
    const snap = await localLearning.load()
    expect(snap.categories[0].name).toBe('Рост')
    expect(snap.categories[0].created_at).toBe(made.created_at)
  })

  it('удаление категории уносит её материалы и их конспекты', async () => {
    const cat = await localLearning.addCategory(aCategory)
    const other = await localLearning.addCategory({ ...aCategory, name: 'English' })
    const mat = await localLearning.addMaterial({
      category_id: cat.id, title: 'Product Design Psychology', kind: 'book',
      author: null, url: null, status: 'active', parts_total: 41, sort: 0,
    })
    const kept = await localLearning.addMaterial({
      category_id: other.id, title: 'Podcast', kind: 'podcast',
      author: null, url: null, status: 'inbox', parts_total: null, sort: 0,
    })
    await localLearning.addNote({
      material_id: mat.id, part: 'Глава 1', title: null, body: 'текст',
      tags: ['idea'], date: '2026-09-21', sort: 0,
    })

    await localLearning.deleteCategory(cat.id)

    const snap = await localLearning.load()
    expect(snap.categories.map((c) => c.id)).toEqual([other.id])
    expect(snap.materials.map((m) => m.id)).toEqual([kept.id])
    expect(snap.notes).toEqual([])
  })

  it('удаление материала уносит только его конспекты', async () => {
    const cat = await localLearning.addCategory(aCategory)
    const a = await localLearning.addMaterial({
      category_id: cat.id, title: 'A', kind: 'book',
      author: null, url: null, status: 'active', parts_total: null, sort: 0,
    })
    const b = await localLearning.addMaterial({
      category_id: cat.id, title: 'B', kind: 'article',
      author: null, url: null, status: 'inbox', parts_total: null, sort: 1,
    })
    await localLearning.addNote({
      material_id: a.id, part: null, title: null, body: 'а', tags: [], date: '2026-09-21', sort: 0,
    })
    const keep = await localLearning.addNote({
      material_id: b.id, part: null, title: null, body: 'б', tags: [], date: '2026-09-21', sort: 0,
    })

    await localLearning.deleteMaterial(a.id)

    const snap = await localLearning.load()
    expect(snap.materials.map((m) => m.id)).toEqual([b.id])
    expect(snap.notes.map((n) => n.id)).toEqual([keep.id])
  })

  it('правит конспект', async () => {
    const cat = await localLearning.addCategory(aCategory)
    const mat = await localLearning.addMaterial({
      category_id: cat.id, title: 'A', kind: 'book',
      author: null, url: null, status: 'active', parts_total: null, sort: 0,
    })
    const note = await localLearning.addNote({
      material_id: mat.id, part: null, title: null, body: 'было',
      tags: [], date: '2026-09-21', sort: 0,
    })
    await localLearning.updateNote(note.id, { body: 'стало', tags: ['quote', 'question'] })
    const snap = await localLearning.load()
    expect(snap.notes[0].body).toBe('стало')
    expect(snap.notes[0].tags).toEqual(['quote', 'question'])
  })

  it('переживает испорченное хранилище', async () => {
    localStorage.setItem('readingtracker.learning.v1', '{не json')
    expect(await localLearning.load()).toEqual({ categories: [], materials: [], notes: [] })
  })

  it('достраивает недостающие массивы в старом снимке', async () => {
    localStorage.setItem('readingtracker.learning.v1', JSON.stringify({ categories: [] }))
    const snap = await localLearning.load()
    expect(snap.materials).toEqual([])
    expect(snap.notes).toEqual([])
  })
})
```

- [ ] **Step 4: Убедиться, что тест падает**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx vitest run src/lib/learning/store/local.test.ts
```

Ожидается: FAIL, `Failed to resolve import "./local"`.

- [ ] **Step 5: Написать реализацию**

`src/lib/learning/store/local.ts` — по образцу `src/lib/store/local.ts`:

```ts
import {
  emptyLearning,
  type LearningCategory,
  type LearningSnapshot,
  type Material,
  type StudyNote,
} from '../types'
import type { LearningStore, NewCategory, NewMaterial, NewStudyNote } from './types'

/** Отдельный ключ: обучение и чтение живут рядом, но не в одной записи. */
const KEY = 'readingtracker.learning.v1'

function read(): LearningSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyLearning(), ...(JSON.parse(raw) as Partial<LearningSnapshot>) }
  } catch {
    /* испорченное или закрытое хранилище: начинаем с пустого */
  }
  return emptyLearning()
}

function write(snap: LearningSnapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap))
}

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

export const localLearning: LearningStore = {
  async load() {
    return read()
  },

  async addCategory(item: NewCategory) {
    const snap = read()
    const made: LearningCategory = {
      ...item,
      id: uid(),
      archived: false,
      created_at: now(),
      updated_at: now(),
    }
    snap.categories.push(made)
    write(snap)
    return made
  },
  async updateCategory(id, patch) {
    const snap = read()
    snap.categories = snap.categories.map((c) =>
      c.id === id ? { ...c, ...patch, updated_at: now() } : c,
    )
    write(snap)
  },
  async deleteCategory(id) {
    const snap = read()
    const gone = new Set(snap.materials.filter((m) => m.category_id === id).map((m) => m.id))
    snap.categories = snap.categories.filter((c) => c.id !== id)
    snap.materials = snap.materials.filter((m) => m.category_id !== id)
    snap.notes = snap.notes.filter((n) => !gone.has(n.material_id))
    write(snap)
  },

  async addMaterial(item: NewMaterial) {
    const snap = read()
    const made: Material = { ...item, id: uid(), created_at: now(), updated_at: now() }
    snap.materials.push(made)
    write(snap)
    return made
  },
  async updateMaterial(id, patch) {
    const snap = read()
    snap.materials = snap.materials.map((m) =>
      m.id === id ? { ...m, ...patch, updated_at: now() } : m,
    )
    write(snap)
  },
  async deleteMaterial(id) {
    const snap = read()
    snap.materials = snap.materials.filter((m) => m.id !== id)
    snap.notes = snap.notes.filter((n) => n.material_id !== id)
    write(snap)
  },

  async addNote(item: NewStudyNote) {
    const snap = read()
    const made: StudyNote = { ...item, id: uid(), created_at: now(), updated_at: now() }
    snap.notes.push(made)
    write(snap)
    return made
  },
  async updateNote(id, patch) {
    const snap = read()
    snap.notes = snap.notes.map((n) => (n.id === id ? { ...n, ...patch, updated_at: now() } : n))
    write(snap)
  },
  async deleteNote(id) {
    const snap = read()
    snap.notes = snap.notes.filter((n) => n.id !== id)
    write(snap)
  },
}
```

`src/lib/learning/store/index.ts`:

```ts
import { localLearning } from './local'
import type { LearningStore } from './types'

/** Одна реализация сегодня. Точка, где появится supabaseLearning, не трогая экраны. */
export const learningStore: LearningStore = localLearning
export type { LearningStore, NewCategory, NewMaterial, NewStudyNote } from './types'
```

- [ ] **Step 6: Прогнать тесты**

```bash
npx vitest run src/lib/learning/store/local.test.ts
```

Ожидается: PASS, 8 тестов.

- [ ] **Step 7: Проверить, что ничего не сломано, и закоммитить**

```bash
npm test && npx tsc -b --noEmit
git add src/lib/learning docs/superpowers
git commit -m "Learning: types and the local store behind an interface"
```

Ожидается: 141 passed, `tsc` молчит.

---

## Task 2: Рендерер markdown

**Files:**
- Create: `src/lib/learning/markdown.ts`
- Test: `src/lib/learning/markdown.test.ts`

**Interfaces:**
- Produces: `renderMarkdown(src: string): string` — строка HTML для `dangerouslySetInnerHTML`

Самая рискованная часть итерации: ошибка здесь тихо портит текст или открывает дыру. Поэтому тесты пишутся первыми и подробно.

- [ ] **Step 1: Написать падающий тест**

`src/lib/learning/markdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('экранирует HTML до всего остального', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })

  it('экранирует амперсанд и кавычки', () => {
    expect(renderMarkdown('A & B "c"')).toBe('<p>A &amp; B &quot;c&quot;</p>')
  })

  it('делает заголовки трёх уровней', () => {
    expect(renderMarkdown('# Раз')).toBe('<h1>Раз</h1>')
    expect(renderMarkdown('## Два')).toBe('<h2>Два</h2>')
    expect(renderMarkdown('### Три')).toBe('<h3>Три</h3>')
  })

  it('не считает решётку без пробела заголовком', () => {
    expect(renderMarkdown('#хештег')).toBe('<p>#хештег</p>')
  })

  it('делает жирный и курсив', () => {
    expect(renderMarkdown('**жирно** и *косо*')).toBe(
      '<p><strong>жирно</strong> и <em>косо</em></p>',
    )
  })

  it('делает выделение маркером', () => {
    expect(renderMarkdown('обычный ==главное== обычный')).toBe(
      '<p>обычный <mark>главное</mark> обычный</p>',
    )
  })

  it('не путает выделение с жирным', () => {
    expect(renderMarkdown('==**оба**==')).toBe('<p><mark><strong>оба</strong></mark></p>')
  })

  it('делает код', () => {
    expect(renderMarkdown('вот `код` тут')).toBe('<p>вот <code>код</code> тут</p>')
  })

  it('внутри кода разметка не работает', () => {
    expect(renderMarkdown('`**не жирно**`')).toBe('<p><code>**не жирно**</code></p>')
  })

  it('делает маркированный список', () => {
    expect(renderMarkdown('- раз\n- два')).toBe('<ul><li>раз</li><li>два</li></ul>')
  })

  it('делает нумерованный список', () => {
    expect(renderMarkdown('1. раз\n2. два')).toBe('<ol><li>раз</li><li>два</li></ol>')
  })

  it('делает цитату', () => {
    expect(renderMarkdown('> мысль')).toBe('<blockquote><p>мысль</p></blockquote>')
  })

  it('склеивает соседние строки цитаты', () => {
    expect(renderMarkdown('> раз\n> два')).toBe('<blockquote><p>раз два</p></blockquote>')
  })

  it('делает горизонтальную линию', () => {
    expect(renderMarkdown('---')).toBe('<hr>')
  })

  it('делает ссылку', () => {
    expect(renderMarkdown('[текст](https://a.b)')).toBe(
      '<p><a href="https://a.b" target="_blank" rel="noopener noreferrer">текст</a></p>',
    )
  })

  it('не пускает javascript: в ссылку', () => {
    expect(renderMarkdown('[клик](javascript:alert(1))')).toBe('<p>клик</p>')
  })

  it('разбивает абзацы по пустой строке', () => {
    expect(renderMarkdown('раз\n\nдва')).toBe('<p>раз</p><p>два</p>')
  })

  it('склеивает строки одного абзаца', () => {
    expect(renderMarkdown('раз\nдва')).toBe('<p>раз два</p>')
  })

  it('на пустом входе отдаёт пустую строку', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown('   \n\n  ')).toBe('')
  })

  it('собирает конспект целиком', () => {
    const src = [
      '## Главное',
      'Дизайнер принимает своё восприятие за ==точку зрения пользователя==.',
      '',
      '> Экспертиза создаёт приор.',
      '',
      '- первое',
      '- второе',
    ].join('\n')
    expect(renderMarkdown(src)).toBe(
      '<h2>Главное</h2>' +
        '<p>Дизайнер принимает своё восприятие за <mark>точку зрения пользователя</mark>.</p>' +
        '<blockquote><p>Экспертиза создаёт приор.</p></blockquote>' +
        '<ul><li>первое</li><li>второе</li></ul>',
    )
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

```bash
npx vitest run src/lib/learning/markdown.test.ts
```

Ожидается: FAIL, `Failed to resolve import "./markdown"`.

- [ ] **Step 3: Написать реализацию**

`src/lib/learning/markdown.ts`:

```ts
/**
 * Маленький markdown ровно на то, из чего состоит конспект.
 *
 * Своё, а не библиотека, по той же причине, по которой своя локализация:
 * нужна десятая часть возможностей, а зависимость пришлось бы обновлять
 * и проверять годами.
 *
 * Порядок здесь — часть безопасности. Сначала экранируется весь HTML, и
 * только потом появляются наши теги. Обратный порядок означал бы, что
 * написанный в конспекте script доезжает до страницы.
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c])

/** Ссылка принимается, только если это http, https или почта. */
function safeHref(url: string): string | null {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed
  return null
}

/** Место из области частного использования: в тексте конспекта его быть не может. */
const HOLD = ''

/**
 * Строчная разметка. Код вынимается первым и возвращается в конце, иначе
 * звёздочки внутри обратных кавычек стали бы жирным шрифтом.
 */
function inline(text: string): string {
  const code: string[] = []
  let out = text.replace(/`([^`]+)`/g, (_, body: string) => {
    code.push(`<code>${body}</code>`)
    return `${HOLD}${code.length - 1}${HOLD}`
  })

  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const href = safeHref(url)
    return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label
  })

  out = out.replace(/==(.+?)==/g, '<mark>$1</mark>')
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')

  return out.replace(new RegExp(`${HOLD}(\\d+)${HOLD}`, 'g'), (_, i: string) => code[Number(i)])
}

export function renderMarkdown(src: string): string {
  const lines = escapeHtml(src).split('\n')
  const out: string[] = []

  let para: string[] = []
  let quote: string[] = []
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`)
    quote = []
  }
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.join('')}</${list.tag}>`)
    list = null
  }
  const flushAll = () => {
    flushPara()
    flushQuote()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trim()

    if (!line) {
      flushAll()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushAll()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`)
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushAll()
      out.push('<hr>')
      continue
    }

    // Знак цитаты уже экранирован в &gt; — ищем именно его.
    const quoted = line.match(/^&gt;\s?(.*)$/)
    if (quoted) {
      flushPara()
      flushList()
      quote.push(quoted[1].trim())
      continue
    }

    const bullet = line.match(/^-\s+(.*)$/)
    if (bullet) {
      flushPara()
      flushQuote()
      if (!list || list.tag !== 'ul') {
        flushList()
        list = { tag: 'ul', items: [] }
      }
      list.items.push(`<li>${inline(bullet[1].trim())}</li>`)
      continue
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      flushPara()
      flushQuote()
      if (!list || list.tag !== 'ol') {
        flushList()
        list = { tag: 'ol', items: [] }
      }
      list.items.push(`<li>${inline(numbered[1].trim())}</li>`)
      continue
    }

    flushQuote()
    flushList()
    para.push(line)
  }

  flushAll()
  return out.join('')
}
```

- [ ] **Step 4: Прогнать тесты**

```bash
npx vitest run src/lib/learning/markdown.test.ts
```

Ожидается: PASS, 20 тестов. Если падает тест про `#хештег` — проверить, что в шаблоне заголовка стоит `\s+`, а не `\s*`.

- [ ] **Step 5: Закоммитить**

```bash
npm test && npx tsc -b --noEmit
git add src/lib/learning
git commit -m "Learning: a small markdown renderer, escaping first"
```

Ожидается: 161 passed.

---

## Task 3: Прогресс материала

**Files:**
- Create: `src/lib/learning/metrics.ts`
- Test: `src/lib/learning/metrics.test.ts`

**Interfaces:**
- Consumes: `Material`, `StudyNote` из `./types`
- Produces: `materialProgress(material: Material, notes: StudyNote[]): { done: number; total: number | null; percent: number | null }`

- [ ] **Step 1: Написать падающий тест**

`src/lib/learning/metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { materialProgress } from './metrics'
import type { Material, StudyNote } from './types'

const material = (over: Partial<Material> = {}): Material => ({
  id: 'm1', category_id: 'c1', title: 'Книга', kind: 'book',
  author: null, url: null, status: 'active', parts_total: null, sort: 0,
  created_at: '', updated_at: '', ...over,
})

const note = (over: Partial<StudyNote> = {}): StudyNote => ({
  id: crypto.randomUUID(), material_id: 'm1', part: null, title: null,
  body: '', tags: [], date: '2026-09-21', sort: 0,
  created_at: '', updated_at: '', ...over,
})

describe('materialProgress', () => {
  it('без конспектов — ноль', () => {
    expect(materialProgress(material(), [])).toEqual({ done: 0, total: null, percent: null })
  })

  it('считает конспекты только своего материала', () => {
    const notes = [note(), note(), note({ material_id: 'другой' })]
    expect(materialProgress(material(), notes).done).toBe(2)
  })

  it('с известным числом глав даёт проценты', () => {
    expect(materialProgress(material({ parts_total: 41 }), [note(), note()])).toEqual({
      done: 2, total: 41, percent: 5,
    })
  })

  it('не даёт больше ста процентов, если конспектов больше глав', () => {
    expect(materialProgress(material({ parts_total: 2 }), [note(), note(), note()]).percent).toBe(100)
  })

  it('ноль глав не делит на ноль', () => {
    expect(materialProgress(material({ parts_total: 0 }), [note()]).percent).toBe(null)
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

```bash
npx vitest run src/lib/learning/metrics.test.ts
```

Ожидается: FAIL, `Failed to resolve import "./metrics"`.

- [ ] **Step 3: Написать реализацию**

`src/lib/learning/metrics.ts`:

```ts
import type { Material, StudyNote } from './types'

export interface MaterialProgress {
  done: number
  total: number | null
  percent: number | null
}

/**
 * Глава считается пройденной, когда по ней есть конспект.
 *
 * Отдельной отметки «прочитано» нет намеренно: потребление и обучение это
 * не одно и то же, и модель не должна делать вид, что одно.
 */
export function materialProgress(material: Material, notes: StudyNote[]): MaterialProgress {
  const done = notes.filter((n) => n.material_id === material.id).length
  const total = material.parts_total && material.parts_total > 0 ? material.parts_total : null
  const percent = total === null ? null : Math.min(100, Math.round((done / total) * 100))
  return { done, total, percent }
}
```

- [ ] **Step 4: Прогнать тесты и закоммитить**

```bash
npx vitest run src/lib/learning/metrics.test.ts && npm test && npx tsc -b --noEmit
git add src/lib/learning
git commit -m "Learning: a chapter counts when there is a note for it"
```

Ожидается: 166 passed.

---

## Task 4: Словарь, контекст, навигация

После этой задачи в меню появляется «Обучение», и раздел открывается с честным пустым состоянием.

**Files:**
- Create: `src/lib/i18n/learning.ts`
- Create: `src/state/LearningContext.tsx`
- Create: `src/pages/Learning.tsx` — пока только пустое состояние
- Modify: `src/lib/i18n/dict.ts` — строка 8 и последние три строки
- Modify: `src/components/Icon.tsx`
- Modify: `src/components/Shell.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `learningStore` из Task 1
- Produces: `LEARNING` (словарь), `LearningProvider`, `useLearning()` — снимок плюс `addCategory / updateCategory / deleteCategory / addMaterial / updateMaterial / deleteMaterial / addNote / updateNote / deleteNote`

- [ ] **Step 1: Завести словарь раздела**

`src/lib/i18n/learning.ts` — отдельный файл, чтобы `dict.ts` не рос и не конфликтовал с незакоммиченной работой:

```ts
import type { Dict } from './translate'

/** Ключи раздела обучения. Оба языка рядом — пропуск видно глазом и ловит tsc. */
export const LEARNING = {
  'nav.learning': { ru: 'Обучение', en: 'Learning' },

  'learning.title': { ru: 'Обучение', en: 'Learning' },
  'learning.empty': {
    ru: 'Пока ни одной категории. Категория — это область, в которой ты учишься.',
    en: 'No categories yet. A category is an area you are learning in.',
  },
  'learning.newCategory': { ru: 'Новая категория', en: 'New category' },
  'learning.newMaterial': { ru: 'Новый материал', en: 'New material' },
  'learning.suggest': { ru: 'Или сразу одну из этих:', en: 'Or start with one of these:' },
  'learning.materialsEmpty': {
    ru: 'В этой категории пока нет материалов.',
    en: 'No materials in this category yet.',
  },

  'category.name': { ru: 'Название', en: 'Name' },
  'category.icon': { ru: 'Иконка', en: 'Icon' },
  'category.accent': { ru: 'Цвет', en: 'Colour' },
  'category.outline': { ru: 'Контур конспекта', en: 'Note outline' },
  'category.outlineHint': {
    ru: 'Подставляется в новый конспект этой категории. Можно стереть — это обычный текст.',
    en: 'Pre-filled into a new note in this category. Delete it freely — it is plain text.',
  },
  'category.edit': { ru: 'Настроить категорию', en: 'Edit category' },
  'category.delete': { ru: 'Удалить категорию', en: 'Delete category' },
  'category.confirmDelete': {
    ru: 'Удалить категорию вместе со всеми её материалами и конспектами?',
    en: 'Delete the category with all its materials and notes?',
  },

  'material.title': { ru: 'Название', en: 'Title' },
  'material.author': { ru: 'Автор', en: 'Author' },
  'material.url': { ru: 'Ссылка', en: 'Link' },
  'material.kind': { ru: 'Вид', en: 'Kind' },
  'material.status': { ru: 'Статус', en: 'Status' },
  'material.parts': { ru: 'Сколько глав', en: 'How many chapters' },
  'material.partsHint': {
    ru: 'Необязательно. Если указано, виден прогресс.',
    en: 'Optional. Fills in the progress line when set.',
  },
  'material.edit': { ru: 'Настроить материал', en: 'Edit material' },
  'material.delete': { ru: 'Удалить материал', en: 'Delete material' },
  'material.confirmDelete': {
    ru: 'Удалить материал вместе с его конспектами?',
    en: 'Delete the material and its notes?',
  },
  'material.notesEmpty': {
    ru: 'Конспектов пока нет. Глава считается пройденной, когда по ней есть конспект.',
    en: 'No notes yet. A chapter counts as done when there is a note for it.',
  },
  'material.progress': { ru: '{done} из {total}', en: '{done} of {total}' },

  'kind.book': { ru: 'Книга', en: 'Book' },
  'kind.article': { ru: 'Статья', en: 'Article' },
  'kind.course': { ru: 'Курс', en: 'Course' },
  'kind.video': { ru: 'Видео', en: 'Video' },
  'kind.podcast': { ru: 'Подкаст', en: 'Podcast' },
  'kind.other': { ru: 'Другое', en: 'Other' },

  'mstatus.inbox': { ru: 'Входящее', en: 'Inbox' },
  'mstatus.active': { ru: 'В работе', en: 'Active' },
  'mstatus.done': { ru: 'Пройдено', en: 'Done' },
  'mstatus.reference': { ru: 'Справка', en: 'Reference' },
  'mstatus.dropped': { ru: 'Отложено', en: 'Dropped' },

  'note.new': { ru: 'Новый конспект', en: 'New note' },
  'note.part': { ru: 'Глава или часть', en: 'Chapter or part' },
  'note.partPlaceholder': { ru: 'Глава 1. Название', en: 'Chapter 1. Title' },
  'note.body': { ru: 'Конспект', en: 'Note' },
  'note.bodyPlaceholder': {
    ru: 'Пиши как в тетради. ## заголовок, - список, > цитата, ==главное==.',
    en: 'Write as in a notebook. ## heading, - list, > quote, ==highlight==.',
  },
  'note.highlight': { ru: 'Выделить главное', en: 'Highlight' },
  'note.edit': { ru: 'Править', en: 'Edit' },
  'note.empty': { ru: 'Лист пока пустой.', en: 'The sheet is still empty.' },
  'note.delete': { ru: 'Удалить конспект', en: 'Delete note' },
  'note.confirmDelete': { ru: 'Удалить этот конспект?', en: 'Delete this note?' },
  'note.count': {
    ru: { one: '{n} конспект', few: '{n} конспекта', many: '{n} конспектов' },
    en: { one: '{n} note', other: '{n} notes' },
  },
} satisfies Dict
```

- [ ] **Step 2: Склеить словари, не трогая середину `dict.ts`**

Три точечные правки в `src/lib/i18n/dict.ts`.

Вторая строка файла, сразу под существующим импортом, добавляется:

```ts
import { LEARNING } from './learning'
```

Строка 8 меняется с:

```ts
export const DICT = {
```

на:

```ts
const BASE = {
```

Последние три строки файла меняются с:

```ts
} satisfies Dict

export type DictKey = keyof typeof DICT
```

на:

```ts
} satisfies Dict

/** Раздел обучения живёт отдельным файлом: словарь чтения и без того большой. */
export const DICT = { ...BASE, ...LEARNING }
export type DictKey = keyof typeof DICT
```

- [ ] **Step 3: Проверить, что типы не поехали**

```bash
npx tsc -b --noEmit
```

Ожидается: пусто. Если ругается на `DictKey` — убедиться, что `DICT` объявлен **до** строки с `export type DictKey`.

- [ ] **Step 4: Добавить иконки**

В `src/components/Icon.tsx` в объект `ICONS`, перед закрывающей строкой `} as const`:

```ts
  "plus": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 5v14M5 12h14\"/>",
  "pen": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 20h4L20 8a2.828 2.828 0 0 0-4-4L4 16z\"/>",
  "car": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 17a2 2 0 1 0 4 0a2 2 0 0 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-4-6h13\"/>",
  "chat": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 9h8m-8 4h5m-8 6V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8z\"/>",
```

- [ ] **Step 5: Написать контекст**

`src/state/LearningContext.tsx` — по образцу `DataContext`, но проще: сети нет, поэтому нет ни `loaded`, ни защиты от гонок.

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  learningStore,
  type NewCategory,
  type NewMaterial,
  type NewStudyNote,
} from '../lib/learning/store'
import {
  emptyLearning,
  type LearningCategory,
  type LearningSnapshot,
  type Material,
  type StudyNote,
} from '../lib/learning/types'

interface LearningValue extends LearningSnapshot {
  loading: boolean
  error: string | null

  addCategory(item: NewCategory): Promise<LearningCategory | undefined>
  updateCategory(id: string, patch: Partial<LearningCategory>): Promise<void>
  deleteCategory(id: string): Promise<void>

  addMaterial(item: NewMaterial): Promise<Material | undefined>
  updateMaterial(id: string, patch: Partial<Material>): Promise<void>
  deleteMaterial(id: string): Promise<void>

  addNote(item: NewStudyNote): Promise<StudyNote | undefined>
  updateNote(id: string, patch: Partial<StudyNote>): Promise<void>
  deleteNote(id: string): Promise<void>
}

const LearningContext = createContext<LearningValue | null>(null)

export function LearningProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<LearningSnapshot>(emptyLearning)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setSnap(await learningStore.load())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn()
        await refresh()
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return undefined
      }
    },
    [refresh],
  )

  const value = useMemo<LearningValue>(
    () => ({
      ...snap,
      loading,
      error,

      addCategory: (c) => run(() => learningStore.addCategory(c)),
      updateCategory: async (id, p) => void (await run(() => learningStore.updateCategory(id, p))),
      deleteCategory: async (id) => void (await run(() => learningStore.deleteCategory(id))),

      addMaterial: (m) => run(() => learningStore.addMaterial(m)),
      updateMaterial: async (id, p) => void (await run(() => learningStore.updateMaterial(id, p))),
      deleteMaterial: async (id) => void (await run(() => learningStore.deleteMaterial(id))),

      addNote: (n) => run(() => learningStore.addNote(n)),
      updateNote: async (id, p) => void (await run(() => learningStore.updateNote(id, p))),
      deleteNote: async (id) => void (await run(() => learningStore.deleteNote(id))),
    }),
    [snap, loading, error, run],
  )

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearning(): LearningValue {
  const v = useContext(LearningContext)
  if (!v) throw new Error('useLearning outside LearningProvider')
  return v
}
```

- [ ] **Step 6: Добавить пункт меню**

В `src/components/Shell.tsx`, в массив `LINKS`, перед настройками:

```ts
  { to: '/learning', key: 'nav.learning' },
```

- [ ] **Step 7: Завести страницу-заглушку и роут**

`src/pages/Learning.tsx` — на этом шаге только пустое состояние:

```tsx
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

export function Learning() {
  const { t } = useLocale()
  const { categories, loading } = useLearning()

  if (loading) return null

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('learning.title')}</h1>
      </div>
      {categories.length === 0 && <div className="empty">{t('learning.empty')}</div>}
    </>
  )
}
```

В `src/App.tsx` обернуть роуты провайдером и добавить путь:

```tsx
  return (
    <DataProvider>
      <LearningProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Progress />} />
            <Route path="shelf" element={<Shelf />} />
            <Route path="book/:id" element={<Book />} />
            <Route path="journal" element={<Journal />} />
            <Route path="learning" element={<Learning />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LearningProvider>
    </DataProvider>
  )
```

с импортами `import { Learning } from './pages/Learning'` и `import { LearningProvider } from './state/LearningContext'`.

- [ ] **Step 8: Проверить в браузере**

```bash
npm run dev
```

Открыть `http://localhost:5173/#/learning`. Ожидается: в шапке пять пунктов, активный «Обучение» подсвечен лимонной пилюлей, на странице заголовок и строка о том, что категорий нет. Переключение языка меняет обе строки.

- [ ] **Step 9: Закоммитить**

```bash
npm test && npx tsc -b --noEmit
git add src/lib/i18n/learning.ts src/lib/i18n/dict.ts src/state/LearningContext.tsx src/pages/Learning.tsx src/App.tsx src/components/Shell.tsx src/components/Icon.tsx
git commit -m "Learning: a section in the menu, with an honest empty state"
```

---

## Task 5: Категории и список материалов

**Files:**
- Modify: `src/pages/Learning.tsx` — полностью переписывается
- Create: `src/components/CategoryForm.tsx`
- Create: `src/components/MaterialForm.tsx`
- Modify: `src/index.css` — **дописать в конец файла**

**Interfaces:**
- Consumes: `useLearning()`, `materialProgress()`, `ACCENTS`, компонент `Sheet`, `Segmented`, `Jelly`
- Produces: `CategoryForm({ category?, onClose })`, `MaterialForm({ categoryId, material?, onClose })`

**Перед началом:** открыть `src/index.css` и `src/lib/i18n/dict.ts` и проверить точные имена: класс поля ввода (`input`), класс формы (`field`, `form-row`), ключ кнопки сохранения (`form.save`). Если отличаются — использовать существующие, новых не заводить.

- [ ] **Step 1: Форма категории**

`src/components/CategoryForm.tsx`:

```tsx
import { useState } from 'react'
import { ACCENTS, type Accent, type LearningCategory } from '../lib/learning/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { Icon, type IconName } from './Icon'
import { Sheet } from './Sheet'
import { Jelly } from './ui'

const PICKABLE: IconName[] = ['compass', 'book', 'bulb', 'car', 'chat', 'headphones', 'chart-bar', 'trending-up']

export function CategoryForm({
  category,
  onClose,
}: {
  category?: LearningCategory
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addCategory, updateCategory, deleteCategory, categories } = useLearning()

  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState<IconName>(category?.icon ?? 'compass')
  const [accent, setAccent] = useState<Accent | null>(category?.accent ?? null)
  const [outline, setOutline] = useState(category?.outline ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    const patch = { name: name.trim(), icon, accent, outline: outline.trim() || null }
    if (category) await updateCategory(category.id, patch)
    else await addCategory({ ...patch, sort: categories.length })
    setBusy(false)
    onClose()
  }

  async function remove() {
    if (!category || !confirm(t('category.confirmDelete'))) return
    await deleteCategory(category.id)
    onClose()
  }

  return (
    <Sheet title={category ? t('category.edit') : t('learning.newCategory')} onClose={onClose}>
      <label className="field">
        <span className="label">{t('category.name')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>

      <div className="field">
        <span className="label">{t('category.icon')}</span>
        <div className="icon-pick">
          {PICKABLE.map((n) => (
            <button
              key={n}
              type="button"
              className={`icon-opt${icon === n ? ' on' : ''}`}
              aria-label={n}
              aria-pressed={icon === n}
              onClick={() => setIcon(n)}
            >
              <Icon name={n} />
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">{t('category.accent')}</span>
        <div className="accent-pick">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`accent-opt${accent === a ? ' on' : ''}`}
              data-accent={a}
              aria-label={a}
              aria-pressed={accent === a}
              onClick={() => setAccent(accent === a ? null : a)}
            />
          ))}
        </div>
      </div>

      <label className="field">
        <span className="label">{t('category.outline')}</span>
        <textarea
          className="textarea"
          rows={6}
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
        />
        <span className="small faint">{t('category.outlineHint')}</span>
      </label>

      <div className="row-tight">
        <Jelly className="btn" onClick={() => void save()} disabled={busy || !name.trim()}>
          {t('form.save')}
        </Jelly>
        {category && (
          <button className="link-btn danger" type="button" onClick={() => void remove()}>
            {t('category.delete')}
          </button>
        )}
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 2: Форма материала**

`src/components/MaterialForm.tsx`:

```tsx
import { useState } from 'react'
import type { Material, MaterialKind, MaterialStatus } from '../lib/learning/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { Sheet } from './Sheet'
import { Jelly, Segmented } from './ui'

const KINDS: MaterialKind[] = ['book', 'article', 'course', 'video', 'podcast', 'other']
const STATUSES: MaterialStatus[] = ['inbox', 'active', 'done', 'reference', 'dropped']

export function MaterialForm({
  categoryId,
  material,
  onClose,
}: {
  categoryId: string
  material?: Material
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addMaterial, updateMaterial, deleteMaterial, materials } = useLearning()

  const [title, setTitle] = useState(material?.title ?? '')
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? 'article')
  const [author, setAuthor] = useState(material?.author ?? '')
  const [url, setUrl] = useState(material?.url ?? '')
  const [status, setStatus] = useState<MaterialStatus>(material?.status ?? 'inbox')
  const [parts, setParts] = useState(material?.parts_total ? String(material.parts_total) : '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!title.trim()) return
    setBusy(true)
    const patch = {
      title: title.trim(),
      kind,
      author: author.trim() || null,
      url: url.trim() || null,
      status,
      parts_total: Number(parts) > 0 ? Number(parts) : null,
    }
    if (material) await updateMaterial(material.id, patch)
    else await addMaterial({ ...patch, category_id: categoryId, sort: materials.length })
    setBusy(false)
    onClose()
  }

  async function remove() {
    if (!material || !confirm(t('material.confirmDelete'))) return
    await deleteMaterial(material.id)
    onClose()
  }

  return (
    <Sheet title={material ? t('material.edit') : t('learning.newMaterial')} onClose={onClose}>
      <label className="field">
        <span className="label">{t('material.title')}</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>

      <div className="field">
        <span className="label">{t('material.kind')}</span>
        <Segmented
          name={t('material.kind')}
          value={kind}
          options={KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
          onChange={setKind}
          className="sm"
        />
      </div>

      <div className="form-row">
        <label className="field">
          <span className="label">{t('material.author')}</span>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">{t('material.parts')}</span>
          <input
            className="input"
            inputMode="numeric"
            value={parts}
            onChange={(e) => setParts(e.target.value.replace(/\D/g, ''))}
          />
          <span className="small faint">{t('material.partsHint')}</span>
        </label>
      </div>

      <label className="field">
        <span className="label">{t('material.url')}</span>
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>

      <div className="field">
        <span className="label">{t('material.status')}</span>
        <Segmented
          name={t('material.status')}
          value={status}
          options={STATUSES.map((s) => ({ value: s, label: t(`mstatus.${s}`) }))}
          onChange={setStatus}
          className="sm"
        />
      </div>

      <div className="row-tight">
        <Jelly className="btn" onClick={() => void save()} disabled={busy || !title.trim()}>
          {t('form.save')}
        </Jelly>
        {material && (
          <button className="link-btn danger" type="button" onClick={() => void remove()}>
            {t('material.delete')}
          </button>
        )}
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 3: Собрать страницу раздела**

`src/pages/Learning.tsx` целиком:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryForm } from '../components/CategoryForm'
import { Icon, type IconName } from '../components/Icon'
import { MaterialForm } from '../components/MaterialForm'
import { Jelly } from '../components/ui'
import { materialProgress } from '../lib/learning/metrics'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

/** Подсказки при пустом разделе — быстрый старт, а не константы системы. */
const SUGGESTED: { name: string; icon: IconName }[] = [
  { name: 'Professional Growth', icon: 'compass' },
  { name: 'Driving', icon: 'car' },
  { name: 'English', icon: 'chat' },
]

export function Learning() {
  const { t } = useLocale()
  const { categories, materials, notes, loading, addCategory } = useLearning()

  const [active, setActive] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState(false)
  const [newMaterial, setNewMaterial] = useState(false)

  if (loading) return null

  const live = categories.filter((c) => !c.archived)
  const current = live.find((c) => c.id === active) ?? live[0] ?? null
  const mine = current ? materials.filter((m) => m.category_id === current.id) : []

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('learning.title')}</h1>
      </div>

      {live.length === 0 ? (
        <div className="hero-empty">
          <p className="muted">{t('learning.empty')}</p>
          <Jelly className="btn" onClick={() => setNewCategory(true)}>
            {t('learning.newCategory')}
          </Jelly>
          <p className="small faint">{t('learning.suggest')}</p>
          <div className="row-tight">
            {SUGGESTED.map((s, i) => (
              <button
                key={s.name}
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  void addCategory({
                    name: s.name, icon: s.icon, accent: null, outline: null, sort: i,
                  })
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="cat-tabs" role="tablist" aria-label={t('learning.title')}>
            {live.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === current?.id}
                className={`cat-tab${c.id === current?.id ? ' on' : ''}`}
                data-accent={c.accent ?? undefined}
                onClick={() => setActive(c.id)}
              >
                <Icon name={c.icon} size={16} />
                {c.name}
              </button>
            ))}
            <button
              type="button"
              className="cat-tab add"
              aria-label={t('learning.newCategory')}
              onClick={() => setNewCategory(true)}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>

          {current && (
            <>
              <div className="panel-head">
                <span className="label">{current.name}</span>
                <div className="row-tight">
                  <button
                    className="link-btn"
                    type="button"
                    onClick={() => setEditingCategory(current.id)}
                  >
                    {t('category.edit')}
                  </button>
                  <Jelly className="btn sm" onClick={() => setNewMaterial(true)}>
                    {t('learning.newMaterial')}
                  </Jelly>
                </div>
              </div>

              {mine.length === 0 ? (
                <div className="empty small">{t('learning.materialsEmpty')}</div>
              ) : (
                <ul className="mat-list">
                  {mine.map((m) => {
                    const p = materialProgress(m, notes)
                    return (
                      <li key={m.id}>
                        <Link to={`/learning/m/${m.id}`} className="mat-row">
                          <span className="mat-main">
                            <span className="mat-title">{m.title}</span>
                            <span className="small faint">
                              {t(`kind.${m.kind}`)}
                              {m.author ? ` · ${m.author}` : ''}
                            </span>
                          </span>
                          <span className="mat-meta">
                            <span className="chip sm">{t(`mstatus.${m.status}`)}</span>
                            <span className="small faint mono">
                              {p.total
                                ? t('material.progress', { done: p.done, total: p.total })
                                : t('note.count', { n: p.done })}
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {newCategory && <CategoryForm onClose={() => setNewCategory(false)} />}
      {editingCategory && (
        <CategoryForm
          category={live.find((c) => c.id === editingCategory)}
          onClose={() => setEditingCategory(null)}
        />
      )}
      {newMaterial && current && (
        <MaterialForm categoryId={current.id} onClose={() => setNewMaterial(false)} />
      )}
    </>
  )
}
```

- [ ] **Step 4: Стили — дописать в конец `src/index.css`**

**Только дописывание в конец файла.** В середине лежат незакоммиченные правки пользователя.

```css
/* ---------- learning ---------- */

/* Акценты категорий: набор, а не пипетка. Крупные заливки — правило ядра. */
[data-accent='lemon'] { --cat: #e9f86b; }
[data-accent='sage']  { --cat: #cfe0c3; }
[data-accent='clay']  { --cat: #e6c9b4; }
[data-accent='slate'] { --cat: #c6ced6; }
[data-accent='plum']  { --cat: #d9c6de; }
[data-accent='sky']   { --cat: #c5dcea; }
[data-accent='sand']  { --cat: #e8dcc0; }
[data-accent='rose']  { --cat: #eccdd3; }

.cat-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}
.cat-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line-2);
  background: var(--paper);
  color: var(--ink-2);
  transition: border-color 0.2s, background 0.2s, color 0.2s;
}
.cat-tab .icon { color: currentColor; }
.cat-tab:hover { border-color: var(--ink-3); color: var(--ink); }
.cat-tab.on {
  background: var(--cat, var(--brand));
  border-color: var(--ink);
  color: var(--ink);
}
.cat-tab.add { padding: 8px 12px; }

.mat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.mat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: var(--r-md);
  background: var(--paper);
  border: 1px solid var(--line);
  transition: border-color 0.2s, transform 0.2s var(--ease-out);
}
.mat-row:hover { border-color: var(--line-2); transform: translateY(-1px); }
.mat-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.mat-title { font-weight: 500; }
.mat-meta { display: flex; align-items: center; gap: 12px; flex: none; }

.icon-pick,
.accent-pick { display: flex; flex-wrap: wrap; gap: 8px; }
.icon-opt {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  border: 1px solid var(--line-2);
  background: var(--paper);
  color: var(--ink-2);
}
.icon-opt .icon { color: currentColor; }
.icon-opt.on { border-color: var(--ink); background: var(--brand); color: var(--ink); }
.accent-opt {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--cat);
  border: 1px solid rgba(14, 16, 18, 0.18);
}
.accent-opt.on { box-shadow: 0 0 0 2px var(--ink); }

.link-btn.danger { color: var(--danger); }
```

- [ ] **Step 5: Проверить в браузере**

```bash
npm run dev
```

По шагам: пустой раздел показывает три подсказки → нажатие заводит категорию → появляется таб → «Новый материал» открывает лист → сохранённый материал виден строкой со статусом → «Настроить категорию» открывает форму с заполненными полями → выбор цвета красит активный таб → удаление категории уносит её материалы. Переключить язык — все строки переводятся.

- [ ] **Step 6: Закоммитить**

```bash
npm test && npx tsc -b --noEmit && npx oxlint
git add src/pages/Learning.tsx src/components/CategoryForm.tsx src/components/MaterialForm.tsx src/index.css
git commit -m "Learning: categories as tabs, materials as a list"
```

---

## Task 6: Страница материала со стопкой конспектов

**Files:**
- Create: `src/pages/Material.tsx`
- Modify: `src/App.tsx` — роут `learning/m/:id`
- Modify: `src/index.css` — дописать в конец

**Interfaces:**
- Consumes: `useLearning()`, `materialProgress()`, `MaterialForm`, `fmtDate`
- Produces: страница по пути `/learning/m/:id`

- [ ] **Step 1: Собрать страницу**

`src/pages/Material.tsx`. Новый конспект создаётся сразу с контуром категории и открывается: форма перед листом была бы лишним шагом.

```tsx
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { MaterialForm } from '../components/MaterialForm'
import { Jelly } from '../components/ui'
import { fmtDate, todayISO } from '../lib/format'
import { materialProgress } from '../lib/learning/metrics'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

export function Material() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const { materials, categories, notes, loading, addNote } = useLearning()
  const [editing, setEditing] = useState(false)

  if (loading) return null

  const material = materials.find((m) => m.id === id)
  if (!material) return <Navigate to="/learning" replace />

  const category = categories.find((c) => c.id === material.category_id)
  const mine = notes
    .filter((n) => n.material_id === material.id)
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
  const p = materialProgress(material, notes)

  async function create() {
    const made = await addNote({
      material_id: material.id,
      part: null,
      title: null,
      body: category?.outline ?? '',
      tags: [],
      date: todayISO(),
      sort: mine.length,
    })
    if (made) navigate(`/learning/n/${made.id}`)
  }

  return (
    <>
      <div className="crumbs">
        <Link to="/learning" className="crumb">
          ← {category?.name ?? t('learning.title')}
        </Link>
      </div>

      <div className="page-head">
        <h1 className="display">{material.title}</h1>
      </div>

      <div className="mat-facts">
        <span className="chip">{t(`kind.${material.kind}`)}</span>
        <span className="chip">{t(`mstatus.${material.status}`)}</span>
        {material.author && <span className="small muted">{material.author}</span>}
        <span className="small faint mono">
          {p.total
            ? t('material.progress', { done: p.done, total: p.total })
            : t('note.count', { n: p.done })}
        </span>
        {material.url && (
          <a className="link-btn" href={material.url} target="_blank" rel="noopener noreferrer">
            {t('material.url')}
          </a>
        )}
        <button className="link-btn" type="button" onClick={() => setEditing(true)}>
          {t('material.edit')}
        </button>
      </div>

      {p.percent !== null && (
        <div className="meter" aria-hidden>
          <span style={{ width: `${p.percent}%` }} />
        </div>
      )}

      <div className="panel-head" style={{ marginTop: 28 }}>
        <span className="label">{t('note.count', { n: mine.length })}</span>
        <Jelly className="btn sm" onClick={() => void create()}>
          {t('note.new')}
        </Jelly>
      </div>

      {mine.length === 0 ? (
        <div className="empty small">{t('material.notesEmpty')}</div>
      ) : (
        <ul className="note-stack">
          {mine.map((n) => (
            <li key={n.id}>
              <Link to={`/learning/n/${n.id}`} className="note-row">
                <span className="note-row-main">
                  <span className="note-row-title">{n.part ?? n.title ?? t('note.new')}</span>
                  <span className="small faint">
                    {fmtDate(n.date, locale)}
                    {n.tags.length > 0 && ` · ${n.tags.map((g) => t(`tag.${g}`)).join(', ')}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <MaterialForm
          categoryId={material.category_id}
          material={material}
          onClose={() => {
            setEditing(false)
            if (!materials.some((m) => m.id === material.id)) navigate('/learning')
          }}
        />
      )}
    </>
  )
}
```

Проверить, что `todayISO` действительно экспортируется из `src/lib/format.ts`; если имя другое — использовать существующее.

- [ ] **Step 2: Роут**

В `src/App.tsx`, сразу под строкой с `learning`:

```tsx
            <Route path="learning/m/:id" element={<Material />} />
```

с импортом `import { Material } from './pages/Material'`.

- [ ] **Step 3: Стили — дописать в конец `src/index.css`**

```css
.mat-facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}
.note-stack {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.note-row {
  display: block;
  padding: 13px 18px;
  border-radius: var(--r-md);
  background: var(--paper);
  border: 1px solid var(--line);
  transition: border-color 0.2s, transform 0.2s var(--ease-out);
}
.note-row:hover { border-color: var(--line-2); transform: translateY(-1px); }
.note-row-main { display: flex; flex-direction: column; gap: 3px; }
.note-row-title { font-weight: 500; }
```

- [ ] **Step 4: Проверить в браузере**

Завести книгу с 41 главой, нажать «Новый конспект». Ожидается: создаётся конспект, страница уходит на `/learning/n/<id>` — пока пустая, она в следующей задаче. Возврат назад показывает строку в стопке, «1 из 41» и полосу прогресса на 2%.

- [ ] **Step 5: Закоммитить**

```bash
npm test && npx tsc -b --noEmit && npx oxlint
git add src/pages/Material.tsx src/App.tsx src/index.css
git commit -m "Learning: the material page and its stack of notes"
```

---

## Task 7: Лист конспекта — чтение, правка, текстовыделитель

**Files:**
- Create: `src/components/NoteEditor.tsx`
- Create: `src/pages/StudyNote.tsx`
- Modify: `src/App.tsx` — роут `learning/n/:id`
- Modify: `src/index.css` — дописать в конец

**Interfaces:**
- Consumes: `renderMarkdown()`, `useLearning()`, `NoteTag`
- Produces: страница по пути `/learning/n/:id`

- [ ] **Step 1: Редактор с текстовыделителем**

`src/components/NoteEditor.tsx`. Главная механика — обернуть выделенный кусок в `==`.

```tsx
import { useRef } from 'react'
import type { NoteTag } from '../lib/types'
import { useLocale } from '../state/LocaleContext'
import { Icon } from './Icon'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

export function NoteEditor({
  body,
  tags,
  onBody,
  onTags,
}: {
  body: string
  tags: NoteTag[]
  onBody: (next: string) => void
  onTags: (next: NoteTag[]) => void
}) {
  const { t } = useLocale()
  const ref = useRef<HTMLTextAreaElement>(null)

  /** Оборачивает выделенное в ==…==, снимая обёртку при повторном нажатии. */
  function highlight() {
    const el = ref.current
    if (!el) return
    const from = el.selectionStart
    const to = el.selectionEnd
    if (from === to) return

    const picked = body.slice(from, to)
    const wrapped = picked.length > 4 && picked.startsWith('==') && picked.endsWith('==')
    const inner = wrapped ? picked.slice(2, -2) : `==${picked}==`
    onBody(body.slice(0, from) + inner + body.slice(to))

    // Выделение восстанавливается после того, как React отрисовал новое значение.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(from, from + inner.length)
    })
  }

  return (
    <div className="note-editor">
      <div className="note-tools">
        <button type="button" className="btn ghost sm" onClick={highlight} title="Cmd+H">
          <Icon name="pen" size={15} /> {t('note.highlight')}
        </button>
        <div className="chips">
          {TAGS.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip${tags.includes(g) ? ' on' : ''}`}
              aria-pressed={tags.includes(g)}
              onClick={() => onTags(tags.includes(g) ? tags.filter((x) => x !== g) : [...tags, g])}
            >
              {t(`tag.${g}`)}
            </button>
          ))}
        </div>
      </div>

      <textarea
        ref={ref}
        className="note-input"
        value={body}
        placeholder={t('note.bodyPlaceholder')}
        onChange={(e) => onBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
            e.preventDefault()
            highlight()
          }
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Лист**

`src/pages/StudyNote.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { NoteEditor } from '../components/NoteEditor'
import { Jelly } from '../components/ui'
import { fmtDate } from '../lib/format'
import { renderMarkdown } from '../lib/learning/markdown'
import type { NoteTag } from '../lib/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

export function StudyNote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const { notes, materials, categories, loading, updateNote, deleteNote } = useLearning()

  const note = notes.find((n) => n.id === id)

  const [editing, setEditing] = useState(false)
  const [part, setPart] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<NoteTag[]>([])

  // Черновик заводится от записи, когда она приехала или сменилась.
  const stamp = note ? `${note.id}:${note.updated_at}` : null
  useEffect(() => {
    if (!note) return
    setPart(note.part ?? '')
    setBody(note.body)
    setTags(note.tags)
  }, [stamp])

  if (loading) return null
  if (!note) return <Navigate to="/learning" replace />

  const material = materials.find((m) => m.id === note.material_id)
  const category = categories.find((c) => c.id === material?.category_id)
  const dirty =
    part !== (note.part ?? '') || body !== note.body || tags.join() !== note.tags.join()

  async function save() {
    await updateNote(note.id, { part: part.trim() || null, body, tags })
    setEditing(false)
  }

  async function remove() {
    if (!confirm(t('note.confirmDelete'))) return
    await deleteNote(note.id)
    navigate(material ? `/learning/m/${material.id}` : '/learning')
  }

  return (
    <>
      <div className="crumbs">
        {material && (
          <Link to={`/learning/m/${material.id}`} className="crumb">
            ← {material.title}
          </Link>
        )}
      </div>

      <article className="sheet-page" data-accent={category?.accent ?? undefined}>
        <div className="sheet-head-line">
          <span className="label">
            {category?.name} · {fmtDate(note.date, locale)}
          </span>
          <div className="row-tight">
            {editing ? (
              <Jelly className="btn sm" onClick={() => void save()} disabled={!dirty}>
                {t('form.save')}
              </Jelly>
            ) : (
              <button className="link-btn" type="button" onClick={() => setEditing(true)}>
                {t('note.edit')}
              </button>
            )}
            <button className="link-btn danger" type="button" onClick={() => void remove()}>
              {t('note.delete')}
            </button>
          </div>
        </div>

        {editing ? (
          <input
            className="input sheet-part"
            value={part}
            placeholder={t('note.partPlaceholder')}
            onChange={(e) => setPart(e.target.value)}
          />
        ) : (
          (note.part ?? note.title) && (
            <h1 className="sheet-title-big">{note.part ?? note.title}</h1>
          )
        )}

        {!editing && note.tags.length > 0 && (
          <div className="chips sheet-tags">
            {note.tags.map((g) => (
              <span key={g} className="chip sm">
                {t(`tag.${g}`)}
              </span>
            ))}
          </div>
        )}

        <div className="sheet-rule" aria-hidden />

        {editing ? (
          <NoteEditor body={body} tags={tags} onBody={setBody} onTags={setTags} />
        ) : note.body.trim() ? (
          <div
            className="sheet-body"
            // Безопасно: renderMarkdown экранирует весь ввод до того, как
            // появится первый наш тег, и наружу идут только известные теги.
            dangerouslySetInnerHTML={{ __html: renderMarkdown(note.body) }}
          />
        ) : (
          <p className="muted">{t('note.empty')}</p>
        )}
      </article>
    </>
  )
}
```

- [ ] **Step 3: Роут**

В `src/App.tsx`:

```tsx
            <Route path="learning/n/:id" element={<StudyNote />} />
```

с импортом `import { StudyNote } from './pages/StudyNote'`.

- [ ] **Step 4: Стили листа — дописать в конец `src/index.css`**

Бумага та же, что у `.thought-card`: свет из верхнего левого угла, внутреннее кольцо, мягкая тень. Отличие только в масштабе.

```css
/* Лист конспекта. От A3 взято ощущение — ширина, поля, воздух, — но не
   пропорции: фиксированная высота дала бы прокрутку внутри прокрутки. */
.sheet-page {
  --paper-1: #fcfcfd;

  position: relative;
  isolation: isolate;
  max-width: 820px;
  margin: 0 auto;
  padding: 52px 56px 64px;
  border-radius: 6px;
  background:
    radial-gradient(116% 70% at 20% 0%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 60%),
    var(--paper-1);
  box-shadow:
    inset 0 0 0 1px rgba(14, 16, 18, 0.05),
    0 1px 1px rgba(14, 16, 18, 0.04),
    0 30px 46px -34px rgba(14, 16, 18, 0.5);
}
/* Линия поля, как в тетради. */
.sheet-page::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 34px;
  width: 1px;
  background: var(--cat, var(--line-2));
  opacity: 0.55;
}
.sheet-head-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.sheet-title-big {
  margin: 0 0 10px;
  font-weight: 400;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.sheet-part {
  font-size: 20px;
  height: 48px;
  margin-bottom: 10px;
}
.sheet-tags { margin-bottom: 14px; }
.sheet-rule {
  height: 1px;
  background: var(--line);
  margin: 0 0 26px;
}

.sheet-body {
  font-size: 16.5px;
  line-height: 1.7;
  max-width: 70ch;
  overflow-wrap: anywhere;
}
.sheet-body > :first-child { margin-top: 0; }
.sheet-body h1,
.sheet-body h2,
.sheet-body h3 {
  margin: 30px 0 10px;
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.25;
}
.sheet-body h1 { font-size: 24px; }
.sheet-body h2 { font-size: 20px; }
.sheet-body h3 { font-size: 17px; }
.sheet-body p { margin: 0 0 16px; }
.sheet-body ul,
.sheet-body ol { margin: 0 0 16px; padding-left: 24px; }
.sheet-body li { margin-bottom: 6px; }
.sheet-body blockquote {
  margin: 0 0 16px;
  padding-left: 16px;
  border-left: 3px solid var(--ink);
  color: var(--ink-2);
}
.sheet-body blockquote p { margin: 0; }
.sheet-body hr { border: 0; border-top: 1px solid var(--line); margin: 26px 0; }
.sheet-body code {
  font-family: var(--mono);
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg);
}
.sheet-body a { text-decoration: underline; text-underline-offset: 2px; }
/* Текстовыделитель. Акцент системы и есть лимонный маркер. */
.sheet-body mark {
  background: var(--brand);
  color: var(--ink);
  padding: 0 2px;
  border-radius: 2px;
}

.note-editor { display: flex; flex-direction: column; gap: 14px; }
.note-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.note-input {
  width: 100%;
  min-height: 420px;
  padding: 0;
  border: 0;
  background: transparent;
  resize: vertical;
  font-family: var(--mono);
  font-size: 14.5px;
  line-height: 1.75;
}
.note-input:focus { outline: none; }
.note-input::placeholder { color: var(--ink-3); }

@media (max-width: 720px) {
  .sheet-page { padding: 34px 22px 44px; }
  .sheet-page::before { left: 12px; }
}
```

- [ ] **Step 5: Проверить в браузере — главный прогон**

```bash
npm run dev
```

По шагам:

1. Завести категорию Professional Growth, вписать в контур три строки: `## Главное`, `## Моя поправка`, `## Применение`.
2. Завести книгу «Product Design Psychology», вид «Книга», 41 глава.
3. «Новый конспект» — открывается лист, **в нём уже стоят три заголовка из контура**.
4. «Править», вписать главу «Глава 1. Nobody Thinks Like You», написать текст под заголовками.
5. Выделить фразу мышью, нажать «Выделить главное» — вокруг появляются `==`. Повторно на той же фразе — снимаются.
6. Проверить `Cmd+H` на выделенном тексте.
7. Отметить теги «идея» и «вопрос».
8. Сохранить — лист показывает отрендеренный markdown, выделенная фраза залита лимонным, теги чипсами под заголовком.
9. Вписать в конспект `<script>alert(1)</script>`, сохранить — на странице виден текст, диалога нет.
10. Вернуться назад — в стопке строка с главой и тегами, у материала «1 из 41».
11. Сузить окно до ширины телефона — лист читаем, поля уменьшаются, горизонтальной прокрутки нет.
12. Переключить язык — интерфейс переводится, текст конспекта не трогается.

- [ ] **Step 6: Закоммитить**

```bash
npm test && npx tsc -b --noEmit && npx oxlint
git add src/pages/StudyNote.tsx src/components/NoteEditor.tsx src/App.tsx src/index.css
git commit -m "Learning: the note as a sheet, with a lemon highlighter"
```

---

## Самопроверка плана

**Покрытие §0 спеки.** Категории с иконкой, цветом и контуром — Task 5. Материалы шести видов со статусом и числом глав — Task 5. Конспект на главу с тегами и markdown — Task 7. Прогресс «глава пройдена, когда есть конспект» — Task 3. Лист без пропорций A3 — Task 7. Текстовыделитель `==` — Task 7. Хранилище за интерфейсом — Task 1. Свой рендерер — Task 2. Пятый пункт меню — Task 4. Пустые состояния — Tasks 4, 5, 6. «Входящие» как статус, а не экран — Task 5. Крошки — Tasks 6, 7.

**Чего в плане нет, и правильно:** сессий, ритма, захвата, Supabase, Obsidian, агента, писем, миграции данных. Всё это горизонт спеки, не эта итерация.

**Согласованность имён.** `learningStore` (Task 1) используется в Task 4. `materialProgress(material, notes)` (Task 3) — в Tasks 5 и 6. `renderMarkdown(src)` (Task 2) — в Task 7. `useLearning()` (Task 4) — в Tasks 5, 6, 7. `ACCENTS` (Task 1) — в Task 5. Ключи `kind.*`, `mstatus.*`, `note.*`, `category.*`, `material.*`, `learning.*` объявлены в Task 4 и используются дальше. Ключи `tag.*` и `form.save` уже есть в словаре ядра и не дублируются.

**Риски исполнения.** Имена существующих классов (`input`, `field`, `form-row`, `chip`, `chips`, `crumbs`, `meter`, `empty`, `hero-empty`, `panel-head`, `row-tight`, `btn ghost sm`, `link-btn`) и ключей (`form.save`, `tag.*`) взяты по памяти о кодовой базе — **перед использованием каждый проверяется в `src/index.css` и `src/lib/i18n/dict.ts`**. Если имя отличается, берётся существующее; новых сущностей ради совпадения с планом не заводить.
