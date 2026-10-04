import type { ReactNode } from 'react'

/**
 * Подпись под написанным: когда и о чём — мелко, вторым планом.
 *
 * Одна строка на все места, где мысль или конспект стоят на бумаге:
 * хранилище, дашборд, раскрытая сессия. Части приходят готовыми, пустые
 * выпадают сами — точек-разделителей над пустотой не остаётся.
 */
export function NoteMeta({ parts }: { parts: ReactNode[] }) {
  const shown = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  if (shown.length === 0) return null
  return (
    <span className="note-meta">
      {shown.map((p, i) => (
        <span key={i} className="note-meta-part">
          {p}
        </span>
      ))}
    </span>
  )
}
