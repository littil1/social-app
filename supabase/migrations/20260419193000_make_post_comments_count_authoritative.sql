create or replace function public.sync_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set comments_count = coalesce(comments_count, 0) + 1
    where id = new.post_id;

    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.posts
    set comments_count = greatest(coalesce(comments_count, 0) - 1, 0)
    where id = old.post_id;

    return old;
  end if;

  return null;
end;
$$;

update public.posts
set comments_count = coalesce(comment_totals.count, 0)
from (
  select post_id, count(*)::integer as count
  from public.comments
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
   );

drop trigger if exists comments_sync_post_comments_count_insert
on public.comments;

create trigger comments_sync_post_comments_count_insert
after insert on public.comments
for each row
execute function public.sync_post_comments_count();

drop trigger if exists comments_sync_post_comments_count_delete
on public.comments;

create trigger comments_sync_post_comments_count_delete
after delete on public.comments
for each row
execute function public.sync_post_comments_count();
