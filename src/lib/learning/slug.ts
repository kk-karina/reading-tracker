/**
 * Кириллица в латиницу таблицей, а не библиотекой: алфавит один и он не растёт,
 * а зависимость ради тридцати трёх букв — плохая сделка.
 */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Имя в адрес. Пусто — значит, переводить было нечего: решает вызывающий. */
export function slugify(name: string): string {
  const latin = [...name.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join('')
  return latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Адрес потока. Занятые адреса передаются, потому что два потока с одним
 * именем — обычное дело, а один адрес на двоих сделал бы второй недостижимым.
 *
 * Выдаётся один раз при создании: переименование потока меняет имя и не
 * трогает адрес, иначе ссылка на поток не переживёт смены названия.
 */
export function streamSlug(name: string, taken: readonly string[]): string {
  const base = slugify(name) || `stream-${taken.length + 1}`
  if (!taken.includes(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.includes(candidate)) return candidate
  }
}
