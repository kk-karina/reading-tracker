import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { BookForm } from '../components/BookForm'
import { Crumbs } from '../components/Crumbs'
import { Icon } from '../components/Icon'
import { Review } from '../components/Review'
import { SessionSheet } from '../components/SessionSheet'
import { LogRow } from '../components/log/LogRow'
import { PagesStrip } from '../components/log/ProgressStrip'
import { ThoughtCard } from '../components/ThoughtCard'
import { ThoughtSheet } from '../components/ThoughtSheet'
import { Empty, inkSlide, Jelly, Tip } from '../components/ui'
import { sourceOf } from '../lib/compose/linkMeta'
import { fmtDate, fmtMinutes } from '../lib/format'
import { Mood } from '../components/Mood'
import {
  lastSessionDate,
  paceMinutesPerPage,
  pagesRead,
  progressOf,
  remainingMinutes,
  spentOn,
} from '../lib/reading'
import { timeOf } from '../lib/log'
import type { NoteTag, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { useSessionWrites } from '../state/useSessionWrites'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

/* Sessions and thoughts are one record kept from two sides, so they are two
   views of the same thing rather than two boxes side by side. Reflection leads:
   the pages are the means, what they left behind is the point. */
const TABS = ['reflection', 'sessions', 'review'] as const
type Tab = (typeof TABS)[number]
const TAB_KEY = {
  reflection: 'book.tabReflection',
  sessions: 'book.tabSessions',
  review: 'book.tabReview',
} as const

export function Book() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t, locale } = useLocale()
  const { books, sessions, notes, loading, deleteBook, setFocus } = useData()
  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [tagFilter, setTagFilter] = useState<NoteTag | 'all'>('all')
  const [tab, setTab] = useState<Tab>('reflection')
  const { streams } = useLearning()
  const writes = useSessionWrites()

  if (loading) return null
  const book = books.find((b) => b.id === id)
  if (!book)
    return (
      <Empty
        art="signpost"
        hint={t('book.notFoundBody')}
        action={
          <Link to="/reading/shelf">
            <Jelly className="btn ghost sm">{t('book.back')}</Jelly>
          </Link>
        }
      >
        {t('book.notFound')}
      </Empty>
    )

  const { page, percent } = progressOf(book.id, sessions, book.pages)
  const read = pagesRead(book.id, sessions)
  // Pace is learned from every book, so a new book inherits what you already know.
  const pace = paceMinutesPerPage(sessions)
  const spent = spentOn(book.id, sessions, pace)
  const left = remainingMinutes(page, book.pages, pace)
  const last = lastSessionDate(book.id, sessions)

  const mySessions = sessions
    .filter((s) => s.book_id === book.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const bookNotes = notes.filter((n) => n.book_id === book.id)
  const myNotes = bookNotes.filter((n) => tagFilter === 'all' || n.tag === tagFilter)

  const finished = book.status === 'finished'
  // Taking a book off the finished shelf takes its review tab with it.
  const current: Tab = tab === 'review' && !finished ? 'reflection' : tab
  const counts: Record<Tab, number | null> = {
    reflection: bookNotes.length,
    sessions: mySessions.length,
    review: null,
  }

  // Та же книга в потоке. Связь ставится и снимается со страницы материала.
  const twin = writes.materialOf(book.id)
  const twinStream = twin && streams.find((s) => s.id === twin.stream_id)

  async function remove() {
    if (!book) return
    if (confirm(t('book.confirmDelete'))) {
      await writes.forgetBook(book.id)
      await deleteBook(book.id)
      nav('/reading/shelf')
    }
  }

  return (
    <>
      {/* Действия над книгой целиком — в строке крошки, а не у названия: у
          длинного заголовка они переносились на вторую строку. */}
      <Crumbs
        fallback={{ to: '/reading/shelf', label: t('nav.shelf') }}
        actions={
              <div className="head-actions">
                <Tip text={book.is_focus ? t('book.isFocus') : t('book.makeFocus')}>
                  <Jelly
                    className={`icon-act${book.is_focus ? ' on' : ''}`}
                    onClick={() => setFocus(book.is_focus ? null : book.id)}
                    aria-pressed={book.is_focus}
                    aria-label={book.is_focus ? t('book.isFocus') : t('book.makeFocus')}
                  >
                    <Icon name="flag" size={17} />
                  </Jelly>
                </Tip>
                <Tip text={t('book.edit')}>
                  <Jelly
                    className="icon-act"
                    onClick={() => setEditing(true)}
                    aria-label={t('book.edit')}
                  >
                    <Icon name="pen" size={17} />
                  </Jelly>
                </Tip>
                <Tip text={t('book.delete')}>
                  <Jelly
                    className="icon-act danger"
                    onClick={() => void remove()}
                    aria-label={t('book.delete')}
                  >
                    <Icon name="trash" size={17} />
                  </Jelly>
                </Tip>
              </div>
        }
      />

      <div className="book-head">
        <div className="book-cover-tilt">
          <BookCover book={book} size="lg" />
        </div>

        <div className="book-info">
          <h1 className="display book-title">{book.title}</h1>

          {/* Статус строкой, а не переключателем ниже: он больше не вопрос к
              человеку, а вывод из прочитанного — см. `statusOf`. */}
          <p className="muted book-author">
            {[book.author, t(`status.${book.status}`)].filter(Boolean).join(' · ')}
            {/* Связь с обучением — свойство книги того же рода, что статус, и
                стоит с ним в одной строке, а не отдельным абзацем под фактами. */}
            {twin && twinStream && (
              <>
                {' · '}
                <Link className="link-btn" to={`/learning/${twinStream.slug}/m/${twin.id}`}>
                  {t('book.inStream', { stream: twinStream.name })}
                </Link>
              </>
            )}
          </p>

          {/* Плюс вплотную к полосе, а не громкая кнопка под фактами: записать
              сессию значит сдвинуть именно её. Тот же жест в обучении. */}
          <div className="prog-row">
            <div className="meter big" aria-hidden>
              <span style={{ width: `${percent ?? (page > 0 ? 8 : 0)}%` }} />
            </div>
            <Tip text={t('session.log')}>
              <Jelly
                className="log-dot"
                onClick={() => setLogging(true)}
                aria-label={t('session.log')}
              >
                <Icon name="plus" size={15} />
              </Jelly>
            </Tip>
          </div>

          {/* Always four cells, zeros included: an empty slot is information too. */}
          <dl className="facts">
            <div>
              <dt>{t('book.pages')}</dt>
              <dd className="mono">
                {book.pages ? t('book.pagesOf', { page, total: book.pages }) : page || 0}
                {percent !== null && <span className="faint"> · {percent}%</span>}
              </dd>
            </div>
            <div>
              <dt>{t('book.time')}</dt>
              <dd className="mono" title={spent.approx ? t('book.approx') : undefined}>
                {spent.minutes > 0 ? (
                  <>
                    {spent.approx && '≈ '}
                    {fmtMinutes(spent.minutes, locale)}
                  </>
                ) : (
                  <span className="faint">{t('book.noTime')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('book.pace')}</dt>
              <dd className="mono">
                {pace !== null ? (
                  t('book.perPage', { n: Math.round(pace * 10) / 10 })
                ) : (
                  <span className="faint">{t('book.unknown')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('book.left')}</dt>
              <dd className="mono">
                {left !== null ? (
                  `≈ ${fmtMinutes(left, locale)}`
                ) : (
                  <span className="faint">{t('book.unknown')}</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="small muted hint-line">
            {last ? t('book.lastRead', { date: fmtDate(last, locale) }) : t('book.notOpened')}
          </p>

          {/* Ссылка там же и так же, как у материала: книга на полке — тот же
              материал вида «книга». */}
          {book.url && (
            <p className="small hint-line">
              <a className="link-btn" href={book.url} target="_blank" rel="noopener noreferrer">
                {sourceOf(book.url) ?? t('material.url')} ↗
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label={book.title}>
        {TABS.map((id) => {
          const locked = id === 'review' && !finished
          const on = current === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={locked}
              title={locked ? t('book.reviewLocked') : undefined}
              className={`tab${on ? ' on' : ''}`}
              onClick={() => setTab(id)}
            >
              {/* Имя несёт своё имя ещё и атрибутом: по нему `.tab-label`
                  держит ширину жирного начертания всегда — см. `index.css`. */}
              <span className="tab-label" data-label={t(TAB_KEY[id])}>
                {t(TAB_KEY[id])}
              </span>
              {counts[id] !== null && counts[id] > 0 && (
                <span className="tab-n">{counts[id]}</span>
              )}
              {on && (
                <motion.span layoutId="book-tab" className="tab-line" transition={inkSlide} />
              )}
            </button>
          )
        })}
      </div>

      {current === 'reflection' && (
        <div className="tab-body">
          {/* Та же строка, что над листами у материала: чипы среза слева,
              дверь справа. Мысль приходит и не за чтением — для неё своя
              дверь, а не «Записать сессию». Пока мыслей нет, срезать нечего:
              строки нет, дверь стоит в пустоте ниже. */}
          {bookNotes.length > 0 && (
            <div className="panel-head">
              <div className="chips">
                {(['all', ...TAGS] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`chip${tagFilter === tag ? ' on' : ''}`}
                    aria-pressed={tagFilter === tag}
                    onClick={() => setTagFilter(tag)}
                  >
                    {tag === 'all' ? t('book.allTags') : t(`tag.${tag}`)}
                  </button>
                ))}
              </div>
              <Jelly className="btn sm" onClick={() => setThinking(true)}>
                {t('thought.add')}
              </Jelly>
            </div>
          )}
          {myNotes.length === 0 ? (
            /* Рисунок только у настоящей пустоты: ниже этого же места
               «под фильтр ничего не попало» остаётся строкой. */
            bookNotes.length === 0 ? (
              <Empty
                size="sm"
                art="writing"
                action={
                  <Jelly className="btn ghost sm" onClick={() => setThinking(true)}>
                    {t('thought.add')}
                  </Jelly>
                }
              >
                {t('book.reflectionEmpty')}
              </Empty>
            ) : (
              <Empty size="sm">{t('journal.emptyHere')}</Empty>
            )
          ) : (
            <div className="thought-cards">
              {myNotes.map((n) => (
                <ThoughtCard key={n.id} note={n} />
              ))}
            </div>
          )}
        </div>
      )}

      {current === 'sessions' && (
        <div className="tab-body">
          {mySessions.length === 0 ? (
            <Empty
              size="sm"
              art="reading"
              action={
                <Jelly className="btn ghost sm" onClick={() => setLogging(true)}>
                  {t('session.log')}
                </Jelly>
              }
            >
              {t('book.sessionsEmpty')}
            </Empty>
          ) : (
            <>
              {/* Та же строка журнала, что во вкладке «Сессии» раздела: шаг
                  крупно, мысли значком с числом. Книги в строке нет — мы на
                  её странице. */}
              <div className="log">
                {mySessions.map((s) => {
                  const thoughts = bookNotes
                    .filter((n) => n.session_id === s.id)
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  return (
                    <LogRow
                      key={s.id}
                      step={`+${s.page_to - s.page_from}`}
                      unit={t('unit.pages')}
                      detail={
                        <span className="mono">
                          {s.page_from} → {s.page_to}
                        </span>
                      }
                      mood={s.rating && <Mood rating={s.rating} />}
                      when={[
                        fmtDate(s.date, locale),
                        timeOf(s.date, s.created_at),
                        s.minutes && fmtMinutes(s.minutes, locale),
                      ]}
                      meter={
                        book.pages ? (
                          <PagesStrip from={s.page_from} to={s.page_to} total={book.pages} />
                        ) : undefined
                      }
                      written={thoughts.length}
                      open={openSession === s.id}
                      onToggle={() => setOpenSession(openSession === s.id ? null : s.id)}
                      onEdit={() => setEditingSession(s)}
                    >
                      <div className="store-grid">
                        {thoughts.map((n) => (
                          <ThoughtCard key={n.id} note={n} flat />
                        ))}
                      </div>
                    </LogRow>
                  )
                })}
              </div>
              {read > 0 && (
                <p className="small faint" style={{ margin: '14px 0 0' }}>
                  {t('count.pages', { n: read })}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {current === 'review' && (
        <div className="tab-body">
          <Review key={book.id} book={book} />
        </div>
      )}

      {editing && (
        <BookForm book={book} onClose={() => setEditing(false)} onDeleted={() => nav('/reading/shelf')} />
      )}
      {logging && <SessionSheet book={book} sessions={sessions} onClose={() => setLogging(false)} />}
      {thinking && <ThoughtSheet book={book} onClose={() => setThinking(false)} />}
      {editingSession && (
        <SessionSheet
          book={book}
          sessions={sessions}
          session={editingSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </>
  )
}
