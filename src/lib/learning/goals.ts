import type { Locale } from '../i18n/translate'

/**
 * Цель потока, придуманная за человека.
 *
 * Пустое «Зачем этот поток?» стояло самой крупной строкой экрана и задавало
 * вопрос, на который в момент заведения потока ответа обычно нет: учиться
 * садятся раньше, чем формулируют зачем. Серьёзная заготовка («Развиваться
 * профессионально») хуже пустоты — её не правят, потому что к ней нечего
 * добавить. Смешная цель правится сама: её хочется заменить своей, а пока не
 * заменили, она хотя бы не пялится на тебя вопросом.
 *
 * Тема узнаётся по имени, а не выбирается: поток и так называют тем, чему
 * учатся. Не узнали — цель собирается из самого имени.
 *
 * Детерминированно. Случайная цель меняла бы заголовок при каждой отрисовке,
 * а одна и та же на одно имя позволяет перебирать их броском по порядку.
 */

type Ideas = Record<Locale, string[]>

interface Theme {
  /**
   * По чему узнаётся. Корни, а не слова: «вождение», «водитель», «автошкола».
   * Короткие корни привязаны к началу слова: «права» иначе ловит
   * «управление», а «бег» — «бегло».
   */
  match: RegExp
  ideas: Ideas
}

const THEMES: Theme[] = [
  {
    match: /driv|вожд|водител|(^|\s)водить|автошкол|автомоб|машин|(^|\s)права|\bcar\b|parking|парков/,
    ideas: {
      ru: [
        'Парковаться с первого раза, а не с пятого',
        'Чтобы навигатор перестал говорить «развернитесь»',
        'Съезжать с кольца, когда надо, а не на третьем круге',
        'Сдать на права раньше, чем их получит кот',
      ],
      en: [
        'Park on the first try, not the fifth',
        'Make the satnav stop saying “turn around”',
        'Leave a roundabout on purpose, not on lap three',
        'Get a licence before the cat does',
      ],
    },
  },
  {
    match: /english|англ|язык|language|spanish|испан|немец|german|french|франц|italian|итальян|japan|япон|chinese|китай/,
    ideas: {
      ru: [
        'Смотреть сериалы без субтитров и понимать больше, чем «okay»',
        'Заказать кофе, не репетируя фразу три квартала',
        'Понять, о чём на самом деле любимая песня',
        'Шутить на другом языке и чтобы смеялись не над акцентом',
      ],
      en: [
        'Watch shows without subtitles and catch more than “okay”',
        'Order coffee without rehearsing it for three blocks',
        'Find out what my favourite song is actually about',
        'Tell a joke in another language and get laughs for the joke',
      ],
    },
  },
  {
    match: /growth|(^|\s)рост|карьер|career|\bwork|работ|\blead|руковод|менедж|manag|professional|профес/,
    ideas: {
      ru: [
        'Стать тем, кому пишут «можно тебя на минутку»',
        'Повышение — и чтобы заметил не только бухгалтер',
        'Знать ответ раньше, чем все полезут гуглить',
        'Говорить «давайте синкнемся» только когда правда надо',
      ],
      en: [
        'Become the one people message “got a minute?”',
        'A promotion that more than payroll notices',
        'Know the answer before everyone starts googling',
        'Say “let’s sync” only when we truly must',
      ],
    },
  },
  {
    match: /code|код|програм|program|python|javascript|typescript|\bjs\b|react|\bdev|разраб|алгоритм|algorithm/,
    ideas: {
      ru: [
        'Чтобы код работал — и было понятно почему',
        'Читать чужой код без тяжёлых вздохов',
        'Перестать бояться слова «рефакторинг»',
        'Починить баг с первой попытки и никому не рассказывать, что это случайно',
      ],
      en: [
        'Code that works — and I know why',
        'Read other people’s code without heavy sighing',
        'Stop flinching at the word “refactor”',
        'Fix a bug on the first try and tell no one it was luck',
      ],
    },
  },
  {
    match: /design|дизайн|figma|фигм|\bux\b|\bui\b|типограф|typograph/,
    ideas: {
      ru: [
        'Отличать «сделай побольше» от «сделай получше»',
        'Двигать пиксели осознанно, а не от тревоги',
        'Объяснить, почему шрифт не Comic Sans, не повышая голоса',
      ],
      en: [
        'Tell “make it bigger” apart from “make it better”',
        'Nudge pixels on purpose, not out of anxiety',
        'Explain why not Comic Sans without raising my voice',
      ],
    },
  },
  {
    match: /music|музык|guitar|гитар|piano|пиани|фортеп|вокал|vocal|sing|петь|drum|барабан/,
    ideas: {
      ru: [
        'Сыграть так, чтобы не просили «давай лучше включим»',
        'Чтобы соседи стучали в ритм, а не по батарее',
        'Выучить больше одной песни у костра',
      ],
      en: [
        'Play so nobody says “let’s just put a song on”',
        'Have the neighbours knock in rhythm, not on the wall',
        'Know more than one campfire song',
      ],
    },
  },
  {
    match: /sport|спорт|(^|\s)бег|\brun|fitness|фитнес|\bgym|(^|\s)зал|йог|yoga|swim|плаван|stretch|растяж/,
    ideas: {
      ru: [
        'Подниматься на пятый этаж и продолжать разговор',
        'Дотянуться до пальцев ног без драмы',
        'Бегать не только за уходящим автобусом',
      ],
      en: [
        'Climb five floors and keep the conversation going',
        'Touch my toes without drama',
        'Run for more than the departing bus',
      ],
    },
  },
  {
    match: /cook|кулин|(^|\s)готов[кил]|кухн|\bbak|выпеч|рецепт|recipe/,
    ideas: {
      ru: [
        'Готовить так, чтобы доставку заказывали из лени, а не от отчаяния',
        'Чтобы пожарная сигнализация была просто украшением',
        'Перестать гуглить, сколько варить яйцо',
      ],
      en: [
        'Order takeout out of laziness, not despair',
        'Keep the smoke alarm purely decorative',
        'Stop googling how long to boil an egg',
      ],
    },
  },
  {
    match: /financ|финанс|деньг|money|invest|инвест|budget|бюджет|эконом|econom/,
    ideas: {
      ru: [
        'Чтобы в конце месяца оставался не только оптимизм',
        'Понимать новости про ставку без помощи друга',
        'Перестать называть кофе инвестицией в себя',
      ],
      en: [
        'End the month with more than optimism',
        'Follow rate news without phoning a friend',
        'Stop calling coffee an investment in myself',
      ],
    },
  },
]

/** Когда тему не узнали: цель из самого имени. `{name}` — имя потока как есть. */
const ANY: Ideas = {
  ru: [
    'Разбираться в «{name}» так, чтобы объяснить бабушке',
    'Вычеркнуть «{name}» из списка «когда-нибудь»',
    'Знать про «{name}» больше, чем первая ссылка в поиске',
    'Дойти в «{name}» до места, где становится весело',
  ],
  en: [
    'Know {name} well enough to explain it to my grandma',
    'Take {name} off the “someday” list for good',
    'Know more about {name} than the first search result',
    'Get far enough into {name} for it to get fun',
  ],
}

/** Все цели, которые подходят этому имени, в постоянном порядке. */
export function goalIdeas(name: string, locale: Locale): string[] {
  const clean = name.trim()
  if (!clean) return []
  const key = clean.toLowerCase()
  const theme = THEMES.find((t) => t.match.test(key))
  if (theme) return theme.ideas[locale]
  return ANY[locale].map((idea) => idea.replace('{name}', clean))
}

/** Простой и устойчивый хэш: одно имя — одна стартовая цель на всех устройствах. */
function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Одна цель для имени. `roll` — сколько раз попросили другую: перебор идёт
 * по кругу от стартовой, поэтому повторы начинаются, только когда список
 * пройден целиком.
 */
export function funnyGoal(name: string, locale: Locale, roll = 0): string {
  const ideas = goalIdeas(name, locale)
  if (ideas.length === 0) return ''
  return ideas[(hash(name.trim().toLowerCase()) + roll) % ideas.length]
}
