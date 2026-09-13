import type { Dict } from './translate'

/**
 * Both languages sit side by side so a missing one is visible while editing.
 * Countable strings hold plural categories: Russian needs one/few/many, English one/other.
 * `satisfies Dict` keeps the shape honest without widening the key type.
 */
export const DICT = {
  'app.name': { ru: 'Дневник чтения', en: 'Reading tracker' },

  'nav.progress': { ru: 'Прогресс', en: 'Progress' },
  'nav.shelf': { ru: 'Полка', en: 'Shelf' },
  'nav.journal': { ru: 'Дневник', en: 'Journal' },
  'nav.settings': { ru: 'Настройки', en: 'Settings' },

  'locale.label': { ru: 'Язык интерфейса', en: 'Interface language' },

  'login.greeting': { ru: 'Открой книгу. Войди.', en: 'Open the book. Log in.' },
  'login.email': { ru: 'Почта', en: 'Email' },
  'login.password': { ru: 'Пароль', en: 'Password' },
  'login.submit': { ru: 'Войти', en: 'Sign in' },

  'count.books': {
    ru: { one: '{n} книга', few: '{n} книги', many: '{n} книг' },
    en: { one: '{n} book', other: '{n} books' },
  },
  'count.sessions': {
    ru: { one: '{n} сессия', few: '{n} сессии', many: '{n} сессий' },
    en: { one: '{n} session', other: '{n} sessions' },
  },
  'count.notes': {
    ru: { one: '{n} заметка', few: '{n} заметки', many: '{n} заметок' },
    en: { one: '{n} note', other: '{n} notes' },
  },
  'count.pages': {
    ru: { one: '{n} страница', few: '{n} страницы', many: '{n} страниц' },
    en: { one: '{n} page', other: '{n} pages' },
  },
  'count.days': {
    ru: { one: '{n} день', few: '{n} дня', many: '{n} дней' },
    en: { one: '{n} day', other: '{n} days' },
  },

  'settings.title': { ru: 'Настройки', en: 'Settings' },
  'settings.account': { ru: 'Аккаунт', en: 'Account' },
  'settings.signOut': { ru: 'Выйти', en: 'Sign out' },
  'settings.localMode': {
    ru: 'Локальный режим — данные остаются в этом браузере',
    en: 'Local mode — data stays in this browser',
  },
  'settings.language': { ru: 'Язык', en: 'Language' },
  'settings.data': { ru: 'Данные', en: 'Data' },
  'settings.export': { ru: 'Экспорт', en: 'Export' },
  'settings.exportHint': { ru: 'Выгрузить всё в JSON', en: 'Export everything as JSON' },
  'settings.import': { ru: 'Импорт', en: 'Import' },
  'settings.importHint': {
    ru: 'Загрузить JSON-выгрузку (заменит текущие данные)',
    en: 'Import a JSON export (replaces current data)',
  },
  'settings.imported': { ru: 'Загружено.', en: 'Imported.' },
  'settings.importFailed': { ru: 'Не удалось прочитать файл.', en: 'Could not import.' },
  'settings.notAnExport': {
    ru: 'Это не выгрузка дневника чтения.',
    en: 'Not a reading tracker export.',
  },
  'settings.confirmImport': {
    ru: 'Заменить всё на этом устройстве содержимым файла?',
    en: 'Replace everything on this device with the file contents?',
  },
  'settings.clear': { ru: 'Очистить', en: 'Clear' },
  'settings.clearHint': {
    ru: 'Удалить все данные на этом устройстве',
    en: 'Delete everything on this device',
  },
  'settings.confirmClear': {
    ru: 'Удалить все локальные данные? Это необратимо.',
    en: 'Delete all local data? This cannot be undone.',
  },

  'soon.title': { ru: 'Скоро', en: 'Coming soon' },
  'soon.shelf': {
    ru: 'Здесь встанут книги: обложки, полки и прогресс по каждой.',
    en: 'The books will stand here: covers, shelves and progress on each.',
  },
  'soon.progress': {
    ru: 'Здесь будет фокусная книга, ритм чтения и последние мысли.',
    en: 'The focused book, your reading rhythm and the latest thoughts will live here.',
  },
  'soon.journal': {
    ru: 'Здесь будет хронология сессий и всё, что ты вынесла из книг.',
    en: 'The timeline of sessions and everything you took from your books.',
  },
  'soon.book': {
    ru: 'Страница книги появится на второй фазе.',
    en: 'The book page arrives in phase two.',
  },
  'status.want': { ru: 'Хочу прочитать', en: 'Want to read' },
  'status.reading': { ru: 'Читаю', en: 'Reading' },
  'status.finished': { ru: 'Прочитано', en: 'Finished' },
  'status.abandoned': { ru: 'Заброшено', en: 'Set aside' },

  'shelf.add': { ru: 'Добавить книгу', en: 'Add a book' },
  'shelf.empty': { ru: 'Полка пока пустая.', en: 'The shelf is empty.' },
  'shelf.loadMine': { ru: 'Загрузить мои пять книг', en: 'Load my five books' },
  'shelf.loadMineHint': {
    ru: 'Те, что ты назвала: Браун, Перель, Клафф, Вышенков, Паттерсон.',
    en: 'The ones you named: Brown, Perel, Klaff, Vyshenkov, Patterson.',
  },

  'book.pagesOf': { ru: '{page} из {total}', en: '{page} of {total}' },
  'book.pagesUnknown': { ru: 'страниц не указано', en: 'page count not set' },
  'book.notOpened': { ru: 'Ещё не открыта', en: 'Not opened yet' },
  'book.lastRead': { ru: 'Последний раз {date}', en: 'Last read {date}' },
  'book.makeFocus': { ru: 'Сделать главной', en: 'Make it the focus' },
  'book.isFocus': { ru: 'Главная книга', en: 'In focus' },
  'book.edit': { ru: 'Изменить', en: 'Edit' },
  'book.delete': { ru: 'Удалить', en: 'Delete' },
  'book.confirmDelete': {
    ru: 'Удалить книгу вместе с её сессиями и заметками?',
    en: 'Delete the book together with its sessions and notes?',
  },
  'book.notFound': { ru: 'Такой книги нет.', en: 'No such book.' },
  'book.sessionsSoon': {
    ru: 'Сессии и мысли появятся на третьей фазе.',
    en: 'Sessions and thoughts arrive in phase three.',
  },

  'form.title': { ru: 'Название', en: 'Title' },
  'form.author': { ru: 'Автор', en: 'Author' },
  'form.pages': { ru: 'Страниц', en: 'Pages' },
  'form.cover': { ru: 'Ссылка на обложку', en: 'Cover image URL' },
  'form.coverHint': {
    ru: 'Необязательно. Без неё обложка рисуется из названия.',
    en: 'Optional. Without it the cover is drawn from the title.',
  },
  'form.genre': { ru: 'Жанр', en: 'Genre' },
  'form.language': { ru: 'Язык книги', en: 'Book language' },
  'form.status': { ru: 'Статус', en: 'Status' },
  'form.save': { ru: 'Сохранить', en: 'Save' },
  'form.cancel': { ru: 'Отмена', en: 'Cancel' },
  'form.titleRequired': { ru: 'Без названия не сохранить.', en: 'A title is required.' },

  'search.label': { ru: 'Найти по названию', en: 'Search by title' },
  'search.action': { ru: 'Найти', en: 'Search' },
  'search.busy': { ru: 'Ищу…', en: 'Searching…' },
  'search.none': {
    ru: 'Ничего не нашлось — заполни поля руками, это нормально.',
    en: 'Nothing found — fill the fields in by hand, that is fine.',
  },
  'search.failed': {
    ru: 'Поиск недоступен. Заполни поля руками.',
    en: 'Search is unavailable. Fill the fields in by hand.',
  },
  'search.hint': {
    ru: 'Open Library хорошо знает англоязычные издания и почти не знает русские.',
    en: 'Open Library knows English editions well and Russian ones barely at all.',
  },
  'chart.rhythm': { ru: 'Страниц в день за полгода', en: 'Pages per day, last 26 weeks' },
  'chart.weeks': { ru: 'Страниц по неделям', en: 'Pages per week' },
  'chart.weekdays': { ru: 'Пн Ср Пт', en: 'M W F' },
  'chart.rest': { ru: 'Отдых', en: 'Rest' },
  'chart.nothing': { ru: 'Ничего', en: 'Nothing' },
  'chart.now': { ru: 'сейчас', en: 'now' },
  'chart.avg': { ru: 'в среднем {n}', en: 'avg {n}' },

  'shares.title': { ru: 'Из чего состоит полка', en: 'What the shelf is made of' },
  'shares.other': { ru: 'Прочее', en: 'Other' },
  'shares.empty': {
    ru: 'Проставь жанр или язык у книг, и разбивка появится.',
    en: 'Set a genre or a language on your books and the split appears.',
  },
  'lang.ru': { ru: 'Русский', en: 'Russian' },
  'lang.en': { ru: 'Английский', en: 'English' },

  'progress.noBooks': { ru: 'Пока ни одной книги.', en: 'No books yet.' },
  'progress.toShelf': { ru: 'На полку', en: 'To the shelf' },
  'progress.pickFocus': {
    ru: 'Выбери главную книгу — она будет стоять здесь.',
    en: 'Pick a focus book and it will stand here.',
  },
  'progress.alsoReading': { ru: 'Ещё читаю', en: 'Also reading' },
  'progress.week': { ru: 'За 7 дней', en: 'Last 7 days' },
  'progress.streak': { ru: 'Подряд', en: 'Streak' },
  'progress.finishedYear': { ru: 'Прочитано за год', en: 'Finished this year' },
  'progress.yearInBooks': { ru: 'Год в книгах', en: 'The year in books' },
  'progress.yearEmpty': {
    ru: 'Дочитанные книги встанут сюда обложками.',
    en: 'Finished books will stand here, covers out.',
  },
  'progress.recentNotes': { ru: 'Последние мысли', en: 'Latest thoughts' },
  'progress.notesEmpty': {
    ru: 'Мысли из сессий будут появляться здесь — чтобы не забывались.',
    en: 'Thoughts from your sessions will surface here, so they are not lost.',
  },
  'progress.stuck': { ru: 'Застряли', en: 'Gone quiet' },
  'progress.stuckHint': { ru: 'Читаю, но больше двух недель без сессий', en: 'Being read, but untouched for over two weeks' },
  'progress.stuckEmpty': { ru: 'Ничего не простаивает.', en: 'Nothing is stalling.' },
  'progress.rhythmHint': { ru: 'Точка на день. Крупнее — больше страниц.', en: 'One dot per day. Bigger is more pages.' },
  'progress.weeksHint': { ru: 'Последние 12 недель', en: 'Last 12 weeks' },
  'progress.noSessions': { ru: 'Сессий пока нет', en: 'No sessions yet' },  'progress.ofTotal': { ru: 'из {n}', en: 'of {n}' },
  // The unit on its own: the tile already shows the number in large type.
  'progress.dayUnit': {
    ru: { one: 'день', few: 'дня', many: 'дней' },
    en: { one: 'day', other: 'days' },
  },
  'book.back': { ru: 'Полка', en: 'Shelf' },
  'book.progress': { ru: 'Прогресс', en: 'Progress' },
  'book.time': { ru: 'Время', en: 'Time' },
  'book.pace': { ru: 'Темп', en: 'Pace' },
  'book.left': { ru: 'Осталось', en: 'Left' },
  'book.pages': { ru: 'Страницы', en: 'Pages' },
  'book.unknown': { ru: '—', en: '—' },
  'book.noTime': { ru: 'не записано', en: 'not recorded' },
  'book.noTimeHint': {
    ru: 'Поставь минуты хотя бы в одной сессии — дальше время и остаток посчитаются сами.',
    en: 'Put minutes on one session and the time and the estimate work themselves out.',
  },
  'book.approx': { ru: 'часть времени оценена по твоему темпу', en: 'part of this is estimated from your pace' },
  'book.perPage': { ru: '{n} мин/стр', en: '{n} min/page' },
  'book.statusLabel': { ru: 'Статус', en: 'Status' },
  'book.actions': { ru: 'Действия', en: 'Actions' },
  'book.sessions': { ru: 'Сессии', en: 'Sessions' },
  'book.sessionsEmpty': { ru: 'Пока ни одной сессии.', en: 'No sessions yet.' },
  'book.notes': { ru: 'Мысли', en: 'Thoughts' },
  'book.notesEmpty': {
    ru: 'Здесь будет всё, что ты вынесла из этой книги.',
    en: 'Everything you took from this book will be here.',
  },
  'book.allTags': { ru: 'Все', en: 'All' },

  'session.log': { ru: 'Записать сессию', en: 'Log a session' },
  'session.title': { ru: 'Сессия чтения', en: 'Reading session' },
  'session.date': { ru: 'Дата', en: 'Date' },
  'session.from': { ru: 'От страницы', en: 'From page' },
  'session.to': { ru: 'До страницы', en: 'To page' },
  'session.minutes': { ru: 'Минуты', en: 'Minutes' },
  'session.minutesHint': {
    ru: 'Необязательно, но с ними появятся темп и прогноз.',
    en: 'Optional, but they unlock the pace and the estimate.',
  },
  'session.how': { ru: 'Как пошло', en: 'How it went' },
  'session.pagesRead': { ru: 'Прочитано за сессию: {n}', en: 'Read this session: {n}' },
  'session.toMustGrow': {
    ru: 'Страница «до» не может быть меньше страницы «от».',
    en: 'The page you stopped at cannot be before the page you started from.',
  },
  'session.finishedAsk': {
    ru: 'Похоже, книга дочитана. Отметить как прочитанную?',
    en: 'Looks like the book is finished. Mark it as read?',
  },
  'session.addNote': { ru: '+ мысль', en: '+ a thought' },
  'session.removeNote': { ru: 'Убрать', en: 'Remove' },
  'session.noteOnPage': { ru: 'стр. {n}', en: 'p. {n}' },

  'tag.quote': { ru: 'Цитата', en: 'Quote' },
  'tag.idea': { ru: 'Идея', en: 'Idea' },
  'tag.question': { ru: 'Вопрос', en: 'Question' },
  'tag.disagree': { ru: 'Несогласие', en: 'Disagreement' },
  'tag.feeling': { ru: 'Чувство', en: 'Feeling' },

  'tagHint.quote': {
    ru: 'Выпиши строчку — и почему она зацепила.',
    en: 'Write the line down — and why it caught you.',
  },
  'tagHint.idea': {
    ru: 'Своими словами: о чём она и с чем у тебя связана.',
    en: 'In your own words: what it is, and what it connects to.',
  },
  'tagHint.question': {
    ru: 'Что осталось непонятным или что хочется проверить.',
    en: 'What stayed unclear, or what you want to check.',
  },
  'tagHint.disagree': {
    ru: 'С чем ты не согласна и на чём основано твоё возражение.',
    en: 'What you disagree with, and what your objection rests on.',
  },
  'tagHint.feeling': {
    ru: 'Что ты почувствовала в этом месте.',
    en: 'What you felt at this point.',
  },

  'face.1': { ru: 'тяжело', en: 'rough' },
  'face.2': { ru: 'так себе', en: 'meh' },
  'face.3': { ru: 'нормально', en: 'okay' },
  'face.4': { ru: 'хорошо', en: 'good' },
  'face.5': { ru: 'отлично', en: 'great' },
} satisfies Dict

export type DictKey = keyof typeof DICT
