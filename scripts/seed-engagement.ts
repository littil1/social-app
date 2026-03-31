// =====================================================
// Env laden
// =====================================================

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// =====================================================
// Imports
// =====================================================

import { createClient } from "@supabase/supabase-js";

// =====================================================
// Config
// =====================================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL fehlt");
  process.exit(1);
}

if (!key) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY fehlt");
  process.exit(1);
}

const supabase = createClient(url, key);

// =====================================================
// Seed Data
// =====================================================

const COMMENT_TEXTS = [
  "Starker Hinweis, genau solche Beiträge sind hilfreich.",
  "Gut beschrieben und direkt verständlich.",
  "Hilft wirklich weiter, vor allem mit dem Kontext.",
  "Solche konkreten Empfehlungen machen hier den Unterschied.",
  "Ehrlich und nützlich, genau darum geht es.",
  "Das ist deutlich hilfreicher als ein allgemeiner Einzeiler.",
];

// Falls dein Enum andere Werte nutzt, hier anpassen:
const REACTION_TYPES = ["like", "funny", "wow", "fire"] as const;

// =====================================================
// Helpers
// =====================================================

function getDifferentUserId(userIds: string[], excludedUserId: string) {
  const candidate = userIds.find((id) => id !== excludedUserId);
  return candidate ?? null;
}

// =====================================================
// Main
// =====================================================

async function seedEngagement() {
  try {
    console.log("💬 Starte Engagement-Seed...");

    const { data: usersData, error: usersError } =
      await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("❌ Fehler beim Laden der User:");
      console.error(usersError);
      process.exit(1);
    }

    const userIds = usersData.users.map((user) => user.id);

    if (userIds.length < 2) {
      console.error("❌ Du brauchst mindestens 2 User für Likes und Kommentare");
      process.exit(1);
    }

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, user_id")
      .order("id", { ascending: true });

    if (postsError) {
      console.error("❌ Fehler beim Laden der Posts:");
      console.error(postsError);
      process.exit(1);
    }

    if (!posts || posts.length === 0) {
      console.error("❌ Keine Posts gefunden");
      process.exit(1);
    }

    // =====================================================
    // Post-Reaktionen vorbereiten
    // =====================================================

    const postReactions: {
      post_id: number;
      user_id: string;
      reaction: (typeof REACTION_TYPES)[number];
    }[] = [];

    posts.forEach((post, index) => {
      const availableUsers = userIds.filter((id) => id !== post.user_id);

      const maxReactions = Math.min(availableUsers.length, 2);

      for (let i = 0; i < maxReactions; i += 1) {
        postReactions.push({
          post_id: post.id,
          user_id: availableUsers[i],
          reaction: REACTION_TYPES[(index + i) % REACTION_TYPES.length],
        });
      }
    });

    if (postReactions.length > 0) {
      const { error: reactionsError } = await supabase
        .from("post_reactions")
        .insert(postReactions);

      if (reactionsError) {
        console.error("❌ Fehler bei post_reactions:");
        console.error(reactionsError);
        process.exit(1);
      }
    }

    // =====================================================
    // Kommentare vorbereiten
    // =====================================================

    const commentsToInsert: {
      post_id: number;
      user_id: string;
      content: string;
      parent_id: null;
    }[] = [];

    posts.slice(0, 6).forEach((post, index) => {
      const commenterId = getDifferentUserId(userIds, post.user_id);

      if (!commenterId) return;

      commentsToInsert.push({
        post_id: post.id,
        user_id: commenterId,
        content: COMMENT_TEXTS[index % COMMENT_TEXTS.length],
        parent_id: null,
      });
    });

    let insertedComments:
      | {
          id: number;
          user_id: string;
        }[]
      | null = null;

    if (commentsToInsert.length > 0) {
      const { data, error: commentsError } = await supabase
        .from("comments")
        .insert(commentsToInsert)
        .select("id, user_id");

      if (commentsError) {
        console.error("❌ Fehler bei comments:");
        console.error(commentsError);
        process.exit(1);
      }

      insertedComments = data;
    }

    // =====================================================
    // Kommentar-Reaktionen vorbereiten
    // =====================================================

    if (insertedComments && insertedComments.length > 0) {
      const commentReactions: {
        comment_id: number;
        user_id: string;
        reaction: (typeof REACTION_TYPES)[number];
      }[] = [];

      insertedComments.forEach((comment, index) => {
        const reactorId = getDifferentUserId(userIds, comment.user_id);

        if (!reactorId) return;

        commentReactions.push({
          comment_id: comment.id,
          user_id: reactorId,
          reaction: REACTION_TYPES[index % REACTION_TYPES.length],
        });
      });

      if (commentReactions.length > 0) {
        const { error: commentReactionsError } = await supabase
          .from("comment_reactions")
          .insert(commentReactions);

        if (commentReactionsError) {
          console.error("❌ Fehler bei comment_reactions:");
          console.error(commentReactionsError);
          process.exit(1);
        }
      }
    }

    console.log("✅ Likes und Kommentare erfolgreich erstellt");
  } catch (error) {
    console.error("❌ Unerwarteter Fehler:");
    console.error(error);
    process.exit(1);
  }
}

// =====================================================
// Run
// =====================================================

seedEngagement();