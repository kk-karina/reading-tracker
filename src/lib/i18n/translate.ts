export type Locale = 'ru' | 'en'

/** A countable string: one entry per plural category the locale actually uses. */
type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>
type Value = string | PluralForms

/** Both languages live side by side, so a missing translation is visible at a glance. */
export type Entry = Record<Locale, Value>
export type Dict = Record<string, Entry>
export type Params = Record<string, string | number>

// Russian has three forms where English has two; the browser knows the rules.
const RULES: Record<Locale, Intl.PluralRules> = {
  ru: new Intl.PluralRules('ru'),
  en: new Intl.PluralRules('en'),
}

export function translate<D extends Dict>(
  dict: D,
  locale: Locale,
  key: keyof D & string,
  params?: Params,
): string {
  const entry = dict[key]
  if (!entry) return key
  const value = entry[locale]
  const template = typeof value === 'string' ? value : plural(value, locale, params)
  return fill(template, params)
}

function plural(forms: PluralForms, locale: Locale, params?: Params): string {
  const n = typeof params?.n === 'number' ? params.n : 0
  const category = RULES[locale].select(n)
  return forms[category] ?? forms.other ?? forms.many ?? Object.values(forms)[0] ?? ''
}

function fill(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  )
}
