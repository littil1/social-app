create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.posts(id) on delete cascade,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  post_owner_user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint post_reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint post_reports_reporter_per_post_unique
    unique (post_id, reporter_user_id)
);

create index if not exists post_reports_status_created_at_idx
  on public.post_reports (status, created_at desc);

create index if not exists post_reports_post_id_idx
  on public.post_reports (post_id);

create index if not exists post_reports_reporter_user_id_idx
  on public.post_reports (reporter_user_id);

create or replace function public.set_post_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists post_reports_set_updated_at on public.post_reports;

create trigger post_reports_set_updated_at
before update on public.post_reports
for each row
execute function public.set_post_reports_updated_at();

alter table public.post_reports enable row level security;

drop policy if exists "authenticated_users_can_insert_post_reports" on public.post_reports;

create policy "authenticated_users_can_insert_post_reports"
on public.post_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

drop policy if exists "admins can select post reports" on public.post_reports;

create policy "admins can select post reports"
on public.post_reports
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

drop policy if exists "admins can update post reports" on public.post_reports;
create policy "admins can update post reports"
on public.post_reports
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
