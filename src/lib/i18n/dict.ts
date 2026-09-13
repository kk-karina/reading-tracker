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
} satisfies Dict

export type DictKey = keyof typeof DICT
