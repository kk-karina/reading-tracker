import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { partLabel, partState, parseTitles, planNames } from '../../lib/learning/parts'
import type { Material, MaterialPart } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Sheet } from '../Sheet'
import { Field, FormStack, Jelly, listItem } from '../ui'

/**
 * Главы или лекции материала — листом поверх его страницы.
 *
 * Здесь всё, что раньше жило во вкладке «Главы»: список частей с отметкой и
 * именем, добавить часть, убрать лишнюю. Имя правится прямо в строке и
 * пишется, когда уходишь из поля, — как правят название в списке, а не форму.
 *
 * Вставка оглавления — вторым режимом того же листа. Первым она быть не
 * может: у курса из двенадцати безымянных лекций поле для вставки было
 * пустой коробкой без единой подсказки, какая лекция какая. Сразу на вставке
 * лист открывается, только когда частей ещё нет — тогда вставлять и нужно.
 *
 * Лишние части вставка не удаляет, даже когда имён меньше: «имён не хватило» —
 * это про список имён, а не про то, что лекций стало меньше.
 */
export function PartNames({
  material,
  parts,
  started,
  word,
  onClose,
}: {
  material: Material
  /** Части этого материала, уже по порядку. */
  parts: MaterialPart[]
  /** По каким частям уже написано: точка такой части «начата». */
  started: ReadonlySet<string>
  word: 'chapter' | 'lecture'
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addPart, updatePart, deletePart } = useLearning()
  const [pasting, setPasting] = useState(parts.length === 0)
  const [fresh, setFresh] = useState<string | null>(null)

  const label = (part: MaterialPart, i: number) =>
    partLabel(part, i, (n) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n }))
  const title = t(word === 'lecture' ? 'part.lectures' : 'part.chapters')

  const add = async () => {
    const made = await addPart({ material_id: material.id, title: '', done: false, sort: parts.length })
    if (made) setFresh(made.id)
  }

  if (pasting) {
    return (
      <PasteTitles
        material={material}
        parts={parts}
        word={word}
        title={title}
        onBack={parts.length > 0 ? () => setPasting(false) : undefined}
        onClose={onClose}
      />
    )
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <ul className="parts-list">
        <AnimatePresence initial={false}>
          {parts.map((part, i) => {
            const state = partState(part, started)
            return (
              <motion.li key={part.id} className="parts-row" layout="position" {...listItem}>
                <button
                  type="button"
                  className={`dot ${state} parts-dot`}
                  aria-pressed={part.done}
                  aria-label={`${label(part, i)} — ${t(`part.state.${state}`)}`}
                  title={t(`part.state.${state}`)}
                  onClick={() => void updatePart(part.id, { done: !part.done })}
                >
                  <span className="dot-fill" aria-hidden />
                </button>
                <span className="parts-num mono">{i + 1}</span>
                {/* Пустое имя остаётся пустым — тогда часть зовётся своим
                    номером. Enter — то же, что уход из поля; Esc возвращает
                    прежнее имя: набранное ещё никуда не записано. */}
                <input
                  className="parts-name"
                  defaultValue={part.title}
                  placeholder={label({ ...part, title: '' }, i)}
                  aria-label={t('part.renameOne', { name: label(part, i) })}
                  autoFocus={part.id === fresh}
                  onBlur={(e) => {
                    if (e.target.value !== part.title) void updatePart(part.id, { title: e.target.value })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      e.currentTarget.value = part.title
                      e.currentTarget.blur()
                    }
                  }}
                />
                <button
                  type="button"
                  className="icon-btn parts-remove"
                  aria-label={t('part.removeOne', { name: label(part, i) })}
                  title={t('part.removeOne', { name: label(part, i) })}
                  onClick={() => void deletePart(part.id)}
                >
                  <Icon name="close-md" size={15} />
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <div className="parts-foot">
        <button type="button" className="link-btn draft-add" onClick={() => void add()}>
          <Icon name="plus" size={15} />
          {t(word === 'lecture' ? 'part.addLecture' : 'part.addChapter')}
        </button>
        <button type="button" className="link-btn" onClick={() => setPasting(true)}>
          {t('part.paste')}
        </button>
      </div>
    </Sheet>
  )
}

/** Вставка оглавления: по строке на часть, сверху вниз. */
function PasteTitles({
  material,
  parts,
  word,
  title,
  onBack,
  onClose,
}: {
  material: Material
  parts: MaterialPart[]
  word: 'chapter' | 'lecture'
  title: string
  /** Назад к списку. Нет — частей ещё нет, и вставка и есть весь лист. */
  onBack?: () => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addPart, updatePart } = useLearning()

  // Поле открывается тем, что уже есть: список имён правят, а не набирают с
  // нуля. Безымянная часть открывается пустой строкой и такой же пустой
  // сохраняется, то есть остаётся при своём номере. Если не названо ничего,
  // поле пустое и показывает пример: столбик пустых строк выглядел как
  // ошибка, а не как приглашение вставить оглавление.
  const initial = parts.some((p) => p.title.trim())
    ? parts.map((p) => p.title.trim()).join('\n')
    : ''
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const titles = parseTitles(text)

  const save = async () => {
    setBusy(true)
    const plan = planNames(parts, titles)
    for (const r of plan.rename) await updatePart(r.id, { title: r.title })
    for (const a of plan.add)
      await addPart({ material_id: material.id, title: a.title, done: false, sort: a.sort })
    setBusy(false)
    if (onBack) onBack()
    else onClose()
  }

  return (
    <Sheet title={title} onClose={onClose} dirty={text !== initial}>
      <FormStack>
        <Field
          label={t('part.paste')}
          hint={t(word === 'lecture' ? 'part.namesLectures' : 'part.namesChapters')}
        >
          <textarea
            className="textarea"
            rows={10}
            value={text}
            autoFocus
            placeholder={t(word === 'lecture' ? 'part.pastePlaceholderLectures' : 'part.pastePlaceholderChapters')}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>

        {/* Счёт под полем, а не после сохранения: «31 имя на 30 лекций»
            решается здесь, пока список ещё перед глазами. */}
        <p className="small faint">
          {titles.length > parts.length
            ? t('part.namesGrow', { n: titles.length - parts.length, total: titles.length })
            : t('part.namesCount', { n: titles.length, have: parts.length })}
        </p>

        <div className="sheet-foot">
          {onBack && (
            <button type="button" className="link-btn back-link" onClick={onBack}>
              {t('part.backToList')}
            </button>
          )}
          <Jelly className="btn" onClick={() => void save()} disabled={busy}>
            {t('form.save')}
          </Jelly>
        </div>
      </FormStack>
    </Sheet>
  )
}
