import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../state/LocaleContext'

/** Что внутри листа умеет принимать фокус. Порядок — как в разметке. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Панель поверх страницы.
 *
 * Живёт в `document.body`, а не там, где её открыли. Лист с дашборда потока
 * рендерился внутри тёмной подложки: оттуда он наследовал белый текст, а его
 * `z-index` запирался в стакающем контексте подложки — и панель уезжала под
 * липкую верхнюю полосу. Портал снимает оба следствия разом.
 *
 * Модальность здесь не декларация, а поведение. Раньше стояли `role="dialog"`
 * и `aria-modal`, но ни фокуса, ни скролла лист не держал: Tab уводил на
 * ссылки под шимой, страница за ней продолжала ехать, а после закрытия фокус
 * оказывался в начале документа. Атрибут обещал модальное окно, которого не
 * было, — для клавиатуры и экранного диктора это хуже, чем честная панель.
 */
export function Sheet({
  title,
  head,
  onClose,
  children,
}: {
  title: string
  /**
   * Чем заменить заголовок, когда лист открыт про конкретный предмет.
   *
   * `title` при этом не исчезает, а уходит в `aria-label`: слово «Записать
   * занятие» на экране не нужно — ты и так знаешь, что нажала, — но без него
   * панель становится для экранного диктора безымянной.
   */
  head?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Кто открыл лист, тот и получит фокус назад. Читается до переноса фокуса.
    const opener = document.activeElement as HTMLElement | null

    const first = box.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !box.current) return

      const stops = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (stops.length === 0) return
      const edge = e.shiftKey ? stops[0] : stops[stops.length - 1]
      // За край не уходим: фокус заворачивается на противоположный конец.
      // Проверка на `activeElement` нужна и для случая, когда фокус успел
      // оказаться вне листа, — тогда Tab возвращает его внутрь.
      if (document.activeElement === edge || !box.current.contains(document.activeElement)) {
        e.preventDefault()
        ;(e.shiftKey ? stops[stops.length - 1] : stops[0]).focus()
      }
    }

    document.addEventListener('keydown', onKey)

    // Прежнее значение возвращается, а не затирается пустым: страница могла
    // быть заперта чем-то ещё.
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = scroll
      opener?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="sheet-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={box}
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sheet-head">
            {head ?? <h2 className="display sheet-title">{title}</h2>}
            <button className="btn ghost sm" onClick={onClose}>
              {t('form.cancel')}
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
