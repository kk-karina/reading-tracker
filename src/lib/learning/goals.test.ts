import { describe, expect, it } from 'vitest'
import { funnyGoal, goalIdeas } from './goals'

describe('goalIdeas', () => {
  it('узнаёт тему по имени потока, в любом регистре и на обоих языках', () => {
    const driving = goalIdeas('Driving', 'ru')
    expect(goalIdeas('ВОЖДЕНИЕ', 'ru')).toEqual(driving)
    expect(goalIdeas('Автошкола', 'ru')).toEqual(driving)
  })

  it('у разных тем разные цели', () => {
    expect(goalIdeas('Driving', 'ru')).not.toEqual(goalIdeas('English', 'ru'))
  })

  it('без темы подставляет имя в общие цели', () => {
    const ideas = goalIdeas('Керамика', 'ru')
    expect(ideas.length).toBeGreaterThan(1)
    for (const idea of ideas) expect(idea).toContain('Керамика')
  })

  it('говорит на языке интерфейса', () => {
    expect(goalIdeas('Driving', 'en')).not.toEqual(goalIdeas('Driving', 'ru'))
    expect(goalIdeas('Pottery', 'en')[0]).toContain('Pottery')
  })

  it('без имени предлагать нечего', () => {
    expect(goalIdeas('   ', 'ru')).toEqual([])
  })
})

describe('funnyGoal', () => {
  it('для одного имени даёт одну и ту же цель', () => {
    expect(funnyGoal('English', 'ru')).toBe(funnyGoal('English', 'ru'))
  })

  it('берёт цель из темы потока', () => {
    expect(goalIdeas('English', 'ru')).toContain(funnyGoal('English', 'ru'))
  })

  it('следующий бросок даёт другую цель и в конце концов идёт по кругу', () => {
    const pool = goalIdeas('Driving', 'ru')
    expect(funnyGoal('Driving', 'ru', 1)).not.toBe(funnyGoal('Driving', 'ru', 0))
    expect(funnyGoal('Driving', 'ru', pool.length)).toBe(funnyGoal('Driving', 'ru', 0))
  })

  it('без имени возвращает пустую строку', () => {
    expect(funnyGoal('', 'ru')).toBe('')
  })
})

describe('goalIdeas, ложные темы', () => {
  it('не путает похожие корни', () => {
    expect(goalIdeas('Управление проектами', 'ru')).not.toEqual(goalIdeas('Driving', 'ru'))
    expect(goalIdeas('Подготовка к экзамену', 'ru')).not.toEqual(goalIdeas('Кулинария', 'ru'))
    expect(goalIdeas('Перевод', 'ru')[0]).toContain('Перевод')
  })
})
