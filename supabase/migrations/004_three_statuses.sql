-- Run in Supabase → SQL editor on a database created before this change.
-- Fresh installs already get the narrowed checks from schema.sql and
-- 003_learning.sql.
--
-- Статусов стало три, и ставить их руками больше нельзя: приложение считает
-- статус из сделанного — из отмеченных глав, страницы, записанных сессий. В
-- колонке остаётся только отметка «пройдено»/«прочитано», которую подсчётом не
-- получить: у статьи и ролика считать нечего, у книги может быть неизвестно
-- число страниц.
--
-- «Брошено» и «заброшено» ушли. Это был единственный статус, который не
-- выводится ни из чего, кроме настроения, и держать ради него отдельную полку
-- значило просить объявлять поражение вслух. Брошенное возвращается в очередь:
-- не пройденное, а переставшее двигаться. Ничего при этом не теряется — главы
-- и страницы остаются на месте, и если по материалу что-то сделано, подсчёт
-- тут же вернёт его в работу.
--
-- Порядок обязателен: сначала увести значения, потом сужать проверку. Иначе
-- проверка отвергнет строки, которые ещё не переписаны.
--
-- Safe to run again: обновление ничего не находит, а проверки пересоздаются.

update public.materials set status = 'backlog' where status = 'dropped';
update public.books set status = 'want' where status = 'abandoned';

alter table public.materials drop constraint if exists materials_status_check;
alter table public.materials
  add constraint materials_status_check
  check (status in ('backlog','active','done'));

alter table public.books drop constraint if exists books_status_check;
alter table public.books
  add constraint books_status_check
  check (status in ('want','reading','finished'));
