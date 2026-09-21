import type { Dict } from './translate'

/** Ключи раздела обучения. Оба языка рядом — пропуск видно глазом и ловит tsc. */
export const LEARNING = {
  'nav.learning': { ru: 'Обучение', en: 'Learning' },

  'learning.title': { ru: 'Обучение', en: 'Learning' },
  'learning.empty': {
    ru: 'Пока ни одной категории. Категория — это область, в которой ты учишься.',
    en: 'No categories yet. A category is an area you are learning in.',
  },
  'learning.newCategory': { ru: 'Новая категория', en: 'New category' },
  'learning.newMaterial': { ru: 'Новый материал', en: 'New material' },
  'learning.suggest': { ru: 'Или сразу одну из этих:', en: 'Or start with one of these:' },
  'learning.materialsEmpty': {
    ru: 'В этой категории пока нет материалов.',
    en: 'No materials in this category yet.',
  },

  'category.name': { ru: 'Название', en: 'Name' },
  'category.icon': { ru: 'Иконка', en: 'Icon' },
  'category.accent': { ru: 'Цвет', en: 'Colour' },
  'category.outline': { ru: 'Контур конспекта', en: 'Note outline' },
  'category.outlineHint': {
    ru: 'Подставляется в новый конспект этой категории. Можно стереть — это обычный текст.',
    en: 'Pre-filled into a new note in this category. Delete it freely — it is plain text.',
  },
  'category.edit': { ru: 'Настроить категорию', en: 'Edit category' },
  'category.delete': { ru: 'Удалить категорию', en: 'Delete category' },
  'category.confirmDelete': {
    ru: 'Удалить категорию вместе со всеми её материалами и конспектами?',
    en: 'Delete the category with all its materials and notes?',
  },

  'material.title': { ru: 'Название', en: 'Title' },
  'material.author': { ru: 'Автор', en: 'Author' },
  'material.url': { ru: 'Ссылка', en: 'Link' },
  'material.kind': { ru: 'Вид', en: 'Kind' },
  'material.status': { ru: 'Статус', en: 'Status' },
  'material.parts': { ru: 'Сколько глав', en: 'How many chapters' },
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

  'kind.book': { ru: 'Книга', en: 'Book' },
  'kind.article': { ru: 'Статья', en: 'Article' },
  'kind.course': { ru: 'Курс', en: 'Course' },
  'kind.video': { ru: 'Видео', en: 'Video' },
  'kind.podcast': { ru: 'Подкаст', en: 'Podcast' },
  'kind.other': { ru: 'Другое', en: 'Other' },

  'mstatus.inbox': { ru: 'Входящее', en: 'Inbox' },
  'mstatus.active': { ru: 'В работе', en: 'Active' },
  'mstatus.done': { ru: 'Пройдено', en: 'Done' },
  'mstatus.reference': { ru: 'Справка', en: 'Reference' },
  'mstatus.dropped': { ru: 'Отложено', en: 'Dropped' },

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
} satisfies Dict
