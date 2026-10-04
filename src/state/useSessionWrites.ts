import { sessionDates } from '../lib/reading'
import {
  applySession,
  diffSession,
  rollbackSession,
  type SessionEffects,
} from '../lib/learning/sessions'
import type { NewStudySession } from '../lib/learning/store'
import type { Material, MaterialPart, StudySession } from '../lib/learning/types'
import type { NewSession } from '../lib/store'
import { canLink, mergeHistory, mirrorOp, readingStep, studyStep, type Step } from '../lib/twin'
import type { Book, Session } from '../lib/types'
import { useData } from './DataContext'
import { useLearning } from './LearningContext'

const stepFields = (s: Step) => ({
  date: s.date,
  page_from: s.page_from,
  page_to: s.page_to,
  minutes: s.minutes,
  rating: s.rating,
})

const readingFields = (bookId: string, s: Step): NewSession => ({ book_id: bookId, ...stepFields(s) })

const studyFields = (materialId: string, s: Step): NewStudySession => ({
  material_id: materialId,
  ...stepFields(s),
  part_ids: [],
  completed: false,
})

/**
 * Запись сессий и занятий — одна дверь на оба раздела.
 *
 * Книга, связанная с материалом, пишет каждую сессию дважды (см.
 * `src/lib/twin.ts`), и пара должна вести себя ровно как запись своего
 * листа: сессия из потока датирует книгу, занятие с полки двигает страницу
 * материала. Поэтому всё, что лист раньше делал после записи сам, — шаг
 * материала и даты книги — живёт здесь, и оба листа пишут через этот хук, а не
 * прямо в контекст.
 *
 * Общей транзакции у пары нет: сначала исходная запись, потом пара. Отказ
 * второй показывается как любая ошибка, расхождение правится правкой записи.
 */
export function useSessionWrites() {
  const data = useData()
  const learning = useLearning()

  /** Книга связанного материала. Висячий указатель — как нет связи. */
  const bookOf = (m: Pick<Material, 'book_id' | 'kind' | 'scale'>): Book | null =>
    m.book_id && canLink(m) ? (data.books.find((b) => b.id === m.book_id) ?? null) : null

  const materialOf = (bookId: string): Material | null =>
    learning.materials.find((m) => m.book_id === bookId && canLink(m)) ?? null

  const twinOfStudy = (s: Pick<StudySession, 'book_session_id'>): Session | null =>
    s.book_session_id ? (data.sessions.find((r) => r.id === s.book_session_id) ?? null) : null

  const twinOfReading = (sessionId: string): StudySession | null =>
    learning.sessions.find((x) => x.book_session_id === sessionId) ?? null

  /**
   * Шаг материала и отметки частей одной записью на часть. `extra` — то, что
   * лист занятия правит в частях сам, имена глав: два вызова подряд — два
   * круга перерисовки и две точки отказа.
   */
  async function settle(
    material: Material,
    fx: SessionEffects,
    extra: Map<string, Partial<MaterialPart>> = new Map(),
  ) {
    if (Object.keys(fx.material).length > 0) await learning.updateMaterial(material.id, fx.material)
    const patches = new Map(extra)
    for (const x of fx.parts) patches.set(x.id, { ...patches.get(x.id), done: x.done })
    for (const [id, patch] of patches) await learning.updatePart(id, patch)
  }

  async function datesOf(book: Book, step: Step) {
    const dates = sessionDates(book, step.date, step.page_to)
    if (Object.keys(dates).length > 0) await data.updateBook(book.id, dates)
  }

  /* ---------- обучение → полка ---------- */

  async function mirrorStudy(material: Material, saved: StudySession) {
    const book = bookOf(material)
    if (!book) return
    const twin = twinOfStudy(saved)
    const op = mirrorOp(studyStep(saved), twin && { id: twin.id, step: readingStep(twin) })
    if (!op) return
    if (op.kind === 'delete') {
      await data.deleteSession(op.id)
      await learning.updateSession(saved.id, { book_session_id: null })
      return
    }
    if (op.kind === 'update') {
      await data.updateSession(op.id, stepFields(op.step))
    } else {
      const made = await data.addSession(readingFields(book.id, op.step))
      if (made) await learning.updateSession(saved.id, { book_session_id: made.id })
    }
    await datesOf(book, op.step)
  }

  async function saveStudy(
    material: Material,
    before: StudySession | undefined,
    fields: NewStudySession,
    extra?: Map<string, Partial<MaterialPart>>,
  ): Promise<StudySession | undefined> {
    let saved: StudySession | undefined
    if (before) {
      saved = { ...before, ...fields }
      await learning.updateSession(before.id, fields)
      await settle(material, diffSession(material, learning.sessions, before, saved), extra)
    } else {
      saved = await learning.addSession(fields)
      if (!saved) return undefined
      await settle(material, applySession(material, saved), extra)
    }
    await mirrorStudy(material, saved)
    return saved
  }

  async function removeStudy(material: Material, session: StudySession) {
    await settle(material, rollbackSession(material, learning.sessions, session))
    await learning.deleteSession(session.id)
    const twin = twinOfStudy(session)
    if (twin) await data.deleteSession(twin.id)
  }

  /* ---------- полка → обучение ---------- */

  async function mirrorReading(book: Book, saved: Session) {
    const material = materialOf(book.id)
    if (!material) return
    const twin = twinOfReading(saved.id)
    const op = mirrorOp(readingStep(saved), twin && { id: twin.id, step: studyStep(twin) })
    if (!op) return
    if (op.kind === 'add') {
      const made = await learning.addSession({ ...studyFields(material.id, op.step), book_session_id: saved.id })
      if (made) await settle(material, applySession(material, made))
    } else if (op.kind === 'update' && twin) {
      const patch = stepFields(op.step)
      await learning.updateSession(twin.id, patch)
      await settle(material, diffSession(material, learning.sessions, twin, { ...twin, ...patch }))
    }
  }

  async function saveReading(
    book: Book,
    before: Session | undefined,
    fields: NewSession,
  ): Promise<Session | undefined> {
    let saved: Session | undefined
    if (before) {
      await data.updateSession(before.id, fields)
      saved = { ...before, ...fields }
    } else {
      saved = await data.addSession(fields)
    }
    if (!saved) return undefined
    await datesOf(book, readingStep(saved))
    await mirrorReading(book, saved)
    return saved
  }

  async function removeReading(session: Session) {
    await data.deleteSession(session.id)
    const twin = twinOfReading(session.id)
    const material = twin && learning.materials.find((m) => m.id === twin.material_id)
    if (!twin || !material) return
    await settle(material, rollbackSession(material, learning.sessions, twin))
    await learning.deleteSession(twin.id)
  }

  /* ---------- связь ---------- */

  /**
   * Связать и свести историю: одна и та же сессия, записанная в обоих местах,
   * спаривается, остальное копируется на другую сторону (`mergeHistory`).
   * Число страниц `pages` — одно на двоих.
   */
  async function link(material: Material, book: Book, pages: number | null) {
    const reading = data.sessions.filter((s) => s.book_id === book.id)
    const plan = mergeHistory(
      reading,
      learning.sessions.filter((x) => x.material_id === material.id),
    )

    const patch: Partial<Material> = { book_id: book.id, pages_total: pages }
    if (plan.page !== null && plan.page > (material.page_current ?? 0)) patch.page_current = plan.page
    await learning.updateMaterial(material.id, patch)

    for (const p of plan.pairs) {
      await learning.updateSession(p.studyId, { book_session_id: p.sessionId, ...p.study })
      if (Object.keys(p.session).length > 0) await data.updateSession(p.sessionId, p.session)
    }
    for (const c of plan.toReading) {
      const made = await data.addSession(readingFields(book.id, c.step))
      if (made) await learning.updateSession(c.studyId, { book_session_id: made.id })
    }
    for (const c of plan.toStudy) {
      await learning.addSession({ ...studyFields(material.id, c.step), book_session_id: c.sessionId })
    }

    // Даты книги — по всей сведённой истории в порядке дней: пришедшая из
    // потока сессия могла и начать книгу, и дочитать её.
    const steps = [...reading.map(readingStep), ...plan.toReading.map((c) => c.step)].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    let state = { pages, started_at: book.started_at, finished_at: book.finished_at }
    const bookPatch: Partial<Book> = book.pages === pages ? {} : { pages }
    for (const s of steps) {
      const dates = sessionDates(state, s.date, s.page_to)
      Object.assign(bookPatch, dates)
      state = { ...state, ...dates }
    }
    if (Object.keys(bookPatch).length > 0) await data.updateBook(book.id, bookPatch)
  }

  /** Записи остаются на обеих сторонах обычными; новые больше не зеркалятся. */
  async function unlink(material: Material) {
    await learning.updateMaterial(material.id, { book_id: null })
    for (const x of learning.sessions) {
      if (x.material_id === material.id && x.book_session_id) {
        await learning.updateSession(x.id, { book_session_id: null })
      }
    }
  }

  /** Правка книги: число страниц у пары одно. */
  async function afterBookEdit(bookId: string, pages: number | null) {
    const material = materialOf(bookId)
    if (material && material.pages_total !== pages) await learning.updateMaterial(material.id, { pages_total: pages })
  }

  /**
   * Правка материала: число страниц уходит книге, а вид или шкала, при которых
   * связь невозможна, её снимают — иначе книга не могла бы связаться с другим
   * материалом.
   */
  async function afterMaterialEdit(material: Material, after: Pick<Material, 'kind' | 'scale' | 'pages_total'>) {
    if (!material.book_id) return
    if (!canLink(after)) return unlink(material)
    const book = data.books.find((b) => b.id === material.book_id)
    if (book && book.pages !== after.pages_total) await data.updateBook(book.id, { pages: after.pages_total })
  }

  /** Книга уходит с полки: материал остаётся со своими занятиями. */
  async function forgetBook(bookId: string) {
    const material = learning.materials.find((m) => m.book_id === bookId)
    if (material) await unlink(material)
  }

  return {
    bookOf,
    materialOf,
    twinOfStudy,
    twinOfReading,
    saveStudy,
    removeStudy,
    saveReading,
    removeReading,
    link,
    unlink,
    afterBookEdit,
    afterMaterialEdit,
    forgetBook,
  }
}
