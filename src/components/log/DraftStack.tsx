import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { listItem } from '../ui'

/** Черновик мысли или конспекта в листе. `id` — у уже сохранённого. */
export interface Draft {
  key: string
  id?: string
  /** Убран крестиком. Удаляется по «Сохранить», до тех пор его можно вернуть. */
  removed?: boolean
}

/**
 * Стопка написанного в листе: ноль, одна или сколько угодно карточек.
 *
 * Карточка — та же бумага, на которой мысль потом лежит в дневнике: лист
 * показывает, что получится, а не анкету. Поэтому и тег красит её сразу, а
 * не после сохранения.
 *
 * Убранная карточка не исчезает молча: на её месте строка «Убрано · Вернуть»,
 * пока лист открыт. Набранный текст — то, что жалко потерять от промаха, и
 * подтверждения тут хуже, чем возврат: они спрашивают каждый раз, а промах
 * случается редко.
 */
export function DraftStack<T extends Draft>({
  drafts,
  onDrafts,
  make,
  render,
  tagOf,
  isBlank,
  addLabel,
  paper = 'thought-card flat',
}: {
  drafts: T[]
  onDrafts: (next: T[]) => void
  /** Новая пустая карточка. */
  make: () => T
  /** Содержимое карточки. `fresh` — только что добавлена: курсор в неё. */
  render: (draft: T, patch: (p: Partial<T>) => void, fresh: boolean) => ReactNode
  tagOf?: (draft: T) => string | undefined
  /** Ничего не написано — убирается без «Вернуть». */
  isBlank: (draft: T) => boolean
  /** Подпись «+ мысль». Нет — дописывать нельзя: правится одна запись. */
  addLabel?: string
  /** Бумага карточки — та же, на которой запись ляжет в ленту: записка
      мысли или лист конспекта. */
  paper?: string
}) {
  const { t } = useLocale()
  const [fresh, setFresh] = useState<string | null>(null)

  const patch = (key: string) => (p: Partial<T>) =>
    onDrafts(drafts.map((d) => (d.key === key ? { ...d, ...p } : d)))

  // Несохранённую и ненаписанную убирать некуда возвращать — она уходит сразу.
  const drop = (d: T) =>
    onDrafts(
      !d.id && isBlank(d)
        ? drafts.filter((x) => x.key !== d.key)
        : drafts.map((x) => (x.key === d.key ? { ...x, removed: true } : x)),
    )

  return (
    <div className="draft-stack">
      <AnimatePresence initial={false}>
        {drafts.map((d) =>
          d.removed ? (
            <motion.p key={d.key} className="draft-gone small" layout="position" {...listItem}>
              <span className="faint">{t('draft.removed')}</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => patch(d.key)({ removed: false } as Partial<T>)}
              >
                {t('draft.undo')}
              </button>
            </motion.p>
          ) : (
            <motion.div
              key={d.key}
              className={`${paper} draft-card`}
              data-tag={tagOf?.(d)}
              layout="position"
              {...listItem}
            >
              {render(d, patch(d.key), d.key === fresh)}
              <button
                type="button"
                className="icon-btn draft-drop"
                aria-label={t('session.removeNote')}
                title={t('session.removeNote')}
                onClick={() => drop(d)}
              >
                <Icon name="close-md" size={16} />
              </button>
            </motion.div>
          ),
        )}
      </AnimatePresence>

      {addLabel && (
      <button
        type="button"
        className="link-btn draft-add"
        onClick={() => {
          const next = make()
          setFresh(next.key)
          onDrafts([...drafts, next])
        }}
      >
        <Icon name="plus" size={15} />
        {addLabel}
      </button>
      )}
    </div>
  )
}
