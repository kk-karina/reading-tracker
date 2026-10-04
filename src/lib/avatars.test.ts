import { describe, expect, it } from 'vitest'
import { AVATAR_IDS, isAvatarId, randomAvatar } from './avatars'

describe('avatars', () => {
  it('knows only the names from the pack', () => {
    expect(isAvatarId('cat')).toBe(true)
    expect(isAvatarId('dog')).toBe(false)
    expect(isAvatarId(3)).toBe(false)
    expect(isAvatarId(undefined)).toBe(false)
  })

  it('picks within the pack at both ends of the range', () => {
    expect(randomAvatar(() => 0)).toBe(AVATAR_IDS[0])
    expect(randomAvatar(() => 0.999999)).toBe(AVATAR_IDS[AVATAR_IDS.length - 1])
  })
})
