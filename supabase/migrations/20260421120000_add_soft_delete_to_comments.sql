alter table public.comments
add column if not exists deleted_at timestamp with time zone;

create or replace function public.sync_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is null then
      update public.posts
      set comments_count = coalesce(comments_count, 0) + 1
      where id = new.post_id;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.deleted_at is null then
      update public.posts
      set comments_count = greatest(coalesce(comments_count, 0) - 1, 0)
      where id = old.post_id;
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.posts
      set comments_count = greatest(coalesce(comments_count, 0) - 1, 0)
      where id = new.post_id;
    elsif old.deleted_at is not null and new.deleted_at is null then
      update public.posts
      set comments_count = coalesce(comments_count, 0) + 1
      where id = new.post_id;
    end if;

    return new;
  end if;

  return null;
end;
$$;

update public.posts
set comments_count = coalesce(comment_totals.count, 0)
from (
  select post_id, count(*)::integer as count
  from public.comments
  where deleted_at is null
  group by post_id
) as comment_totals
where public.posts.id = comment_totals.post_id;

update public.posts
set comments_count = 0
where comments_count is null
   or comments_count < 0
   or not exists (
     select 1
     from public.comments
     where public.comments.post_id = public.posts.id
       and public.comments.deleted_at is null
   );

drop trigger if exists comments_sync_post_comments_count_update
on public.comments;

create trigger comments_sync_post_comments_count_update
after update of deleted_at on public.comments
for each row
execute function public.sync_post_comments_count();
