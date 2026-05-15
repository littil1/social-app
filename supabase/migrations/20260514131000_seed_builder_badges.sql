insert into public.badges (
  key,
  family,
  category,
  level,
  threshold,
  name,
  short_label,
  description,
  icon,
  color_token,
  sort_order
)
select
  badge.key,
  badge.family,
  badge.category,
  badge.level,
  badge.threshold,
  badge.name,
  badge.short_label,
  badge.description,
  badge.icon,
  badge.color_token,
  badge.sort_order
from (
  values
    ('builder_1', 'builder', 'ideas_implemented', 1, 1, 'Builder', 'Builder', 'Had 1 INPUT idea implemented.', '🧩', 'emerald', 300),
    ('builder_3', 'builder', 'ideas_implemented', 2, 3, 'Product Shaper', 'Product Shaper', 'Had 3 INPUT ideas implemented.', '🔧', 'emerald', 301),
    ('builder_5', 'builder', 'ideas_implemented', 3, 5, 'Impact Maker', 'Impact Maker', 'Had 5 INPUT ideas implemented.', '🏗️', 'emerald', 302),
    ('builder_10', 'builder', 'ideas_implemented', 4, 10, 'Community Architect', 'Community Architect', 'Had 10 INPUT ideas implemented.', '🏛️', 'emerald', 303),
    ('builder_25', 'builder', 'ideas_implemented', 5, 25, 'Platform Builder', 'Platform Builder', 'Had 25 INPUT ideas implemented.', '🌉', 'emerald', 304)
) as badge(
  key,
  family,
  category,
  level,
  threshold,
  name,
  short_label,
  description,
  icon,
  color_token,
  sort_order
)
where not exists (
  select 1
  from public.badges
  where badges.key = badge.key
);
