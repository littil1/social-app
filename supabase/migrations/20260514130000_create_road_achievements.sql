create table if not exists public.road_achievements (
  id uuid primary key default gen_random_uuid(),
  source_feature_request_id bigint null references public.feature_requests(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'DEPLOYED',
  icon text null,
  image_url text null,
  source_user_id uuid null references public.profiles(id) on delete set null,
  source_user_username_snapshot text null,
  created_by_admin_id uuid null references public.profiles(id) on delete set null,
  implemented_at timestamp with time zone not null default now(),
  sort_order integer null,
  is_published boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists road_achievements_unique_source_feature_request
on public.road_achievements (source_feature_request_id)
where source_feature_request_id is not null;

create index if not exists road_achievements_published_implemented_idx
on public.road_achievements (is_published, implemented_at);

create index if not exists road_achievements_source_feature_request_idx
on public.road_achievements (source_feature_request_id);

create index if not exists road_achievements_source_user_idx
on public.road_achievements (source_user_id);

alter table public.road_achievements enable row level security;

drop policy if exists "Published road achievements are readable" on public.road_achievements;
create policy "Published road achievements are readable"
on public.road_achievements
for select
using (is_published = true);

drop policy if exists "Admins can read road achievements" on public.road_achievements;
create policy "Admins can read road achievements"
on public.road_achievements
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

drop policy if exists "Admins can insert road achievements" on public.road_achievements;
create policy "Admins can insert road achievements"
on public.road_achievements
for insert
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

drop policy if exists "Admins can update road achievements" on public.road_achievements;
create policy "Admins can update road achievements"
on public.road_achievements
for update
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

drop policy if exists "Admins can delete road achievements" on public.road_achievements;
create policy "Admins can delete road achievements"
on public.road_achievements
for delete
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);
