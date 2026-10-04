import type { Dict } from './translate'

/** Ключи раздела обучения. Оба языка рядом — пропуск видно глазом и ловит tsc. */
export const LEARNING = {
  'nav.reading': { ru: 'Чтение', en: 'Reading' },
  'nav.hub': { ru: 'Лернинг Хаб', en: 'Learning Hub' },
  'nav.dashboard': { ru: 'Дашборд', en: 'Dashboard' },
  'nav.materials': { ru: 'Материалы', en: 'Materials' },
  // Раздел называется тем, что в нём лежит. «Заметки» — это про пометки на
  // полях; здесь пишут конспект занятия.
  'nav.notes': { ru: 'Конспекты', en: 'Notes' },
  // Занятия — журнал прогресса потока, рядом со своим хранилищем конспектов:
  // те же две вкладки, что у материала.
  'nav.studySessions': { ru: 'Занятия', en: 'Sessions' },
  'sjournal.material': { ru: 'Материал', en: 'Material' },
  'sjournal.allMaterials': { ru: 'Все материалы', en: 'All materials' },
  'group.byMaterial': { ru: 'По материалам', en: 'By material' },
  'ssessions.empty': { ru: 'Занятий пока нет', en: 'No sessions yet' },
  'ssessions.emptyBody': {
    ru: 'Запиши, что прошла, — занятия встанут сюда строками, по дням или по материалам.',
    en: 'Log what you got through — sessions line up here, by day or by material.',
  },
  'notes.empty': { ru: 'Конспектов пока нет', en: 'No notes yet' },
  'notes.emptyBody': {
    ru: 'Всё, что ты записала по материалам потока, соберётся здесь — с занятием или без.',
    en: 'Everything you write down across the stream collects here — with a session or without.',
  },
  'unit.lectures': {
    ru: { one: 'лекция', few: 'лекции', many: 'лекций' },
    en: { one: 'lecture', other: 'lectures' },
  },
  'unit.chapters': {
    ru: { one: 'глава', few: 'главы', many: 'глав' },
    en: { one: 'chapter', other: 'chapters' },
  },
  'sjournal.whole': { ru: 'целиком', en: 'in full' },
  'material.notFound': { ru: 'Материал удалён', en: 'Material deleted' },
  'material.tabSessions': { ru: 'Занятия', en: 'Sessions' },
  'material.sessionsEmpty': { ru: 'Занятий пока нет', en: 'No sessions yet' },

  // Все двери «завести» начинаются одним глаголом: «Добавить книгу», «Добавить
  // конспект», «Добавить материал». «Новый материал» рядом с ними читался как
  // другое действие, хотя открывает тот же композер.
  'learning.newMaterial': { ru: 'Добавить материал', en: 'Add a material' },

  'hub.title': { ru: 'Лернинг Хаб', en: 'Learning Hub' },
  'hub.empty': { ru: 'Пока ни одного потока', en: 'No streams yet' },
  'hub.emptyBody': {
    ru: 'Поток — это область, в которой ты учишься: материалы, конспекты и ритм считаются внутри него.',
    en: 'A stream is an area you are learning in: its materials, notes and rhythm all count inside it.',
  },
  'hub.newStream': { ru: 'Добавить поток', en: 'Add a stream' },
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
  'stream.focusNone': {
    ru: 'Здесь встанет то, за что садишься.',
    en: 'Whatever you sit down with will stand here.',
  },
  'stream.focusFirst': { ru: 'Добавить первый материал', en: 'Add the first material' },
  'stream.focusAllDone': {
    ru: 'Всё пройдено. Что дальше?',
    en: 'All done. What’s next?',
  },
  'stream.goalAnother': { ru: 'Придумать другую', en: 'Think of another' },
  'stream.open': { ru: 'Открыть', en: 'Open' },
  // Не считаемый: «из 8 недель» не склоняется от n.
  'stream.activeWeeks': {
    ru: 'Активна {n} из 8 недель',
    en: 'Active {n} of the last 8 weeks',
  },
  // Считается по занятиям и конспектам вместе — слово «конспект» здесь врало.
  'stream.lastNote': { ru: 'последний раз {date}', en: 'last time {date}' },
  'stream.neverNoted': { ru: 'ещё не садилась', en: 'not started yet' },

  'stream.continue': { ru: 'Продолжить', en: 'Continue' },

  // Дашборд: имена зон экрана. Зона либо отвечает на вопрос — «Что осталось»,
  // — либо зовёт сущность тем же словом, что и весь остальной интерфейс.
  // Синоним тут хуже вопроса: «Очередь» над тем, что на соседней вкладке
  // зовётся бэклогом, заставляла гадать, одно ли это. У зоны ритма имени нет
  // вовсе: панель с числами и графиком называет себя сама.
  'stream.zoneThinking': { ru: 'Что осталось', en: 'What it left' },
  'stream.zoneBacklog': { ru: 'Бэклог', en: 'Backlog' },
  'stream.backlogAll': { ru: 'Весь бэклог', en: 'The whole backlog' },
  'stream.goalHint': { ru: 'Нажми, чтобы изменить цель', en: 'Click to edit the goal' },
  'stream.moreStudying': {
    ru: { one: 'и ещё {n}', few: 'и ещё {n}', many: 'и ещё {n}' },
    en: { one: 'and {n} more', other: 'and {n} more' },
  },
  'stream.moreBacklog': {
    ru: { one: 'и ещё {n} в бэклоге', few: 'и ещё {n} в бэклоге', many: 'и ещё {n} в бэклоге' },
    en: { one: 'and {n} more in the backlog', other: 'and {n} more in the backlog' },
  },

  // Две двери и два листа. Занятие записывают, когда посидели за материалом:
  // речь о том, что из него пройдено, а конспекты к нему — по желанию.
  // Конспект добавляют, когда есть что записать, и занятия он не требует.
  'study.log': { ru: 'Записать занятие', en: 'Log a session' },
  'note.add': { ru: 'Добавить конспект', en: 'Add a note' },
  'study.editTitle': { ru: 'Правка занятия', en: 'Edit the session' },
  'study.delete': { ru: 'Удалить занятие', en: 'Delete session' },
  // Говорится, что откатится, а что нет: удаление занятия — это не только
  // строка в дневнике, но и отметки на главах.
  'study.confirmDelete': {
    ru: 'Удалить это занятие? Отмеченное в нём снова станет непройденным, а конспекты останутся.',
    en: 'Delete this session? What it marked done goes back to not done; the notes stay.',
  },
  'study.entries': {
    ru: { one: '{n} запись', few: '{n} записи', many: '{n} записей' },
    en: { one: '{n} entry', other: '{n} entries' },
  },
  'draft.addNote': { ru: 'Конспект', en: 'Note' },
  'draft.part': { ru: 'К какой части', en: 'Which part' },
  'draft.noPart': { ru: 'Без главы', en: 'No chapter' },
  'draft.open': { ru: 'Открыть', en: 'Open' },
  'step.pickChapters': {
    ru: 'Отметь главы, которые прошла',
    en: 'Mark the chapters you got through',
  },
  'step.pickLectures': {
    ru: 'Отметь лекции, которые прошла',
    en: 'Mark the lectures you got through',
  },
  'study.source': { ru: 'Источник', en: 'Source' },
  'study.noMaterials': {
    ru: 'В потоке пока нет материалов — конспект пишется о чём-то, так что сначала добавь материал.',
    en: 'This stream has no materials yet — a note is about something, so add a material first.',
  },
  'study.willBe': { ru: 'Станет {done} из {total}', en: 'That makes it {done} of {total}' },
  'study.noParts': {
    ru: 'У материала ещё нет глав — они заводятся на его странице.',
    en: 'This material has no chapters yet — they are added on its page.',
  },
  'stream.alsoStudying': { ru: 'Ещё изучаю', en: 'Also studying' },
  'stream.weekNotes': { ru: 'Конспектов за 7 дней', en: 'Notes in the last 7 days' },
  'stream.inDays': {
    ru: { one: 'в {n} дне', few: 'в {n} днях', many: 'в {n} днях' },
    en: { one: 'on {n} day', other: 'on {n} days' },
  },
  'stream.streakScope': { ru: 'во всём обучении', en: 'across all learning' },
  // Раздел зовётся Конспектами; ссылка на него звала его старым именем.
  'stream.notesAll': { ru: 'Все конспекты', en: 'All notes' },
  'stream.notesNone': { ru: 'Конспектов пока нет', en: 'No notes yet' },
  'stream.resourcesNone': { ru: 'В бэклоге пусто', en: 'The backlog is empty' },
  'chart.studyRhythm': {
    ru: 'Конспектов в день за полгода',
    en: 'Notes per day, last 26 weeks',
  },

  'stream.name': { ru: 'Название', en: 'Name' },
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
  'material.scale': { ru: 'Считать по', en: 'Count by' },
  'scale.pages': { ru: 'Страницам', en: 'Pages' },
  'scale.parts': { ru: 'Главам', en: 'Chapters' },

  'material.pagesTotal': { ru: 'Сколько страниц', en: 'How many pages' },
  'material.chaptersTotal': { ru: 'Сколько глав', en: 'How many chapters' },
  'material.lecturesTotal': { ru: 'Сколько лекций', en: 'How many lectures' },

  'count.chapters': {
    ru: { one: '{n} глава', few: '{n} главы', many: '{n} глав' },
    en: { one: '{n} chapter', other: '{n} chapters' },
  },
  // Сводка дня в дневнике потока: части разных материалов — и главы, и
  // лекции, — поэтому общим словом.
  'count.parts': {
    ru: { one: '{n} часть', few: '{n} части', many: '{n} частей' },
    en: { one: '{n} part', other: '{n} parts' },
  },
  'count.lectures': {
    ru: { one: '{n} лекция', few: '{n} лекции', many: '{n} лекций' },
    en: { one: '{n} lecture', other: '{n} lectures' },
  },
  'part.chapter': { ru: 'Глава {n}', en: 'Chapter {n}' },
  'part.lecture': { ru: 'Лекция {n}', en: 'Lecture {n}' },
  'part.chapters': { ru: 'Главы', en: 'Chapters' },
  'part.lectures': { ru: 'Лекции', en: 'Lectures' },
  // Имя главы правится в двух местах — в списке частей и в листе занятия.
  // Подпись при этом разная: в списке правят «часть», а на листе сидят с
  // конкретной главой, и звать её «частью» там было бы казённо.
  'part.nameChapter': { ru: 'Название главы', en: 'Chapter name' },
  'part.nameLecture': { ru: 'Название лекции', en: 'Lecture name' },
  // Состояние части словом — так её читает экранный диктор в ряду точек, где
  // всё остальное сказано заливкой. Род женский у обоих слов, главы и лекции.
  'part.state.done': { ru: 'пройдена', en: 'done' },
  'part.state.started': { ru: 'начата', en: 'started' },
  'part.state.fresh': { ru: 'не пройдена', en: 'not done' },
  'part.names': { ru: 'Назвать списком', en: 'Name from a list' },
  'part.paste': { ru: 'Вставить оглавление', en: 'Paste the contents' },
  'part.backToList': { ru: 'К списку', en: 'Back to the list' },
  'part.addLecture': { ru: 'Лекция', en: 'Lecture' },
  'part.addChapter': { ru: 'Глава', en: 'Chapter' },
  'part.renameOne': { ru: 'Название: {name}', en: 'Name: {name}' },
  'part.removeOne': { ru: 'Убрать: {name}', en: 'Remove: {name}' },
  'part.pastePlaceholderLectures': {
    ru: '1. Введение\n2. Токены\n3. Компоненты',
    en: '1. Introduction\n2. Tokens\n3. Components',
  },
  'part.pastePlaceholderChapters': {
    ru: '1. Вступление\n2. Первая глава\n3. Вторая глава',
    en: '1. Introduction\n2. Chapter one\n3. Chapter two',
  },
  'part.namesChapters': {
    ru: 'По строке на главу, сверху вниз. Вставляй программу прямо как есть: номер в начале строки снимется сам. Пустая строка оставляет главу при её номере.',
    en: 'One line per chapter, top to bottom. Paste the contents as they are — a leading number is stripped. A blank line leaves that chapter at its number.',
  },
  'part.namesLectures': {
    ru: 'По строке на лекцию, сверху вниз. Вставляй программу прямо как есть: номер в начале строки снимется сам. Пустая строка оставляет лекцию при её номере.',
    en: 'One line per lecture, top to bottom. Paste the syllabus as it is — a leading number is stripped. A blank line leaves that lecture at its number.',
  },
  'part.namesCount': {
    ru: 'Строк в списке: {n}. Частей сейчас: {have}.',
    en: '{n} lines in the list, {have} parts right now.',
  },
  'part.namesGrow': {
    ru: 'Строк больше, чем частей: добавится {n}, станет {total}.',
    en: 'More lines than parts: {n} will be added, {total} in all.',
  },
  'part.confirmDrop': {
    ru: 'Среди убираемых частей есть пройденные. Отметки пропадут. Убрать?',
    en: 'Some of the parts being removed are marked done. Those marks will be lost. Remove?',
  },

  'material.read': { ru: 'Прочитано', en: 'Read' },
  'material.watched': { ru: 'Просмотрено', en: 'Watched' },

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
  // Четыре ячейки шапки материала — те же четыре вопроса, что у книги в чтении.
  'material.factDone': { ru: 'Пройдено', en: 'Done' },
  'material.factLeft': { ru: 'Осталось', en: 'Left' },
  'material.factNotes': { ru: 'Конспекты', en: 'Notes' },
  'material.factLast': { ru: 'Последнее занятие', en: 'Last session' },
  'material.edit': { ru: 'Настроить материал', en: 'Edit material' },
  'material.delete': { ru: 'Удалить материал', en: 'Delete material' },
  'material.confirmDelete': {
    ru: 'Удалить материал вместе с его конспектами?',
    en: 'Delete the material and its notes?',
  },
  'material.notesEmpty': { ru: 'Конспектов пока нет', en: 'No notes yet' },
  'material.progress': { ru: '{done} из {total}', en: '{done} of {total}' },
  'material.cover': { ru: 'Обложка', en: 'Cover' },
  'material.fetch': { ru: 'Заполнить по ссылке', en: 'Fill in from the link' },
  'material.fetchNothing': {
    ru: 'По этой ссылке ничего не нашлось — впиши руками.',
    en: 'Nothing came back from that link — type it in by hand.',
  },
  'material.fetchHint': {
    ru: 'Адрес уйдёт стороннему сервису, который читает разметку страницы.',
    en: 'The address goes to a third-party service that reads the page markup.',
  },
  'material.makeFocus': { ru: 'Сделать фокусом потока', en: 'Make it the stream focus' },
  'material.isFocus': { ru: 'В фокусе потока', en: 'The stream focus' },

  'kind.book': { ru: 'Книга', en: 'Book' },
  'kind.article': { ru: 'Статья', en: 'Article' },
  'kind.course': { ru: 'Курс', en: 'Course' },
  'kind.video': { ru: 'Видео', en: 'Video' },

  // Статус материала — тем же словом, что срез «Материалов», в котором он
  // лежит: «В работе» на карточке из среза «На изучении» звучало как третье
  // состояние.
  'mstatus.backlog': { ru: 'В бэклоге', en: 'In the backlog' },
  'mstatus.active': { ru: 'На изучении', en: 'Studying' },
  'mstatus.done': { ru: 'Изучено', en: 'Studied' },

  'studying.empty': {
    // Связка после дефиса: рукописная строка узкая, и «что-» без «нибудь»
    // повисало бы на конце строки.
    ru: 'Ничего не изучается — возьми что-\u2060нибудь из бэклога',
    en: 'Nothing in progress — take something from the backlog',
  },
  /* Бейдж, а не действие: фокус на карточке отмечают, а переключают его на
     странице материала — там видно, что именно меняешь, и есть чем отменить. */
  'studying.focusBadge': { ru: 'Фокус', en: 'Focus' },

  // Рейка фильтров раздела «Материалы». Имена от состояния человека, а не от
  // статуса в базе: «на изучении», а не «active».
  'mview.active': { ru: 'На изучении', en: 'Studying' },
  'mview.backlog': { ru: 'Бэклог', en: 'Backlog' },
  'mview.done': { ru: 'Изучены', en: 'Studied' },
  'materials.filters': { ru: 'Фильтры материалов', en: 'Material filters' },
  'materials.emptyBacklog': {
    ru: 'Бэклог пуст — всё разобрано',
    en: 'The backlog is empty, all sorted',
  },
  'materials.emptyDone': { ru: 'Изученного пока нет', en: 'Nothing studied yet' },
  'materials.emptyAll': { ru: 'В потоке пока пусто', en: 'Nothing in this stream yet' },
  'materials.emptyAllBody': {
    ru: 'Материал — это книга, курс, статья или ролик. Прогресс потока считается по ним.',
    en: 'A material is a book, a course, an article or a video. The stream counts its progress by them.',
  },

  'backlog.take': { ru: 'Взять на изучение', en: 'Start studying' },

  'note.part': { ru: 'Глава или часть', en: 'Chapter or part' },
  'note.partPlaceholder': { ru: 'Глава 1. Название', en: 'Chapter 1. Title' },
  'note.body': { ru: 'Конспект', en: 'Note' },
  'note.bodyPlaceholder': {
    ru: 'Пиши как в тетради. ## заголовок, - список, > цитата. Оформить — выделить и правой кнопкой.',
    en: 'Write as in a notebook. ## heading, - list, > quote. To format, select and right-click.',
  },
  'note.format': { ru: 'Оформление', en: 'Formatting' },
  'note.bold': { ru: 'Жирный', en: 'Bold' },
  'note.italic': { ru: 'Курсив', en: 'Italic' },
  'note.wave': { ru: 'Волна', en: 'Wave' },
  'note.mark': { ru: 'Маркер', en: 'Marker' },
  'note.edit': { ru: 'Править', en: 'Edit' },
  'note.empty': { ru: 'Лист пока пустой.', en: 'The sheet is still empty.' },
  'note.blankChip': { ru: 'пустой', en: 'empty' },
  'note.delete': { ru: 'Удалить конспект', en: 'Delete note' },
  'note.confirmDelete': { ru: 'Удалить этот конспект?', en: 'Delete this note?' },
  'note.prev': { ru: 'Предыдущий лист', en: 'Previous sheet' },
  'note.next': { ru: 'Следующий лист', en: 'Next sheet' },
  'note.count': {
    ru: { one: '{n} конспект', few: '{n} конспекта', many: '{n} конспектов' },
    en: { one: '{n} note', other: '{n} notes' },
  },
  // Короткая форма для строки-сводки дашборда: рядом со счётчиком, не отдельным предложением.
  'note.last': { ru: 'последний {date}', en: 'last {date}' },
} satisfies Dict
