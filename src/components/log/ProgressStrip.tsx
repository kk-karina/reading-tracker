import type { CSSProperties } from 'react'

/**
 * Насколько сессия сдвинула книгу: полоса «было → стало».
 *
 * Та же полоса, что в листе записи (`PagesStep`): густое — где книга была до
 * сессии, бледное — что сессия прибавила. В журнале она отвечает не только
 * «сколько прочитала», но и «насколько это продвинуло книгу»: сорок страниц
 * в тонкой книге и в толстой — разные шаги.
 *
 * Обе доли считаются из самой сессии, а не из нынешнего прогресса книги:
 * строка месячной давности показывает тот шаг, а не сегодняшний.
 */
export function PagesStrip({ from, to, total }: { from: number; to: number; total: number }) {
  const share = (n: number) => Math.min(1, Math.max(0, n / total))
  const was = share(from)
  const will = share(to)
  return (
    <span className="strip" aria-hidden>
      <span className="strip-bar">
        <span className="strip-will" style={{ transform: `scaleX(${will})` }} />
        <span className="strip-was" style={{ transform: `scaleX(${was})` }} />
      </span>
      <span className="strip-label">
        {Math.round(was * 100)}→{Math.round(will * 100)}%
      </span>
    </span>
  )
}

/**
 * То же для материала по частям: ряд точек.
 *
 * Части этого занятия залиты чернилами, пройденные к этому дню другими —
 * бледно, остальные пустые. Ряд тихий и не нажимается: это история, а не
 * переключатель, как ряд точек у полосы прогресса материала.
 */
export function PartsStrip({
  parts,
  now,
  done,
}: {
  parts: { id: string }[]
  /** Отмеченные этим занятием. */
  now: ReadonlySet<string>
  /** Пройденные другими занятиями или руками. */
  done: ReadonlySet<string>
}) {
  // Длинный курс ужимает точку, чтобы ряд оставался одной строкой колонки.
  const dot = parts.length > 24 ? 4 : parts.length > 14 ? 5 : 6
  return (
    <span className="strip strip-dots" style={{ '--strip-dot': `${dot}px` } as CSSProperties} aria-hidden>
      {parts.map((p) => (
        <i key={p.id} className={now.has(p.id) ? 'now' : done.has(p.id) ? 'done' : undefined} />
      ))}
    </span>
  )
}
