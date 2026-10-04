/**
 * Переезд обучения из браузера в облако.
 *
 * Раздел вышел на прод, держа всё в localStorage, и у человека к этому моменту
 * уже написаны конспекты. Появление аккаунта не должно выглядеть как потеря:
 * при первом входе накопленное уезжает в базу само — но только когда
 * столкновение невозможно, то есть в облаке нет ни одного потока.
 *
 * Это перенос, а не слияние. Слияние двух расходящихся снимков требует решать
 * за человека, какая из двух правок одного конспекта настоящая, и ошибается
 * молча. Здесь вместо этого есть условие, при котором вопрос не возникает.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ok } from '../../store/retry'
import type { LearningSnapshot } from '../types'

/** Отметка о переносе, по аккаунту: тот же браузер под другим входом переносит заново. */
const MARK = 'readingtracker.learning.carried'

export function carried(userId: string): boolean {
  try {
    return localStorage.getItem(MARK) === userId
  } catch {
    // Закрытое хранилище значит «не переносили». Повтор упрётся в непустое
    // облако и ничего не сделает — это безопаснее, чем счесть перенос сделанным.
    return false
  }
}

export function markCarried(userId: string): void {
  try {
    localStorage.setItem(MARK, userId)
  } catch {
    /* хранилище недоступно на запись: следующий заход упрётся в непустое облако */
  }
}

/** Есть ли что переносить и некуда ли столкнуться. */
export function worthCarrying(cloud: LearningSnapshot, local: LearningSnapshot): boolean {
  if (cloud.streams.length > 0) return false
  return (
    local.streams.length > 0 ||
    local.materials.length > 0 ||
    local.parts.length > 0 ||
    local.sessions.length > 0 ||
    local.notes.length > 0
  )
}

/**
 * Перекладывает снимок в базу и возвращает число перенесённых строк.
 *
 * `id` у всего уже `crypto.randomUUID()`, поэтому строки едут как есть и
 * ссылки между ними перекладывать не нужно. `user_id` проставляет умолчание
 * колонки.
 *
 * Порядок диктует круговая ссылка между потоком и материалом: поток едет без
 * фокуса, а указатель проставляется вторым проходом, когда материалы уже на
 * месте.
 */
export async function carryOver(sb: SupabaseClient, snap: LearningSnapshot): Promise<number> {
  const focused = snap.streams.filter((s) => s.focus_material_id)

  if (snap.streams.length) {
    await ok(() =>
      sb.from('streams').insert(snap.streams.map((s) => ({ ...s, focus_material_id: null }))),
    )
  }
  // Связь с полкой не переезжает: книги браузера в облако не едут, и ключ
  // указывал бы в никуда. Связать заново — одна кнопка на странице материала.
  if (snap.materials.length) {
    await ok(() => sb.from('materials').insert(snap.materials.map(({ book_id: _gone, ...m }) => m)))
  }
  if (snap.parts.length) await ok(() => sb.from('material_parts').insert(snap.parts))
  // Занятия раньше конспектов: конспект ссылается на занятие.
  if (snap.sessions.length) {
    await ok(() =>
      sb.from('study_sessions').insert(snap.sessions.map(({ book_session_id: _gone, ...x }) => x)),
    )
  }
  if (snap.notes.length) await ok(() => sb.from('study_notes').insert(snap.notes))

  for (const s of focused) {
    await ok(() =>
      sb.from('streams').update({ focus_material_id: s.focus_material_id }).eq('id', s.id),
    )
  }

  return (
    snap.streams.length +
    snap.materials.length +
    snap.parts.length +
    snap.sessions.length +
    snap.notes.length
  )
}
