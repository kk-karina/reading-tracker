import { draftToMaterial, materialToDraft } from '../lib/compose/draft'
import { hasParts, partsOf, planParts } from '../lib/learning/parts'
import { BOOK_SCALES, KINDS, type Material } from '../lib/learning/types'
import { canLink } from '../lib/twin'
import { useData } from '../state/DataContext'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { useSessionWrites } from '../state/useSessionWrites'
import { Composer, type ComposerVariant } from './compose/Composer'

const STREAM: ComposerVariant = { kinds: KINDS, scales: BOOK_SCALES }

/**
 * Материал в потоке — композер со всеми четырьмя видами.
 *
 * Своё здесь — только сохранение: части живут отдельной коллекцией, и их
 * план считается до записи — он же отвечает, нужно ли спрашивать
 * подтверждение, а спрашивать после удаления поздно.
 */
export function MaterialForm({
  streamId,
  material,
  onClose,
  onDeleted,
}: {
  streamId: string
  material?: Material
  onClose: () => void
  /** Куда уйти после удаления: страницы удалённого материала больше нет. */
  onDeleted?: () => void
}) {
  const { t } = useLocale()
  const { addMaterial, updateMaterial, deleteMaterial, addPart, deletePart, materials, parts } =
    useLearning()

  const { books } = useData()
  const writes = useSessionWrites()
  const shelfBook = material ? writes.bookOf(material) : null

  const mine = material ? partsOf(parts, material.id) : []

  return (
    <Composer
      title={material ? t('material.edit') : t('learning.newMaterial')}
      initial={materialToDraft(material, mine.length)}
      editing={!!material}
      variant={STREAM}
      home={{ section: 'stream', streamId }}
      self={{ materialId: material?.id }}
      onClose={onClose}
      linked={
        material &&
        shelfBook && {
          title: t('compose.linkedShelf'),
          href: `/reading/book/${shelfBook.id}`,
          onUnlink: () => {
            if (confirm(t('compose.confirmUnlink'))) void writes.unlink(material)
          },
        }
      }
      onSave={async (draft, copyOf) => {
        const fields = draftToMaterial(draft, material)
        const plan = hasParts({ kind: fields.kind, scale: fields.scale })
          ? planParts(mine, Number(draft.parts) || 0)
          : null
        if (plan?.losesDone && !confirm(t('part.confirmDrop'))) return false

        let saved: string | undefined
        if (material) {
          await updateMaterial(material.id, fields)
          await writes.afterMaterialEdit(material, fields)
          saved = material.id
        } else {
          const made = await addMaterial({ ...fields, stream_id: streamId, sort: materials.length })
          saved = made?.id
          // Копия книги с полки по страницам — та же книга: связь ставится
          // сразу, и сессии полки приходят сюда занятиями. Число страниц —
          // то, что стоит в карточке.
          const source = copyOf?.where === 'shelf' ? books.find((b) => b.id === copyOf.id) : null
          if (made && source && canLink(made) && !writes.materialOf(source.id)) {
            await writes.link(made, source, made.pages_total ?? source.pages)
          }
        }

        if (saved && plan) {
          for (const id of plan.remove) await deletePart(id)
          // Имени нет намеренно: безымянная часть зовётся своим номером по порядку.
          for (const p of plan.add) await addPart({ material_id: saved, title: '', done: false, sort: p.sort })
        }
      }}
      onDelete={
        material &&
        (async () => {
          if (!confirm(t('material.confirmDelete'))) return
          await deleteMaterial(material.id)
          onClose()
          onDeleted?.()
        })
      }
    />
  )
}
