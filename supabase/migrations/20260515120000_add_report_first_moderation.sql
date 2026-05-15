alter table public.posts
add column if not exists moderation_status text not null default 'clean',
add column if not exists moderation_reason text,
add column if not exists moderation_report_count integer not null default 0,
add column if not exists moderation_ai_summary text,
add column if not exists moderation_ai_categories jsonb,
add column if not exists moderation_ai_scores jsonb,
add column if not exists moderation_ai_checked_at timestamptz,
add column if not exists moderation_reviewed_by uuid references public.profiles(id) on delete set null,
add column if not exists moderation_reviewed_at timestamptz;

alter table public.comments
add column if not exists moderation_status text not null default 'clean',
add column if not exists moderation_reason text,
add column if not exists moderation_report_count integer not null default 0,
add column if not exists moderation_ai_summary text,
add column if not exists moderation_ai_categories jsonb,
add column if not exists moderation_ai_scores jsonb,
add column if not exists moderation_ai_checked_at timestamptz,
add column if not exists moderation_reviewed_by uuid references public.profiles(id) on delete set null,
add column if not exists moderation_reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_moderation_status_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
    add constraint posts_moderation_status_check
    check (moderation_status in ('clean', 'reported', 'blurred', 'removed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_moderation_status_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
    add constraint comments_moderation_status_check
    check (moderation_status in ('clean', 'reported', 'blurred', 'removed'));
  end if;
end $$;

create index if not exists posts_moderation_status_created_at_idx
  on public.posts (moderation_status, created_at desc);

create index if not exists comments_moderation_status_created_at_idx
  on public.comments (moderation_status, created_at desc);

create or replace function public.sync_post_moderation_from_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_total integer;
  next_status text;
begin
  select count(*)::integer
  into report_total
  from public.post_reports
  where post_id = new.post_id;

  next_status := case
    when report_total >= 2 then 'blurred'
    when report_total >= 1 then 'reported'
    else 'clean'
  end;

  update public.posts
  set
    moderation_report_count = report_total,
    moderation_status = case
      when moderation_status = 'removed' then moderation_status
      when moderation_status = 'blurred' then moderation_status
      else next_status
    end
  where id = new.post_id;

  return new;
end;
$$;

create or replace function public.sync_comment_moderation_from_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_total integer;
  next_status text;
begin
  select count(*)::integer
  into report_total
  from public.comment_reports
  where comment_id = new.comment_id;

  next_status := case
    when report_total >= 2 then 'blurred'
    when report_total >= 1 then 'reported'
    else 'clean'
  end;

  update public.comments
  set
    moderation_report_count = report_total,
    moderation_status = case
      when moderation_status = 'removed' then moderation_status
      when moderation_status = 'blurred' then moderation_status
      else next_status
    end
  where id = new.comment_id;

  return new;
end;
$$;

drop trigger if exists post_reports_sync_post_moderation on public.post_reports;
create trigger post_reports_sync_post_moderation
after insert on public.post_reports
for each row
execute function public.sync_post_moderation_from_reports();

drop trigger if exists comment_reports_sync_comment_moderation on public.comment_reports;
create trigger comment_reports_sync_comment_moderation
after insert on public.comment_reports
for each row
execute function public.sync_comment_moderation_from_reports();

update public.posts
set moderation_report_count = coalesce(report_totals.count, 0),
    moderation_status = case
      when moderation_status = 'removed' then moderation_status
      when coalesce(report_totals.count, 0) >= 2 then 'blurred'
      when coalesce(report_totals.count, 0) >= 1 then 'reported'
      else moderation_status
    end
from (
  select post_id, count(*)::integer as count
  from public.post_reports
  group by post_id
) as report_totals
where public.posts.id = report_totals.post_id;

update public.comments
set moderation_report_count = coalesce(report_totals.count, 0),
    moderation_status = case
      when moderation_status = 'removed' then moderation_status
      when coalesce(report_totals.count, 0) >= 2 then 'blurred'
      when coalesce(report_totals.count, 0) >= 1 then 'reported'
      else moderation_status
    end
from (
  select comment_id, count(*)::integer as count
  from public.comment_reports
  group by comment_id
) as report_totals
where public.comments.id = report_totals.comment_id;
