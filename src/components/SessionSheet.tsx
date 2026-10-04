import { useState } from 'react'
import { todayISO } from '../lib/format'
import { progressOf } from '../lib/reading'
import type { Book, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'
import { useSessionWrites } from '../state/useSessionWrites'
import { DraftStack } from './log/DraftStack'
import { PagesStep } from './log/PagesStep'
import { SubjectPick } from './log/SubjectPick'
import { bookCover, pickOrder } from './log/subjects'
import { thoughtBlank, thoughtDraft, thoughtDrafts, type ThoughtDraft } from './log/drafts'
import { ThoughtFields } from './log/ThoughtFields'
import { WhenLine } from './log/WhenLine'
import { Sheet } from './Sheet'
import { FormStack, Jelly } from './ui'

/**
 * Сессия: докуда дочитала и что осталось в голове.
 *
 * Лист выглядит как строка дневника, которой он станет: обложка, шаг по
 * страницам крупно, тихая строка «когда · сколько · как», под ней мысли той
 * же бумагой, что в ленте. Мыслей по умолчанию ноль — сессия это прогресс, а
 * не текст, — и сколько угодно по «+ мысль». Мысль без сессии заводится
 * другой дверью, `ThoughtSheet`.
 *
 * «От» подставляется из прочитанного, так что обычно набирают одно число.
 * Минуты необязательны: спрашивать их каждый раз — то, от чего бросают вести
 * журнал.
 *
 * С `session` тот же лист правит запись: ошибка в странице не должна стоять
 * вечно. `book` необязателен — со страницы книги она известна, из дневника и
 * с дашборда выбирается в шапке, преднабранная фокусом.
 */
export function SessionSheet({
  book,
  sessions,
  session,
  onClose,
}: {
  /** Известная книга. Без неё лист спрашивает её сам. */
  book?: Book | null
  sessions: Session[]
  session?: Session
  onClose: () => void
}) {
  const t = useT()
  const { books, notes, addNote, updateNote, deleteNote } = useData()
  const writes = useSessionWrites()
  const options = book || session ? [] : pickOrder(books)
  const [pickedId, setPickedId] = useState(() => book?.id ?? session?.book_id ?? options[0]?.id ?? '')
  const subject = book ?? books.find((b) => b.id === pickedId) ?? null
  // Правится сессия — «от» считается без неё самой, иначе она подпирала бы
  // собственное начало.
  const others = session ? sessions.filter((s) => s.id !== session.id) : sessions
  const reached = (b: Book | null) => (b ? progressOf(b.id, others, b.pages).page : 0)

  const [date, setDate] = useState(session?.date ?? todayISO())
  const [from, setFrom] = useState(String(session?.page_from ?? reached(subject)))
  const [to, setTo] = useState(session ? String(session.page_to) : '')
  const [minutes, setMinutes] = useState(session?.minutes ? String(session.minutes) : '')
  const [rating, setRating] = useState<number | null>(session?.rating ?? null)
  const [drafts, setDrafts] = useState<ThoughtDraft[]>(() =>
    thoughtDrafts(session ? notes.filter((n) => n.session_id === session.id) : []),
  )
  const [busy, setBusy] = useState(false)
  // Снимок того, с чего лист начал: «есть несохранённое» — это отличие от него.
  const [start] = useState(() => JSON.stringify({ date, from, to, minutes, rating, drafts }))

  // Смена книги пересчитывает только «от страницы»: она и зависит от книги.
  const pick = (id: string) => {
    setPickedId(id)
    setFrom(String(reached(books.find((b) => b.id === id) ?? null)))
  }

  const title = t(session ? 'session.editTitle' : 'session.log')

  // Сессия пишется по книге. Пустой полке лист говорит это прямо, а не
  // показывает пустой список.
  if (!subject) {
    return (
      <Sheet title={title} onClose={onClose}>
        <p className="small faint">{t('session.noBooks')}</p>
      </Sheet>
    )
  }

  const fromNum = Number(from) || 0
  const toNum = to.trim() ? Number(to) : null
  const backwards = toNum !== null && toNum < fromNum
  const ready = toNum !== null && !backwards
  const dirty = JSON.stringify({ date, from, to, minutes, rating, drafts }) !== start

  /** Стрелочная: объявление поднимается выше проверки на `subject`, и
      сужение типа внутрь него не доходит. */
  const save = async () => {
    if (!ready || busy) return
    setBusy(true)
    const fields = {
      book_id: subject.id,
      date,
      page_from: fromNum,
      page_to: toNum,
      // Ноль и меньше — «не записано», а не время, которое приняла бы база.
      minutes: Number(minutes) > 0 ? Number(minutes) : null,
      rating,
    }
    // Даты книги и пара в потоке, если книга с ним связана, — там же.
    const saved = await writes.saveReading(subject, session, fields)
    const sessionId = saved?.id ?? session?.id

    for (const d of drafts) {
      const body = d.body.trim()
      const page = d.page ? Number(d.page) : null
      if (d.id) {
        // Убранная и стёртая до пустоты — одно и то же: мысли больше нет.
        if (d.removed || !body) await deleteNote(d.id)
        else await updateNote(d.id, { tag: d.tag, body, page })
      } else if (!d.removed && body) {
        await addNote({ book_id: subject.id, session_id: sessionId ?? null, page, tag: d.tag, body })
      }
    }

    setBusy(false)
    onClose()
  }

  const remove = async () => {
    if (!session) return
    const twin = writes.twinOfReading(session.id)
    if (!confirm(t(twin ? 'session.confirmDeleteTwin' : 'session.confirmDelete'))) return
    setBusy(true)
    await writes.removeReading(session)
    onClose()
  }

  const head = (
    <SubjectPick
      value={subject}
      options={options}
      onPick={pick}
      cover={bookCover}
      title={(b) => b.title}
      author={(b) => b.author}
      label={t('session.book')}
    />
  )

  return (
    <Sheet title={title} head={head} onClose={onClose} dirty={dirty} onSubmit={() => void save()}>
      <FormStack>
        <PagesStep
          from={from}
          to={to}
          total={subject.pages}
          onFrom={setFrom}
          onTo={setTo}
          backwards={backwards}
        />

        <WhenLine
          date={date}
          onDate={setDate}
          minutes={minutes}
          onMinutes={setMinutes}
          rating={rating}
          onRating={setRating}
        />

        <DraftStack
          drafts={drafts}
          onDrafts={setDrafts}
          // Мысль пришла там, где остановилась: страница — «до» этой сессии.
          make={() => thoughtDraft(to)}
          tagOf={(d) => d.tag}
          isBlank={thoughtBlank}
          addLabel={t('draft.addThought')}
          render={(d, patch, fresh) => (
            <ThoughtFields draft={d} patch={patch} fresh={fresh} index={drafts.indexOf(d)} />
          )}
        />

        <div className="sheet-foot">
          {session && (
            <button type="button" className="link-btn danger" onClick={remove} disabled={busy}>
              {t('session.delete')}
            </button>
          )}
          <Jelly className="btn" onClick={() => void save()} disabled={!ready || busy}>
            {t('form.save')}
          </Jelly>
        </div>
      </FormStack>
    </Sheet>
  )
}
