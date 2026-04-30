import dotenv from "dotenv";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database";
import {
  getPreviousZurichDayRange,
  getZurichDayRange,
} from "@/features/winners/lib/daily-ranking";
import {
  snapshotDailyWinner,
  type WinnerSnapshotDayRange,
} from "@/lib/daily-winner-snapshot";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";

dotenv.config({ path: ".env.local" });

const REQUIRED_CONFIRMATION = "APP_LEAN_SEED";
const SEED_PASSWORD = "SeedPass123!";
const SEED_EMAIL_DOMAIN = "seed-app.local";

const SEED_USERS = [
  "noah",
  "lina",
  "mila",
  "elias",
  "sara",
  "nico",
  "ava",
  "ben",
  "clara",
  "tim",
] as const;

const POST_TEXTS = [
  "Small wins count more when nobody claps for them.",
  "Some days feel like loading screens.",
  "What is one habit that actually made your days lighter?",
  "I think quiet consistency beats loud motivation.",
  "Today's tiny victory: I did the thing before overthinking it.",
  "You ever open an app and forget why?",
  "Not every reset has to be dramatic.",
  "The best ideas usually arrive when I stop forcing them.",
  "A clean desk does not fix everything, but it does help.",
  "I like when plans leave room for being human.",
  "The first five minutes are usually the hardest part.",
  "Tiny rituals make ordinary days feel less blurry.",
  "I keep learning that simple is not the same as easy.",
  "A good walk can debug more than code sometimes.",
  "There is peace in doing one thing properly.",
  "The best productivity trick might be sleeping enough.",
  "I wish more apps had a button for 'not today'.",
  "Half of confidence is just keeping promises to yourself.",
  "A quiet morning feels like borrowing time from the world.",
  "Nobody warned me that rest also takes practice.",
  "Today's plan: less spiraling, more starting.",
  "You can be serious without being intense all the time.",
  "The notes app is basically a museum of almost-ideas.",
  "I respect anyone who names their files properly.",
  "Some advice only makes sense after the third mistake.",
  "A little friction can save a lot of regret.",
  "I am trying to make boring progress fashionable.",
  "The best ideas survive a night's sleep.",
  "Small kindness has a long battery life.",
  "Starting over quietly still counts.",
  "What is one thing you stopped doing that helped?",
  "I like tools that make me feel calmer, not busier.",
  "A deadline is just a calendar item with drama.",
  "Sometimes the brave thing is sending the simple version.",
  "I want more spaces where being thoughtful wins.",
  "The group chat is undefeated at derailing focus.",
  "Consistency feels boring until it starts working.",
  "A good question can change the whole room.",
  "There should be a word for productive procrastination.",
  "I am suspicious of any plan that requires a perfect mood.",
  "The small stuff adds up in both directions.",
  "Today I chose done over impressive.",
] as const;

const COMMENT_TEXTS = [
  "This is too real.",
  "I needed this today.",
  "Same. The small stuff adds up.",
  "That last line hit.",
  "Honestly, yes.",
  "I disagree a bit, but I get the point.",
  "Saving this thought.",
  "That is a very kind way to put it.",
  "Quietly accurate.",
  "This feels like a Monday sentence.",
  "I am trying this tomorrow.",
  "The boring progress part is underrated.",
] as const;

const REPLY_TEXTS = [
  "Exactly. Tiny but repeatable.",
  "Fair. Context changes everything.",
  "That is the part I keep forgetting.",
  "Same here, especially in the morning.",
  "I like that framing.",
  "Small enough to actually do.",
] as const;

type ReactionType = Database["public"]["Enums"]["reaction_type"];
type SeedUser = {
  id: string;
  username: (typeof SEED_USERS)[number];
};
type SeedPost = {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  day: "today" | "yesterday" | "twoDaysAgo";
};
type SeedComment = {
  id: number;
  post_id: number;
  user_id: string;
  created_at: string;
};
type ZurichDayRange = {
  dayKey: string;
  startIso: string;
  endIso: string;
};

const REACTION_TYPES: ReactionType[] = ["like", "like", "like", "fire", "wow", "funny"];

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getSeedEmail(username: string) {
  return `seed+${username}@${SEED_EMAIL_DOMAIN}`;
}

function isSeedUser(user: User) {
  return (
    user.email?.endsWith(`@${SEED_EMAIL_DOMAIN}`) === true ||
    user.user_metadata?.seed_user === true
  );
}

async function listAllAuthUsers(supabase: SupabaseClient<Database>) {
  const users: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(error.message);
    }

    users.push(...data.users);

    if (data.users.length < 1000) {
      return users;
    }

    page += 1;
  }
}

function asInList<T>(values: T[]) {
  return values.length > 0 ? values : null;
}

function pickOtherUser(users: SeedUser[], excludedUserId: string, offset: number) {
  const candidates = users.filter((user) => user.id !== excludedUserId);
  return candidates[offset % candidates.length];
}

function isoBetween(startIso: string, endIso: string, index: number, total: number) {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const fraction = (index + 1) / (total + 1);
  return new Date(startMs + (endMs - startMs) * fraction).toISOString();
}

function getTodaySeedRange(today: ZurichDayRange) {
  const startMs = new Date(today.startIso).getTime();
  const nowMs = Date.now();
  const safeEndMs = Math.max(startMs + 45 * 60 * 1000, nowMs - 5 * 60 * 1000);

  return {
    startIso: new Date(startMs + 20 * 60 * 1000).toISOString(),
    endIso: new Date(safeEndMs).toISOString(),
  };
}

async function ensureNoUsernameConflicts(
  supabase: SupabaseClient<Database>,
  seedUserIds: string[]
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", [...SEED_USERS]);

  if (error) {
    throw new Error(error.message);
  }

  const conflicts = (data ?? []).filter(
    (profile) => !seedUserIds.includes(profile.id)
  );

  if (conflicts.length > 0) {
    throw new Error(
      `Refusing to seed because these usernames already belong to non-seed profiles: ${conflicts
        .map((profile) => profile.username)
        .join(", ")}`
    );
  }
}

async function updateCommentCounts(
  supabase: SupabaseClient<Database>,
  postIds: number[]
) {
  for (const postId of postIds) {
    const { count, error: countError } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .is("deleted_at", null);

    if (countError) {
      throw new Error(countError.message);
    }

    const { error: updateError } = await supabase
      .from("posts")
      .update({ comments_count: count ?? 0 })
      .eq("id", postId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

async function resetExistingSeedData(
  supabase: SupabaseClient<Database>,
  seedAuthUsers: User[]
) {
  const seedUserIds = seedAuthUsers.map((user) => user.id);
  const seedUserIdList = asInList(seedUserIds);

  if (!seedUserIdList) {
    return;
  }

  const { data: seedPosts, error: seedPostsError } = await supabase
    .from("posts")
    .select("id")
    .in("user_id", seedUserIds);

  if (seedPostsError) {
    throw new Error(seedPostsError.message);
  }

  const seedPostIds = (seedPosts ?? []).map((post) => post.id);
  const seedPostIdList = asInList(seedPostIds);

  const { data: seedComments, error: seedCommentsError } = seedPostIdList
    ? await supabase
        .from("comments")
        .select("id, post_id")
        .or(`user_id.in.(${seedUserIds.join(",")}),post_id.in.(${seedPostIds.join(",")})`)
    : await supabase
        .from("comments")
        .select("id, post_id")
        .in("user_id", seedUserIds);

  if (seedCommentsError) {
    throw new Error(seedCommentsError.message);
  }

  const seedCommentIds = (seedComments ?? []).map((comment) => comment.id);
  const affectedNonSeedPostIds = Array.from(
    new Set(
      (seedComments ?? [])
        .map((comment) => comment.post_id)
        .filter((postId) => !seedPostIds.includes(postId))
    )
  );

  if (seedCommentIds.length > 0) {
    const { error } = await supabase
      .from("comment_reactions")
      .delete()
      .in("comment_id", seedCommentIds);

    if (error) {
      throw new Error(error.message);
    }
  }

  const { error: seedCommentReactionUserError } = await supabase
    .from("comment_reactions")
    .delete()
    .in("user_id", seedUserIds);

  if (seedCommentReactionUserError) {
    throw new Error(seedCommentReactionUserError.message);
  }

  if (seedCommentIds.length > 0) {
    const { error } = await supabase.from("comments").delete().in("id", seedCommentIds);

    if (error) {
      throw new Error(error.message);
    }
  }

  if (seedPostIdList) {
    const { error: postReactionPostError } = await supabase
      .from("post_reactions")
      .delete()
      .in("post_id", seedPostIds);

    if (postReactionPostError) {
      throw new Error(postReactionPostError.message);
    }

    const { error: winnerPostError } = await supabase
      .from("daily_post_winners")
      .delete()
      .in("post_id", seedPostIds);

    if (winnerPostError) {
      throw new Error(winnerPostError.message);
    }
  }

  const { error: postReactionUserError } = await supabase
    .from("post_reactions")
    .delete()
    .in("user_id", seedUserIds);

  if (postReactionUserError) {
    throw new Error(postReactionUserError.message);
  }

  const { error: winnerAuthorError } = await supabase
    .from("daily_post_winners")
    .delete()
    .in("author_id", seedUserIds);

  if (winnerAuthorError) {
    throw new Error(winnerAuthorError.message);
  }

  const { error: userBadgesError } = await supabase
    .from("user_badges")
    .delete()
    .in("user_id", seedUserIds);

  if (userBadgesError) {
    throw new Error(userBadgesError.message);
  }

  if (seedPostIdList) {
    const { error: postsError } = await supabase.from("posts").delete().in("id", seedPostIds);

    if (postsError) {
      throw new Error(postsError.message);
    }
  }

  const { error: profilesError } = await supabase
    .from("profiles")
    .delete()
    .in("id", seedUserIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  for (const user of seedAuthUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  await updateCommentCounts(supabase, affectedNonSeedPostIds);
}

async function createSeedUsers(supabase: SupabaseClient<Database>) {
  const users: SeedUser[] = [];

  for (const username of SEED_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: getSeedEmail(username),
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        seed_user: true,
        username,
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? `Could not create ${username}.`);
    }

    const userId = data.user.id;
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      username,
      bio: getSeedBio(username),
      avatar_url: null,
      is_admin: false,
      badges: [],
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    users.push({ id: userId, username });
  }

  return users;
}

function getSeedBio(username: string) {
  const bios: Record<string, string> = {
    noah: "Collecting small wins.",
    lina: "Quiet consistency fan.",
    mila: "Notes, walks, better questions.",
    elias: "Trying to keep things simple.",
    sara: "Here for thoughtful tiny posts.",
    nico: "Less noise, more signal.",
    ava: "Small rituals and fresh starts.",
    ben: "Mostly overthinking, sometimes shipping.",
    clara: "Making boring progress visible.",
    tim: "One good question at a time.",
  };

  return bios[username] ?? "Seed profile.";
}

async function createSeedPosts(
  supabase: SupabaseClient<Database>,
  users: SeedUser[],
  today: ZurichDayRange,
  yesterday: WinnerSnapshotDayRange,
  twoDaysAgo: WinnerSnapshotDayRange
) {
  const todaySeedRange = getTodaySeedRange(today);
  const plan = [
    { day: "today" as const, count: 22, range: todaySeedRange },
    { day: "yesterday" as const, count: 13, range: yesterday },
    { day: "twoDaysAgo" as const, count: 7, range: twoDaysAgo },
  ];
  const inserts: Array<{
    user_id: string;
    content: string;
    created_at: string;
    comments_count: number;
  }> = [];
  let postIndex = 0;

  for (const group of plan) {
    for (let index = 0; index < group.count; index += 1) {
      const user = users[(postIndex + index) % users.length];
      inserts.push({
        user_id: user.id,
        content: POST_TEXTS[postIndex % POST_TEXTS.length],
        created_at: isoBetween(group.range.startIso, group.range.endIso, index, group.count),
        comments_count: 0,
      });
      postIndex += 1;
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .insert(inserts)
    .select("id, user_id, content, created_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((post, index) => ({
    ...post,
    day: index < 22 ? "today" : index < 35 ? "yesterday" : "twoDaysAgo",
  })) as SeedPost[];
}

async function createSeedComments(
  supabase: SupabaseClient<Database>,
  users: SeedUser[],
  posts: SeedPost[]
) {
  const topLevelComments: SeedComment[] = [];
  const commentedPosts = posts.filter((_, index) =>
    [1, 3, 4, 6, 8, 10, 13, 15, 17, 20, 23, 25, 28, 31, 34, 37, 40, 41].includes(index)
  );

  for (const [postIndex, post] of commentedPosts.entries()) {
    const commentCount = postIndex % 5 === 0 ? 3 : postIndex % 2 === 0 ? 2 : 1;

    for (let commentIndex = 0; commentIndex < commentCount; commentIndex += 1) {
      const commenter = pickOtherUser(users, post.user_id, postIndex + commentIndex);
      const createdAt = new Date(
        new Date(post.created_at).getTime() + (commentIndex + 1) * 18 * 60 * 1000
      ).toISOString();
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: post.id,
          user_id: commenter.id,
          content: COMMENT_TEXTS[(postIndex + commentIndex) % COMMENT_TEXTS.length],
          parent_id: null,
          created_at: createdAt,
        })
        .select("id, post_id, user_id, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      topLevelComments.push(data);
    }
  }

  const discussionParents = topLevelComments.slice(2, 6);
  const replies: SeedComment[] = [];

  for (const [replyIndex, parent] of discussionParents.entries()) {
    const replyCount = replyIndex % 2 === 0 ? 2 : 1;

    for (let index = 0; index < replyCount; index += 1) {
      const replier = pickOtherUser(users, parent.user_id, replyIndex + index + 3);
      const createdAt = new Date(
        new Date(parent.created_at).getTime() + (index + 1) * 11 * 60 * 1000
      ).toISOString();
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: parent.post_id,
          user_id: replier.id,
          content: REPLY_TEXTS[(replyIndex + index) % REPLY_TEXTS.length],
          parent_id: parent.id,
          created_at: createdAt,
        })
        .select("id, post_id, user_id, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      replies.push(data);
    }
  }

  await updateCommentCounts(
    supabase,
    Array.from(new Set([...topLevelComments, ...replies].map((comment) => comment.post_id)))
  );

  return [...topLevelComments, ...replies];
}

async function createPostReactions(
  supabase: SupabaseClient<Database>,
  users: SeedUser[],
  posts: SeedPost[]
) {
  const boostedPostIds = new Set([
    posts[2]?.id,
    posts[7]?.id,
    posts[14]?.id,
    posts[24]?.id,
    posts[36]?.id,
  ]);
  const rows: Array<{
    post_id: number;
    user_id: string;
    reaction: ReactionType;
    created_at: string;
  }> = [];

  posts.forEach((post, index) => {
    const availableUsers = users.filter((user) => user.id !== post.user_id);
    const reactionCount = boostedPostIds.has(post.id)
      ? Math.min(availableUsers.length, 8 - (index % 2))
      : index % 6 === 0
        ? 0
        : 1 + (index % 4);

    for (let reactionIndex = 0; reactionIndex < reactionCount; reactionIndex += 1) {
      rows.push({
        post_id: post.id,
        user_id: availableUsers[(index + reactionIndex) % availableUsers.length].id,
        reaction: REACTION_TYPES[(index + reactionIndex) % REACTION_TYPES.length],
        created_at: new Date(
          new Date(post.created_at).getTime() + (reactionIndex + 1) * 9 * 60 * 1000
        ).toISOString(),
      });
    }
  });

  const { error } = await supabase.from("post_reactions").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

async function createCommentReactions(
  supabase: SupabaseClient<Database>,
  users: SeedUser[],
  comments: SeedComment[]
) {
  const rows: Array<{
    comment_id: number;
    user_id: string;
    reaction: ReactionType;
    created_at: string;
  }> = [];

  comments.forEach((comment, index) => {
    const availableUsers = users.filter((user) => user.id !== comment.user_id);
    const reactionCount = index % 3 === 0 ? 2 : 1;

    for (let reactionIndex = 0; reactionIndex < reactionCount; reactionIndex += 1) {
      rows.push({
        comment_id: comment.id,
        user_id: availableUsers[(index + reactionIndex) % availableUsers.length].id,
        reaction: REACTION_TYPES[(index + reactionIndex) % REACTION_TYPES.length],
        created_at: new Date(
          new Date(comment.created_at).getTime() + (reactionIndex + 1) * 7 * 60 * 1000
        ).toISOString(),
      });
    }
  });

  const { error } = await supabase.from("comment_reactions").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

async function assertNoRealWinnerForSeedDays(
  supabase: SupabaseClient<Database>,
  seedUserIds: string[],
  days: WinnerSnapshotDayRange[]
) {
  const { data, error } = await supabase
    .from("daily_post_winners")
    .select("winner_date, author_id")
    .in(
      "winner_date",
      days.map((day) => day.winnerDate)
    )
    .eq("rank_position", 1);

  if (error) {
    throw new Error(error.message);
  }

  const realRows = (data ?? []).filter(
    (row) => row.author_id && !seedUserIds.includes(row.author_id)
  );

  if (realRows.length > 0) {
    throw new Error(
      `Refusing to overwrite real Hall of Fame winners for: ${realRows
        .map((row) => row.winner_date)
        .join(", ")}`
    );
  }
}

async function createPastDailyWinners(
  supabase: SupabaseClient<Database>,
  seedUserIds: string[],
  yesterday: WinnerSnapshotDayRange,
  twoDaysAgo: WinnerSnapshotDayRange
) {
  await assertNoRealWinnerForSeedDays(supabase, seedUserIds, [yesterday, twoDaysAgo]);

  const results = [];

  for (const day of [twoDaysAgo, yesterday]) {
    const result = await snapshotDailyWinner(supabase, {
      ...day,
      mode: "replace",
      onAffectedWinnerUser: async (userId) => {
        if (seedUserIds.includes(userId)) {
          await recomputeUserBadgeFamilies(supabase, userId, ["legend"]);
        }
      },
    });

    results.push(result);
  }

  return results;
}

async function main() {
  if (process.env.CONFIRM_LEAN_SEED !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Refusing to run. Set CONFIRM_LEAN_SEED=${REQUIRED_CONFIRMATION} to seed local demo data.`
    );
  }

  if (process.env.VERCEL || process.env.CI || process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run during build/deploy/production.");
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const today = getZurichDayRange(new Date());
  const previousDay = getPreviousZurichDayRange(new Date());

  if (!previousDay) {
    throw new Error("Could not resolve Zurich seed days.");
  }

  const previousPreviousDay = getPreviousZurichDayRange(previousDay.startIso);

  if (!previousPreviousDay) {
    throw new Error("Could not resolve Zurich seed days.");
  }

  const yesterday: WinnerSnapshotDayRange = {
    winnerDate: previousDay.dayKey,
    startIso: previousDay.startIso,
    endIso: previousDay.endIso,
  };
  const twoDaysAgo: WinnerSnapshotDayRange = {
    winnerDate: previousPreviousDay.dayKey,
    startIso: previousPreviousDay.startIso,
    endIso: previousPreviousDay.endIso,
  };

  console.log("Starting APP lean seed.");
  console.log("Reaction column: post_reactions.reaction and comment_reactions.reaction.");

  const authUsers = await listAllAuthUsers(supabase);
  const existingSeedUsers = authUsers.filter(isSeedUser);
  await ensureNoUsernameConflicts(
    supabase,
    existingSeedUsers.map((user) => user.id)
  );
  await resetExistingSeedData(supabase, existingSeedUsers);

  const users = await createSeedUsers(supabase);
  const posts = await createSeedPosts(supabase, users, today, yesterday, twoDaysAgo);
  const comments = await createSeedComments(supabase, users, posts);
  await createPostReactions(supabase, users, posts);
  await createCommentReactions(supabase, users, comments);
  const winnerResults = await createPastDailyWinners(
    supabase,
    users.map((user) => user.id),
    yesterday,
    twoDaysAgo
  );

  console.log("Lean seed complete.");
  console.log(`Users: ${users.length}`);
  console.log(`Posts: ${posts.length}`);
  console.log(`Comments/replies: ${comments.length}`);
  console.log(
    `Hall of Fame snapshots: ${winnerResults
      .map((result) => `${result.winnerDate}:${result.status}`)
      .join(", ")}`
  );
  console.log(`Seed login password for all users: ${SEED_PASSWORD}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
