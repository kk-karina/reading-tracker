import { useState } from 'react'
import { parseTitles, planNames } from '../../lib/learning/parts'
import type { Material, MaterialPart } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { Sheet } from '../Sheet'
import { Field, FormStack, Jelly } from '../ui'

/**
 * Имена частей списком.
 *
 * Переименовать можно и по одной, прямо в списке, — но у курса их тридцать, и
 * тридцать раз навести, кликнуть и набрать это не работа, а отказ от неё.
 * Программа курса при этом уже существует готовым списком на чужой странице:
 * лист принимает её как есть, вместе с нумерацией и пустыми строками.
 *
 * Лишние части лист не удаляет, даже когда имён меньше: «имён не хватило» —
 * это про список имён, а не про то, что лекций стало меньше, и терять на
 * такой догадке чужие отметки нельзя. Число частей меняют в форме материала,
 * где за это спрашивают подтверждение.
 */
export function PartNames({
  material,
  parts,
  word,
  onClose,
}: {
  material: Material
  /** Части этого материала, уже по порядку. */
  parts: MaterialPart[]
  word: 'chapter' | 'lecture'
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addPart, updatePart } = useLearning()

  // Поле открывается тем, что уже есть: список имён правят, а не набирают с
  // нуля, и пустое поле выглядело бы как «всё сотрут». Безымянная часть
  // открывается пустой строкой и такой же пустой сохраняется, то есть
  // остаётся при своём номере.
  const [text, setText] = useState(() => parts.map((p) => p.title.trim()).join('\n'))
  const [busy, setBusy] = useState(false)

  const titles = parseTitles(text)

  const save = async () => {
    setBusy(true)
    const plan = planNames(parts, titles)
    for (const r of plan.rename) await updatePart(r.id, { title: r.title })
    for (const a of plan.add)
      await addPart({ material_id: material.id, title: a.title, done: false, sort: a.sort })
    setBusy(false)
    onClose()
  }

  return (
    <Sheet title={t('part.names')} onClose={onClose}>
      <FormStack>
        <Field
          label={t(word === 'lecture' ? 'part.lectures' : 'part.chapters')}
          hint={t(word === 'lecture' ? 'part.namesLectures' : 'part.namesChapters')}
        >
          <textarea
            className="textarea"
            rows={12}
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
          />
        </Field>

        {/* Счёт под полем, а не после сохранения: «31 имя на 30 лекций»
            решается здесь, пока список ещё перед глазами. Когда имён больше,
            строка говорит не про расхождение, а про последствие. */}
        <p className="small faint">
          {titles.length > parts.length
            ? t('part.namesGrow', { n: titles.length - parts.length, total: titles.length })
            : t('part.namesCount', { n: titles.length, have: parts.length })}
        </p>

        <div className="row-tight" style={{ alignSelf: 'flex-start' }}>
          <Jelly className="btn" onClick={() => void save()} disabled={busy}>
            {t('form.save')}
          </Jelly>
        </div>
      </FormStack>
    </Sheet>
  )
}
