import { useEffect, useRef, useState } from 'react'
import { mergeLinkMeta, metaIsEmpty } from '../lib/learning/autofill'
import { fetchLinkMeta, localMeta, sourceOf } from '../lib/learning/cover'
import { CoverRejected, fileToCover } from '../lib/learning/imageCover'
import { hasParts, partWord, partsOf, planParts } from '../lib/learning/parts'
import {
  BOOK_SCALES,
  KINDS,
  type BookScale,
  type Material,
  type MaterialKind,
  type MaterialStatus,
} from '../lib/learning/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { Field, FormStack, Jelly, Segmented } from './ui'

/** Корзины бэклога. «Пройдено» и «брошено» при заведении смысла не имеют. */
const OPEN_STATUSES: MaterialStatus[] = ['inbox', 'active', 'someday', 'reference']
const ALL_STATUSES: MaterialStatus[] = [...OPEN_STATUSES, 'done', 'dropped']

const digits = (v: string) => v.replace(/\D/g, '')
const num = (v: string) => (v.trim() ? Number(v) : null)

/**
 * Заведение и правка материала.
 *
 * Порядок полей — не оформление, а логика: вид стоит первым, потому что он
 * решает, какие поля ниже вообще существуют; ссылка второй, потому что умеет
 * заполнить всё остальное. Дальше показывается только то, что этому виду
 * нужно: у статьи нет ни глав, ни страниц, и спрашивать о них нечего.
 */
export function MaterialForm({
  streamId,
  material,
  onClose,
}: {
  streamId: string
  material?: Material
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addMaterial, updateMaterial, deleteMaterial, addPart, deletePart, materials, parts } =
    useLearning()

  const mine = material ? partsOf(parts, material.id) : []

  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? 'article')
  const [kindTouched, setKindTouched] = useState(material !== undefined)
  const [url, setUrl] = useState(material?.url ?? '')
  const [title, setTitle] = useState(material?.title ?? '')
  const [author, setAuthor] = useState(material?.author ?? '')
  const [cover, setCover] = useState(material?.cover_url ?? '')
  const [scale, setScale] = useState<BookScale>(material?.scale ?? 'pages')
  const [pages, setPages] = useState(material?.pages_total ? String(material.pages_total) : '')
  const [count, setCount] = useState(mine.length ? String(mine.length) : '')
  const [status, setStatus] = useState<MaterialStatus>(material?.status ?? 'inbox')

  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const trip = useRef<AbortController | null>(null)

  // Запрос наружу не должен пережить форму: ответ пришёл бы в размонтированный
  // компонент, а адрес материала к тому моменту уже незачем было отдавать.
  useEffect(() => () => trip.current?.abort(), [])

  const shape = { kind, scale: kind === 'book' ? scale : null }
  const withParts = hasParts(shape)
  const word = partWord(kind)

  const pickKind = (k: MaterialKind) => {
    setKind(k)
    setKindTouched(true)
  }

  /**
   * Звёздочка. Сначала то, что видно из самой ссылки, — домен, вид, превью
   * ролика; это бесплатно и мгновенно. Потом сеть. Заполняется только пустое.
   */
  async function readLink() {
    const address = url.trim()
    if (!address) return
    trip.current?.abort()
    const ctl = new AbortController()
    trip.current = ctl

    setReading(true)
    setNote(null)

    // Своя копия полей, а не состояние компонента: по ссылке заполняют дважды
    // — сначала тем, что видно из самой ссылки, потом ответом сети, — а между
    // этими двумя вызовами React ещё не перерисовал, и состояние в замыкании
    // осталось бы прежним. Второй заход тогда считал бы пустым поле, которое
    // первый уже заполнил, и затирал бы его.
    let shown = { title, author, cover, kind }
    const apply = (meta: Parameters<typeof mergeLinkMeta>[1]) => {
      const patch = mergeLinkMeta(shown, meta, kindTouched)
      shown = { ...shown, ...patch }
      if (patch.title !== undefined) setTitle(patch.title)
      if (patch.author !== undefined) setAuthor(patch.author)
      if (patch.cover !== undefined) setCover(patch.cover)
      if (patch.kind !== undefined) setKind(patch.kind)
    }

    apply(localMeta(address))
    try {
      const meta = await fetchLinkMeta(address, ctl.signal)
      if (ctl.signal.aborted) return
      apply(meta)
      if (metaIsEmpty(meta)) setNote(t('material.fetchNothing'))
    } finally {
      if (!ctl.signal.aborted) setReading(false)
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      setCover(await fileToCover(file))
    } catch (e) {
      const reason = e instanceof CoverRejected ? e.reason : 'broken'
      setError(
        t(
          reason === 'type'
            ? 'material.coverBadType'
            : reason === 'tooBig'
              ? 'material.coverTooBig'
              : 'material.coverBroken',
        ),
      )
    }
  }

  async function save() {
    if (!title.trim()) {
      setError(t('form.titleRequired'))
      return
    }

    // План частей считается до записи: он же отвечает на вопрос, нужно ли
    // спрашивать подтверждение, — а спрашивать после удаления поздно.
    const plan = withParts ? planParts(mine, Number(count) || 0) : null
    if (plan?.losesDone && !confirm(t('part.confirmDrop'))) return

    setBusy(true)
    const fields = {
      title: title.trim(),
      kind,
      author: author.trim() || null,
      url: url.trim() || null,
      cover_url: cover.trim() || null,
      status,
      scale: kind === 'book' ? scale : null,
      pages_total: kind === 'book' && scale === 'pages' ? num(pages) : null,
      // Текущая страница живёт на странице материала: она меняется каждый раз,
      // а всё здешнее — один раз.
      page_current: kind === 'book' && scale === 'pages' ? (material?.page_current ?? null) : null,
    }

    const saved = material
      ? (await updateMaterial(material.id, fields), material.id)
      : (await addMaterial({ ...fields, stream_id: streamId, sort: materials.length }))?.id

    if (saved && plan) {
      for (const id of plan.remove) await deletePart(id)
      // Имени нет намеренно: безымянная часть зовётся своим номером по порядку.
      for (const p of plan.add) await addPart({ material_id: saved, title: '', done: false, sort: p.sort })
    }

    setBusy(false)
    onClose()
  }

  async function remove() {
    if (!material || !confirm(t('material.confirmDelete'))) return
    await deleteMaterial(material.id)
    onClose()
  }

  const host = url.trim() ? sourceOf(url) : null
  const statuses = material ? ALL_STATUSES : OPEN_STATUSES

  return (
    <Sheet title={material ? t('material.edit') : t('learning.newMaterial')} onClose={onClose}>
      <FormStack>
        {/* Подписи над видом нет намеренно: четыре слова объясняют себя сами,
            а лишняя строка отодвигает вниз первое настоящее поле. */}
        <Segmented
          name={t('material.kind')}
          value={kind}
          options={KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
          onChange={pickKind}
        />

        <Field label={t('material.url')} hint={note ?? host ?? t('material.fetchHint')}>
          <div className="row-tight">
            <input
              className="input"
              value={url}
              inputMode="url"
              placeholder="https://…"
              onChange={(e) => setUrl(e.target.value)}
            />
            <Jelly
              type="button"
              className="btn ghost icon-btn"
              onClick={() => void readLink()}
              disabled={reading || !url.trim()}
              aria-label={t('material.fetch')}
              title={t('material.fetch')}
            >
              <Icon name="sparkles" size={18} />
            </Jelly>
          </div>
        </Field>

        <Field label={t('material.title')}>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label={t('material.author')}>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>

        {kind === 'book' && (
          <Field label={t('material.scale')} group>
            <Segmented
              name={t('material.scale')}
              value={scale}
              options={BOOK_SCALES.map((s) => ({ value: s, label: t(`scale.${s}`) }))}
              onChange={setScale}
              className="sm"
            />
          </Field>
        )}

        {kind === 'book' && scale === 'pages' && (
          <Field label={t('material.pagesTotal')}>
            <input
              className="input"
              inputMode="numeric"
              value={pages}
              onChange={(e) => setPages(digits(e.target.value))}
            />
          </Field>
        )}

        {withParts && (
          <Field
            label={t(word === 'lecture' ? 'material.lecturesTotal' : 'material.chaptersTotal')}
            hint={t('material.partsHint')}
          >
            <input
              className="input"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(digits(e.target.value))}
            />
          </Field>
        )}

        <Field label={t('material.cover')} group>
          <div className="cover-pick">
            <span className="cover-pick-art" aria-hidden>
              {cover ? <img src={cover} alt="" /> : <Icon name="bulb" size={18} />}
            </span>
            <span className="row-tight">
              <label className="btn ghost sm">
                {t('material.coverUpload')}
                <input
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  onChange={(e) => void pickFile(e.target.files?.[0])}
                />
              </label>
              {cover && (
                <button className="link-btn" type="button" onClick={() => setCover('')}>
                  {t('material.coverClear')}
                </button>
              )}
            </span>
          </div>
        </Field>

        <Field label={t('material.status')} group>
          <Segmented
            name={t('material.status')}
            value={status}
            options={statuses.map((s) => ({ value: s, label: t(`mstatus.${s}`) }))}
            onChange={setStatus}
            className={material ? 'sm wrap' : 'sm'}
          />
        </Field>

        {error && <div className="error">{error}</div>}

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
      </FormStack>
    </Sheet>
  )
}
