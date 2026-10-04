import { useEffect, useRef, useState } from 'react'
import { mergeLinkMeta, metaIsEmpty } from '../../lib/compose/autofill'
import type { Draft } from '../../lib/compose/draft'
import { fetchLinkMeta, localMeta, type LinkMeta } from '../../lib/compose/linkMeta'
import { cleanTitle } from '../../lib/compose/title'

/** Поля, которые умеют вспыхнуть, когда их заполнили не руками. */
export type FillKey = 'title' | 'author' | 'cover' | 'pages'

/**
 * Когда какое поле заполнилось в последний раз. Число, а не флаг: подсветка
 * в поле — это элемент с этим числом в `key`, и новое число перезапускает её,
 * не трогая само поле и курсор в нём.
 */
export type Filled = Partial<Record<FillKey, number>>

/**
 * Магазины отдают в `og:title` рекламу, а в `publisher` — своё имя. Если
 * автора удалось достать из заголовка, он сильнее «ЛитРес» в поле автора.
 */
function tidy(meta: LinkMeta): LinkMeta {
  if (!meta.title) return meta
  const clean = cleanTitle(meta.title, meta.source)
  return { ...meta, title: clean.title, author: clean.author ?? meta.author }
}

/**
 * ✦ — чтение ссылки.
 *
 * Сначала то, что видно из самой ссылки, — домен, вид, превью ролика: это
 * бесплатно и мгновенно. Потом сеть. Заполняется только пустое — правило
 * `mergeLinkMeta`. Читается только по нажатию: адрес уходит стороннему
 * сервису, и это решение человека, а не формы.
 */
export function useLinkAutofill({
  current,
  apply,
  kindTouched,
}: {
  /** Черновик на момент вызова — не из замыкания, а живой. */
  current: () => Draft
  apply: (patch: Partial<Draft>) => void
  kindTouched: () => boolean
}) {
  const [reading, setReading] = useState(false)
  const [nothing, setNothing] = useState(false)
  const [filled, setFilled] = useState<Filled>({})
  const trip = useRef<AbortController | null>(null)

  // Запрос наружу не должен пережить форму: ответ пришёл бы в размонтированный
  // компонент, а адрес к тому моменту уже незачем было отдавать.
  useEffect(() => () => trip.current?.abort(), [])

  const mark = (keys: string[]) => {
    const id = Date.now()
    const glow = keys.filter((k): k is FillKey => ['title', 'author', 'cover', 'pages'].includes(k))
    if (glow.length) setFilled((f) => ({ ...f, ...Object.fromEntries(glow.map((k) => [k, id])) }))
  }

  async function read(address: string) {
    const url = address.trim()
    if (!url) return
    trip.current?.abort()
    const ctl = new AbortController()
    trip.current = ctl

    setReading(true)
    setNothing(false)

    // Своя копия полей, а не состояние компонента: по ссылке заполняют дважды
    // — сначала тем, что видно из самой ссылки, потом ответом сети, — а между
    // этими двумя вызовами React ещё не перерисовал. Второй заход иначе
    // считал бы пустым поле, которое первый уже заполнил, и затирал бы его.
    let shown = current()
    const take = (meta: LinkMeta) => {
      const patch = mergeLinkMeta(shown, meta, kindTouched())
      shown = { ...shown, ...patch }
      const keys = Object.keys(patch)
      if (keys.length === 0) return
      apply(patch)
      mark(keys)
    }

    take(localMeta(url))
    try {
      const meta = await fetchLinkMeta(url, ctl.signal)
      if (ctl.signal.aborted) return
      take(tidy(meta))
      setNothing(metaIsEmpty(meta))
    } finally {
      if (!ctl.signal.aborted) setReading(false)
    }
  }

  return { read, reading, nothing, filled, mark }
}
