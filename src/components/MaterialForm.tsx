import { useState } from 'react'
import type { Material, MaterialKind, MaterialStatus } from '../lib/learning/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { Sheet } from './Sheet'
import { Jelly, Segmented } from './ui'

const KINDS: MaterialKind[] = ['book', 'article', 'course', 'video', 'podcast', 'other']
const STATUSES: MaterialStatus[] = ['inbox', 'active', 'someday', 'reference', 'done', 'dropped']

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
  const { addMaterial, updateMaterial, deleteMaterial, materials } = useLearning()

  const [title, setTitle] = useState(material?.title ?? '')
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? 'article')
  const [author, setAuthor] = useState(material?.author ?? '')
  const [url, setUrl] = useState(material?.url ?? '')
  const [status, setStatus] = useState<MaterialStatus>(material?.status ?? 'inbox')
  const [parts, setParts] = useState(material?.parts_total ? String(material.parts_total) : '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!title.trim()) return
    setBusy(true)
    const patch = {
      title: title.trim(),
      kind,
      author: author.trim() || null,
      url: url.trim() || null,
      status,
      parts_total: Number(parts) > 0 ? Number(parts) : null,
    }
    if (material) await updateMaterial(material.id, patch)
    else await addMaterial({ ...patch, stream_id: streamId, sort: materials.length })
    setBusy(false)
    onClose()
  }

  async function remove() {
    if (!material || !confirm(t('material.confirmDelete'))) return
    await deleteMaterial(material.id)
    onClose()
  }

  return (
    <Sheet title={material ? t('material.edit') : t('learning.newMaterial')} onClose={onClose}>
      <label className="field">
        <span className="label">{t('material.title')}</span>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </label>

      <div className="field">
        <span className="label">{t('material.kind')}</span>
        <Segmented
          name={t('material.kind')}
          value={kind}
          options={KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
          onChange={setKind}
          className="sm"
        />
      </div>

      <div className="form-row">
        <label className="field">
          <span className="label">{t('material.author')}</span>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">{t('material.parts')}</span>
          <input
            className="input"
            inputMode="numeric"
            value={parts}
            onChange={(e) => setParts(e.target.value.replace(/\D/g, ''))}
          />
          <span className="small faint">{t('material.partsHint')}</span>
        </label>
      </div>

      <label className="field">
        <span className="label">{t('material.url')}</span>
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>

      <div className="field">
        <span className="label">{t('material.status')}</span>
        <Segmented
          name={t('material.status')}
          value={status}
          options={STATUSES.map((s) => ({ value: s, label: t(`mstatus.${s}`) }))}
          onChange={setStatus}
          className="sm"
        />
      </div>

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
    </Sheet>
  )
}
