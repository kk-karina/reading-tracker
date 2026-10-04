import { useEffect, useEffectEvent, useState } from 'react'
import { CoverRejected, fileToCover } from '../../lib/compose/imageCover'
import { parseUrl } from '../../lib/compose/linkMeta'
import type { MaterialKind } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { MaterialCover } from '../learning/MaterialCover'
import { Tip } from '../ui'

/** Адрес похож на картинку: по нему вставленная строка — обложка, а не ссылка на материал. */
const IMAGE_URL = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && !['checkbox', 'radio', 'file', 'button'].includes(el.type))

/**
 * Обложка в форме — главное в карточке, а не значок в хвосте.
 *
 * Кадр своего вида: книга стоит, остальное лежит. Пустой кадр рисует ту же
 * обложку, что увидишь в списке, — цвет по названию, значок вида, — так что
 * карточка не выглядит дырой, пока картинки нет.
 *
 * Картинку можно дать четырьмя способами, и все четыре — один жест «вот она»:
 * файл, адрес, перетащить на кадр, вставить из буфера. Файл ужимается под
 * кадр (`fileToCover`), адрес хранится адресом.
 */
export function CoverPicker({
  title,
  kind,
  url,
  cover,
  onCover,
  glow,
}: {
  title: string
  kind: MaterialKind
  url: string
  cover: string
  onCover: (cover: string) => void
  /** Число из `Filled`: новое — обложка пришла по ссылке и проявляется. */
  glow?: number
}) {
  const { t } = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [byUrl, setByUrl] = useState(false)
  const [address, setAddress] = useState('')
  const [over, setOver] = useState(false)

  async function take(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      onCover(await fileToCover(file, kind))
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
  // ⌘V, пока лист открыт. Картинка из буфера берётся откуда угодно — в текстовое
  // поле её всё равно не вставить. Строка-адрес картинки — только когда фокус не
  // в поле: там вставка значит «впиши сюда», и перехватывать её нельзя.
  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    const data = e.clipboardData
    if (!data) return
    const file = [...data.files].find((f) => f.type.startsWith('image/'))
    if (file) {
      e.preventDefault()
      void take(file)
      return
    }
    if (isTextField(e.target)) return
    const text = data.getData('text/plain').trim()
    if (IMAGE_URL.test(text) && parseUrl(text)) {
      e.preventDefault()
      setError(null)
      onCover(text)
    }
  })
  useEffect(() => {
    const listen = (e: ClipboardEvent) => onPaste(e)
    document.addEventListener('paste', listen)
    return () => document.removeEventListener('paste', listen)
  }, [])

  const applyAddress = () => {
    const a = address.trim()
    if (a && parseUrl(a)) {
      setError(null)
      onCover(a)
      setAddress('')
      setByUrl(false)
    }
  }

  return (
    <div className="compose-cover">
      <div
        className={`compose-cover-frame${over ? ' over' : ''}`}
        onDragOver={(e) => {
          if (![...e.dataTransfer.types].includes('Files')) return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void take(e.dataTransfer.files[0])
        }}
      >
        {/* key по адресу: у обложки своя память о сломанной картинке, и новая
            картинка должна получить новую попытку и новое проявление. */}
        <MaterialCover
          key={`${cover}-${glow ?? 0}`}
          material={{ title: title || t('compose.untitled'), kind, url: url || null, cover_url: cover || null }}
          size="lg"
          className={glow ? 'arrived' : ''}
        />
      </div>

      {/* Три действия значками, а не словами: под обложкой узкая колонка, и
          слова в ней складывались в груду. Слово не пропало — оно в подсказке
          и в `aria-label`. */}
      <div className="compose-cover-acts">
        <Tip text={t('compose.coverFile')}>
          <label className="icon-act" aria-label={t('compose.coverFile')}>
            <Icon name="cloud-upload" size={17} />
            <input
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={(e) => {
                void take(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </Tip>
        <Tip text={t('compose.coverUrl')}>
          <button
            type="button"
            className={`icon-act${byUrl ? ' on' : ''}`}
            onClick={() => setByUrl((v) => !v)}
            aria-label={t('compose.coverUrl')}
            aria-expanded={byUrl}
          >
            <Icon name="link" size={17} />
          </button>
        </Tip>
        {cover && (
          <Tip text={t('compose.coverClear')}>
            <button
              type="button"
              className="icon-act danger"
              onClick={() => onCover('')}
              aria-label={t('compose.coverClear')}
            >
              <Icon name="trash" size={17} />
            </button>
          </Tip>
        )}
      </div>

      {byUrl && (
        <input
          className="input compose-cover-url"
          inputMode="url"
          placeholder={t('compose.coverUrlPlaceholder')}
          aria-label={t('compose.coverUrl')}
          value={address}
          autoFocus
          onChange={(e) => setAddress(e.target.value)}
          onBlur={applyAddress}
          onKeyDown={(e) => {
            // Esc закрывает поле адреса, а не весь лист.
            if (e.key === 'Escape') {
              e.stopPropagation()
              setByUrl(false)
              return
            }
            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              applyAddress()
            }
          }}
        />
      )}
      {error && <div className="error">{error}</div>}
    </div>
  )
}
