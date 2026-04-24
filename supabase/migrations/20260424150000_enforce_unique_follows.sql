delete from public.follows
where follower_id = following_id;

with duplicate_rows as (
  select
    id,
    row_number() over (
      partition by follower_id, following_id
      order by created_at asc, id asc
    ) as row_number_for_pair
  from public.follows
)
delete from public.follows
where id in (
  select id
  from duplicate_rows
  where row_number_for_pair > 1
);

create unique index if not exists follows_follower_id_following_id_idx
on public.follows (follower_id, following_id);

alter table public.follows
  drop constraint if exists follows_no_self_follow;

alter table public.follows
  add constraint follows_no_self_follow
  check (follower_id <> following_id);
