import { motion } from 'motion/react'
import box from '../assets/empty/box.png'
import laptop from '../assets/empty/laptop.png'
import pile from '../assets/empty/pile.png'
import reading from '../assets/empty/reading.png'
import signpost from '../assets/empty/signpost.png'
import waiting from '../assets/empty/waiting.png'
import writing from '../assets/empty/writing.png'

/**
 * Пак рисунков для пустых мест. Исходные листы и как они нарезаны — в
 * `docs/illustrations/README.md`.
 *
 * Набор закрытый: имя приходит отсюда, а не строкой из вызова. Открытый
 * список означал бы, что в одном разделе картинка нашлась, а в соседнем
 * опечатались в имени и получили дыру, — и узнали бы об этом с экрана, а не
 * от `tsc`.
 *
 * Имена — про то, чем герой занят, а не про экран, на котором рисунок стоит:
 * «пишет» годится и мыслям о книге, и конспекту занятия, а «нет конспектов»
 * годилось бы ровно одному месту.
 */
export const EMPTY_ART = { reading, writing, pile, signpost, laptop, box, waiting } as const

export type EmptyArtName = keyof typeof EMPTY_ART

/** Насколько громко. Крупный — когда пуст экран, мелкий — когда пуста зона внутри него. */
export type EmptyArtSize = 'sm' | 'md'

/**
 * Рисунок въезжает один раз, при появлении, и больше ничего не делает.
 *
 * Пустое место — редкий экран, и бюджет на радость здесь есть; но живущая
 * своей жизнью картинка на экране, куда возвращаются, превращается из
 * приветствия в тик. Поэтому движение одно: чуть снизу, с короткой пружиной,
 * и всё встало.
 *
 * «Меньше движения» здесь не спрашивается отдельно: `MotionConfig` в корне
 * приложения снимает сдвиг и оставляет проявление — см. `App.tsx`.
 *
 * Текст и кнопка под рисунком не анимируются вовсе. Блок приходит на экран
 * целиком — со сменой вкладки или перехода, — и разбирать его на очередь
 * значило бы показывать сборку там, где нечего собирать.
 */
export function EmptyArt({ name, size = 'md' }: { name: EmptyArtName; size?: EmptyArtSize }) {
  return (
    <motion.img
      className={`empty-pic${size === 'sm' ? ' sm' : ''}`}
      src={EMPTY_ART[name]}
      alt=""
      aria-hidden
      draggable={false}
      initial={{ opacity: 0, transform: 'translateY(10px) scale(0.96)' }}
      animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
      transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
    />
  )
}
