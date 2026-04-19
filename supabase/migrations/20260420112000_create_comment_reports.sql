create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id bigint not null references public.comments(id) on delete cascade,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  comment_owner_user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint comment_reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint comment_reports_reporter_per_comment_unique
    unique (comment_id, reporter_user_id)
);

create index if not exists comment_reports_status_created_at_idx
  on public.comment_reports (status, created_at desc);

create index if not exists comment_reports_comment_id_idx
  on public.comment_reports (comment_id);

create index if not exists comment_reports_reporter_user_id_idx
  on public.comment_reports (reporter_user_id);

create or replace function public.set_comment_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists comment_reports_set_updated_at on public.comment_reports;

create trigger comment_reports_set_updated_at
before update on public.comment_reports
for each row
execute function public.set_comment_reports_updated_at();

alter table public.comment_reports enable row level security;

create policy "authenticated users can insert comment reports"
on public.comment_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

create policy "admins can select comment reports"
on public.comment_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "admins can update comment reports"
on public.comment_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);
