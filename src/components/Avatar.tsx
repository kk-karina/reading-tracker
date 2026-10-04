import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import books from '../assets/avatars/books.webp'
import bun from '../assets/avatars/bun.webp'
import cap from '../assets/avatars/cap.webp'
import cat from '../assets/avatars/cat.webp'
import cheeks from '../assets/avatars/cheeks.webp'
import coffee from '../assets/avatars/coffee.webp'
import flower from '../assets/avatars/flower.webp'
import glasses from '../assets/avatars/glasses.webp'
import hair from '../assets/avatars/hair.webp'
import headphones from '../assets/avatars/headphones.webp'
import hoodie from '../assets/avatars/hoodie.webp'
import hug from '../assets/avatars/hug.webp'
import music from '../assets/avatars/music.webp'
import panama from '../assets/avatars/panama.webp'
import pencil from '../assets/avatars/pencil.webp'
import ponytail from '../assets/avatars/ponytail.webp'
import reading from '../assets/avatars/reading.webp'
import roof from '../assets/avatars/roof.webp'
import shades from '../assets/avatars/shades.webp'
import stack from '../assets/avatars/stack.webp'
import { AVATAR_IDS, type AvatarId } from '../lib/avatars'
import { useAuth } from '../state/AuthContext'
import { useT } from '../state/LocaleContext'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { Jelly } from './ui'

/**
 * Пак аватаров. Исходный лист и как он нарезан — в
 * `docs/illustrations/README.md`. Запись полная: забытый файл ловит `tsc`,
 * а не экран с дырой вместо лица.
 */
const AVATAR_SRC: Record<AvatarId, string> = {
  shades, books, music, coffee, cap, cheeks, reading, bun, glasses, cat,
  panama, hair, pencil, hoodie, roof, headphones, flower, hug, ponytail, stack,
}

/**
 * Лицо пользователя — без поведения. Шапка ставит его в кнопку профиля,
 * закладка профиля — в кнопку смены.
 *
 * Пока аватара нет (вход ещё не пришёл, случайный ещё не выпал), на его месте
 * стоит пустой кружок того же размера: появление лица не двигает соседей.
 * Новое лицо проявляется поверх старого, а не сменой кадра: так смена,
 * сделанная в закладке, видна и в шапке.
 */
export function AvatarFace({ size }: { size: number }) {
  const { avatar } = useAuth()
  return (
    <span className="avatar-face" style={{ width: size, height: size }}>
      <AnimatePresence initial={false}>
        {avatar && (
          <motion.img
            key={avatar}
            className="avatar"
            src={AVATAR_SRC[avatar]}
            alt=""
            draggable={false}
            initial={{ opacity: 0, transform: 'scale(0.9)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          />
        )}
      </AnimatePresence>
    </span>
  )
}

/**
 * Аватар, который сам открывает лист выбора. Карандаш в углу — потому что
 * картинка сама по себе не обещает, что на неё можно нажать.
 */
export function AvatarButton({ size = 32 }: { size?: number }) {
  const t = useT()
  const { avatar, setAvatar } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Jelly
        type="button"
        className="avatar-btn"
        onClick={() => setOpen(true)}
        aria-label={t('avatar.change')}
        title={t('avatar.change')}
        disabled={!avatar}
      >
        <AvatarFace size={size} />
        <span className="avatar-edit" aria-hidden>
          <Icon name="pen" size={14} />
        </span>
      </Jelly>
      {open && avatar && (
        <AvatarSheet
          value={avatar}
          onPick={(id) => {
            setAvatar(id)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

/** Выбор — одно нажатие: менять нечего, кроме картинки, и подтверждать тоже нечего. */
function AvatarSheet({
  value,
  onPick,
  onClose,
}: {
  value: AvatarId
  onPick: (id: AvatarId) => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <Sheet title={t('avatar.change')} onClose={onClose}>
      <div className="avatar-grid">
        {AVATAR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="avatar-pick"
            aria-pressed={id === value}
            aria-label={t(`avatar.${id}`)}
            title={t(`avatar.${id}`)}
            // Фокус встаёт на текущий: с клавиатуры начинаешь от того, что есть.
            data-autofocus={id === value ? '' : undefined}
            onClick={() => onPick(id)}
          >
            <img className="avatar" src={AVATAR_SRC[id]} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </Sheet>
  )
}
