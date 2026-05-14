create table if not exists public.post_boosts (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_key text not null,
  created_at timestamp with time zone not null default now()
);

create unique index if not exists post_boosts_unique_user_day
on public.post_boosts (user_id, day_key);

create unique index if not exists post_boosts_unique_post_user
on public.post_boosts (post_id, user_id);

create index if not exists post_boosts_post_id_idx
on public.post_boosts (post_id);

create index if not exists post_boosts_user_day_idx
on public.post_boosts (user_id, day_key);

create index if not exists post_boosts_day_key_idx
on public.post_boosts (day_key);

alter table public.post_boosts enable row level security;

drop policy if exists "Allow read access" on public.post_boosts;
create policy "Allow read access"
on public.post_boosts
for select
using (true);

drop policy if exists "Allow insert own boost" on public.post_boosts;
create policy "Allow insert own boost"
on public.post_boosts
for insert
with check (
  auth.uid() = user_id
  and day_key = (timezone('Europe/Zurich', now())::date)::text
  and exists (
    select 1
    from public.posts
    where posts.id = post_boosts.post_id
      and posts.created_at >= ((timezone('Europe/Zurich', now())::date)::timestamp at time zone 'Europe/Zurich')
      and posts.created_at < (((timezone('Europe/Zurich', now())::date + 1)::timestamp) at time zone 'Europe/Zurich')
  )
);

create or replace function public.run_snapshot_daily_winners(target_winner_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  winner_day date;
  start_at timestamptz;
  end_at timestamptz;
  ranking_at timestamptz;
  existing_count integer;
  inserted_count integer;
  winner_record record;
  inserted_author_id uuid;
  legend_progress integer;
  legend_badge_id integer;
  existing_user_badge record;
begin
  winner_day := coalesce(
    target_winner_date,
    (timezone('Europe/Zurich', now())::date - 1)
  );

  start_at := winner_day::timestamp at time zone 'Europe/Zurich';
  end_at := (winner_day + 1)::timestamp at time zone 'Europe/Zurich';
  ranking_at := end_at - interval '1 millisecond';

  select count(*)
    into existing_count
  from public.daily_post_winners
  where winner_date = winner_day
    and rank_position = 1;

  if existing_count > 0 then
    return jsonb_build_object(
      'winnerDate', winner_day,
      'status', 'skipped_existing',
      'winner', null,
      'existingRowCount', existing_count
    );
  end if;

  with posts_for_day as (
    select
      posts.id,
      posts.content,
      posts.created_at,
      posts.user_id
    from public.posts
    where posts.created_at >= start_at
      and posts.created_at < end_at
  ),
  reaction_counts as (
    select
      post_reactions.post_id,
      count(*) filter (where post_reactions.reaction = 'like')::integer as likes_count,
      count(*) filter (where post_reactions.reaction = 'funny')::integer as funny_count,
      count(*) filter (where post_reactions.reaction = 'wow')::integer as wow_count,
      count(*) filter (where post_reactions.reaction = 'fire')::integer as fire_count
    from public.post_reactions
    join posts_for_day on posts_for_day.id = post_reactions.post_id
    group by post_reactions.post_id
  ),
  boost_counts as (
    select
      post_boosts.post_id,
      count(*)::integer as boost_count
    from public.post_boosts
    join posts_for_day on posts_for_day.id = post_boosts.post_id
    group by post_boosts.post_id
  ),
  comment_counts as (
    select
      comments.post_id,
      count(*)::integer as comments_count
    from public.comments
    join posts_for_day on posts_for_day.id = comments.post_id
    where comments.deleted_at is null
    group by comments.post_id
  ),
  ranked_posts as (
    select
      posts_for_day.id as post_id,
      posts_for_day.created_at as post_created_at,
      coalesce(posts_for_day.content, '') as post_content,
      posts_for_day.user_id as author_id,
      profiles.username as author_username,
      coalesce(reaction_counts.likes_count, 0) as likes_count,
      coalesce(reaction_counts.funny_count, 0) as funny_count,
      coalesce(reaction_counts.wow_count, 0) as wow_count,
      coalesce(reaction_counts.fire_count, 0) as fire_count,
      coalesce(comment_counts.comments_count, 0) as comments_count,
      (
        (
          coalesce(reaction_counts.likes_count, 0) +
          coalesce(reaction_counts.funny_count, 0) +
          coalesce(reaction_counts.wow_count, 0) +
          coalesce(reaction_counts.fire_count, 0) +
          coalesce(comment_counts.comments_count, 0) * 2 +
          coalesce(boost_counts.boost_count, 0) * 3
        )::double precision /
        power(
          1 + greatest(
            0,
            extract(epoch from (ranking_at - posts_for_day.created_at)) / 3600
          ) / 8,
          0.3
        )
      ) as relevance_score
    from posts_for_day
    left join reaction_counts on reaction_counts.post_id = posts_for_day.id
    left join boost_counts on boost_counts.post_id = posts_for_day.id
    left join comment_counts on comment_counts.post_id = posts_for_day.id
    left join public.profiles on profiles.id = posts_for_day.user_id
  )
  select *
    into winner_record
  from ranked_posts
  order by
    relevance_score desc,
    comments_count desc,
    post_created_at desc,
    post_id desc
  limit 1;

  if winner_record.post_id is null then
    return jsonb_build_object(
      'winnerDate', winner_day,
      'status', 'noop_no_posts',
      'winner', null,
      'existingRowCount', existing_count
    );
  end if;

  insert into public.daily_post_winners (
    winner_date,
    rank_position,
    post_id,
    post_created_at,
    post_content,
    author_id,
    author_username,
    likes_count,
    funny_count,
    wow_count,
    fire_count,
    comments_count,
    relevance_score
  )
  values (
    winner_day,
    1,
    winner_record.post_id,
    winner_record.post_created_at,
    winner_record.post_content,
    winner_record.author_id,
    winner_record.author_username,
    winner_record.likes_count,
    winner_record.funny_count,
    winner_record.wow_count,
    winner_record.fire_count,
    winner_record.comments_count,
    winner_record.relevance_score
  )
  on conflict (winner_date, rank_position) do nothing
  returning author_id into inserted_author_id;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object(
      'winnerDate', winner_day,
      'status', 'skipped_existing',
      'winner', null,
      'existingRowCount', 1
    );
  end if;

  if inserted_author_id is null then
    return jsonb_build_object(
      'winnerDate', winner_day,
      'status', 'inserted',
      'winner', jsonb_build_object(
        'winner_date', winner_day,
        'rank_position', 1,
        'post_id', winner_record.post_id,
        'post_created_at', winner_record.post_created_at,
        'post_content', winner_record.post_content,
        'author_id', winner_record.author_id,
        'author_username', winner_record.author_username,
        'likes_count', winner_record.likes_count,
        'funny_count', winner_record.funny_count,
        'wow_count', winner_record.wow_count,
        'fire_count', winner_record.fire_count,
        'comments_count', winner_record.comments_count,
        'relevance_score', winner_record.relevance_score
      ),
      'existingRowCount', existing_count
    );
  end if;

  select count(*)::integer
    into legend_progress
  from public.daily_post_winners
  where rank_position = 1
    and author_id = inserted_author_id;

  select badges.id
    into legend_badge_id
  from public.badges
  where badges.family = 'legend'
    and badges.is_active = true
    and badges.threshold <= legend_progress
  order by badges.threshold desc
  limit 1;

  select user_badges.id, user_badges.badge_id
    into existing_user_badge
  from public.user_badges
  where user_badges.user_id = inserted_author_id
    and user_badges.family = 'legend'
  limit 1;

  if legend_badge_id is null then
    if existing_user_badge.id is not null then
      delete from public.user_badges
      where id = existing_user_badge.id;
    end if;
  elsif existing_user_badge.id is null then
    insert into public.user_badges (
      user_id,
      badge_id,
      family,
      awarded_via,
      progress_value
    )
    values (
      inserted_author_id,
      legend_badge_id,
      'legend',
      'automatic',
      legend_progress
    );
  elsif existing_user_badge.badge_id = legend_badge_id then
    update public.user_badges
    set progress_value = legend_progress,
        updated_at = now()
    where id = existing_user_badge.id;
  else
    update public.user_badges
    set badge_id = legend_badge_id,
        progress_value = legend_progress,
        awarded_via = 'automatic',
        awarded_at = now(),
        updated_at = now()
    where id = existing_user_badge.id;
  end if;

  return jsonb_build_object(
    'winnerDate', winner_day,
    'status', 'inserted',
    'winner', jsonb_build_object(
      'winner_date', winner_day,
      'rank_position', 1,
      'post_id', winner_record.post_id,
      'post_created_at', winner_record.post_created_at,
      'post_content', winner_record.post_content,
      'author_id', winner_record.author_id,
      'author_username', winner_record.author_username,
      'likes_count', winner_record.likes_count,
      'funny_count', winner_record.funny_count,
      'wow_count', winner_record.wow_count,
      'fire_count', winner_record.fire_count,
      'comments_count', winner_record.comments_count,
      'relevance_score', winner_record.relevance_score
    ),
    'existingRowCount', existing_count
  );
end;
$$;

revoke all on function public.run_snapshot_daily_winners(date) from public;
revoke all on function public.run_snapshot_daily_winners(date) from anon;
revoke all on function public.run_snapshot_daily_winners(date) from authenticated;
