update public.badges as b
set
  name = v.label,
  short_label = v.label,
  icon = v.icon
from (
  values
    ('legend_1', 'Legend', '🏆'),
    ('legend_3', 'Elite Legend', '🌟'),
    ('legend_5', 'Mythic Legend', '💎'),
    ('legend_10', 'HOF Icon', '👑'),

    ('contributor_1', 'Contributor', '💡'),
    ('contributor_3', 'Active Contributor', '📝'),
    ('contributor_5', 'Strong Contributor', '🧠'),
    ('contributor_10', 'Top Contributor', '📐'),
    ('contributor_25', 'Idea Machine', '⚡'),
    ('contributor_50', 'Idea Architect', '🛠️'),
    ('contributor_100', 'Vision Engine', '🚀'),

    ('builder_1', 'Builder', '🧩'),
    ('builder_3', 'Product Shaper', '🔧'),
    ('builder_5', 'Impact Maker', '🏗️'),
    ('builder_10', 'Community Architect', '🏛️'),
    ('builder_25', 'Platform Builder', '🌉'),

    ('top_reactor_1', 'Top Reactor', '👆'),
    ('top_reactor_3', 'Active Reactor', '🔋'),
    ('top_reactor_5', 'Strong Reactor', '🔥'),
    ('top_reactor_10', 'Reaction Storm', '🌪️'),
    ('top_reactor_25', 'Reaction Force', '💥'),
    ('top_reactor_50', 'Reaction Core', '⚛️'),
    ('top_reactor_100', 'Reaction Legend', '☄️'),

    ('most_reacted_1', 'Most Reacted', '✨'),
    ('most_reacted_3', 'Crowd Favorite', '📣'),
    ('most_reacted_5', 'Reaction Magnet', '🧲'),
    ('most_reacted_10', 'Viral Spark', '💫'),
    ('most_reacted_25', 'Public Favorite', '🎇'),
    ('most_reacted_50', 'Reaction Icon', '💠'),
    ('most_reacted_100', 'Spotlight Legend', '🪩'),

    ('top_commentator_1', 'Top Commentator', '💬'),
    ('top_commentator_3', 'Active Voice', '🗣️'),
    ('top_commentator_5', 'Strong Commentator', '✍️'),
    ('top_commentator_10', 'Conversation Driver', '🎙️'),
    ('top_commentator_25', 'Community Voice', '📢'),
    ('top_commentator_50', 'Forum Voice', '📰'),
    ('top_commentator_100', 'Comment Legend', '🏅'),

    ('most_discussed_1', 'Most Discussed', '🗨️'),
    ('most_discussed_3', 'Conversation Starter', '🔁'),
    ('most_discussed_5', 'Discussion Wave', '🌊'),
    ('most_discussed_10', 'Thread Driver', '🧵'),
    ('most_discussed_25', 'Debate Driver', '⚖️'),
    ('most_discussed_50', 'Thought Magnet', '🧭'),
    ('most_discussed_100', 'Public Forum', '🏟️')
) as v(key, label, icon)
where b.key = v.key;
