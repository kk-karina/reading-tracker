import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../state/LocaleContext'
import { Icon } from './Icon'

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
  dirty,
  onSubmit,
  bare,
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
  /**
   * Есть ли в листе набранное, что пропадёт при закрытии.
   *
   * Тогда Esc и щелчок мимо листа не закрывают его молча: лист вздрагивает и
   * спрашивает в шапке. Вопрос стоит в шапке, а не окном поверх окна, — он
   * не мешает продолжить, и второй Esc его подтверждает: дважды нажатая
   * клавиша — уже решение, а не промах.
   */
  dirty?: boolean
  /** ⌘↵ / Ctrl+↵ где угодно в листе. Без него сочетание ничего не делает. */
  onSubmit?: () => void
  /**
   * Без своей белой рамки и шапки: содержимое само бумага — лист конспекта
   * поверх экрана. Иначе выходила бы бумага в рамке на подложке, двойная
   * подложка. Полоса крестика остаётся и встаёт в угол самой бумаги.
   */
  bare?: boolean
  children: ReactNode
}) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [asking, setAsking] = useState(false)
  // Читается один раз, при открытии: эффект ниже нарочно не перезапускается.
  const readOnOpen = useRef(bare)

  // Вопрос снимается, как только форма снова чистая: спрашивать о том, чего
  // уже нет, — врать. Считается здесь же, при отрисовке, а не эффектом.
  if (asking && !dirty) setAsking(false)

  const close = () => {
    if (!dirty || asking) {
      onClose()
      return
    }
    setAsking(true)
    // Вздрагивание — «нет» без слов, головой. WAAPI, а не motion: входная
    // пружина листа владеет его transform, а эта короткая дрожь ложится
    // поверх и по окончании отдаёт transform обратно.
    if (!reduce)
      box.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-7px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      )
  }

  // Клавиши читают свежие значения, но не перезапускают эффект ниже: он
  // ставит фокус на первое поле, и перезапуск при каждом нажатии в форме
  // уводил бы курсор из поля, в котором печатают.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close()
      return
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
      e.preventDefault()
      onSubmit()
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
  })

  useEffect(() => {
    // Кто открыл лист, тот и получит фокус назад. Читается до переноса фокуса.
    const opener = document.activeElement as HTMLElement | null

    // Фокус — в первое поле содержимого, а не на крестик в шапке: лист
    // открывают, чтобы в нём что-то написать. Форма может назвать поле сама.
    const all = [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    // Лист для чтения открывают читать, а не жать первую попавшуюся кнопку:
    // фокус встаёт на сам лист, и стрелки листания не горят обводкой с
    // порога. Esc, Tab и стрелки работают как обычно.
    const first = readOnOpen.current
      ? box.current
      : (box.current?.querySelector<HTMLElement>('[data-autofocus]') ??
        all.find((el) => !el.closest('.sheet-head, .sheet-bar')) ??
        all[0])
    first?.focus()

    // Обёртка, а не само событие эффекта: React требует звать его отсюда.
    const listen = (e: KeyboardEvent) => onKey(e)
    document.addEventListener('keydown', listen)

    // Прежнее значение возвращается, а не затирается пустым: страница могла
    // быть заперта чем-то ещё.
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', listen)
      document.body.style.overflow = scroll
      opener?.focus?.()
    }
  }, [])

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="sheet-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => close()}
      >
        <motion.div
          ref={box}
          className={`sheet${bare ? ' sheet-bare' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={bare ? -1 : undefined}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Крестик и вопрос «закрыть без сохранения» — своей полосой над
              содержимым, а не в одной строке с заголовком. В одной строке
              вопрос отнимал у заголовка ширину: длинное название книги
              переносилось ещё на строку, и лист прыгал по высоте ровно в тот
              момент, когда его пытаются закрыть. Полоса есть всегда, и вопрос
              появляется в ней, ничего под собой не сдвигая. */}
          <div className="sheet-bar">
            <AnimatePresence>
              {asking && (
                <motion.span
                  className="sheet-unsaved small"
                  role="status"
                  initial={{ opacity: 0, transform: 'translateX(6px)' }}
                  animate={{ opacity: 1, transform: 'translateX(0px)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  <span className="muted">{t('sheet.unsaved')}</span>
                  <button type="button" className="link-btn danger" onClick={onClose}>
                    {t('sheet.discard')}
                  </button>
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="button"
              className="icon-btn sheet-close"
              onClick={() => close()}
              aria-label={t('sheet.close')}
              title={t('sheet.close')}
            >
              <Icon name="close-md" size={20} />
            </button>
          </div>
          {!bare && (
            <div className="sheet-head">{head ?? <h2 className="display sheet-title">{title}</h2>}</div>
          )}
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
