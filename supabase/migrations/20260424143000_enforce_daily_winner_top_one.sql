delete from public.daily_post_winners
where rank_position <> 1;

with duplicate_rows as (
  select
    id,
    row_number() over (
      partition by winner_date, rank_position
      order by awarded_at desc, id desc
    ) as row_number_for_day_rank
  from public.daily_post_winners
  where rank_position = 1
)
delete from public.daily_post_winners
where id in (
  select id
  from duplicate_rows
  where row_number_for_day_rank > 1
);

create unique index if not exists daily_post_winners_winner_date_rank_position_idx
on public.daily_post_winners (winner_date, rank_position);

alter table public.daily_post_winners
  drop constraint if exists daily_post_winners_rank_position_is_top_one;

alter table public.daily_post_winners
  add constraint daily_post_winners_rank_position_is_top_one
  check (rank_position = 1);
