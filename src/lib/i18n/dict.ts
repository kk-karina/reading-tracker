import type { Dict } from './translate'
import { LEARNING } from './learning'

/**
 * Both languages sit side by side so a missing one is visible while editing.
 * Countable strings hold plural categories: Russian needs one/few/many, English one/other.
 * `satisfies Dict` keeps the shape honest without widening the key type.
 */
const BASE = {
  'app.name': { ru: 'Дневник чтения', en: 'Reading tracker' },

  'nav.progress': { ru: 'Прогресс', en: 'Progress' },
  'nav.shelf': { ru: 'Полка', en: 'Shelf' },
  // Сессии и мысли — разные вкладки раздела, как у самой книги: журнал того,
  // как шло чтение, и хранилище того, что от него осталось.
  'nav.sessions': { ru: 'Сессии', en: 'Sessions' },
  'nav.thoughts': { ru: 'Мысли', en: 'Thoughts' },

  'locale.label': { ru: 'Язык интерфейса', en: 'Interface language' },

  'error.loadFailed': {
    ru: 'Не удалось загрузить данные. Твои книги на месте — до них просто не дошёл запрос.',
    en: 'The data did not load. Your books are still there; the request just did not reach them.',
  },
  'error.retry': { ru: 'Попробовать снова', en: 'Try again' },
  'error.retrying': { ru: 'Загружаю…', en: 'Loading…' },

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
  // Записи о книге в чтении везде зовутся мыслями — и во вкладке, и в
  // фильтре дневника. «Заметки» оставались только в счётчике.
  'count.notes': {
    ru: { one: '{n} мысль', few: '{n} мысли', many: '{n} мыслей' },
    en: { one: '{n} thought', other: '{n} thoughts' },
  },
  'count.pages': {
    ru: { one: '{n} страница', few: '{n} страницы', many: '{n} страниц' },
    en: { one: '{n} page', other: '{n} pages' },
  },
  'count.days': {
    ru: { one: '{n} день', few: '{n} дня', many: '{n} дней' },
    en: { one: '{n} day', other: '{n} days' },
  },

  'profile.title': { ru: 'Профиль', en: 'Profile' },
  'profile.export': { ru: 'Скачать всё в JSON', en: 'Download all as JSON' },
  'profile.carry': { ru: 'Перенести обучение в облако', en: 'Move learning to the cloud' },
  'profile.import': { ru: 'Загрузить из JSON', en: 'Load from JSON' },
  'profile.importNote': { ru: 'заменит всё на устройстве', en: 'replaces everything here' },
  'profile.clear': { ru: 'Стереть всё с устройства', en: 'Erase this device' },
  'avatar.prev': { ru: 'Предыдущий аватар', en: 'Previous avatar' },
  'avatar.next': { ru: 'Следующий аватар', en: 'Next avatar' },
  // Лист называется так же, как кнопка, которая его открыла.
  'avatar.change': { ru: 'Сменить аватар', en: 'Change avatar' },
  // Подписи для экранного диктора: в сетке видны только рисунки.
  'avatar.shades': { ru: 'В тёмных очках', en: 'In sunglasses' },
  'avatar.books': { ru: 'Со стопкой книг', en: 'With a stack of books' },
  'avatar.music': { ru: 'Слушает музыку', en: 'Listening to music' },
  'avatar.coffee': { ru: 'С чашкой', en: 'With a cup' },
  'avatar.cap': { ru: 'В кепке', en: 'In a cap' },
  'avatar.cheeks': { ru: 'Щёки в ладонях', en: 'Cheeks in hands' },
  'avatar.reading': { ru: 'Читает', en: 'Reading' },
  'avatar.bun': { ru: 'С пучком', en: 'With a hair bun' },
  'avatar.glasses': { ru: 'В круглых очках', en: 'In round glasses' },
  'avatar.cat': { ru: 'С котом', en: 'With a cat' },
  'avatar.panama': { ru: 'В панаме', en: 'In a bucket hat' },
  'avatar.hair': { ru: 'С длинными волосами', en: 'With long hair' },
  'avatar.pencil': { ru: 'С карандашом', en: 'With a pencil' },
  'avatar.hoodie': { ru: 'В худи', en: 'In a hoodie' },
  'avatar.roof': { ru: 'Книга домиком', en: 'Book as a roof' },
  'avatar.headphones': { ru: 'В больших наушниках', en: 'In big headphones' },
  'avatar.flower': { ru: 'С цветком', en: 'With a flower' },
  'avatar.hug': { ru: 'Обнимает колени', en: 'Hugging knees' },
  'avatar.ponytail': { ru: 'С хвостиком', en: 'With a ponytail' },
  'avatar.stack': { ru: 'С горой книг', en: 'With a pile of books' },

  'settings.signOut': { ru: 'Выйти', en: 'Sign out' },
  'settings.localMode': {
    ru: 'Локальный режим — данные остаются в этом браузере',
    en: 'Local mode — data stays in this browser',
  },
  'settings.language': { ru: 'Язык', en: 'Language' },
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
  'settings.confirmClear': {
    ru: 'Удалить все локальные данные? Это необратимо.',
    en: 'Delete all local data? This cannot be undone.',
  },

  // Перенос обучения в облако. Обычно случается сам при первом входе; строка
  // в профиле нужна для случая, когда сам он не взялся: в облаке уже что-то
  // есть, а в браузере осталось написанное до аккаунта.
  'settings.carryDone': {
    ru: 'Перенесено: {n}. Локальная копия осталась на месте.',
    en: 'Moved {n} rows. The local copy stays where it was.',
  },
  'settings.carryNothing': { ru: 'Переносить нечего.', en: 'Nothing to move.' },
  'settings.carryWorking': { ru: 'Переношу…', en: 'Moving…' },
  'count.rows': {
    ru: { one: '{n} строка', few: '{n} строки', many: '{n} строк' },
    en: { one: '{n} row', other: '{n} rows' },
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
  'soon.book': {
    ru: 'Страница книги появится на второй фазе.',
    en: 'The book page arrives in phase two.',
  },
  'status.want': { ru: 'Хочу прочитать', en: 'Want to read' },
  'status.reading': { ru: 'Читаю', en: 'Reading' },
  'status.finished': { ru: 'Прочитано', en: 'Finished' },

  'shelf.add': { ru: 'Добавить книгу', en: 'Add a book' },
  'shelf.empty': { ru: 'Полка пока пустая', en: 'The shelf is empty' },
  'shelf.emptyBody': {
    ru: 'Добавь книгу — дальше прогресс, темп и остаток считаются сами, из сессий.',
    en: 'Add a book — progress, pace and what is left all count themselves from your sessions.',
  },
  'shelf.loadSample': { ru: 'Загрузить пример', en: 'Load a sample shelf' },
  'shelf.view': { ru: 'Вид полки', en: 'Shelf view' },
  'shelf.viewGrid': { ru: 'Сетка', en: 'Grid' },
  'shelf.viewReel': { ru: 'Лента', en: 'Reel' },
  'shelf.status': { ru: 'Статус книг', en: 'Book status' },
  'shelf.allStatuses': { ru: 'Все', en: 'All' },

  'reel.back': { ru: 'Назад по полке', en: 'Back along the shelf' },
  'reel.forward': { ru: 'Вперёд по полке', en: 'Forward along the shelf' },

  'settings.sample': { ru: 'Добавить примеры', en: 'Add the sample books' },
  'settings.sampleLoading': { ru: 'Добавляю…', en: 'Adding…' },
  'settings.sampleAdded': {
    ru: { one: 'Добавлена {n} книга.', few: 'Добавлено {n} книги.', many: 'Добавлено {n} книг.' },
    en: { one: 'Added {n} book.', other: 'Added {n} books.' },
  },
  'settings.sampleNone': {
    ru: 'Все примерные книги уже на полке.',
    en: 'Every sample book is already on the shelf.',
  },

  'book.pagesOf': { ru: '{page} из {total}', en: '{page} of {total}' },
  'book.pagesUnknown': { ru: 'страниц не указано', en: 'page count not set' },
  'book.notOpened': { ru: 'Ещё не открыта', en: 'Not opened yet' },
  'book.lastRead': { ru: 'Последний раз {date}', en: 'Last read {date}' },
  // «Фокус», как и в обучении: понятие одно, и в одном разделе оно не может
  // зваться «главной книгой», а в соседнем — фокусом потока.
  'book.makeFocus': { ru: 'Сделать фокусом', en: 'Make it the focus' },
  'book.isFocus': { ru: 'В фокусе', en: 'In focus' },
  'book.edit': { ru: 'Изменить', en: 'Edit' },
  'book.delete': { ru: 'Удалить', en: 'Delete' },
  'book.confirmDelete': {
    ru: 'Удалить книгу вместе с её сессиями и мыслями?',
    en: 'Delete the book together with its sessions and thoughts?',
  },
  'book.notFound': { ru: 'Такой книги нет', en: 'No such book' },
  'book.notFoundBody': {
    ru: 'Её могли удалить — или ссылка пришла из прошлой жизни полки.',
    en: 'It may have been deleted, or the link is from an older life of the shelf.',
  },
  'book.sessionsSoon': {
    ru: 'Сессии и мысли появятся на третьей фазе.',
    en: 'Sessions and thoughts arrive in phase three.',
  },

  'form.title': { ru: 'Название', en: 'Title' },
  'form.author': { ru: 'Автор', en: 'Author' },
  'form.pages': { ru: 'Страниц', en: 'Pages' },
  'form.save': { ru: 'Сохранить', en: 'Save' },

  // Лист: закрыть, и вопрос, когда закрывают набранное.
  'sheet.close': { ru: 'Закрыть', en: 'Close' },
  'sheet.unsaved': { ru: 'Не сохранено', en: 'Not saved' },
  'sheet.discard': { ru: 'Закрыть всё равно', en: 'Close anyway' },

  // Композер — одна форма заведения книги и материала.
  'compose.capture': { ru: 'Ссылка или название', en: 'A link or a title' },
  'compose.captureHint': {
    ru: 'По ссылке заполню карточку сама. По названию найду книгу в Open Library.',
    en: 'A link fills the card in from the page. A title looks the book up in Open Library.',
  },
  'compose.search': { ru: 'Найти книгу', en: 'Look the book up' },
  'compose.manual': { ru: 'Заполнить вручную', en: 'Fill in by hand' },
  'compose.found': { ru: 'Найденные книги', en: 'Books found' },
  'compose.pagesShort': { ru: '{n} стр.', en: '{n} p.' },
  'compose.asIs': { ru: 'Без поиска: «{title}»', en: 'Without search: “{title}”' },
  'compose.untitled': { ru: 'Без названия', en: 'Untitled' },
  'compose.editLink': { ru: 'Изменить', en: 'Edit' },
  'compose.addLink': { ru: 'Добавить ссылку', en: 'Add a link' },
  'compose.linkPlaceholder': { ru: 'Ссылка на страницу, https://…', en: 'Link to the page, https://…' },
  'compose.titlePlaceholder': { ru: 'Название', en: 'Title' },
  'compose.authorPlaceholder': { ru: 'Автор', en: 'Author' },
  'compose.coverFile': {
    ru: 'Загрузить картинку — можно и перетащить, и вставить',
    en: 'Upload an image — or drop it, or paste it',
  },
  'compose.coverUrl': { ru: 'Картинка по ссылке', en: 'Image from a link' },
  'compose.coverUrlPlaceholder': { ru: 'Адрес картинки, Enter', en: 'Image address, Enter' },
  'compose.coverClear': { ru: 'Убрать обложку', en: 'Remove the cover' },
  'compose.open': { ru: 'Открыть', en: 'Open' },
  'compose.blockHint': {
    ru: 'Вторую такую же не завести — открой ту, что есть.',
    en: 'A second one cannot be added — open the one you have.',
  },
  'compose.copyHint': {
    ru: 'Добавится копия со всем, что там уже заполнено. Прогресс у неё будет свой.',
    en: 'A copy is added with everything already filled in there. Its progress is its own.',
  },
  'compose.blockShelf': { ru: 'Такая книга уже стоит на полке', en: 'This book is already on the shelf' },
  'compose.blockStream': { ru: 'Это уже есть в этом потоке', en: 'This is already in the stream' },
  'compose.onShelf': { ru: 'Эта книга есть на полке', en: 'This book is on the shelf' },
  'compose.inStream': { ru: 'Это есть в потоке «{stream}»', en: 'This is in “{stream}”' },
  'compose.copyToMaterials': { ru: 'Продублировать книгу в материалы', en: 'Copy the book to materials' },
  'compose.copyToStream': { ru: 'Продублировать в этот поток', en: 'Copy into this stream' },
  'compose.copyToShelf': { ru: 'Продублировать книгу на полку', en: 'Copy the book to the shelf' },
  'compose.own': { ru: 'Твои книги', en: 'Your books' },
  'compose.ownShelf': { ru: 'на полке', en: 'on the shelf' },
  'compose.ownStream': { ru: 'в потоке «{stream}»', en: 'in “{stream}”' },
  // Единица после числа, согласованная с ним: «1 глава», «3 главы», «12 глав».
  'compose.unitPages': {
    ru: { one: 'страница', few: 'страницы', many: 'страниц' },
    en: { one: 'page', other: 'pages' },
  },
  'compose.unitChapters': {
    ru: { one: 'глава', few: 'главы', many: 'глав' },
    en: { one: 'chapter', other: 'chapters' },
  },
  'compose.unitLectures': {
    ru: { one: 'лекция', few: 'лекции', many: 'лекций' },
    en: { one: 'lecture', other: 'lectures' },
  },
  'compose.delete': { ru: 'Удалить', en: 'Delete' },
  'compose.add': { ru: 'Добавить', en: 'Add' },

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
  'chart.weeksEmpty': {
    ru: 'Стопки начнут расти с первой сессии',
    en: 'The piles start growing with your first session',
  },
  'chart.now': { ru: 'сейчас', en: 'now' },
  'chart.avg': { ru: 'в среднем {n}', en: 'avg {n}' },


  'progress.noBooks': { ru: 'Пока ни одной книги', en: 'No books yet' },
  'progress.noBooksBody': {
    ru: 'Полка — начало всего: ритм, темп и итоги года считаются из того, что на ней стоит.',
    en: 'The shelf starts everything: rhythm, pace and the year all count from what stands on it.',
  },
  'progress.toShelf': { ru: 'На полку', en: 'To the shelf' },
  'progress.pickFocus': { ru: 'Книга в фокусе не выбрана', en: 'No focus book picked' },
  'progress.pickFocusBody': {
    ru: 'Открой ту, которую читаешь сейчас, и сделай её фокусом — она встанет сюда.',
    en: 'Open the one you are reading now and make it the focus — it will stand here.',
  },
  'progress.alsoReading': { ru: 'Ещё читаю', en: 'Also reading' },
  'progress.week': { ru: 'За 7 дней', en: 'Last 7 days' },
  'progress.streak': { ru: 'Подряд', en: 'Streak' },
  'progress.finishedYear': { ru: 'Прочитано за год', en: 'Finished this year' },
  'progress.yearInBooks': { ru: 'Год в книгах', en: 'The year in books' },
  'progress.yearEmpty': { ru: 'Год ещё пустой', en: 'The year is still empty' },
  'progress.recentNotes': { ru: 'Последние мысли', en: 'Latest thoughts' },
  'progress.notesEmpty': { ru: 'Мыслей пока нет', en: 'No thoughts yet' },
  'progress.toJournal': { ru: 'Все мысли', en: 'All thoughts' },
  'progress.stuck': { ru: 'Застряли', en: 'Gone quiet' },
  'progress.stuckHint': { ru: 'Читаю, но больше двух недель без сессий', en: 'Being read, but untouched for over two weeks' },
  'progress.stuckEmpty': { ru: 'Ничего не простаивает', en: 'Nothing is stalling' },
  'progress.rhythmHint': { ru: 'Точка на день. Крупнее — больше страниц.', en: 'One dot per day. Bigger is more pages.' },
  'progress.weeksHint': { ru: 'Последние 12 недель', en: 'Last 12 weeks' },
  'progress.noSessions': { ru: 'Сессий пока нет', en: 'No sessions yet' },  'progress.ofTotal': { ru: 'из {n}', en: 'of {n}' },
  // The unit on its own: the tile already shows the number in large type.
  'progress.dayUnit': {
    ru: { one: 'день', few: 'дня', many: 'дней' },
    en: { one: 'day', other: 'days' },
  },
  'journal.book': { ru: 'Книга', en: 'Book' },
  'journal.allBooks': { ru: 'Все книги', en: 'All books' },
  'journal.emptyHere': { ru: 'Под этот фильтр ничего не попало', en: 'Nothing matches this filter' },

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
  // Единственный вопрос про статус, на который прочитанное не отвечает само.
  'book.sessions': { ru: 'Сессии', en: 'Sessions' },
  'book.sessionsEmpty': { ru: 'Пока ни одной сессии', en: 'No sessions yet' },
  'book.notes': { ru: 'Мысли', en: 'Thoughts' },
  'book.notesEmpty': {
    ru: 'Здесь будет всё, что ты вынесла из этой книги.',
    en: 'Everything you took from this book will be here.',
  },
  'book.allTags': { ru: 'Все', en: 'All' },

  // Вкладки книги — теми же словами, что фильтр дневника: там «Сессии» и
  // «Мысли», и одна и та же запись не должна менять имя по дороге.
  'book.tabReflection': { ru: 'Мысли', en: 'Thoughts' },
  'book.tabSessions': { ru: 'Сессии', en: 'Sessions' },
  'book.tabReview': { ru: 'Рецензия', en: 'Review' },
  'book.reviewLocked': {
    ru: 'Откроется, когда книга будет дочитана',
    en: 'Opens once the book is finished',
  },
  'book.reflectionEmpty': { ru: 'Пока ни одной мысли', en: 'No thoughts yet' },

  'review.lead': {
    ru: 'Пишется один раз, после последней страницы: это то, что ты вспомнишь о книге через год.',
    en: 'Written once, after the last page: it is what you will remember of the book a year from now.',
  },
  'review.how': { ru: 'Книга целиком', en: 'The book as a whole' },
  'review.text': { ru: 'Что это было', en: 'What it was' },
  'review.placeholder': {
    ru: 'О чём книга, что из неё осталось с тобой и кому её стоит дать.',
    en: 'What the book was about, what stayed with you, and who you would hand it to.',
  },
  'review.saved': { ru: 'Сохранено', en: 'Saved' },
  'review.finishedOn': { ru: 'Дочитано {date}', en: 'Finished {date}' },

  'session.log': { ru: 'Записать сессию', en: 'Log a session' },
  'session.book': { ru: 'Книга', en: 'Book' },
  'session.noBooks': {
    ru: 'На полке пока нет книг — сессия пишется по книге, так что сначала добавь её.',
    en: 'The shelf has no books yet — a session is about a book, so add one first.',
  },
  'session.date': { ru: 'Дата', en: 'Date' },
  'session.from': { ru: 'От страницы', en: 'From page' },
  'session.to': { ru: 'До страницы', en: 'To page' },
  'session.minutes': { ru: 'Минуты', en: 'Minutes' },
  'session.minutesHint': {
    ru: 'Необязательно, но с ними появятся темп и прогноз.',
    en: 'Optional, but they unlock the pace and the estimate.',
  },
  'session.how': { ru: 'Как пошло', en: 'How it went' },
  'session.toMustGrow': {
    ru: 'Страница «до» не может быть меньше страницы «от».',
    en: 'The page you stopped at cannot be before the page you started from.',
  },
  'session.editTitle': { ru: 'Правка сессии', en: 'Edit the session' },
  'session.delete': { ru: 'Удалить сессию', en: 'Delete session' },
  'session.confirmDelete': {
    ru: 'Удалить эту сессию? Мысли из неё останутся.',
    en: 'Delete this session? The thoughts from it stay.',
  },
  'session.removeNote': { ru: 'Убрать', en: 'Remove' },
  'session.noteOnPage': { ru: 'стр. {n}', en: 'p. {n}' },

  // Мысль без сессии — своя дверь. «Добавить», а не «Записать»: мысль заводят,
  // а записывают сессию.
  'group.byDay': { ru: 'По дням', en: 'By day' },
  'group.byBook': { ru: 'По книгам', en: 'By book' },
  'sessions.empty': { ru: 'Сессий пока нет', en: 'No sessions yet' },
  'sessions.emptyBody': {
    ru: 'Запиши, докуда дочитала, — сессии встанут сюда строками, по дням или по книгам.',
    en: 'Log how far you read — sessions line up here, by day or by book.',
  },
  'thoughts.empty': { ru: 'Мыслей пока нет', en: 'No thoughts yet' },
  'thoughts.emptyBody': {
    ru: 'Всё, что осталось в голове от чтения, соберётся здесь — с сессией или без.',
    en: 'Whatever stays with you from reading collects here — with a session or without.',
  },
  // Сколько мыслей или конспектов записано за сессией: значок и число в строке.
  'log.notesOpen': { ru: 'Показать написанное ({n})', en: 'Show what was written ({n})' },
  'log.notesClose': { ru: 'Скрыть написанное', en: 'Hide what was written' },
  'unit.pages': { ru: 'стр.', en: 'pp.' },
  'thought.add': { ru: 'Добавить мысль', en: 'Add a thought' },
  'thought.editTitle': { ru: 'Правка мысли', en: 'Edit the thought' },
  'thought.delete': { ru: 'Удалить мысль', en: 'Delete thought' },
  'thought.confirmDelete': { ru: 'Удалить эту мысль?', en: 'Delete this thought?' },
  'thought.noBooks': {
    ru: 'На полке пока нет книг — мысль пишется о книге, так что сначала добавь её.',
    en: 'The shelf has no books yet — a thought is about a book, so add one first.',
  },

  // Детали листов записи — общие для чтения и обучения.
  'step.pagesPlus': { ru: '+{n} стр.', en: '+{n} pp.' },
  'step.min': { ru: 'мин', en: 'min' },
  'step.pageShort': { ru: 'стр.', en: 'p.' },
  'step.pageOf': { ru: 'Страница, к которой мысль', en: 'Page the thought is about' },
  'draft.addThought': { ru: 'Мысль', en: 'Thought' },
  'draft.removed': { ru: 'Убрано', en: 'Removed' },
  'draft.undo': { ru: 'Вернуть', en: 'Undo' },

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

/** Раздел обучения живёт отдельным файлом: словарь чтения и без того большой. */
export const DICT = { ...BASE, ...LEARNING }
export type DictKey = keyof typeof DICT
