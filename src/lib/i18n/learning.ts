import type { Dict } from './translate'

/** Ключи раздела обучения. Оба языка рядом — пропуск видно глазом и ловит tsc. */
export const LEARNING = {
  'nav.reading': { ru: 'Чтение', en: 'Reading' },
  'nav.hub': { ru: 'Лернинг Хаб', en: 'Learning Hub' },
  'nav.dashboard': { ru: 'Дашборд', en: 'Dashboard' },
  'nav.materials': { ru: 'Материалы', en: 'Materials' },
  // Раздел называется тем, что в нём лежит. «Заметки» — это про пометки на
  // полях; здесь пишут конспект занятия, и он же и есть прогресс.
  'nav.notes': { ru: 'Конспекты', en: 'Notes' },

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

  // Дашборд: имена зон экрана. Отвечают на вопрос, а не называют сущность, —
  // «Что осталось», а не «Конспекты». У зоны ритма имени нет вовсе: панель с
  // числами и графиком называет себя сама.
  'stream.zoneNow': { ru: 'Сейчас', en: 'Right now' },
  'stream.zoneThinking': { ru: 'Что осталось', en: 'What it left' },
  'stream.zoneQueue': { ru: 'Очередь', en: 'The queue' },
  'stream.goalHint': { ru: 'Нажми, чтобы изменить цель', en: 'Click to edit the goal' },
  'stream.moreStudying': {
    ru: { one: 'и ещё {n}', few: 'и ещё {n}', many: 'и ещё {n}' },
    en: { one: 'and {n} more', other: 'and {n} more' },
  },
  'stream.moreQueued': {
    ru: { one: 'и ещё {n} в очереди', few: 'и ещё {n} в очереди', many: 'и ещё {n} в очереди' },
    en: { one: 'and {n} more queued', other: 'and {n} more queued' },
  },

  // Лист один, а поводов к нему два, и называются они разными словами. Занятие
  // записывают, когда уже посидели за материалом: источник известен, речь о том,
  // что из него пройдено. Конспект добавляют, когда есть что записать: о чём —
  // спрашивает сам лист. Отсюда и две подписи: у полосы прогресса первая, над
  // листами и в ленте — вторая.
  'study.log': { ru: 'Записать занятие', en: 'Log activity' },
  'note.add': { ru: 'Добавить конспект', en: 'Add note' },
  'study.source': { ru: 'Источник', en: 'Source' },
  'study.noMaterials': {
    ru: 'В потоке пока нет материалов — конспект пишется о чём-то, так что сначала добавь материал.',
    en: 'This stream has no materials yet — a note is about something, so add a material first.',
  },
  'study.willBe': { ru: 'Станет {done} из {total}', en: 'That makes it {done} of {total}' },
  'study.willBePage': {
    ru: 'Станет {done} из {total} стр.',
    en: 'That makes it p. {done} of {total}',
  },
  'study.toPage': { ru: 'Дочитала до страницы', en: 'Read up to page' },
  'study.noParts': {
    ru: 'У материала ещё нет глав — они заводятся на его странице.',
    en: 'This material has no chapters yet — they are added on its page.',
  },
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
  // Раздел зовётся Конспектами; ссылка на него звала его старым именем.
  'stream.notesAll': { ru: 'Все конспекты', en: 'All notes' },
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
  'material.scale': { ru: 'Считать по', en: 'Count by' },
  'scale.pages': { ru: 'Страницам', en: 'Pages' },
  'scale.parts': { ru: 'Главам', en: 'Chapters' },

  'material.pagesTotal': { ru: 'Сколько страниц', en: 'How many pages' },
  'material.chaptersTotal': { ru: 'Сколько глав', en: 'How many chapters' },
  'material.lecturesTotal': { ru: 'Сколько лекций', en: 'How many lectures' },
  'material.page': { ru: 'На какой странице', en: 'Current page' },

  'count.chapters': {
    ru: { one: '{n} глава', few: '{n} главы', many: '{n} глав' },
    en: { one: '{n} chapter', other: '{n} chapters' },
  },
  'count.lectures': {
    ru: { one: '{n} лекция', few: '{n} лекции', many: '{n} лекций' },
    en: { one: '{n} lecture', other: '{n} lectures' },
  },
  'part.chapter': { ru: 'Глава {n}', en: 'Chapter {n}' },
  'part.lecture': { ru: 'Лекция {n}', en: 'Lecture {n}' },
  'part.chapters': { ru: 'Главы', en: 'Chapters' },
  'part.lectures': { ru: 'Лекции', en: 'Lectures' },
  // Одно слово на выбор части и одно на отметку — у книги глава, у курса лекция.
  // Пара ключей, а не подстановка слова в шаблон: в английском «Chapter done» и
  // «Lecture done» ещё совпадают по форме, а в русском род уже расходится.
  'part.pickChapter': { ru: 'Глава', en: 'Chapter' },
  'part.pickLecture': { ru: 'Лекция', en: 'Lecture' },
  'part.doneChapter': { ru: 'Глава пройдена', en: 'Chapter done' },
  'part.doneLecture': { ru: 'Лекция пройдена', en: 'Lecture done' },
  'part.started': { ru: 'начата', en: 'started' },
  'part.add': { ru: 'Добавить', en: 'Add' },
  'part.remove': { ru: 'Убрать', en: 'Remove' },
  'part.rename': { ru: 'Название части', en: 'Part name' },
  // Имя главы правится в двух местах — в списке частей и в листе занятия.
  // Подпись при этом разная: в списке правят «часть», а на листе сидят с
  // конкретной главой, и звать её «частью» там было бы казённо.
  'part.nameChapter': { ru: 'Название главы', en: 'Chapter name' },
  'part.nameLecture': { ru: 'Название лекции', en: 'Lecture name' },
  'part.nameHint': {
    ru: 'Пустое — останется номером.',
    en: 'Leave it empty to keep the number.',
  },
  // Состояние части словом — так её читает экранный диктор в ряду точек, где
  // всё остальное сказано заливкой. Род женский у обоих слов, главы и лекции.
  'part.state.done': { ru: 'пройдена', en: 'done' },
  'part.state.started': { ru: 'начата', en: 'started' },
  'part.state.fresh': { ru: 'не пройдена', en: 'not done' },
  'part.names': { ru: 'Назвать списком', en: 'Name from a list' },
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
  // Четыре ячейки шапки материала — те же четыре вопроса, что у книги в чтении.
  'material.factDone': { ru: 'Пройдено', en: 'Done' },
  'material.factLeft': { ru: 'Осталось', en: 'Left' },
  'material.factNotes': { ru: 'Конспекты', en: 'Notes' },
  'material.factLast': { ru: 'Последнее занятие', en: 'Last session' },
  'material.partsEmpty': {
    ru: 'Частей пока нет. Заведи их по одной или вставь программу списком — тогда прогресс пойдёт по ним.',
    en: 'No parts yet. Add them one by one, or paste the syllabus as a list — progress then counts by them.',
  },
  'material.partsLocked': {
    ru: 'У этого материала нет глав: статья и ролик меряются отметкой, книга — страницами.',
    en: 'This material has no chapters: an article or a video is a single mark, a book counts pages.',
  },
  'material.edit': { ru: 'Настроить материал', en: 'Edit material' },
  'material.delete': { ru: 'Удалить материал', en: 'Delete material' },
  'material.confirmDelete': {
    ru: 'Удалить материал вместе с его конспектами?',
    en: 'Delete the material and its notes?',
  },
  'material.notesEmpty': {
    ru: 'Конспектов пока нет. Глава отмечается пройденной в листе занятия.',
    en: 'No notes yet. A chapter is marked done when you log a session.',
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

  'mstatus.backlog': { ru: 'В очереди', en: 'Queued' },
  'material.alreadyDone': { ru: 'Уже пройдено', en: 'Already done' },
  'mstatus.active': { ru: 'В работе', en: 'Active' },
  'mstatus.done': { ru: 'Пройдено', en: 'Done' },

  'studying.empty': {
    ru: 'Ничего не изучается. Возьми что-нибудь из бэклога.',
    en: 'Nothing in progress. Take something from the backlog.',
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
    ru: 'Бэклог пуст. Всё разобрано.',
    en: 'The backlog is empty. All sorted.',
  },
  'materials.emptyDone': {
    ru: 'Пройденного пока нет.',
    en: 'Nothing finished yet.',
  },
  'materials.emptyAll': {
    ru: 'В этом потоке пока нет материалов.',
    en: 'No materials in this stream yet.',
  },

  'backlog.take': { ru: 'Взять в работу', en: 'Take it on' },

  // Чем подписан лист, которому нечем подписаться: ни главы, ни заголовка.
  // Звался «Новым конспектом» — от кнопки, которой больше нет, и годовалая
  // запись в ленте выглядела свежей.
  'note.untitled': { ru: 'Без названия', en: 'Untitled' },
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
  'notes.empty': {
    ru: 'Конспектов пока нет — первый заводится кнопкой справа.',
    en: 'No notes yet — the button on the right starts the first one.',
  },
  'notes.allTags': { ru: 'Все', en: 'All' },
} satisfies Dict
