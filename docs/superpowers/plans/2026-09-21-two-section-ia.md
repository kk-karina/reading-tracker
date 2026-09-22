# Два раздела — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Приложение перестраивается из плоского меню в дерево с двумя корнями — Чтение и Лернинг Хаб, — где у потока есть свой дашборд, «Изучаю», Бэклог и Заметки, а с каждого уровня видно, где ты и как вернуться на шаг назад.

**Architecture:** Две полосы навигации. Первая живёт в `Shell` и знает два раздела. Вторую рисует layout-роут своего раздела (`ReadingLayout`, `StreamLayout`), поэтому подразделы добавляются, не трогая оболочку. Третий уровень — роуты вне layout: вместо полосы у них крошка, которая помнит, откуда пришли. `LearningCategory` становится `Stream` со `slug`, целью и указателем на материал в фокусе; снимок в `localStorage` мигрирует `v1` → `v2` при первом чтении.

**Tech Stack:** React 19, react-router-dom 7 (HashRouter), motion, vitest. Новых зависимостей ноль.

**Spec:** `docs/superpowers/specs/2026-09-21-two-section-ia-design.md`

## Global Constraints

- **Node не в PATH.** Перед любой командой: `export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"`.
- **Базовая линия:** `npm test` → 15 файлов, 168 тестов, всё зелено. `npx tsc -b --noEmit` → пусто. `npx oxlint` → чисто. После каждой задачи должно оставаться так же, плюс новые тесты.
- **Рабочее дерево грязное.** Незакоммиченная работа над лентой обложек: `src/components/Charts.tsx`, `src/index.css`, `src/lib/format.ts(.test)`, `src/lib/i18n/dict.ts`, `src/lib/reading.ts`, `src/lib/seed.ts`, `src/pages/Journal.tsx`, `src/pages/Progress.tsx`, `src/pages/Settings.tsx`, `src/pages/Shelf.tsx`, плюс неотслеживаемые `CoverReel.tsx`, `coverTone.ts`, `reel.ts` и их тесты. **Ничего из этого не коммитить и не откатывать.** `git add -A` не использовать никогда — только перечисление файлов.
- **`src/index.css` правится только дописыванием в конец файла.** Существующие хунки не трогать. Всё, что можно, писать в `src/learning.css` — он чистый.
- **`src/components/Charts.tsx` не трогается вовсе.** В нём незавершённая работа, а `Rhythm` считает страницы из сессий, которых в обучении нет.
- **Правки в грязных файлах — точечные.** В `Progress.tsx`, `Journal.tsx`, `Shelf.tsx`, `CoverReel.tsx` меняются только строки адресов в `to=`. Ничего больше.
- **Каждая строка интерфейса идёт в оба языка.** `satisfies Dict` уронит `tsc` на пропущенном переводе. Считаемые существительные хранят формы `one/few/many` для ru и `one/other` для en.
- **Тестами покрывается только `lib/`** — правило ядра. Интерфейс проверяется руками, чек-лист в конце каждой задачи.
- **Акценты — из набора** `lemon sage clay slate plum sky sand rose`. Тонкое рисуется чернилами, акцент живёт в крупных заливках.
- **Пустое состояние проектируется наравне с заполненным.** Экрана со словом «Скоро» не бывает.

---

## Поправка к спеке

Спека, §6 «Чтение», обещает `h1` «Чтение» на `/reading`. В `Progress.tsx` заголовка страницы нет вовсе — единственный `h1` принадлежит фокус-книге внутри героя. Добавлять туда второй заголовок значит ломать композицию героя в файле, где лежит чужая незавершённая работа. **`h1` на `/reading` не добавляется:** подраздел называет вторая полоса. На `/learning` `h1` появляется, потому что витрина — новый экран и заголовок в ней свой.

---

## Структура файлов

**Создаются:**

| Файл | Отвечает за |
|---|---|
| `src/lib/learning/slug.ts` | Транслитерация имени в адрес и разрешение столкновений |
| `src/lib/learning/slug.test.ts` | Тесты адреса |
| `src/lib/learning/buckets.ts` | Раскладка материалов потока по экранам и вкладкам |
| `src/lib/learning/buckets.test.ts` | Тесты раскладки |
| `src/lib/learning/rhythm.ts` | «Активна N недель из 8» и последняя активность |
| `src/lib/learning/rhythm.test.ts` | Тесты ритма |
| `src/components/SubNav.tsx` | Вторая полоса, общая для обоих разделов |
| `src/components/Crumbs.tsx` | Крошка третьего уровня, помнящая источник перехода |
| `src/pages/ReadingLayout.tsx` | Вторая полоса чтения |
| `src/pages/learning/Streams.tsx` | Витрина потоков |
| `src/pages/learning/StreamLayout.tsx` | Оболочка потока: крошка, переключатель, вторая полоса |
| `src/pages/learning/StreamDashboard.tsx` | Дашборд потока |
| `src/pages/learning/Studying.tsx` | «Изучаю» |
| `src/pages/learning/Backlog.tsx` | Бэклог со вкладками в адресе |
| `src/pages/learning/Notes.tsx` | Лента конспектов потока |

**Переименовываются (`git mv`, содержимое правится):**

| Было | Стало |
|---|---|
| `src/components/CategoryForm.tsx` | `src/components/StreamForm.tsx` |
| `src/pages/Material.tsx` | `src/pages/learning/Material.tsx` |
| `src/pages/StudyNote.tsx` | `src/pages/learning/StudyNote.tsx` |

**Удаляется:** `src/pages/Learning.tsx` — табы становятся витриной и переключателем, список материалов расходится в «Изучаю» и Бэклог.

**Изменяются:**

| Файл | Что именно |
|---|---|
| `src/lib/learning/types.ts` | `LearningCategory` → `Stream` со `slug`, `goal`, `focus_material_id`; `category_id` → `stream_id`; статус `someday` |
| `src/lib/learning/store/types.ts` | `NewStream`, методы `addStream` / `updateStream` / `deleteStream` |
| `src/lib/learning/store/local.ts` | Ключ `v2`, миграция из `v1`, выдача slug, целостность фокуса |
| `src/lib/learning/store/local.test.ts` | Переименования плюс новые случаи |
| `src/state/LearningContext.tsx` | Переименования методов и поля снимка |
| `src/components/MaterialForm.tsx` | `categoryId` → `streamId`, статус `someday` в наборе |
| `src/components/Icon.tsx` | Иконка `chevron-down` |
| `src/components/Shell.tsx` | Два раздела в первой полосе, настройки иконкой справа |
| `src/App.tsx` | Новое дерево роутов и редиректы старых адресов |
| `src/lib/i18n/learning.ts` | `category.*` → `stream.*`, `learning.*` → `hub.*`, ключи новых экранов |
| `src/lib/i18n/dict.ts` | `nav.reading`, `nav.hub`, `nav.dashboard`; `nav.progress` уходит |
| `src/learning.css` | Стили витрины, оболочки потока, карточек «Изучаю», вкладок бэклога |
| `src/index.css` | **Только в конец файла:** стили второй полосы и иконки настроек |
| `src/pages/Progress.tsx` | Только строки адресов в `to=` |
| `src/pages/Journal.tsx` | Только строки адресов в `to=` |
| `src/pages/Shelf.tsx` | Только строка адреса в `to=` |
| `src/components/CoverReel.tsx` | Только строка адреса в `to=` |
| `src/pages/Book.tsx` | Крошка через `Crumbs`, адрес полки |

---

### Task 1: Адрес потока

Чистая функция, ни от чего не зависит. Делается первой, потому что на неё опирается миграция хранилища.

**Files:**
- Create: `src/lib/learning/slug.ts`
- Test: `src/lib/learning/slug.test.ts`

**Interfaces:**
- Consumes: ничего
- Produces: `slugify(name: string): string`, `streamSlug(name: string, taken: readonly string[]): string`

- [ ] **Step 1: Написать падающий тест**

Создать `src/lib/learning/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { slugify, streamSlug } from './slug'

describe('slugify', () => {
  it('переводит латиницу в адрес', () => {
    expect(slugify('Professional Growth')).toBe('professional-growth')
  })

  it('транслитерирует кириллицу', () => {
    expect(slugify('Английский')).toBe('angliyskiy')
  })

  it('схлопывает разделители и обрезает края', () => {
    expect(slugify('  Ещё —— Один!  ')).toBe('esche-odin')
  })

  it('возвращает пустую строку, когда переводить нечего', () => {
    expect(slugify('🎸')).toBe('')
  })
})

describe('streamSlug', () => {
  it('берёт адрес из имени, когда он свободен', () => {
    expect(streamSlug('Driving', [])).toBe('driving')
  })

  it('нумерует столкновения', () => {
    expect(streamSlug('Driving', ['driving'])).toBe('driving-2')
    expect(streamSlug('Driving', ['driving', 'driving-2'])).toBe('driving-3')
  })

  it('даёт порядковый адрес имени без букв и цифр', () => {
    expect(streamSlug('🎸', ['a', 'b'])).toBe('stream-3')
  })

  it('нумерует и запасной адрес, если он уже занят', () => {
    expect(streamSlug('🎸', ['stream-1'])).toBe('stream-2')
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx vitest run src/lib/learning/slug.test.ts
```

Ожидается: FAIL, `Failed to resolve import "./slug"`.

- [ ] **Step 3: Написать реализацию**

Создать `src/lib/learning/slug.ts`:

```ts
/**
 * Кириллица в латиницу таблицей, а не библиотекой: алфавит один и он не растёт,
 * а зависимость ради тридцати трёх букв — плохая сделка.
 */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Имя в адрес. Пусто — значит, переводить было нечего: решает вызывающий. */
export function slugify(name: string): string {
  const latin = [...name.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join('')
  return latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Адрес потока. Занятые адреса передаются, потому что два потока с одним
 * именем — обычное дело, а один адрес на двоих сделал бы второй недостижимым.
 *
 * Выдаётся один раз при создании: переименование потока меняет имя и не
 * трогает адрес, иначе ссылка на поток не переживёт смены названия.
 */
export function streamSlug(name: string, taken: readonly string[]): string {
  const base = slugify(name) || `stream-${taken.length + 1}`
  if (!taken.includes(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.includes(candidate)) return candidate
  }
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx vitest run src/lib/learning/slug.test.ts && npm test && npx tsc -b --noEmit && npx oxlint
```

Ожидается: 9 новых тестов зелёные, всего 177, `tsc` и `oxlint` молчат.

- [ ] **Step 5: Закоммитить**

```bash
git add src/lib/learning/slug.ts src/lib/learning/slug.test.ts
git commit -m "A stream keeps its address when it changes its name"
```

---

### Task 2: Категория становится потоком

Одна задача, потому что переименование сущности нельзя остановить на полпути: `tsc` не соберётся, пока новое имя не разойдётся по всем экранам. Поведение приложения после задачи не меняется ни на шаг — меняются имена, добавляются три поля и один статус, снимок переезжает в `v2`.

**Files:**
- Modify: `src/lib/learning/types.ts`
- Modify: `src/lib/learning/store/types.ts`
- Modify: `src/lib/learning/store/local.ts`
- Modify: `src/lib/learning/store/local.test.ts`
- Modify: `src/state/LearningContext.tsx`
- Modify: `src/components/MaterialForm.tsx`
- Modify: `src/pages/Learning.tsx`
- Modify: `src/pages/Material.tsx`
- Modify: `src/pages/StudyNote.tsx`
- Modify: `src/lib/i18n/learning.ts`
- Rename: `src/components/CategoryForm.tsx` → `src/components/StreamForm.tsx`

**Interfaces:**
- Consumes: `streamSlug` из Task 1
- Produces: тип `Stream` (`id`, `slug`, `name`, `icon`, `accent`, `goal`, `focus_material_id`, `outline`, `sort`, `archived`, `created_at`, `updated_at`); `Material.stream_id`; `MaterialStatus` с членом `someday`; `LearningSnapshot.streams`; методы контекста `addStream(item: NewStream)`, `updateStream(id, patch)`, `deleteStream(id)`; `NewStream = Pick<Stream, 'name' | 'icon' | 'accent' | 'outline' | 'sort'>`; компонент `StreamForm({ stream?, onClose })`

- [ ] **Step 1: Написать падающие тесты хранилища**

В `src/lib/learning/store/local.test.ts` заменить существующие обращения к `categories` / `addCategory` / `updateCategory` / `deleteCategory` / `category_id` на `streams` / `addStream` / `updateStream` / `deleteStream` / `stream_id` и дописать в конец файла новые случаи:

```ts
describe('переезд снимка v1 → v2', () => {
  it('переносит категории в потоки с адресами и оставляет v1 на месте', async () => {
    const v1 = {
      categories: [
        { id: 'c1', name: 'Professional Growth', icon: 'compass', accent: null,
          outline: null, sort: 0, archived: false,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
        { id: 'c2', name: 'Английский', icon: 'chat', accent: 'sage',
          outline: null, sort: 1, archived: false,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
      ],
      materials: [
        { id: 'm1', category_id: 'c1', title: 'Book', kind: 'book', author: null, url: null,
          status: 'active', parts_total: 8, sort: 0,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
      ],
      notes: [],
    }
    localStorage.setItem('readingtracker.learning.v1', JSON.stringify(v1))

    const snap = await localLearning.load()

    expect(snap.streams.map((s) => s.slug)).toEqual(['professional-growth', 'angliyskiy'])
    expect(snap.streams[0].goal).toBeNull()
    expect(snap.streams[0].focus_material_id).toBeNull()
    expect(snap.materials[0].stream_id).toBe('c1')
    expect(localStorage.getItem('readingtracker.learning.v1')).toBe(JSON.stringify(v1))
    expect(localStorage.getItem('readingtracker.learning.v2')).not.toBeNull()
  })

  it('не трогает v1, когда v2 уже есть', async () => {
    localStorage.setItem('readingtracker.learning.v1',
      JSON.stringify({ categories: [{ id: 'c1', name: 'Old' }], materials: [], notes: [] }))
    localStorage.setItem('readingtracker.learning.v2',
      JSON.stringify({ streams: [], materials: [], notes: [] }))

    expect((await localLearning.load()).streams).toEqual([])
  })
})

describe('целостность фокуса', () => {
  it('снимает фокус с удалённого материала', async () => {
    const stream = await localLearning.addStream({
      name: 'Professional Growth', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    const material = await localLearning.addMaterial({
      stream_id: stream.id, title: 'Book', kind: 'book', author: null, url: null,
      status: 'active', parts_total: null, sort: 0,
    })
    await localLearning.updateStream(stream.id, { focus_material_id: material.id })

    await localLearning.deleteMaterial(material.id)

    expect((await localLearning.load()).streams[0].focus_material_id).toBeNull()
  })

  it('снимает фокус с материала, уехавшего в другой поток', async () => {
    const from = await localLearning.addStream({
      name: 'From', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    const to = await localLearning.addStream({
      name: 'To', icon: 'compass', accent: null, outline: null, sort: 1,
    })
    const material = await localLearning.addMaterial({
      stream_id: from.id, title: 'Book', kind: 'book', author: null, url: null,
      status: 'active', parts_total: null, sort: 0,
    })
    await localLearning.updateStream(from.id, { focus_material_id: material.id })

    await localLearning.updateMaterial(material.id, { stream_id: to.id })

    const snap = await localLearning.load()
    expect(snap.streams.find((s) => s.id === from.id)?.focus_material_id).toBeNull()
  })
})

describe('адрес потока', () => {
  it('выдаётся при создании и переживает переименование', async () => {
    const stream = await localLearning.addStream({
      name: 'Professional Growth', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    expect(stream.slug).toBe('professional-growth')

    await localLearning.updateStream(stream.id, { name: 'Профессия', slug: 'professiya' })

    const after = (await localLearning.load()).streams[0]
    expect(after.name).toBe('Профессия')
    expect(after.slug).toBe('professional-growth')
  })

  it('разводит два потока с одним именем', async () => {
    await localLearning.addStream({ name: 'Driving', icon: 'car', accent: null, outline: null, sort: 0 })
    const second = await localLearning.addStream({ name: 'Driving', icon: 'car', accent: null, outline: null, sort: 1 })
    expect(second.slug).toBe('driving-2')
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx vitest run src/lib/learning/store/local.test.ts
```

Ожидается: FAIL, `localLearning.addStream is not a function`.

- [ ] **Step 3: Переписать типы**

В `src/lib/learning/types.ts`:

```ts
export type MaterialStatus = 'inbox' | 'active' | 'someday' | 'reference' | 'done' | 'dropped'

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
```

В `Material` заменить `category_id: string` на `stream_id: string`. В `LearningSnapshot` заменить `categories: LearningCategory[]` на `streams: Stream[]`, в `emptyLearning()` — `categories: []` на `streams: []`.

- [ ] **Step 4: Переписать интерфейс хранилища**

В `src/lib/learning/store/types.ts`:

```ts
import type { LearningSnapshot, Material, Stream, StudyNote } from '../types'

/** Адрес, цель и фокус не спрашиваются при создании: адрес выдаёт хранилище, остальное появляется потом. */
export type NewStream = Pick<Stream, 'name' | 'icon' | 'accent' | 'outline' | 'sort'>
export type NewMaterial = Pick<
  Material,
  'stream_id' | 'title' | 'kind' | 'author' | 'url' | 'status' | 'parts_total' | 'sort'
>
```

В интерфейсе `LearningStore` заменить тройку методов категории на:

```ts
  addStream(item: NewStream): Promise<Stream>
  /** `slug` в заплатке игнорируется: адрес выдаётся один раз. */
  updateStream(id: string, patch: Partial<Stream>): Promise<void>
  /** Каскадом уносит материалы потока и их конспекты. */
  deleteStream(id: string): Promise<void>
```

`NewStudyNote` не меняется.

- [ ] **Step 5: Переписать хранилище**

В `src/lib/learning/store/local.ts` заменить шапку и методы категории:

```ts
import { streamSlug } from '../slug'
import { emptyLearning, type LearningSnapshot, type Material, type Stream, type StudyNote } from '../types'
import type { LearningStore, NewMaterial, NewStream, NewStudyNote } from './types'

const KEY = 'readingtracker.learning.v2'
/** Снимок до переименования категории в поток. Читается один раз и остаётся на месте. */
const KEY_V1 = 'readingtracker.learning.v1'

interface CategoryV1 extends Omit<Stream, 'slug' | 'goal' | 'focus_material_id'> {}
interface MaterialV1 extends Omit<Material, 'stream_id'> {
  category_id: string
}
interface SnapshotV1 {
  categories: CategoryV1[]
  materials: MaterialV1[]
  notes: StudyNote[]
}

/**
 * Адреса выдаются в порядке сортировки, поэтому переезд одного и того же
 * снимка всегда даёт одни и те же ссылки.
 */
function migrate(old: SnapshotV1): LearningSnapshot {
  const taken: string[] = []
  const streams = old.categories.map((c) => {
    const slug = streamSlug(c.name, taken)
    taken.push(slug)
    return { ...c, slug, goal: null, focus_material_id: null }
  })
  const materials = old.materials.map(({ category_id, ...rest }) => ({
    ...rest,
    stream_id: category_id,
  }))
  return { streams, materials, notes: old.notes }
}

function read(): LearningSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyLearning(), ...(JSON.parse(raw) as Partial<LearningSnapshot>) }

    // Запись v1 не удаляется: пара килобайт против единственной копии конспектов.
    const old = localStorage.getItem(KEY_V1)
    if (old) {
      const moved = migrate({
        categories: [],
        materials: [],
        notes: [],
        ...(JSON.parse(old) as Partial<SnapshotV1>),
      })
      write(moved)
      return moved
    }
  } catch {
    /* испорченное или закрытое хранилище: начинаем с пустого */
  }
  return emptyLearning()
}
```

Методы потока:

```ts
  async addStream(item: NewStream) {
    const snap = read()
    const made: Stream = {
      ...item,
      id: uid(),
      slug: streamSlug(item.name, snap.streams.map((s) => s.slug)),
      goal: null,
      focus_material_id: null,
      archived: false,
      created_at: now(),
      updated_at: now(),
    }
    snap.streams.push(made)
    write(snap)
    return made
  },
  async updateStream(id, patch) {
    const snap = read()
    // Адрес не меняется никогда, даже если его прислали: ссылка должна пережить переименование.
    const { slug: _keep, ...safe } = patch
    snap.streams = snap.streams.map((s) =>
      s.id === id ? { ...s, ...safe, updated_at: now() } : s,
    )
    write(snap)
  },
  async deleteStream(id) {
    const snap = read()
    const gone = new Set(snap.materials.filter((m) => m.stream_id === id).map((m) => m.id))
    snap.streams = snap.streams.filter((s) => s.id !== id)
    snap.materials = snap.materials.filter((m) => m.stream_id !== id)
    snap.notes = snap.notes.filter((n) => !gone.has(n.material_id))
    write(snap)
  },
```

Целостность фокуса в двух местах:

```ts
  async updateMaterial(id, patch) {
    const snap = read()
    const before = snap.materials.find((m) => m.id === id)
    snap.materials = snap.materials.map((m) =>
      m.id === id ? { ...m, ...patch, updated_at: now() } : m,
    )
    // Материал, уехавший в другой поток, не может оставаться фокусом прежнего.
    if (before && patch.stream_id && patch.stream_id !== before.stream_id) {
      snap.streams = snap.streams.map((s) =>
        s.id === before.stream_id && s.focus_material_id === id
          ? { ...s, focus_material_id: null, updated_at: now() }
          : s,
      )
    }
    write(snap)
  },
  async deleteMaterial(id) {
    const snap = read()
    snap.materials = snap.materials.filter((m) => m.id !== id)
    snap.notes = snap.notes.filter((n) => n.material_id !== id)
    snap.streams = snap.streams.map((s) =>
      s.focus_material_id === id ? { ...s, focus_material_id: null, updated_at: now() } : s,
    )
    write(snap)
  },
```

- [ ] **Step 6: Прогнать тесты хранилища**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx vitest run src/lib/learning/store/local.test.ts
```

Ожидается: PASS. `tsc` пока красный — экраны ещё говорят о категориях, это чинится следующим шагом.

- [ ] **Step 7: Развести переименование по экранам**

В `src/state/LearningContext.tsx`: `categories` → `streams`, `LearningCategory` → `Stream`, `NewCategory` → `NewStream`, `addCategory/updateCategory/deleteCategory` → `addStream/updateStream/deleteStream` (и в интерфейсе `LearningValue`, и в `value`).

`git mv src/components/CategoryForm.tsx src/components/StreamForm.tsx`, внутри: `CategoryForm` → `StreamForm`, проп `category` → `stream`, `LearningCategory` → `Stream`, вызовы контекста, ключи словаря `category.*` → `stream.*`, `learning.newCategory` → `learning.newStream`.

В `src/components/MaterialForm.tsx`: проп `categoryId` → `streamId`, поле `category_id` → `stream_id`, и статус `someday` в наборе:

```ts
const STATUSES: MaterialStatus[] = ['inbox', 'active', 'someday', 'reference', 'done', 'dropped']
```

В `src/pages/Learning.tsx`, `src/pages/Material.tsx`, `src/pages/StudyNote.tsx`: `categories` → `streams`, `category` → `stream`, `category_id` → `stream_id`, `CategoryForm` → `StreamForm`, ключи `category.*` → `stream.*`.

В `src/lib/i18n/learning.ts` переименовать ключи `category.name/icon/accent/outline/outlineHint/edit/delete/confirmDelete` в `stream.*`, `learning.newCategory` → `learning.newStream`, поправить тексты и добавить статус:

```ts
  'learning.empty': {
    ru: 'Пока ни одного потока. Поток — это область, в которой ты учишься.',
    en: 'No streams yet. A stream is an area you are learning in.',
  },
  'learning.newStream': { ru: 'Новый поток', en: 'New stream' },
  'learning.materialsEmpty': {
    ru: 'В этом потоке пока нет материалов.',
    en: 'No materials in this stream yet.',
  },

  'stream.edit': { ru: 'Настроить поток', en: 'Edit stream' },
  'stream.delete': { ru: 'Удалить поток', en: 'Delete stream' },
  'stream.confirmDelete': {
    ru: 'Удалить поток вместе со всеми его материалами и конспектами?',
    en: 'Delete the stream with all its materials and notes?',
  },
  'stream.outlineHint': {
    ru: 'Подставляется в новый конспект этого потока. Можно стереть — это обычный текст.',
    en: 'Pre-filled into a new note in this stream. Delete it freely — it is plain text.',
  },

  'mstatus.someday': { ru: 'Когда-нибудь', en: 'Someday' },
```

и заменить перевод: `'mstatus.dropped': { ru: 'Брошено', en: 'Dropped' }` — «Отложено» после появления «Когда-нибудь» начинает врать.

- [ ] **Step 8: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

Ожидается: 15 файлов, 185 тестов зелёные, `tsc` и `oxlint` молчат.

- [ ] **Step 9: Проверить руками**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm run dev
```

1. Открыть раздел «Обучение» — старые категории на месте, материалы и конспекты видны.
2. В консоли браузера: `localStorage.getItem('readingtracker.learning.v2')` — снимок есть, у потоков заполнен `slug`, `goal` и `focus_material_id` равны `null`.
3. `localStorage.getItem('readingtracker.learning.v1')` — запись на месте, нетронутая.
4. Переименовать поток — адрес в снимке не изменился.
5. В форме материала виден статус «Когда-нибудь», а «Отложено» стало «Брошено».

- [ ] **Step 10: Закоммитить**

```bash
git add src/lib/learning/types.ts src/lib/learning/store/types.ts src/lib/learning/store/local.ts \
  src/lib/learning/store/local.test.ts src/state/LearningContext.tsx src/components/StreamForm.tsx \
  src/components/CategoryForm.tsx src/components/MaterialForm.tsx src/pages/Learning.tsx \
  src/pages/Material.tsx src/pages/StudyNote.tsx src/lib/i18n/learning.ts
git commit -m "A category was a tab; a stream is a place"
```

---

### Task 3: Раскладка и ритм

Две чистые функции, на которых стоят три будущих экрана. Пока не используются никем — это нормально: следующие задачи не должны одновременно считать и рисовать.

**Files:**
- Create: `src/lib/learning/buckets.ts`
- Create: `src/lib/learning/buckets.test.ts`
- Create: `src/lib/learning/rhythm.ts`
- Create: `src/lib/learning/rhythm.test.ts`

**Interfaces:**
- Consumes: `Material`, `MaterialStatus` из Task 2
- Produces: `BACKLOG_TABS: readonly BacklogTab[]`, `type BacklogTab = 'inbox' | 'someday' | 'reference' | 'archive'`, `studying(materials, streamId): Material[]`, `backlog(materials, streamId, tab): Material[]`, `backlogCounts(materials, streamId): Record<BacklogTab, number>`, `activeWeeks(dates: string[], today?: string): number`, `lastActivity(dates: string[]): string | null`

- [ ] **Step 1: Написать падающие тесты раскладки**

Создать `src/lib/learning/buckets.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { backlog, backlogCounts, studying } from './buckets'
import type { Material, MaterialStatus } from './types'

const make = (id: string, stream_id: string, status: MaterialStatus): Material => ({
  id, stream_id, title: id, kind: 'book', author: null, url: null,
  status, parts_total: null, sort: 0,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
})

const ALL = [
  make('a', 's1', 'active'),
  make('b', 's1', 'inbox'),
  make('c', 's1', 'someday'),
  make('d', 's1', 'reference'),
  make('e', 's1', 'done'),
  make('f', 's1', 'dropped'),
  make('g', 's2', 'active'),
]

describe('studying', () => {
  it('берёт только материалы в работе своего потока', () => {
    expect(studying(ALL, 's1').map((m) => m.id)).toEqual(['a'])
  })

  it('возвращает пусто, когда в работе ничего нет', () => {
    expect(studying(ALL, 's3')).toEqual([])
  })
})

describe('backlog', () => {
  it('раскладывает по вкладкам', () => {
    expect(backlog(ALL, 's1', 'inbox').map((m) => m.id)).toEqual(['b'])
    expect(backlog(ALL, 's1', 'someday').map((m) => m.id)).toEqual(['c'])
    expect(backlog(ALL, 's1', 'reference').map((m) => m.id)).toEqual(['d'])
  })

  it('складывает пройденное и брошенное в архив', () => {
    expect(backlog(ALL, 's1', 'archive').map((m) => m.id)).toEqual(['e', 'f'])
  })

  it('не показывает материал в работе ни на одной вкладке', () => {
    const everywhere = (['inbox', 'someday', 'reference', 'archive'] as const)
      .flatMap((tab) => backlog(ALL, 's1', tab).map((m) => m.id))
    expect(everywhere).not.toContain('a')
  })
})

describe('backlogCounts', () => {
  it('считает по всем вкладкам сразу', () => {
    expect(backlogCounts(ALL, 's1')).toEqual({ inbox: 1, someday: 1, reference: 1, archive: 2 })
  })

  it('даёт нули пустому потоку', () => {
    expect(backlogCounts(ALL, 's3')).toEqual({ inbox: 0, someday: 0, reference: 0, archive: 0 })
  })
})
```

- [ ] **Step 2: Написать падающие тесты ритма**

Создать `src/lib/learning/rhythm.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activeWeeks, lastActivity } from './rhythm'

const TODAY = '2026-09-21'

describe('activeWeeks', () => {
  it('считает ноль, когда записей нет', () => {
    expect(activeWeeks([], TODAY)).toBe(0)
  })

  it('считает одну неделю за одну запись', () => {
    expect(activeWeeks(['2026-09-21'], TODAY)).toBe(1)
  })

  it('не считает дважды две записи одной недели', () => {
    expect(activeWeeks(['2026-09-21', '2026-09-16'], TODAY)).toBe(1)
  })

  it('считает две недели, когда между записями больше семи дней', () => {
    expect(activeWeeks(['2026-09-21', '2026-09-13'], TODAY)).toBe(2)
  })

  it('не смотрит дальше восьми недель назад', () => {
    expect(activeWeeks(['2026-07-01'], TODAY)).toBe(0)
  })

  it('игнорирует даты из будущего', () => {
    expect(activeWeeks(['2026-09-22'], TODAY)).toBe(0)
  })
})

describe('lastActivity', () => {
  it('возвращает null на пустом списке', () => {
    expect(lastActivity([])).toBeNull()
  })

  it('находит самую свежую дату независимо от порядка', () => {
    expect(lastActivity(['2026-09-01', '2026-09-18', '2026-09-10'])).toBe('2026-09-18')
  })
})
```

- [ ] **Step 3: Убедиться, что оба падают**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx vitest run src/lib/learning/buckets.test.ts src/lib/learning/rhythm.test.ts
```

Ожидается: FAIL, `Failed to resolve import "./buckets"` и `"./rhythm"`.

- [ ] **Step 4: Написать раскладку**

Создать `src/lib/learning/buckets.ts`:

```ts
import type { Material, MaterialStatus } from './types'

/**
 * Вкладки бэклога в порядке разбора: входящее решается первым, архив смотрят
 * последним. «В работе» здесь нет намеренно — это отдельный экран, потому что
 * бэклог это очередь решений, а не список дел. В одном списке очередь
 * перестают разбирать.
 */
export const BACKLOG_TABS = ['inbox', 'someday', 'reference', 'archive'] as const
export type BacklogTab = (typeof BACKLOG_TABS)[number]

const ARCHIVE: MaterialStatus[] = ['done', 'dropped']

const ofStream = (materials: Material[], streamId: string) =>
  materials.filter((m) => m.stream_id === streamId)

/** Что изучается прямо сейчас. */
export function studying(materials: Material[], streamId: string): Material[] {
  return ofStream(materials, streamId).filter((m) => m.status === 'active')
}

export function backlog(materials: Material[], streamId: string, tab: BacklogTab): Material[] {
  const mine = ofStream(materials, streamId)
  return tab === 'archive'
    ? mine.filter((m) => ARCHIVE.includes(m.status))
    : mine.filter((m) => m.status === tab)
}

/** Числа для вкладок и для дашборда — одним проходом по одному правилу. */
export function backlogCounts(materials: Material[], streamId: string): Record<BacklogTab, number> {
  const counts = { inbox: 0, someday: 0, reference: 0, archive: 0 }
  for (const tab of BACKLOG_TABS) counts[tab] = backlog(materials, streamId, tab).length
  return counts
}
```

- [ ] **Step 5: Написать ритм**

Создать `src/lib/learning/rhythm.ts`:

```ts
import { addDays, fromISO, toISO, todayISO } from '../format'

const WEEKS = 8

/**
 * Сколько из последних восьми недель были живыми. Неделя живая, если в ней
 * есть хотя бы один конспект.
 *
 * Недели скользящие, от сегодня назад по семь дней, а не календарные: вопрос,
 * на который отвечает эта строка, — «я всё ещё этим занимаюсь?», и к
 * понедельникам он отношения не имеет.
 *
 * Тепловой карты рядом пока нет: `Rhythm` в `Charts.tsx` считает страницы из
 * сессий, а сессий в обучении ещё не существует.
 */
export function activeWeeks(dates: string[], today: string = todayISO()): number {
  const since = toISO(addDays(fromISO(today), -(WEEKS * 7 - 1)))
  const now = fromISO(today).getTime()
  const weeks = new Set<number>()
  for (const d of dates) {
    if (d < since || d > today) continue
    const days = Math.round((now - fromISO(d).getTime()) / 86_400_000)
    weeks.add(Math.floor(days / 7))
  }
  return weeks.size
}

/** Самая свежая дата или null. Сравниваются строки: ISO для этого и сделан. */
export function lastActivity(dates: string[]): string | null {
  let best: string | null = null
  for (const d of dates) if (best === null || d > best) best = d
  return best
}
```

- [ ] **Step 6: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

Ожидается: 17 файлов, 201 тест зелёные.

- [ ] **Step 7: Закоммитить**

```bash
git add src/lib/learning/buckets.ts src/lib/learning/buckets.test.ts \
  src/lib/learning/rhythm.ts src/lib/learning/rhythm.test.ts
git commit -m "A queue of decisions and a list of work are not the same list"
```

---

### Task 4: Две полосы и новые адреса

После задачи меню состоит из двух разделов, чтение живёт под `/reading`, старые ссылки редиректят. Обучение пока остаётся одной страницей на `/learning` — его дерево строится в задачах 5–9.

**Files:**
- Create: `src/components/SubNav.tsx`
- Create: `src/components/Crumbs.tsx`
- Create: `src/pages/ReadingLayout.tsx`
- Modify: `src/components/Shell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/i18n/dict.ts`
- Modify: `src/pages/Book.tsx`
- Modify: `src/pages/Progress.tsx` (только строки в `to=`)
- Modify: `src/pages/Journal.tsx` (только строки в `to=`)
- Modify: `src/pages/Shelf.tsx` (только строка в `to=`)
- Modify: `src/components/CoverReel.tsx` (только строка в `to=`)
- Modify: `src/index.css` (**только дописать в конец**)

**Interfaces:**
- Consumes: ничего из предыдущих задач
- Produces: `SubNav({ items: SubNavItem[], id: string })` где `SubNavItem = { to: string; label: string; end?: boolean }`; `Crumbs({ fallback: Crumb })` где `Crumb = { to: string; label: string }`, источник читается из `location.state.from`; `ReadingLayout()`; ключи `nav.reading`, `nav.hub`, `nav.dashboard`

- [ ] **Step 1: Написать вторую полосу**

Создать `src/components/SubNav.tsx`:

```tsx
import { motion } from 'motion/react'
import { NavLink } from 'react-router-dom'

export interface SubNavItem {
  to: string
  label: string
  /** Точное совпадение. Нужно корню раздела, иначе он активен на всех детях. */
  end?: boolean
}

/**
 * Вторая полоса: подразделы текущего раздела.
 *
 * Жест тот же, что у первой полосы, но тише — подчёркивание вместо пилюли.
 * Два одинаково громких ряда спорили бы за то, какой из них главный.
 *
 * `id` разводит `layoutId` чернил: иначе полоса чтения и полоса потока
 * анимировались бы как одна при переходе между разделами.
 */
export function SubNav({ items, id }: { items: SubNavItem[]; id: string }) {
  return (
    <nav className="subnav" aria-label={id}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end}>
          {({ isActive }) => (
            <span className="subnav-item">
              {isActive && (
                <motion.span
                  layoutId={`subnav-ink-${id}`}
                  className="subnav-ink"
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                />
              )}
              <span className="subnav-label">{i.label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Написать крошку**

Создать `src/components/Crumbs.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom'

export interface Crumb {
  to: string
  label: string
}

/**
 * Крошка третьего уровня.
 *
 * Ведёт туда, откуда пришли, а не в одно фиксированное место: материал
 * открывают из «Изучаю», из Бэклога и с дашборда, и «назад» должно значить
 * назад. Источник кладётся в состояние перехода (`state={{ from }}`).
 *
 * Прямой заход по ссылке и перезагрузка состояния не имеют — тогда работает
 * `fallback`, и крошка ведёт на уровень выше по дереву.
 */
export function Crumbs({ fallback }: { fallback: Crumb }) {
  const { state } = useLocation()
  const crumb = (state as { from?: Crumb } | null)?.from ?? fallback
  return (
    <nav className="crumbs">
      <Link to={crumb.to} className="crumb">
        ← {crumb.label}
      </Link>
    </nav>
  )
}
```

- [ ] **Step 3: Написать вторую полосу чтения**

Создать `src/pages/ReadingLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom'
import { SubNav } from '../components/SubNav'
import { useT } from '../state/LocaleContext'

/**
 * Второй уровень чтения. Заголовка страницы здесь нет: подраздел называет
 * полоса, и дублировать её в `h1` значило бы сказать одно дважды.
 */
export function ReadingLayout() {
  const t = useT()
  return (
    <>
      <SubNav
        id="reading"
        items={[
          { to: '/reading', label: t('nav.dashboard'), end: true },
          { to: '/reading/shelf', label: t('nav.shelf') },
          { to: '/reading/journal', label: t('nav.journal') },
        ]}
      />
      <Outlet />
    </>
  )
}
```

- [ ] **Step 4: Добавить ключи словаря**

В `src/lib/i18n/dict.ts` заменить строку `'nav.progress'` на три новые (остальные строки блока не трогать):

```ts
  'nav.reading': { ru: 'Чтение', en: 'Reading' },
  'nav.hub': { ru: 'Лернинг Хаб', en: 'Learning Hub' },
  'nav.dashboard': { ru: 'Дашборд', en: 'Dashboard' },
```

`nav.hub` в русском остаётся транслитерацией: это имя раздела, и оно отличает второй мир от первого сильнее, чем нейтральное «Обучение».

- [ ] **Step 5: Переписать первую полосу**

В `src/components/Shell.tsx` заменить массив `LINKS` и добавить импорт иконки:

```tsx
import { Icon } from './Icon'

/** Разделов ровно два. Настройки — инструмент, а не третье место. */
const SECTIONS: { to: string; key: DictKey }[] = [
  { to: '/reading', key: 'nav.reading' },
  { to: '/learning', key: 'nav.hub' },
]
```

В разметке `LINKS.map` заменить на `SECTIONS.map`, `end={l.to === '/'}` — на `end={false}`, и в `topbar-right` перед `Segmented` добавить:

```tsx
            <NavLink to="/settings" className="icon-btn" aria-label={t('nav.settings')}>
              <Icon name="settings" />
            </NavLink>
```

- [ ] **Step 6: Переписать дерево роутов**

В `src/App.tsx` заменить импорты и блок `<Routes>`:

```tsx
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Crumbs } from './components/Crumbs'
import { ReadingLayout } from './pages/ReadingLayout'
```

```tsx
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Navigate to="/reading" replace />} />

            <Route path="reading" element={<ReadingLayout />}>
              <Route index element={<Progress />} />
              <Route path="shelf" element={<Shelf />} />
              <Route path="journal" element={<Journal />} />
            </Route>
            {/* Третий уровень вне layout: вместо полосы подразделов у него крошка. */}
            <Route path="reading/book/:id" element={<Book />} />

            <Route path="learning" element={<Learning />} />
            <Route path="learning/m/:id" element={<Material />} />
            <Route path="learning/n/:id" element={<StudyNote />} />

            <Route path="settings" element={<Settings />} />

            {/* Адреса до перестройки. Роуты хэшевые и уже разошлись по закладкам. */}
            <Route path="shelf" element={<Navigate to="/reading/shelf" replace />} />
            <Route path="journal" element={<Navigate to="/reading/journal" replace />} />
            <Route path="book/:id" element={<LegacyBook />} />

            <Route path="*" element={<Navigate to="/reading" replace />} />
          </Route>
        </Routes>
```

И рядом с `Gate`:

```tsx
/** Параметр роута читается только внутри компонента, отсюда обёртка. */
function LegacyBook() {
  const { id } = useParams()
  return <Navigate to={`/reading/book/${id}`} replace />
}
```

- [ ] **Step 7: Перевести крошку книги и внутренние ссылки**

В `src/pages/Book.tsx` заменить блок крошки на `Crumbs` (импорт `Link` оставить, если он используется ниже; `t('book.back')` больше не нужен здесь, но ключ не удалять — он остаётся подписью полки):

```tsx
      <Crumbs fallback={{ to: '/reading/shelf', label: t('nav.shelf') }} />
```

и заменить `nav('/shelf')` на `nav('/reading/shelf')`.

Точечно, **не трогая ничего другого в этих файлах**, заменить адреса:

```bash
cd "/Users/kk/Documents/Repository/Reading tracker/reading-tracker"
sed -i '' 's|to={`/book/${b.id}`}|to={`/reading/book/${b.id}`}|g; s|to={`/book/${book.id}`}|to={`/reading/book/${book.id}`}|g; s|to="/shelf"|to="/reading/shelf"|g; s|to="/journal"|to="/reading/journal"|g' \
  src/pages/Progress.tsx src/pages/Journal.tsx src/pages/Shelf.tsx src/components/CoverReel.tsx
git diff --stat src/pages/Progress.tsx src/pages/Journal.tsx src/pages/Shelf.tsx
```

Проверить `git diff` по каждому файлу: изменённых строк должно быть ровно столько, сколько адресов (Progress 7, Journal 2, Shelf 1, CoverReel 1). Если больше — откатить `sed` и править вручную.

- [ ] **Step 8: Дописать стили в конец `src/index.css`**

```css

/* ---------- вторая полоса и иконка настроек ----------
   Первая полоса говорит, в каком ты мире; вторая — в каком его углу. Она тише
   первой намеренно: два одинаково громких ряда спорили бы за главенство. */
.subnav {
  display: flex;
  gap: 2px;
  margin: 0 0 28px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.subnav::-webkit-scrollbar {
  display: none;
}
.subnav a {
  flex: none;
  text-decoration: none;
  color: var(--ink-2);
}
.subnav a:hover {
  color: var(--ink);
}
.subnav a.active {
  color: var(--ink);
}
.subnav-item {
  position: relative;
  display: inline-block;
  padding: 6px 12px 10px;
  font-size: 14px;
  letter-spacing: 0.01em;
}
.subnav-ink {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 2px;
  height: 2px;
  border-radius: 2px;
  background: var(--ink);
}
.subnav-label {
  position: relative;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  color: var(--ink-2);
  text-decoration: none;
}
.icon-btn:hover,
.icon-btn.active {
  color: var(--ink);
  background: var(--paper-2);
}
```

Если переменных `--ink-2`, `--paper-2` в файле нет, взять ближайшие существующие из `:root` — **новых переменных не заводить**.

- [ ] **Step 9: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

Ожидается: 201 тест зелёный, `tsc` и `oxlint` молчат.

- [ ] **Step 10: Проверить руками**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm run dev
```

1. В шапке два пункта и иконка настроек справа.
2. `#/` уводит на `#/reading`, видна полоса `Дашборд · Полка · Дневник`.
3. `#/shelf` из закладки открывает полку по адресу `#/reading/shelf`.
4. `#/book/<id>` открывает книгу по адресу `#/reading/book/<id>`.
5. С дашборда клик по книге ведёт сразу на `#/reading/book/<id>`, без промежуточного редиректа (в адресной строке нет мигания).
6. Крошка на книге возвращает на полку.
7. `#/learning` открывается как раньше.
8. `#/ерунда` уводит на `#/reading`.
9. Ширина телефона: обе полосы читаемы, активный пункт виден, горизонтальной прокрутки страницы нет.
10. Переключить язык — обе полосы переводятся.

- [ ] **Step 11: Закоммитить**

```bash
git add src/components/SubNav.tsx src/components/Crumbs.tsx src/pages/ReadingLayout.tsx \
  src/components/Shell.tsx src/App.tsx src/lib/i18n/dict.ts src/pages/Book.tsx \
  src/pages/Progress.tsx src/pages/Journal.tsx src/pages/Shelf.tsx src/components/CoverReel.tsx \
  src/index.css
git commit -m "Two worlds in the bar, and a second row for the corner you are in"
```

---

### Task 5: Витрина, оболочка потока, дашборд

Наименьшее, что оставляет хаб проходимым: попасть в поток и увидеть его состояние. Три строки-сводки на дашборде пока не ссылки — экранов, куда вести, ещё нет. Ссылками они становятся в задачах 6, 7 и 8.

**Files:**
- Create: `src/pages/learning/Streams.tsx`
- Create: `src/pages/learning/StreamLayout.tsx`
- Create: `src/pages/learning/StreamDashboard.tsx`
- Delete: `src/pages/Learning.tsx`
- Modify: `src/components/Icon.tsx`
- Modify: `src/components/StreamForm.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/i18n/learning.ts`
- Modify: `src/learning.css`

**Interfaces:**
- Consumes: `Stream` и методы контекста из Task 2; `backlogCounts`, `studying`, `activeWeeks`, `lastActivity` из Task 3; `SubNav` из Task 4; `materialProgress` из `lib/learning/metrics`
- Produces: `Streams()`, `StreamLayout()`, `useStream(): Stream` (через `useOutletContext`), `StreamDashboard()`; иконка `chevron-down`; ключи `hub.*`, `stream.goal`, `stream.goalEmpty`

- [ ] **Step 1: Добавить иконку**

В `src/components/Icon.tsx` в объект `ICONS` дописать перед закрывающей скобкой:

```ts
  "chevron-down": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m6 9l6 6l6-6\"/>",
```

- [ ] **Step 2: Добавить ключи словаря**

В `src/lib/i18n/learning.ts` переименовать `learning.title` → `hub.title`, `learning.empty` → `hub.empty`, `learning.newStream` → `hub.newStream`, `learning.suggest` → `hub.suggest`, `nav.learning` и `learning.materialsEmpty` удалить (их единственный читатель, `Learning.tsx`, уходит в этой же задаче), и дописать:

```ts
  'hub.title': { ru: 'Лернинг Хаб', en: 'Learning Hub' },
  'hub.allStreams': { ru: 'Все потоки', en: 'All streams' },
  'hub.archived': {
    ru: { one: 'Архив потоков ({n})', few: 'Архив потоков ({n})', many: 'Архив потоков ({n})' },
    en: { one: 'Archived streams ({n})', other: 'Archived streams ({n})' },
  },
  'hub.noFocus': { ru: 'Фокус не выбран', en: 'No focus chosen' },
  'hub.materialCount': {
    ru: { one: '{n} материал', few: '{n} материала', many: '{n} материалов' },
    en: { one: '{n} material', other: '{n} materials' },
  },

  'stream.goal': { ru: 'Цель', en: 'Goal' },
  'stream.goalEmpty': { ru: 'Зачем этот поток?', en: 'What is this stream for?' },
  'stream.focus': { ru: 'Сейчас в фокусе', en: 'In focus now' },
  'stream.focusEmpty': { ru: 'Выбери, за что сесть.', en: 'Choose what to sit down with.' },
  'stream.open': { ru: 'Открыть', en: 'Open' },
  'stream.activeWeeks': {
    ru: 'Активна {n} из 8 недель',
    en: 'Active {n} of the last 8 weeks',
  },
  'stream.lastNote': { ru: 'последняя запись {date}', en: 'last note {date}' },
  'stream.neverNoted': { ru: 'записей пока нет', en: 'no notes yet' },
```

Ключ `stream.activeWeeks` не считаемый: «из 8 недель» не склоняется от `n`.

- [ ] **Step 3: Написать витрину**

Создать `src/pages/learning/Streams.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon'
import { StreamForm } from '../../components/StreamForm'
import { Jelly } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { backlogCounts } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { lastActivity } from '../../lib/learning/rhythm'
import type { Stream } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

/** Подсказки при пустом разделе — быстрый старт, а не константы системы. */
const SUGGESTED: { name: string; icon: IconName }[] = [
  { name: 'Professional Growth', icon: 'compass' },
  { name: 'Driving', icon: 'car' },
  { name: 'English', icon: 'chat' },
]

export function Streams() {
  const { t, locale } = useLocale()
  const { streams, materials, notes, loading, addStream } = useLearning()
  const [adding, setAdding] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  if (loading) return null

  const live = streams.filter((s) => !s.archived)
  const archived = streams.filter((s) => s.archived)

  if (live.length === 0) {
    return (
      <>
        <div className="page-head">
          <h1 className="display">{t('hub.title')}</h1>
        </div>
        <div className="hero-empty">
          <p className="muted">{t('hub.empty')}</p>
          <Jelly className="btn" onClick={() => setAdding(true)}>
            {t('hub.newStream')}
          </Jelly>
          <p className="small faint">{t('hub.suggest')}</p>
          <div className="row-tight">
            {SUGGESTED.map((s, i) => (
              <button
                key={s.name}
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  void addStream({ name: s.name, icon: s.icon, accent: null, outline: null, sort: i })
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        {adding && <StreamForm onClose={() => setAdding(false)} />}
      </>
    )
  }

  const card = (s: Stream) => {
    const focus = s.focus_material_id
      ? materials.find((m) => m.id === s.focus_material_id)
      : undefined
    const mine = materials.filter((m) => m.stream_id === s.id)
    const last = lastActivity(
      notes.filter((n) => mine.some((m) => m.id === n.material_id)).map((n) => n.date),
    )
    const p = focus ? materialProgress(focus, notes) : null
    const inbox = backlogCounts(materials, s.id).inbox

    return (
      <li key={s.id}>
        <Link
          to={`/learning/${s.slug}`}
          className="stream-card"
          data-accent={s.accent ?? undefined}
        >
          <span className="stream-card-head">
            <Icon name={s.icon} size={18} />
            <span className="stream-card-name">{s.name}</span>
          </span>
          {/* Без фокуса карточка не пустует: она говорит, сколько всего лежит. */}
          <span className="stream-card-focus">
            {focus ? focus.title : <span className="faint">{t('hub.noFocus')}</span>}
          </span>
          <span className="small faint">
            {focus && p?.total
              ? t('material.progress', { done: p.done, total: p.total })
              : t('hub.materialCount', { n: mine.length })}
          </span>
          <span className="stream-card-foot small faint">
            <span>{last ? fmtDate(last, locale) : t('stream.neverNoted')}</span>
            {inbox > 0 && <span className="chip sm">{inbox}</span>}
          </span>
        </Link>
      </li>
    )
  }

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('hub.title')}</h1>
        <Jelly className="btn" onClick={() => setAdding(true)}>
          {t('hub.newStream')}
        </Jelly>
      </div>

      <ul className="stream-grid">{live.map(card)}</ul>

      {/* Архив не прячется совсем и не мешает: строка есть, только когда в нём что-то лежит. */}
      {archived.length > 0 && (
        <>
          <button className="link-btn" type="button" onClick={() => setShowArchive((v) => !v)}>
            {t('hub.archived', { n: archived.length })}
          </button>
          {showArchive && (
            <ul className="stream-grid dim">{archived.map(card)}</ul>
          )}
        </>
      )}

      {adding && <StreamForm onClose={() => setAdding(false)} />}
    </>
  )
}
```

- [ ] **Step 4: Написать оболочку потока**

Создать `src/pages/learning/StreamLayout.tsx`:

```tsx
import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { SubNav } from '../../components/SubNav'
import type { Stream } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

interface StreamCtx {
  stream: Stream
}

/** Поток резолвится один раз в оболочке; подстраницы просто берут его отсюда. */
export function useStream(): Stream {
  return useOutletContext<StreamCtx>().stream
}

export function StreamLayout() {
  const { slug } = useParams()
  const { t } = useLocale()
  const { streams, loading } = useLearning()

  if (loading) return null

  const stream = streams.find((s) => s.slug === slug)
  // Промахнуться можно только устаревшей ссылкой, и витрина отвечает на это
  // лучше, чем экран со словом «не найдено».
  if (!stream) return <Navigate to="/learning" replace />

  const others = streams.filter((s) => !s.archived && s.id !== stream.id)

  return (
    <>
      <nav className="crumbs">
        <Link to="/learning" className="crumb">
          ← {t('hub.title')}
        </Link>
      </nav>

      {/* Родной <details>: закрывается по Escape и работает с клавиатуры без кода. */}
      <details className="stream-pick">
        <summary>
          <h1 className="display">{stream.name}</h1>
          <Icon name="chevron-down" size={18} />
        </summary>
        <ul className="stream-pick-list">
          {others.map((s) => (
            <li key={s.id}>
              <Link to={`/learning/${s.slug}`} data-accent={s.accent ?? undefined}>
                <Icon name={s.icon} size={16} />
                {s.name}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/learning">{t('hub.allStreams')}</Link>
          </li>
        </ul>
      </details>

      <SubNav
        id="stream"
        items={[{ to: `/learning/${stream.slug}`, label: t('nav.dashboard'), end: true }]}
      />

      <Outlet context={{ stream } satisfies StreamCtx} />
    </>
  )
}
```

- [ ] **Step 5: Написать дашборд потока**

Создать `src/pages/learning/StreamDashboard.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StreamForm } from '../../components/StreamForm'
import { Jelly } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { backlogCounts, studying } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { activeWeeks, lastActivity } from '../../lib/learning/rhythm'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

export function StreamDashboard() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, notes, updateStream } = useLearning()
  const [editingStream, setEditingStream] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goal, setGoal] = useState(stream.goal ?? '')

  const mine = materials.filter((m) => m.stream_id === stream.id)
  const mineNotes = notes.filter((n) => mine.some((m) => m.id === n.material_id))
  const dates = mineNotes.map((n) => n.date)
  const focus = stream.focus_material_id
    ? materials.find((m) => m.id === stream.focus_material_id)
    : undefined
  const p = focus ? materialProgress(focus, notes) : null
  const counts = backlogCounts(materials, stream.id)
  const inWork = studying(materials, stream.id).length
  const last = lastActivity(dates)

  const saveGoal = async () => {
    setEditingGoal(false)
    if (goal.trim() !== (stream.goal ?? '')) await updateStream(stream.id, { goal: goal.trim() || null })
  }

  return (
    <>
      {/* Цель правится по клику, без формы: одна строка не стоит листа. */}
      {editingGoal ? (
        <input
          className="input stream-goal-input"
          value={goal}
          autoFocus
          aria-label={t('stream.goal')}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={() => void saveGoal()}
          onKeyDown={(e) => e.key === 'Enter' && void saveGoal()}
        />
      ) : (
        <button className="stream-goal" type="button" onClick={() => setEditingGoal(true)}>
          {stream.goal ?? <span className="faint">{t('stream.goalEmpty')}</span>}
        </button>
      )}

      <div className="focus-box">
        <span className="label">{t('stream.focus')}</span>
        {focus ? (
          <>
            <span className="focus-box-title">{focus.title}</span>
            <span className="small faint">
              {p?.total ? t('material.progress', { done: p.done, total: p.total }) : ''}
              {p?.total && last ? ' · ' : ''}
              {last ? t('stream.lastNote', { date: fmtDate(last, locale) }) : t('stream.neverNoted')}
            </span>
            <Link className="btn sm" to={`/learning/${stream.slug}/m/${focus.id}`}>
              {t('stream.open')}
            </Link>
          </>
        ) : (
          <span className="muted">{t('stream.focusEmpty')}</span>
        )}
      </div>

      {/* Пока строки-сводки, а не ссылки: экранов, куда вести, ещё нет. */}
      <ul className="stream-rows">
        <li>
          <span className="label">{t('nav.studying')}</span>
          <span className="small faint">{t('hub.materialCount', { n: inWork })}</span>
        </li>
        <li>
          <span className="label">{t('nav.backlog')}</span>
          <span className="small faint">
            {t('mstatus.inbox')} {counts.inbox} · {t('mstatus.someday')} {counts.someday} ·{' '}
            {t('mstatus.reference')} {counts.reference}
          </span>
        </li>
        <li>
          <span className="label">{t('nav.notes')}</span>
          <span className="small faint">{t('note.count', { n: mineNotes.length })}</span>
        </li>
      </ul>

      <p className="small faint">{t('stream.activeWeeks', { n: activeWeeks(dates) })}</p>

      <button className="link-btn" type="button" onClick={() => setEditingStream(true)}>
        {t('stream.edit')}
      </button>

      {editingStream && <StreamForm stream={stream} onClose={() => setEditingStream(false)} />}
    </>
  )
}
```

Ключи `nav.studying`, `nav.backlog`, `nav.notes` добавить в `src/lib/i18n/learning.ts`:

```ts
  'nav.studying': { ru: 'Изучаю', en: 'Studying' },
  'nav.backlog': { ru: 'Бэклог', en: 'Backlog' },
  'nav.notes': { ru: 'Заметки', en: 'Notes' },
```

- [ ] **Step 6: Добавить цель в форму потока**

В `src/components/StreamForm.tsx` добавить состояние `const [goal, setGoal] = useState(stream?.goal ?? '')`, поле после имени:

```tsx
      <label className="field">
        <span className="label">{t('stream.goal')}</span>
        <input
          className="input"
          value={goal}
          placeholder={t('stream.goalEmpty')}
          onChange={(e) => setGoal(e.target.value)}
        />
      </label>
```

и включить `goal: goal.trim() || null` в объект `patch`. При создании нового потока `addStream` цель не принимает — она проставляется отдельным `updateStream` сразу после создания:

```tsx
    if (stream) await updateStream(stream.id, patch)
    else {
      const made = await addStream({ name: patch.name, icon, accent, outline: patch.outline, sort: streams.length })
      if (made && patch.goal) await updateStream(made.id, { goal: patch.goal })
    }
```

- [ ] **Step 7: Подключить роуты и убрать старую страницу**

В `src/App.tsx` заменить импорт `Learning` на новые и блок роутов обучения:

```tsx
import { StreamDashboard } from './pages/learning/StreamDashboard'
import { StreamLayout } from './pages/learning/StreamLayout'
import { Streams } from './pages/learning/Streams'
```

```tsx
            <Route path="learning" element={<Streams />} />
            <Route path="learning/:slug" element={<StreamLayout />}>
              <Route index element={<StreamDashboard />} />
            </Route>
            <Route path="learning/m/:id" element={<Material />} />
            <Route path="learning/n/:id" element={<StudyNote />} />
```

Затем `git rm src/pages/Learning.tsx`.

`Material.tsx` и `StudyNote.tsx` пока остаются на старых адресах и в старых папках — переезжают в задаче 9. Их ссылка `Navigate to="/learning"` при ненайденной записи продолжает работать.

- [ ] **Step 8: Дописать стили в `src/learning.css`**

```css

/* ---------- витрина потоков ---------- */
.stream-grid {
  list-style: none;
  margin: 0 0 28px;
  padding: 0;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.stream-grid.dim {
  opacity: 0.55;
}
.stream-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--rule);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  background: var(--paper);
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.stream-card:hover {
  transform: translateY(-2px);
  border-color: var(--ink-3);
}
.stream-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.stream-card-focus {
  font-size: 15px;
}
.stream-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

/* ---------- оболочка потока ---------- */
.stream-pick {
  margin: 0 0 4px;
}
.stream-pick > summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
}
.stream-pick > summary::-webkit-details-marker {
  display: none;
}
.stream-pick > summary h1 {
  margin: 0;
}
.stream-pick[open] > summary .icon {
  transform: rotate(180deg);
}
.stream-pick-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 6px;
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: var(--paper);
}
.stream-pick-list a {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}
.stream-pick-list a:hover {
  background: var(--paper-2);
}

/* ---------- дашборд потока ---------- */
.stream-goal,
.stream-goal-input {
  display: block;
  width: 100%;
  margin: 0 0 24px;
  padding: 4px 0;
  font-size: 16px;
  text-align: left;
  background: none;
  border: none;
  color: var(--ink-2);
  cursor: text;
}
.focus-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px;
  margin: 0 0 28px;
  border: 1px solid var(--ink-3);
  border-radius: 16px;
}
.focus-box-title {
  font-size: 20px;
  font-weight: 600;
}
.stream-rows {
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
}
.stream-rows > li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--rule);
}
.stream-rows > li:last-child {
  border-bottom: 1px solid var(--rule);
}
```

Имена переменных (`--rule`, `--paper`, `--paper-2`, `--ink-2`, `--ink-3`) **проверить в `src/index.css`** перед использованием; если отличаются — взять существующие, новых не заводить.

- [ ] **Step 9: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

Ожидается: 201 тест зелёный, `tsc` и `oxlint` молчат.

- [ ] **Step 10: Проверить руками**

1. `#/learning` — витрина: карточка на поток, у потока без фокуса «Фокус не выбран» и число материалов.
2. Клик по карточке открывает `#/learning/<slug>`: крошка «← Лернинг Хаб», имя с ▾, полоса с одним «Дашборд».
3. `▾` раскрывает другие потоки и «Все потоки»; Escape закрывает; Tab доходит до пунктов.
4. Цель пустая показывает «Зачем этот поток?»; клик — поле; Enter сохраняет; перезагрузка страницы цель помнит.
5. «Настроить поток» открывает лист, переименование работает, адрес в строке не изменился.
6. Удалить все потоки — витрина показывает пустое состояние с тремя подсказками; клик по подсказке заводит поток.
7. `#/learning/нет-такого` уводит на витрину.
8. Ширина телефона: карточки в одну колонку, имя потока с ▾ не разъезжается.
9. Переключить язык на витрине и на дашборде.

- [ ] **Step 11: Закоммитить**

```bash
git add src/pages/learning/Streams.tsx src/pages/learning/StreamLayout.tsx \
  src/pages/learning/StreamDashboard.tsx src/pages/Learning.tsx src/components/Icon.tsx \
  src/components/StreamForm.tsx src/App.tsx src/lib/i18n/learning.ts src/learning.css
git commit -m "A stream gets a front door and a state of affairs"
```

---

### Task 6: Изучаю

**Files:**
- Create: `src/pages/learning/Studying.tsx`
- Modify: `src/pages/learning/StreamLayout.tsx` (пункт полосы)
- Modify: `src/pages/learning/StreamDashboard.tsx` (строка «Изучаю» становится ссылкой)
- Modify: `src/App.tsx`
- Modify: `src/lib/i18n/learning.ts`
- Modify: `src/learning.css`

**Interfaces:**
- Consumes: `useStream` из Task 5, `studying` из Task 3, `materialProgress`, `lastActivity`
- Produces: `Studying()`, роут `/learning/:slug/active`

- [ ] **Step 1: Добавить ключи словаря**

В `src/lib/i18n/learning.ts`:

```ts
  'studying.empty': {
    ru: 'Ничего не изучается. Возьми что-нибудь из бэклога.',
    en: 'Nothing in progress. Take something from the backlog.',
  },
  'studying.emptyBacklog': {
    ru: 'Ничего не изучается, и бэклог пуст.',
    en: 'Nothing in progress, and the backlog is empty.',
  },
  'studying.continue': { ru: 'Продолжить', en: 'Continue' },
  'studying.makeFocus': { ru: 'Сделать фокусом', en: 'Make it the focus' },
  'studying.toBacklog': { ru: 'Вернуть в бэклог', en: 'Back to backlog' },
  'studying.finish': { ru: 'Пройдено', en: 'Done' },
  'studying.openBacklog': { ru: 'Открыть бэклог', en: 'Open the backlog' },
```

- [ ] **Step 2: Написать экран**

Создать `src/pages/learning/Studying.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Jelly } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { backlogCounts, studying } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { lastActivity } from '../../lib/learning/rhythm'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

/**
 * Работа в процессе. Карточки, а не строки: здесь выбирают, за что сесть, и
 * для этого нужен прогресс, а не плотность.
 */
export function Studying() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, notes, updateMaterial, updateStream } = useLearning()

  const counts = backlogCounts(materials, stream.id)
  const empty = counts.inbox + counts.someday + counts.reference === 0
  const from = { to: `/learning/${stream.slug}/active`, label: t('nav.studying') }

  // Фокус стоит первым: это ответ на вопрос экрана, а не одна из карточек.
  const mine = studying(materials, stream.id).sort((a, b) =>
    a.id === stream.focus_material_id ? -1 : b.id === stream.focus_material_id ? 1 : a.sort - b.sort,
  )

  if (mine.length === 0) {
    return (
      <div className="hero-empty">
        <p className="muted">{t(empty ? 'studying.emptyBacklog' : 'studying.empty')}</p>
        <Link className="btn" to={`/learning/${stream.slug}/backlog`}>
          {t('studying.openBacklog')}
        </Link>
      </div>
    )
  }

  return (
    <ul className="study-list">
      {mine.map((m) => {
        const p = materialProgress(m, notes)
        const last = lastActivity(notes.filter((n) => n.material_id === m.id).map((n) => n.date))
        const isFocus = m.id === stream.focus_material_id
        return (
          <li key={m.id} className={`study-card${isFocus ? ' focus' : ''}`}>
            <span className="study-card-head">
              <span className="study-card-title">{m.title}</span>
              <span className="chip sm">{t(`kind.${m.kind}`)}</span>
            </span>
            {p.percent !== null && (
              <div className="meter" aria-hidden>
                <span style={{ width: `${p.percent}%` }} />
              </div>
            )}
            <span className="small faint">
              {p.total
                ? t('material.progress', { done: p.done, total: p.total })
                : t('note.count', { n: p.done })}
              {last ? ` · ${t('stream.lastNote', { date: fmtDate(last, locale) })}` : ''}
            </span>
            <span className="study-card-acts">
              <Link className="btn sm" to={`/learning/${stream.slug}/m/${m.id}`} state={{ from }}>
                {t('studying.continue')}
              </Link>
              {!isFocus && (
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => void updateStream(stream.id, { focus_material_id: m.id })}
                >
                  {t('studying.makeFocus')}
                </button>
              )}
              <button
                className="link-btn"
                type="button"
                onClick={() => void updateMaterial(m.id, { status: 'inbox' })}
              >
                {t('studying.toBacklog')}
              </button>
              <Jelly
                className="link-btn"
                onClick={() => void updateMaterial(m.id, { status: 'done' })}
              >
                {t('studying.finish')}
              </Jelly>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 3: Добавить пункт полосы и ссылку с дашборда**

В `src/pages/learning/StreamLayout.tsx` в `items`:

```tsx
          { to: `/learning/${stream.slug}`, label: t('nav.dashboard'), end: true },
          { to: `/learning/${stream.slug}/active`, label: t('nav.studying') },
```

В `src/pages/learning/StreamDashboard.tsx` первую `<li>` в `.stream-rows` заменить на ссылку:

```tsx
        <li>
          <Link className="stream-row-link" to={`/learning/${stream.slug}/active`}>
            <span className="label">{t('nav.studying')}</span>
            <span className="small faint">{t('hub.materialCount', { n: inWork })}</span>
          </Link>
        </li>
```

- [ ] **Step 4: Добавить роут**

В `src/App.tsx` внутрь `learning/:slug`:

```tsx
              <Route path="active" element={<Studying />} />
```

- [ ] **Step 5: Дописать стили в `src/learning.css`**

```css

/* ---------- изучаю ---------- */
.study-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.study-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--rule);
  border-radius: 14px;
}
.study-card.focus {
  border-color: var(--ink-3);
}
.study-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.study-card-title {
  font-size: 17px;
  font-weight: 600;
}
.study-card-acts {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.stream-row-link {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  text-decoration: none;
  color: inherit;
}
.stream-row-link:hover .label {
  text-decoration: underline;
}
```

- [ ] **Step 6: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

Ожидается: 201 тест зелёный.

- [ ] **Step 7: Проверить руками**

1. В полосе потока появился «Изучаю».
2. Материал со статусом «В работе» виден карточкой с полосой прогресса.
3. «Сделать фокусом» — карточка уезжает наверх и помечается, дашборд показывает её в блоке фокуса.
4. «Вернуть в бэклог» — карточка исчезает; если она была фокусом, блок фокуса на дашборде говорит «Выбери, за что сесть».
5. Экран без материалов в работе показывает пустое состояние с кнопкой в бэклог.
6. Строка «Изучаю» на дашборде ведёт сюда.
7. Ширина телефона: действия карточки переносятся, не обрезаются.

- [ ] **Step 8: Закоммитить**

```bash
git add src/pages/learning/Studying.tsx src/pages/learning/StreamLayout.tsx \
  src/pages/learning/StreamDashboard.tsx src/App.tsx src/lib/i18n/learning.ts src/learning.css
git commit -m "What is in progress deserves a surface of its own"
```

---

### Task 7: Бэклог

**Files:**
- Create: `src/pages/learning/Backlog.tsx`
- Modify: `src/pages/learning/StreamLayout.tsx`
- Modify: `src/pages/learning/StreamDashboard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/i18n/learning.ts`
- Modify: `src/learning.css`

**Interfaces:**
- Consumes: `BACKLOG_TABS`, `BacklogTab`, `backlog`, `backlogCounts` из Task 3; `useStream` из Task 5
- Produces: `Backlog()`, роут `/learning/:slug/backlog`, вкладка в параметре `?tab=`

- [ ] **Step 1: Добавить ключи словаря**

```ts
  'backlog.tabArchive': { ru: 'Архив', en: 'Archive' },
  'backlog.take': { ru: 'Взять в работу', en: 'Take it on' },
  'backlog.emptyInbox': {
    ru: 'Входящих нет. Всё разобрано.',
    en: 'Nothing in the inbox. All sorted.',
  },
  'backlog.emptySomeday': {
    ru: 'Здесь пусто. Сюда уходит то, что не выкинуть и не взять сейчас.',
    en: 'Empty. This is where things go that you will not drop but will not start either.',
  },
  'backlog.emptyReference': {
    ru: 'Справочников пока нет.',
    en: 'No reference material yet.',
  },
  'backlog.emptyArchive': {
    ru: 'Архив пуст.',
    en: 'The archive is empty.',
  },
```

- [ ] **Step 2: Написать экран**

Создать `src/pages/learning/Backlog.tsx`:

```tsx
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MaterialForm } from '../../components/MaterialForm'
import { Jelly } from '../../components/ui'
import { BACKLOG_TABS, backlog, backlogCounts, type BacklogTab } from '../../lib/learning/buckets'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

const EMPTY: Record<BacklogTab, 'backlog.emptyInbox' | 'backlog.emptySomeday' | 'backlog.emptyReference' | 'backlog.emptyArchive'> = {
  inbox: 'backlog.emptyInbox',
  someday: 'backlog.emptySomeday',
  reference: 'backlog.emptyReference',
  archive: 'backlog.emptyArchive',
}

const isTab = (v: string | null): v is BacklogTab =>
  v !== null && (BACKLOG_TABS as readonly string[]).includes(v)

export function Backlog() {
  const { t } = useLocale()
  const stream = useStream()
  const { materials, updateMaterial } = useLearning()
  const [adding, setAdding] = useState(false)

  /**
   * Вкладка живёт в адресе, а не в состоянии компонента: иначе «назад» после
   * трёх переключений уносит со страницы целиком. Фильтр Полки остаётся
   * локальным — там это вопрос, заданный странице сейчас, а здесь место,
   * куда возвращаются.
   */
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: BacklogTab = isTab(raw) ? raw : 'inbox'

  const counts = backlogCounts(materials, stream.id)
  const rows = backlog(materials, stream.id, tab)
  const from = { to: `/learning/${stream.slug}/backlog?tab=${tab}`, label: t('nav.backlog') }

  return (
    <>
      <div className="filter-bar">
        {/* Вкладки с нулём не прячутся: пустые «Входящие» надо видеть, а не выводить. */}
        <div className="backlog-tabs" role="tablist" aria-label={t('nav.backlog')}>
          {BACKLOG_TABS.map((b) => (
            <button
              key={b}
              type="button"
              role="tab"
              id={`backlog-tab-${b}`}
              aria-selected={b === tab}
              aria-controls="backlog-panel"
              className={`backlog-tab${b === tab ? ' on' : ''}`}
              onClick={() => setParams({ tab: b }, { replace: false })}
            >
              {b === 'archive' ? t('backlog.tabArchive') : t(`mstatus.${b}`)}
              <span className="small faint"> {counts[b]}</span>
            </button>
          ))}
        </div>
        <Jelly className="btn sm" onClick={() => setAdding(true)}>
          {t('learning.newMaterial')}
        </Jelly>
      </div>

      <div id="backlog-panel" role="tabpanel" aria-labelledby={`backlog-tab-${tab}`}>
        {rows.length === 0 ? (
          <div className="empty small">{t(EMPTY[tab])}</div>
        ) : (
          <ul className="mat-list">
            {rows.map((m) => (
              <li key={m.id}>
                <div className="mat-row static">
                  <Link className="mat-main" to={`/learning/${stream.slug}/m/${m.id}`} state={{ from }}>
                    <span className="mat-title">{m.title}</span>
                    <span className="small faint">
                      {t(`kind.${m.kind}`)}
                      {m.author ? ` · ${m.author}` : ''}
                    </span>
                  </Link>
                  <span className="mat-meta">
                    {tab === 'archive' ? (
                      <span className="chip sm">{t(`mstatus.${m.status}`)}</span>
                    ) : (
                      <button
                        className="link-btn"
                        type="button"
                        onClick={() => void updateMaterial(m.id, { status: 'active' })}
                      >
                        {t('backlog.take')}
                      </button>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {adding && <MaterialForm streamId={stream.id} onClose={() => setAdding(false)} />}
    </>
  )
}
```

Ключ `learning.newMaterial` остался с прежним именем — он не про витрину и в `hub.*` не переезжал. Проверить, что он на месте в `src/lib/i18n/learning.ts`; если в задаче 5 его переименовали — вернуть прежнее имя.

- [ ] **Step 3: Подключить полосу, дашборд, роут**

В `StreamLayout.tsx` в `items` добавить третьим:

```tsx
          { to: `/learning/${stream.slug}/backlog`, label: t('nav.backlog') },
```

В `StreamDashboard.tsx` вторую `<li>` обернуть в `Link`:

```tsx
        <li>
          <Link className="stream-row-link" to={`/learning/${stream.slug}/backlog`}>
            <span className="label">{t('nav.backlog')}</span>
            <span className="small faint">
              {t('mstatus.inbox')} {counts.inbox} · {t('mstatus.someday')} {counts.someday} ·{' '}
              {t('mstatus.reference')} {counts.reference}
            </span>
          </Link>
        </li>
```

В `src/App.tsx`:

```tsx
              <Route path="backlog" element={<Backlog />} />
```

- [ ] **Step 4: Дописать стили в `src/learning.css`**

```css

/* ---------- бэклог ---------- */
.backlog-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.backlog-tab {
  padding: 6px 12px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: none;
  color: var(--ink-2);
  font-size: 14px;
  cursor: pointer;
}
.backlog-tab:hover {
  color: var(--ink);
}
.backlog-tab.on {
  color: var(--ink);
  border-color: var(--ink-3);
  background: var(--paper-2);
}
/* Строка бэклога — ссылка плюс действие, поэтому сама строка ссылкой не является. */
.mat-row.static {
  cursor: default;
}
.mat-row.static .mat-main {
  text-decoration: none;
  color: inherit;
}
```

- [ ] **Step 5: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

- [ ] **Step 6: Проверить руками**

1. В полосе появился «Бэклог», четыре вкладки с числами.
2. Переключение вкладок меняет адрес: `?tab=someday` виден в строке.
3. Три переключения, затем «назад» — возвращает на предыдущую вкладку, а не уносит со страницы.
4. Открыть `#/learning/<slug>/backlog?tab=reference` прямой ссылкой — открывается нужная вкладка.
5. `?tab=ерунда` открывает «Входящие», не ломается.
6. «Взять в работу» — строка исчезает со вкладки и появляется в «Изучаю»; счётчики обновляются.
7. Вкладка, опустевшая под руками, показывает своё пустое состояние и не перекидывает на другую.
8. «Новый материал» заводит материал в этом потоке со статусом «Входящее».
9. Клавиатура: Tab доходит до вкладок, `aria-selected` у активной.
10. Строка «Бэклог» на дашборде ведёт сюда.

- [ ] **Step 7: Закоммитить**

```bash
git add src/pages/learning/Backlog.tsx src/pages/learning/StreamLayout.tsx \
  src/pages/learning/StreamDashboard.tsx src/App.tsx src/lib/i18n/learning.ts src/learning.css
git commit -m "A backlog people actually sort, with the tab in the address"
```

---

### Task 8: Заметки потока

**Files:**
- Create: `src/pages/learning/Notes.tsx`
- Modify: `src/pages/learning/StreamLayout.tsx`
- Modify: `src/pages/learning/StreamDashboard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/i18n/learning.ts`

**Interfaces:**
- Consumes: `useStream` из Task 5, `fmtDate`, существующие классы `.note-stack` / `.note-row`
- Produces: `Notes()`, роут `/learning/:slug/notes`

- [ ] **Step 1: Добавить ключи словаря**

```ts
  'notes.empty': {
    ru: 'Конспектов пока нет. Глава считается пройденной, когда по ней есть конспект.',
    en: 'No notes yet. A chapter counts as done when there is a note for it.',
  },
  'notes.allTags': { ru: 'Все', en: 'All' },
```

- [ ] **Step 2: Написать экран**

Создать `src/pages/learning/Notes.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Segmented } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { NoteTag } from '../../lib/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']
type Filter = NoteTag | 'all'

/** Лента конспектов потока. Форма Дневника, применённая к обучению. */
export function Notes() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, notes } = useLearning()
  const [filter, setFilter] = useState<Filter>('all')

  const mine = materials.filter((m) => m.stream_id === stream.id)
  const byId = new Map(mine.map((m) => [m.id, m]))
  const all = notes
    .filter((n) => byId.has(n.material_id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

  // Предлагаются только теги, которые в потоке действительно встречаются:
  // фильтр не должен уметь опустошить экран.
  const present = TAGS.filter((g) => all.some((n) => n.tags.includes(g)))
  const active: Filter = filter !== 'all' && present.includes(filter) ? filter : 'all'
  const shown = active === 'all' ? all : all.filter((n) => n.tags.includes(active))
  const from = { to: `/learning/${stream.slug}/notes`, label: t('nav.notes') }

  if (all.length === 0) return <div className="empty small">{t('notes.empty')}</div>

  return (
    <>
      {present.length > 1 && (
        <div className="filter-bar">
          <Segmented
            name={t('nav.notes')}
            value={active}
            options={[
              { value: 'all' as Filter, label: t('notes.allTags') },
              ...present.map((g) => ({ value: g as Filter, label: t(`tag.${g}`) })),
            ]}
            onChange={setFilter}
            className="sm"
          />
        </div>
      )}

      <ul className="note-stack">
        {shown.map((n) => {
          const material = byId.get(n.material_id)
          return (
            <li key={n.id}>
              <Link
                to={`/learning/${stream.slug}/n/${n.id}`}
                className="note-row"
                state={{ from }}
              >
                <span className="note-row-main">
                  <span className="note-row-title">{n.part ?? n.title ?? t('note.new')}</span>
                  <span className="small faint">
                    {fmtDate(n.date, locale)}
                    {material ? ` · ${material.title}` : ''}
                    {n.tags.length > 0 && ` · ${n.tags.map((g) => t(`tag.${g}`)).join(', ')}`}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
```

- [ ] **Step 3: Подключить полосу, дашборд, роут**

В `StreamLayout.tsx` четвёртым пунктом:

```tsx
          { to: `/learning/${stream.slug}/notes`, label: t('nav.notes') },
```

В `StreamDashboard.tsx` третью `<li>`:

```tsx
        <li>
          <Link className="stream-row-link" to={`/learning/${stream.slug}/notes`}>
            <span className="label">{t('nav.notes')}</span>
            <span className="small faint">{t('note.count', { n: mineNotes.length })}</span>
          </Link>
        </li>
```

В `src/App.tsx`:

```tsx
              <Route path="notes" element={<Notes />} />
```

- [ ] **Step 4: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

- [ ] **Step 5: Проверить руками**

1. В полосе четыре пункта: Дашборд · Изучаю · Бэклог · Заметки.
2. Лента показывает конспекты всех материалов потока, свежие сверху, с именем материала.
3. Фильтр по тегу появляется, только когда тегов в потоке больше одного, и не может опустошить экран.
4. Поток без конспектов показывает пустое состояние.
5. Строка «Заметки» на дашборде ведёт сюда.
6. Ширина телефона: четыре пункта полосы прокручиваются, активный виден.

- [ ] **Step 6: Закоммитить**

```bash
git add src/pages/learning/Notes.tsx src/pages/learning/StreamLayout.tsx \
  src/pages/learning/StreamDashboard.tsx src/App.tsx src/lib/i18n/learning.ts
git commit -m "Everything a stream left in your head, in one ribbon"
```

---

### Task 9: Материал и конспект встают в дерево

Последний уровень. Материал и конспект переезжают под поток, получают крошку, помнящую источник, и действие «Сделать фокусом потока». Старые адреса начинают редиректить.

**Files:**
- Rename: `src/pages/Material.tsx` → `src/pages/learning/Material.tsx`
- Rename: `src/pages/StudyNote.tsx` → `src/pages/learning/StudyNote.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/i18n/learning.ts`

**Interfaces:**
- Consumes: `Crumbs` из Task 4, `useStream` из Task 5
- Produces: роуты `/learning/:slug/m/:id` и `/learning/:slug/n/:id`, редиректы `/learning/m/:id` и `/learning/n/:id`

- [ ] **Step 1: Переселить файлы**

```bash
cd "/Users/kk/Documents/Repository/Reading tracker/reading-tracker"
git mv src/pages/Material.tsx src/pages/learning/Material.tsx
git mv src/pages/StudyNote.tsx src/pages/learning/StudyNote.tsx
```

В обоих поправить импорты: `'../components/…'` → `'../../components/…'`, `'../lib/…'` → `'../../lib/…'`, `'../state/…'` → `'../../state/…'`.

- [ ] **Step 2: Добавить ключ словаря**

```ts
  'material.makeFocus': { ru: 'Сделать фокусом потока', en: 'Make it the stream focus' },
  'material.isFocus': { ru: 'В фокусе потока', en: 'The stream focus' },
```

- [ ] **Step 3: Переписать материал**

В `src/pages/learning/Material.tsx`:

Импорты — добавить `Crumbs` и `useStream`, убрать `Link` из крошки (в ленте конспектов он остаётся):

```tsx
import { Crumbs } from '../../components/Crumbs'
import { useStream } from './StreamLayout'
```

Материал теперь живёт под потоком, поэтому поток берётся из оболочки, а не ищется по `stream_id`:

```tsx
  const stream = useStream()
  ...
  const material = materials.find((m) => m.id === id && m.stream_id === stream.id)
  if (!material) return <Navigate to={`/learning/${stream.slug}`} replace />
```

Крошку заменить на:

```tsx
      <Crumbs fallback={{ to: `/learning/${stream.slug}`, label: stream.name }} />
```

Добавить в `.mat-facts` действие фокуса:

```tsx
        {material.id === stream.focus_material_id ? (
          <span className="chip">{t('material.isFocus')}</span>
        ) : (
          <button
            className="link-btn"
            type="button"
            onClick={() => void updateStream(stream.id, { focus_material_id: material.id })}
          >
            {t('material.makeFocus')}
          </button>
        )}
```

`updateStream` взять из `useLearning()`. Заменить `category?.outline` на `stream.outline`, `navigate(`/learning/n/${made.id}`)` на `navigate(`/learning/${stream.slug}/n/${made.id}`)`, ссылки конспектов — на `/learning/${stream.slug}/n/${n.id}` с `state={{ from: { to: \`/learning/${stream.slug}/m/${material.id}\`, label: material.title } }}`, и после удаления — `navigate(`/learning/${stream.slug}/backlog`)`.

Проп формы: `<MaterialForm streamId={material.stream_id} … />`.

- [ ] **Step 4: Переписать конспект**

В `src/pages/learning/StudyNote.tsx` те же замены: `useStream()` вместо поиска категории, крошка через `Crumbs` с `fallback` на материал:

```tsx
      <Crumbs
        fallback={{
          to: material ? `/learning/${stream.slug}/m/${material.id}` : `/learning/${stream.slug}`,
          label: material?.title ?? stream.name,
        }}
      />
```

`Navigate` при ненайденной записи — на `/learning/${stream.slug}`, `navigate` после удаления — на `/learning/${stream.slug}/m/${material.id}`.

- [ ] **Step 5: Переписать роуты**

В `src/App.tsx` внести материал и конспект внутрь `learning/:slug` и добавить редиректы старых адресов:

```tsx
            <Route path="learning/:slug" element={<StreamLayout />}>
              <Route index element={<StreamDashboard />} />
              <Route path="active" element={<Studying />} />
              <Route path="backlog" element={<Backlog />} />
              <Route path="notes" element={<Notes />} />
            </Route>
            {/* Третий и четвёртый уровни вне layout: у них крошка вместо полосы,
                но поток им всё равно нужен, поэтому оболочка оборачивает их тоже. */}
            <Route path="learning/:slug" element={<StreamLayout bare />}>
              <Route path="m/:id" element={<Material />} />
              <Route path="n/:id" element={<StudyNote />} />
            </Route>

            <Route path="learning/m/:id" element={<LegacyMaterial />} />
            <Route path="learning/n/:id" element={<LegacyNote />} />
```

`StreamLayout` получает проп `bare`: он резолвит поток и отдаёт контекст, но не рисует ни крошку, ни переключатель, ни полосу — их место на этих уровнях занимает крошка самой страницы.

```tsx
export function StreamLayout({ bare = false }: { bare?: boolean }) {
  …
  if (!stream) return <Navigate to="/learning" replace />
  if (bare) return <Outlet context={{ stream } satisfies StreamCtx} />
  …
}
```

Редиректы ищут поток по записи:

```tsx
/** Адрес до перестройки: материал знал свой id, но не знал своего потока. */
function LegacyMaterial() {
  const { id } = useParams()
  const { streams, materials, loading } = useLearning()
  if (loading) return null
  const m = materials.find((x) => x.id === id)
  const s = m && streams.find((x) => x.id === m.stream_id)
  return <Navigate to={s ? `/learning/${s.slug}/m/${m.id}` : '/learning'} replace />
}

function LegacyNote() {
  const { id } = useParams()
  const { streams, materials, notes, loading } = useLearning()
  if (loading) return null
  const n = notes.find((x) => x.id === id)
  const m = n && materials.find((x) => x.id === n.material_id)
  const s = m && streams.find((x) => x.id === m.stream_id)
  return <Navigate to={s && n ? `/learning/${s.slug}/n/${n.id}` : '/learning'} replace />
}
```

Оба живут внутри `Gate`, где `LearningProvider` уже есть.

- [ ] **Step 6: Прогнать всё**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm test && npx tsc -b --noEmit && npx oxlint
```

- [ ] **Step 7: Проверить руками**

1. Материал открывается по `#/learning/<slug>/m/<id>`.
2. Открытый из «Изучаю» — крошка возвращает в «Изучаю»; открытый из Бэклога — в Бэклог, на ту же вкладку; из ленты Заметок — в Заметки.
3. Перезагрузка страницы материала — крошка ведёт на дашборд потока.
4. «Сделать фокусом потока» — на дашборде появляется в блоке фокуса, на материале вместо кнопки чип «В фокусе потока».
5. Новый конспект открывается по `#/learning/<slug>/n/<id>`, крошка ведёт на материал.
6. Удалить конспект — возврат на материал. Удалить материал — возврат в бэклог потока.
7. Старая ссылка `#/learning/m/<id>` попадает на материал внутри своего потока; `#/learning/n/<id>` — на конспект.
8. Старая ссылка на удалённый материал уводит на витрину.
9. Контур конспекта, заданный в настройках потока, подставляется в новый конспект.

- [ ] **Step 8: Закоммитить**

```bash
git add src/pages/learning/Material.tsx src/pages/learning/StudyNote.tsx \
  src/pages/Material.tsx src/pages/StudyNote.tsx src/pages/learning/StreamLayout.tsx \
  src/App.tsx src/lib/i18n/learning.ts
git commit -m "A material knows which stream it belongs to, and how you got here"
```

---

### Task 10: Прогон дерева целиком

Кода не пишется. Проходится чек-лист спеки, §10, на собранной сборке — на ней видно то, чего не видно в `dev`.

**Files:** никаких

- [ ] **Step 1: Собрать**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npm run build && npm run preview
```

Ожидается: сборка без ошибок, `preview` поднялся.

- [ ] **Step 2: Пройти чек-лист спеки**

1. Старый адрес `#/shelf` из закладки открывает Полку по новому адресу.
2. `#/learning/m/<id>` попадает на материал внутри своего потока.
3. Переход Чтение → Лернинг Хаб → поток → Бэклог → материал → конспект: на каждом шаге видно, где ты, и есть чем вернуться ровно на шаг.
4. Материал, открытый из «Изучаю», крошкой возвращает в «Изучаю»; тот же материал, открытый из Бэклога — в Бэклог.
5. Прямой заход по ссылке на материал — крошка ведёт на дашборд потока, не в никуда.
6. Переименование потока не ломает открытую вкладку с его адресом.
7. Ширина телефона: обе полосы читаемы, активный пункт виден, горизонтальной прокрутки страницы нет.
8. Первый запуск без потоков; поток без материалов; поток без конспектов — три пустых состояния, каждое с одним действием.
9. Переключение языка на каждом уровне дерева.
10. Несуществующий slug уводит на витрину.

- [ ] **Step 3: Проверить кнопку «назад» браузера**

Пройти Чтение → Хаб → поток → Бэклог → `?tab=someday` → материал → конспект, затем нажать «назад» семь раз. Каждое нажатие возвращает ровно на шаг, включая переключение вкладки бэклога. Ни один шаг не выкидывает на `/reading`.

- [ ] **Step 4: Проверить, что чужая работа цела**

```bash
git status --short
```

Ожидается: в списке остались ровно те файлы ленты обложек, что были до начала работы, — `Charts.tsx`, `format.ts(.test)`, `reading.ts`, `seed.ts`, `Settings.tsx` и неотслеживаемые `CoverReel.tsx`, `coverTone.*`, `reel.*`, `Charts.test.tsx`, `seed.test.ts`. `Progress.tsx`, `Journal.tsx`, `Shelf.tsx`, `index.css`, `dict.ts` закоммичены с точечными правками адресов и стилей; их остальные изменения должны были остаться в рабочем дереве нетронутыми — проверить `git diff` по каждому.

Если что-то из ленты обложек попало в коммит — не откатывать историю, а сказать об этом владельцу репозитория.

---

## Самопроверка плана

**Покрытие спеки.** §2 дерево — Tasks 4, 5, 6, 7, 8, 9. §3 механика (две полосы, крошки, `▾`, настройки иконкой) — Tasks 4, 5. §4 старые адреса — Tasks 4 и 9. §5.1 `Stream` с целью и фокусом — Task 2. §5.2 slug — Task 1. §5.3 статус `someday` и починка `mstatus.dropped` — Task 2. §5.4 миграция `v1` → `v2` — Task 2. §6 витрина — Task 5; дашборд потока — Task 5; «Изучаю» — Task 6; Бэклог со вкладкой в адресе — Task 7; Заметки — Task 8; материал и конспект — Task 9; настройка потока на дашборде — Task 5; чтение — Task 4. §7 словарь — распределён по задачам, каждая добавляет свои ключи. §8 решения — реализованы в перечисленных выше местах. §9 чего нет — не делается нигде. §10 проверка: тесты в Tasks 1, 2, 3; ручной чек-лист в Task 10.

**Расхождение со спекой, разрешённое в плане.** `h1` «Чтение» на `/reading` не добавляется — причина в разделе «Поправка к спеке».

**Согласованность имён.** `streamSlug(name, taken)` (Task 1) — в Task 2. `Stream`, `stream_id`, `addStream/updateStream/deleteStream` (Task 2) — в Tasks 5–9. `studying`, `backlog`, `backlogCounts`, `BACKLOG_TABS`, `BacklogTab` (Task 3) — в Tasks 5, 6, 7. `activeWeeks`, `lastActivity` (Task 3) — в Tasks 5, 6. `SubNav({ items, id })` и `SubNavItem` (Task 4) — в Tasks 4, 5, 6, 7, 8. `Crumbs({ fallback })` и `Crumb` (Task 4) — в Tasks 4, 9. `useStream()` (Task 5) — в Tasks 6, 7, 8, 9. `StreamForm({ stream?, onClose })` (Task 2) — в Tasks 5. `MaterialForm({ streamId, material?, onClose })` (Task 2) — в Tasks 7, 9. Ключ `hub.materialCount` (Task 5) — в Tasks 5, 6. Ключ `stream.lastNote` (Task 5) — в Tasks 5, 6. Ключи `nav.studying/backlog/notes` (Task 5) — в Tasks 5–8.

**Риски исполнения.**

- Имена CSS-переменных (`--rule`, `--paper`, `--paper-2`, `--ink`, `--ink-2`, `--ink-3`) и классов (`page-head`, `filter-bar`, `hero-empty`, `empty`, `panel-head`, `row-tight`, `chip`, `meter`, `label`, `muted`, `faint`, `small`, `mono`, `btn`, `link-btn`, `mat-list`, `mat-row`, `mat-main`, `mat-title`, `mat-meta`, `note-stack`, `note-row`, `note-row-main`, `note-row-title`, `crumbs`, `crumb`) взяты по памяти о кодовой базе. **Перед использованием каждое проверяется в `src/index.css` и `src/learning.css`.** Если имя отличается — берётся существующее; новых сущностей ради совпадения с планом не заводить.
- Число тестов в ожиданиях (177, 185, 201) — оценка. Расхождение на пару тестов не ошибка; важно, что красных нет и что число выросло.
- `sed` в Task 4, шаг 7, идёт по грязным файлам. Результат обязательно смотрится глазами через `git diff` до коммита.
- Задача 2 — самая крупная и единственная, которую нельзя разрезать: `tsc` не соберётся, пока переименование не разойдётся по всем экранам. Если она встанет, откат делается одним `git checkout --` по перечисленным файлам, а не по дереву целиком.
