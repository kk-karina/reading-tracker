import type { Location } from 'react-router-dom'

/** Что ссылка на конспект несёт с собой: откуда открыли и что листать. */
export interface NoteLinkState {
  /** Экран под листом. Нет — лист открыт прямой ссылкой. */
  background?: Location
  /** Соседи в том порядке, в каком они стояли там, откуда открыли. */
  siblings?: string[]
  /** Открыть сразу на правку — когда ссылка так и называется: «Править». */
  edit?: boolean
}

/**
 * Состояние ссылки на конспект с экрана `from`: он остаётся под листом.
 *
 * Если ссылку нажали внутри уже открытого листа, под новым остаётся тот же
 * экран, а не лист под листом.
 */
export const noteLinkState = (from: Location, siblings: string[]): NoteLinkState => ({
  background: (from.state as NoteLinkState | null)?.background ?? from,
  siblings,
})
