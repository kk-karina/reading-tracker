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
} satisfies Dict

export type DictKey = keyof typeof DICT
