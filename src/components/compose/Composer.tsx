import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import type { BookCandidate } from '../../lib/books'
import { sameDraft, type Draft } from '../../lib/compose/draft'
import { classifyDuplicates, findDuplicates, type Duplicate, type Home } from '../../lib/compose/duplicates'
import { findOwn, withSource, type OwnHit } from '../../lib/compose/own'
import { sourceOf } from '../../lib/compose/linkMeta'
import type { BookScale, MaterialKind } from '../../lib/learning/types'
import { canLink } from '../../lib/twin'
import { useData } from '../../state/DataContext'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { KIND_ICON } from '../learning/kindIcon'
import { Sheet } from '../Sheet'
import { Jelly, Segmented } from '../ui'
import { Capture } from './Capture'
import { CoverPicker } from './CoverPicker'
import { MeasureRow } from './MeasureRow'
import { useLinkAutofill, type FillKey, type Filled } from './useLinkAutofill'

/**
 * Чем одна форма отличается в двух разделах. Не компонентом, а данными: книга
 * на полке — это материал вида «книга», у которого вид уже выбран.
 */
export interface ComposerVariant {
  /** Один вид — переключатель не рисуется. */
  kinds: readonly MaterialKind[]
  /** Одна шкала — переключатель шкалы не рисуется. */
  scales: readonly BookScale[]
}

/**
 * Поля карточки проявляются лесенкой, когда строка захвата раскрылась в неё.
 * При правке карточка открывается сразу, и лесенки нет: лист и так въезжает.
 */
const card: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.04 } },
}
const step: Variants = {
  hidden: { opacity: 0, transform: 'translateY(6px)' },
  shown: { opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] } },
}

/** Поле, которое растёт под текст: длинное название переносится, а не уезжает за край. */
function Grow({ value, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      {...rest}
      onKeyDown={(e) => {
        // Название и автор — одна строка по смыслу: Enter не ставит перенос.
        if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) e.preventDefault()
        rest.onKeyDown?.(e)
      }}
    />
  )
}

/** Подсветка пришедшего поля. Новый `key` — новая вспышка, поле не трогается. */
const Glow = ({ at }: { at?: number }) => (at ? <span key={at} className="fill-glow" aria-hidden /> : null)

/**
 * Композер — заведение и правка материала и книги.
 *
 * Два шага. Захват — одна строка «ссылка или название»: человек приносит то,
 * что у него есть, и не выбирает, что это. Карточка — то, что получится,
 * в том виде, в каком ляжет в список: обложка своего кадра, название крупно,
 * автор, и мелко ниже — то, чем меряется прогресс. Правка открывается сразу
 * карточкой.
 *
 * Форма знает только черновик и не знает, куда он уйдёт: это решают обёртки
 * `BookForm` и `MaterialForm`.
 */
export function Composer({
  title,
  initial,
  editing,
  variant,
  home,
  self,
  onSave,
  onDelete,
  onClose,
  linked,
}: {
  title: string
  initial: Draft
  editing: boolean
  variant: ComposerVariant
  /** Куда заводится: от этого зависит, что считать дублем, а что — копией. */
  home: Home
  /** Кто это, чтобы не найти в дублях себя. */
  self?: { bookId?: string; materialId?: string }
  /**
   * `false` — сохранение отменено (например, не подтвердили потерю отметок).
   * `copyOf` — запись в другом разделе, с которой заводится копия: обёртка
   * связывает с ней новую, когда это одна книга по страницам.
   */
  onSave: (draft: Draft, copyOf: Duplicate | null) => Promise<boolean | void>
  onDelete?: () => void
  onClose: () => void
  /**
   * Та же книга в другом разделе, связанная с этой (см. `src/lib/twin.ts`).
   * Показывается только при правке: страница записи о связи молчит, снимают
   * её отсюда.
   */
  linked?: { title: string; href: string; onUnlink: () => void } | null
}) {
  const { t } = useLocale()
  const { books } = useData()
  const { materials, streams } = useLearning()
  const reduce = useReducedMotion()

  const [draft, setDraft] = useState(initial)
  const [stage, setStage] = useState<'capture' | 'card'>(editing ? 'card' : 'capture')
  const [unfolded, setUnfolded] = useState(false)
  const [editUrl, setEditUrl] = useState(false)
  const [saving, setSaving] = useState(false)

  // Живая копия для чтения ссылки: между двумя заходами автозаполнения React
  // ещё не перерисовал, и черновик из замыкания был бы прежним.
  // `patch` — единственный путь, которым меняется черновик, и он держит эту
  // копию в такт состоянию.
  const live = useRef(draft)
  // Вид, зафиксированный вариантом или тронутый руками, догадке не уступает.
  // Ref — для чтения ссылки, которое идёт асинхронно и должно видеть
  // свежее значение; состояние — для отрисовки.
  const kindFixed = editing || variant.kinds.length === 1
  const kindTouched = useRef(kindFixed)
  const [kindChosen, setKindChosen] = useState(kindFixed)

  const patch = (p: Partial<Draft>) => {
    live.current = { ...live.current, ...p }
    setDraft(live.current)
  }

  // Что сейчас стоит в карточке догадкой по ссылке, а не рукой. Своя запись
  // (копия с полки) такие поля перекрывает, набранные — нет.
  const [guessed, setGuessed] = useState<ReadonlySet<string>>(() => new Set())
  const edit = (p: Partial<Draft>) => {
    patch(p)
    setGuessed((g) => {
      const next = new Set(g)
      for (const k of Object.keys(p)) next.delete(k)
      return next
    })
  }

  const fill = useLinkAutofill({
    current: () => live.current,
    apply: (p) => {
      patch(p)
      setGuessed((g) => new Set([...g, ...Object.keys(p)]))
    },
    kindTouched: () => kindTouched.current,
  })

  const unfold = () => {
    setUnfolded(true)
    setStage('card')
  }

  const onLink = (url: string) => {
    patch({ url })
    unfold()
    void fill.read(url)
  }

  const onPick = (c: BookCandidate) => {
    const p: Partial<Draft> = {
      title: c.title,
      author: c.author ?? '',
      cover: c.cover_url ?? '',
      pages: c.pages ? String(c.pages) : '',
      externalId: c.external_id,
      // Кандидат Open Library — всегда книга, даже если искали из потока.
      kind: 'book',
      scale: 'pages',
    }
    patch(p)
    fill.mark(Object.keys(p).filter((k) => p[k as keyof Draft]))
    unfold()
  }

  const world = { books, materials, streams }
  const ownSections = home.section === 'shelf' ? (['stream'] as const) : (['shelf', 'stream'] as const)

  const onOwn = (hit: OwnHit) => {
    patch(hit.data)
    fill.mark(Object.keys(hit.data))
    unfold()
  }

  const onManual = (name: string) => {
    if (name) patch({ title: name })
    unfold()
  }


  const { blocking, source } =
    stage === 'card'
      ? classifyDuplicates(findDuplicates(draft, world, self, !kindChosen), home)
      : { blocking: null, source: null }
  // Такая же запись там же — вторую не заводят. Сохранение закрыто, подсказка
  // ведёт к существующей.
  const canSave = !!draft.title.trim() && !saving && !blocking
  // Та же книга в другом разделе — заводят копию, и кнопка говорит это прямо.
  const copying = !editing && !!source
  // Карточка показывает то, что сохранится: у копии — с недостающим из
  // найденного и с его видом, если вид не выбирали руками.
  const view = copying && source ? withSource(draft, source.data, !kindChosen, guessed) : draft
  // Копия книги по страницам связывается с найденной, если та ещё ни с чем не
  // связана (так решают `BookForm` / `MaterialForm`): прогресс у них общий, и
  // подсказка не должна обещать свой.
  const willLink =
    copying &&
    !!source &&
    canLink(view) &&
    (source.where === 'stream'
      ? !materials.find((m) => m.id === source.id)?.book_id
      : !materials.some((m) => m.book_id === source.id))
  // Когда сохранить всё равно нельзя, терять нечего: закрытие не спрашивает.
  const dirty = !blocking && !sameDraft(draft, initial)
  const host = view.url.trim() ? sourceOf(view.url) : null

  // Строка захвата уходит из дерева вместе с фокусом; он переезжает в
  // название — первое, что стоит проверить в раскрывшейся карточке.
  const cardBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stage === 'card' && unfolded) cardBox.current?.querySelector<HTMLElement>('.compose-title')?.focus()
  }, [stage, unfolded])

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      // Копия забирает из найденного всё, чего нет в карточке: та же книга не
      // должна оказаться в материалах без обложки, которая есть на полке.
      const ready = copying && source ? withSource(live.current, source.data, !kindTouched.current, guessed) : live.current
      const done = await onSave(ready, copying ? source : null)
      if (done !== false) onClose()
    } finally {
      setSaving(false)
    }
  }

  const saveLabel = editing
    ? t('form.save')
    : !copying || !source
      ? t('compose.add')
      : home.section === 'shelf'
        ? t('compose.copyToShelf')
        : source.where === 'shelf' || source.data.kind === 'book'
          ? t('compose.copyToMaterials')
          : t('compose.copyToStream')
  // При правке копию не заводят: найденное в другом разделе — не повод для
  // плашки. Связь, если она есть, показывает своя.
  const found = blocking ?? (editing ? null : source)
  const filled: Filled = fill.filled
  const glow = (k: FillKey) => <Glow at={filled[k]} />

  return (
    <Sheet title={title} onClose={onClose} dirty={dirty} onSubmit={stage === 'card' ? () => void save() : undefined}>
      {stage === 'capture' ? (
        <Capture
          onLink={onLink}
          onPick={onPick}
          onManual={onManual}
          own={(q) => findOwn(q, world, ownSections, 4, home.section === 'stream' ? home.streamId : undefined)}
          onOwn={onOwn}
        />
      ) : (
        <motion.div
          ref={cardBox}
          className="compose-card"
          variants={card}
          initial={unfolded && !reduce ? 'hidden' : false}
          animate="shown"
        >
          {/* Строка источника. В неё перетекает строка захвата: ссылка,
              которую принесли, остаётся на виду как то, откуда всё взялось. */}
          <motion.div
            layoutId="compose-line"
            className="compose-line compose-source"
            transition={{ duration: 0.28, ease: [0.77, 0, 0.175, 1] }}
          >
            {editUrl ? (
              <input
                className="input"
                inputMode="url"
                placeholder={t('compose.linkPlaceholder')}
                aria-label={t('material.url')}
                value={draft.url}
                autoFocus
                onChange={(e) => patch({ url: e.target.value })}
                onBlur={() => setEditUrl(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault()
                    setEditUrl(false)
                    if (draft.url.trim()) void fill.read(draft.url)
                  }
                }}
              />
            ) : host ? (
              <>
                <a className="compose-host" href={view.url} target="_blank" rel="noreferrer">
                  <Icon name="link" size={15} />
                  {host}
                </a>
                <button type="button" className="link-btn" onClick={() => setEditUrl(true)}>
                  {t('compose.editLink')}
                </button>
              </>
            ) : (
              // Без ссылки карточка не начинается с пустого поля: ссылка здесь
              // — возможность, а не вопрос.
              <button type="button" className="link-btn compose-add-link" onClick={() => setEditUrl(true)}>
                <Icon name="link" size={15} />
                {t('compose.addLink')}
              </button>
            )}
            {(host || editUrl) && (
              <Jelly
                type="button"
                className={`btn ghost compose-wand${fill.reading ? ' busy' : ''}`}
                // Нажатие не должно сначала погасить поле ввода по blur.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setEditUrl(false)
                  void fill.read(draft.url)
                }}
                disabled={!draft.url.trim()}
                aria-label={t('material.fetch')}
                title={t('material.fetch')}
                aria-busy={fill.reading}
              >
                <Icon name="sparkles" size={18} />
              </Jelly>
            )}
          </motion.div>
          {fill.nothing && (
            <p className="small faint compose-note" role="status">
              {t('material.fetchNothing')}
            </p>
          )}

          {variant.kinds.length > 1 && (
            <motion.div variants={step}>
              <Segmented
                name={t('material.kind')}
                value={view.kind}
                options={variant.kinds.map((k) => ({ value: k, label: t(`kind.${k}`), icon: KIND_ICON[k] }))}
                onChange={(kind) => {
                  kindTouched.current = true
                  setKindChosen(true)
                  patch({ kind })
                }}
                className="wrap compose-kinds"
              />
            </motion.div>
          )}

          <motion.div variants={step} className="compose-main" data-kind={view.kind}>
            <CoverPicker
              title={view.title}
              kind={view.kind}
              url={view.url}
              cover={view.cover}
              onCover={(cover) => edit({ cover })}
              glow={filled.cover}
            />
            <div className="compose-text">
              <span className="compose-field">
                {glow('title')}
                <Grow
                  className="compose-title display"
                  value={draft.title}
                  placeholder={t('compose.titlePlaceholder')}
                  aria-label={t('material.title')}
                  data-autofocus
                  onChange={(e) => edit({ title: e.target.value })}
                />
              </span>
              <span className="compose-field">
                {glow('author')}
                <Grow
                  className="compose-author"
                  value={view.author}
                  placeholder={t('compose.authorPlaceholder')}
                  aria-label={t('material.author')}
                  onChange={(e) => edit({ author: e.target.value })}
                />
              </span>
              <MeasureRow
                draft={view}
                scales={variant.scales}
                onChange={edit}
                glow={glow('pages')}
              />
            </div>
          </motion.div>

          {/* Дубль — плашкой во всю ширину, а не строкой под автором: от него
              зависит, что сделает главная кнопка, и он должен читаться сразу. */}
          <AnimatePresence initial={false}>
            {found && (
              <motion.div
                key={`${found.where}-${found.id}`}
                className={`compose-dupe ${blocking ? 'blocking' : 'copy'}`}
                role="status"
                initial={{ opacity: 0, transform: 'translateY(4px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <Icon name={blocking ? 'circle-warning' : 'copy'} size={18} />
                <span className="compose-dupe-text">
                  <strong>
                    {blocking
                      ? blocking.where === 'shelf'
                        ? t('compose.blockShelf')
                        : t('compose.blockStream')
                      : found.where === 'shelf'
                        ? t('compose.onShelf')
                        : t('compose.inStream', { stream: found.stream ?? '' })}
                  </strong>
                  <span>
                    {blocking
                      ? t('compose.blockHint')
                      : willLink
                        ? t('compose.copyLinkedHint')
                        : t('compose.copyHint')}
                  </span>
                </span>
                <Link className="compose-dupe-open" to={found.href} onClick={onClose}>
                  {t('compose.open')}
                  <Icon name="arrow-up-right-md" size={15} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Связь — той же плашкой, что дубль: это тот же вопрос «эта книга есть
              и там», только уже решённый. Тихая подложка, а не лимонная: главная
              кнопка от неё не меняется. */}
          <AnimatePresence initial={false}>
            {editing && linked && (
              <motion.div
                key="linked"
                className="compose-dupe linked"
                initial={{ opacity: 0, transform: 'translateY(4px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <Icon name="link" size={18} />
                <span className="compose-dupe-text">
                  <strong>{linked.title}</strong>
                  <span>{t('compose.linkedHint')}</span>
                </span>
                <span className="compose-dupe-acts">
                  <Link className="compose-dupe-open" to={linked.href} onClick={onClose}>
                    {t('compose.open')}
                    <Icon name="arrow-up-right-md" size={15} />
                  </Link>
                  {/* Не красным: отвязка ничего не удаляет, записи остаются. */}
                  <button type="button" className="link-btn" onClick={linked.onUnlink}>
                    {t('compose.unlink')}
                  </button>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={step} layout="position" className="compose-foot">
            <span className="compose-foot-end">
              {onDelete && (
                <button className="link-btn danger" type="button" onClick={onDelete}>
                  {t('compose.delete')}
                </button>
              )}
              <Jelly className="btn" onClick={() => void save()} disabled={!canSave}>
                {saveLabel}
              </Jelly>
            </span>
          </motion.div>
        </motion.div>
      )}
    </Sheet>
  )
}
