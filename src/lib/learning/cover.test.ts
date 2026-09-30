import { describe, expect, it } from 'vitest'
import { sourceName, sourceOf } from './cover'

describe('sourceName', () => {
  it('роняет зону: на плитке в списке её негде показывать', () => {
    expect(sourceName('https://medium.com/@emma/eight-pillars')).toBe('medium')
    expect(sourceName('https://sidorkin.dev/metrics')).toBe('sidorkin')
  })

  it('роняет и www, и остальные поддомены', () => {
    expect(sourceName('https://www.nngroup.com/articles/psychology-ux/')).toBe('nngroup')
    expect(sourceName('https://podcasts.apple.com/ru/podcast/x')).toBe('apple')
  })

  it('у составной зоны берёт имя, а не «co»', () => {
    expect(sourceName('https://www.bbc.co.uk/news/x')).toBe('bbc')
    expect(sourceName('https://amazon.co.jp/dp/x')).toBe('amazon')
  })

  it('однословный хост отдаёт как есть', () => {
    expect(sourceName('http://localhost:5173/m/1')).toBe('localhost')
  })

  it('на том же, на чём молчит sourceOf, молчит и сам', () => {
    for (const bad of ['', '   ', 'не ссылка вовсе']) {
      expect(sourceOf(bad)).toBeNull()
      expect(sourceName(bad)).toBeNull()
    }
  })
})
