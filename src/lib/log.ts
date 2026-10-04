import { toISO } from './format'

export interface Group<T> {
  key: string
  items: T[]
}

/**
 * Записи, разложенные по группам: по дням или по книге / материалу.
 *
 * Одна функция на оба среза и на оба раздела: группа — это просто ключ. Раньше
 * дни собирала лента, где сессии и мысли шли вперемешку, и группировать её по
 * книге было нечем. Теперь сессии и мысли живут в разных вкладках, и каждой
 * нужен один и тот же ответ — что первым, что внутри.
 *
 * Порядок один: выше та группа, где писали последним, и внутри — от свежего.
 * Для дней это то же, что «новый день сверху»; для книг — «та, за которой
 * сидела последней». `atOf` — строка, сравнимая как ISO: дата записи и время
 * её появления, чтобы запись задним числом стояла в своём дне, а не в дне
 * набора.
 */
export function groupItems<T>(
  items: T[],
  keyOf: (item: T) => string,
  atOf: (item: T) => string,
): Group<T>[] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  const desc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0)
  return [...groups.entries()]
    .map(([key, list]) => ({ key, items: list.sort((a, b) => desc(atOf(a), atOf(b))) }))
    .sort((a, b) => desc(atOf(a.items[0]), atOf(b.items[0])))
}

/**
 * Время записи — только если её сделали в тот же день, о котором она.
 *
 * Сессию за вчера, записанную сегодня утром, время набора описывает неверно:
 * «09:12» рядом со вчерашним чтением выглядит как время самого чтения.
 */
export function timeOf(date: string, createdAt: string): string | null {
  const made = new Date(createdAt)
  if (Number.isNaN(made.getTime()) || toISO(made) !== date) return null
  return `${String(made.getHours()).padStart(2, '0')}:${String(made.getMinutes()).padStart(2, '0')}`
}
