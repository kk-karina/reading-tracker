import type { Dict } from './translate'

/** Ключи раздела обучения. Оба языка рядом — пропуск видно глазом и ловит tsc. */
export const LEARNING = {
  'nav.reading': { ru: 'Чтение', en: 'Reading' },
  'nav.hub': { ru: 'Лернинг Хаб', en: 'Learning Hub' },
  'nav.dashboard': { ru: 'Дашборд', en: 'Dashboard' },
  'nav.studying': { ru: 'Изучаю', en: 'Studying' },
  'nav.backlog': { ru: 'Бэклог', en: 'Backlog' },
  'nav.notes': { ru: 'Заметки', en: 'Notes' },

  'learning.newMaterial': { ru: 'Новый материал', en: 'New material' },

  'hub.title': { ru: 'Лернинг Хаб', en: 'Learning Hub' },
  'hub.empty': {
    ru: 'Пока ни одного потока. Поток — это область, в которой ты учишься.',
    en: 'No streams yet. A stream is an area you are learning in.',
  },
  'hub.newStream': { ru: 'Новый поток', en: 'New stream' },
  'hub.suggest': { ru: 'Или сразу один из этих:', en: 'Or start with one of these:' },
  'hub.archiveShort': { ru: 'Архив ({n})', en: 'Archive ({n})' },
  'hub.archived': {
    ru: { one: 'Архив потоков ({n})', few: 'Архив потоков ({n})', many: 'Архив потоков ({n})' },
    en: { one: 'Archived streams ({n})', other: 'Archived streams ({n})' },
  },
  'hub.materialCount': {
    ru: { one: '{n} материал', few: '{n} материала', many: '{n} материалов' },
    en: { one: '{n} material', other: '{n} materials' },
  },

  'stream.goal': { ru: 'Цель', en: 'Goal' },
  'stream.goalEmpty': { ru: 'Зачем этот поток?', en: 'What is this stream for?' },
  'stream.focus': { ru: 'Сейчас в фокусе', en: 'In focus now' },
  'stream.focusEmpty': { ru: 'Выбери, за что сесть.', en: 'Choose what to sit down with.' },
  'stream.open': { ru: 'Открыть', en: 'Open' },
  // Не считаемый: «из 8 недель» не склоняется от n.
  'stream.activeWeeks': {
    ru: 'Активна {n} из 8 недель',
    en: 'Active {n} of the last 8 weeks',
  },
  'stream.lastNote': { ru: 'последняя запись {date}', en: 'last note {date}' },
  'stream.neverNoted': { ru: 'записей пока нет', en: 'no notes yet' },

  'stream.continue': { ru: 'Продолжить', en: 'Continue' },

  // Дашборд: три зоны экрана. Названия отвечают на вопрос, а не называют
  // сущность, — «Как идёт», а не «Статистика».
  'stream.zoneNow': { ru: 'Сейчас', en: 'Right now' },
  'stream.zoneRhythm': { ru: 'Как идёт', en: 'How it is going' },
  'stream.zoneThinking': { ru: 'Что осталось', en: 'What it left' },
  'stream.zoneQueue': { ru: 'Очередь', en: 'The queue' },
  'stream.goalHint': { ru: 'Нажми, чтобы изменить цель', en: 'Click to edit the goal' },
  'stream.moreStudying': {
    ru: { one: 'и ещё {n}', few: 'и ещё {n}', many: 'и ещё {n}' },
    en: { one: 'and {n} more', other: 'and {n} more' },
  },

  'study.log': { ru: 'Записать занятие', en: 'Log a session' },
  'study.logShort': { ru: 'Записать', en: 'Log it' },
  'study.willBe': { ru: 'Станет {done} из {total}', en: 'That makes it {done} of {total}' },
  'study.willBeNoTotal': {
    ru: { one: 'Станет {n} конспект', few: 'Станет {n} конспекта', many: 'Станет {n} конспектов' },
    en: { one: 'That makes {n} note', other: 'That makes {n} notes' },
  },
  'stream.alsoStudying': { ru: 'Ещё изучаю', en: 'Also studying' },
  'stream.weekNotes': { ru: 'Конспектов за 7 дней', en: 'Notes in the last 7 days' },
  'stream.inDays': {
    ru: { one: 'в {n} дне', few: 'в {n} днях', many: 'в {n} днях' },
    en: { one: 'on {n} day', other: 'on {n} days' },
  },
  'stream.streakScope': { ru: 'во всём обучении', en: 'across all learning' },
  'stream.notesRecent': { ru: 'Последние конспекты', en: 'Latest notes' },
  'stream.notesAll': { ru: 'Все заметки', en: 'All notes' },
  'stream.notesNone': { ru: 'Конспектов пока нет.', en: 'No notes yet.' },
  'stream.resources': { ru: 'Ресурсы и бэклог', en: 'Resources and backlog' },
  'stream.resourcesNone': {
    ru: 'В бэклоге пусто — добавить нечего разбирать.',
    en: 'The backlog is empty — nothing waiting to be sorted.',
  },
  'stream.thought': { ru: 'Мысль недели', en: 'Thought of the week' },
  'chart.studyRhythm': {
    ru: 'Конспектов в день за полгода',
    en: 'Notes per day, last 26 weeks',
  },

  'stream.name': { ru: 'Название', en: 'Name' },
  'stream.icon': { ru: 'Иконка', en: 'Icon' },
  'stream.accent': { ru: 'Цвет', en: 'Colour' },
  'stream.outline': { ru: 'Контур конспекта', en: 'Note outline' },
  'stream.outlineHint': {
    ru: 'Подставляется в новый конспект этого потока. Можно стереть — это обычный текст.',
    en: 'Pre-filled into a new note in this stream. Delete it freely — it is plain text.',
  },
  'stream.edit': { ru: 'Настроить поток', en: 'Edit stream' },
  'stream.delete': { ru: 'Удалить поток', en: 'Delete stream' },
  'stream.confirmDelete': {
    ru: 'Удалить поток вместе со всеми его материалами и конспектами?',
    en: 'Delete the stream with all its materials and notes?',
  },

  'material.title': { ru: 'Название', en: 'Title' },
  'material.author': { ru: 'Автор', en: 'Author' },
  'material.url': { ru: 'Ссылка', en: 'Link' },
  'material.kind': { ru: 'Вид', en: 'Kind' },
  'material.status': { ru: 'Статус', en: 'Status' },
  'material.scale': { ru: 'Считать по', en: 'Count by' },
  'scale.pages': { ru: 'Страницам', en: 'Pages' },
  'scale.parts': { ru: 'Главам', en: 'Chapters' },

  'material.pagesTotal': { ru: 'Сколько страниц', en: 'How many pages' },
  'material.chaptersTotal': { ru: 'Сколько глав', en: 'How many chapters' },
  'material.lecturesTotal': { ru: 'Сколько лекций', en: 'How many lectures' },
  'material.page': { ru: 'На какой странице', en: 'Current page' },

  'part.chapter': { ru: 'Глава {n}', en: 'Chapter {n}' },
  'part.lecture': { ru: 'Лекция {n}', en: 'Lecture {n}' },
  'part.chapters': { ru: 'Главы', en: 'Chapters' },
  'part.lectures': { ru: 'Лекции', en: 'Lectures' },
  'part.add': { ru: 'Добавить', en: 'Add' },
  'part.remove': { ru: 'Убрать', en: 'Remove' },
  'part.rename': { ru: 'Название части', en: 'Part name' },
  'part.confirmDrop': {
    ru: 'Среди убираемых частей есть пройденные. Отметки пропадут. Убрать?',
    en: 'Some of the parts being removed are marked done. Those marks will be lost. Remove?',
  },

  'material.read': { ru: 'Прочитано', en: 'Read' },
  'material.watched': { ru: 'Просмотрено', en: 'Watched' },

  'material.coverUpload': { ru: 'Загрузить файл', en: 'Upload a file' },
  'material.coverBadType': {
    ru: 'Это не картинка. Нужен файл изображения.',
    en: 'That is not an image file.',
  },
  'material.coverTooBig': {
    ru: 'Картинка слишком тяжёлая даже после сжатия. Возьми файл поменьше.',
    en: 'The image is too heavy even after compression. Try a smaller file.',
  },
  'material.coverBroken': {
    ru: 'Не получилось прочитать эту картинку.',
    en: 'That image could not be read.',
  },

  'material.progressPages': { ru: '{done} из {total} стр.', en: 'p. {done} of {total}' },
  'material.partsHint': {
    ru: 'Необязательно. Если указано, виден прогресс.',
    en: 'Optional. Fills in the progress line when set.',
  },
  'material.edit': { ru: 'Настроить материал', en: 'Edit material' },
  'material.delete': { ru: 'Удалить материал', en: 'Delete material' },
  'material.confirmDelete': {
    ru: 'Удалить материал вместе с его конспектами?',
    en: 'Delete the material and its notes?',
  },
  'material.notesEmpty': {
    ru: 'Конспектов пока нет. Глава считается пройденной, когда по ней есть конспект.',
    en: 'No notes yet. A chapter counts as done when there is a note for it.',
  },
  'material.progress': { ru: '{done} из {total}', en: '{done} of {total}' },
  'material.cover': { ru: 'Обложка', en: 'Cover' },
  'material.fetch': { ru: 'Заполнить по ссылке', en: 'Fill in from the link' },
  'material.fetching': { ru: 'Читаю ссылку…', en: 'Reading the link…' },
  'material.fetchNothing': {
    ru: 'По этой ссылке ничего не нашлось — впиши руками.',
    en: 'Nothing came back from that link — type it in by hand.',
  },
  'material.fetchHint': {
    ru: 'Адрес уйдёт стороннему сервису, который читает разметку страницы.',
    en: 'The address goes to a third-party service that reads the page markup.',
  },
  'material.coverClear': { ru: 'Убрать обложку', en: 'Remove the cover' },
  'material.makeFocus': { ru: 'Сделать фокусом потока', en: 'Make it the stream focus' },
  'material.isFocus': { ru: 'В фокусе потока', en: 'The stream focus' },

  'kind.book': { ru: 'Книга', en: 'Book' },
  'kind.article': { ru: 'Статья', en: 'Article' },
  'kind.course': { ru: 'Курс', en: 'Course' },
  'kind.video': { ru: 'Видео', en: 'Video' },

  'mstatus.inbox': { ru: 'Входящее', en: 'Inbox' },
  'mstatus.active': { ru: 'В работе', en: 'Active' },
  'mstatus.someday': { ru: 'Когда-нибудь', en: 'Someday' },
  'mstatus.done': { ru: 'Пройдено', en: 'Done' },
  'mstatus.reference': { ru: 'Справка', en: 'Reference' },
  'mstatus.dropped': { ru: 'Брошено', en: 'Dropped' },

  'studying.empty': {
    ru: 'Ничего не изучается. Возьми что-нибудь из бэклога.',
    en: 'Nothing in progress. Take something from the backlog.',
  },
  'studying.emptyBacklog': {
    ru: 'Ничего не изучается, и бэклог пуст.',
    en: 'Nothing in progress, and the backlog is empty.',
  },
  'studying.continue': { ru: 'Продолжить', en: 'Continue' },
  'studying.makeFocus': { ru: 'Сделать фокусом', en: 'Make it the focus' },
  'studying.toBacklog': { ru: 'Вернуть в бэклог', en: 'Back to backlog' },
  'studying.finish': { ru: 'Пройдено', en: 'Done' },
  'studying.openBacklog': { ru: 'Открыть бэклог', en: 'Open the backlog' },

  // Вкладка архива в бэклоге объединяет статусы done/dropped, у неё нет
  // отдельного mstatus — имя берётся из словаря самого экрана.
  'backlog.tabArchive': { ru: 'Архив', en: 'Archive' },
  'backlog.take': { ru: 'Взять в работу', en: 'Take it on' },
  'backlog.emptyInbox': {
    ru: 'Входящих нет. Всё разобрано.',
    en: 'Nothing in the inbox. All sorted.',
  },
  'backlog.emptySomeday': {
    ru: 'Здесь пусто. Сюда уходит то, что не выкинуть и не взять сейчас.',
    en: 'Empty. This is where things go that you will not drop but will not start either.',
  },
  'backlog.emptyReference': {
    ru: 'Справочников пока нет.',
    en: 'No reference material yet.',
  },
  'backlog.emptyArchive': {
    ru: 'Архив пуст.',
    en: 'The archive is empty.',
  },

  'note.new': { ru: 'Новый конспект', en: 'New note' },
  'note.part': { ru: 'Глава или часть', en: 'Chapter or part' },
  'note.partPlaceholder': { ru: 'Глава 1. Название', en: 'Chapter 1. Title' },
  'note.body': { ru: 'Конспект', en: 'Note' },
  'note.bodyPlaceholder': {
    ru: 'Пиши как в тетради. ## заголовок, - список, > цитата, ==главное==.',
    en: 'Write as in a notebook. ## heading, - list, > quote, ==highlight==.',
  },
  'note.highlight': { ru: 'Выделить главное', en: 'Highlight' },
  'note.edit': { ru: 'Править', en: 'Edit' },
  'note.empty': { ru: 'Лист пока пустой.', en: 'The sheet is still empty.' },
  'note.delete': { ru: 'Удалить конспект', en: 'Delete note' },
  'note.confirmDelete': { ru: 'Удалить этот конспект?', en: 'Delete this note?' },
  'note.count': {
    ru: { one: '{n} конспект', few: '{n} конспекта', many: '{n} конспектов' },
    en: { one: '{n} note', other: '{n} notes' },
  },
  // Короткая форма для строки-сводки дашборда: рядом со счётчиком, не отдельным предложением.
  'note.last': { ru: 'последний {date}', en: 'last {date}' },
  'notes.empty': {
    ru: 'Конспектов пока нет. Глава считается пройденной, когда по ней есть конспект.',
    en: 'No notes yet. A chapter counts as done when there is a note for it.',
  },
  'notes.allTags': { ru: 'Все', en: 'All' },
} satisfies Dict
