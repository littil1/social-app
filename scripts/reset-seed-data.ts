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
// Main
// =====================================================

async function resetSeedData() {
  try {
    console.log("🧹 Starte Reset...");

    const { error: commentReactionsError } = await supabase
      .from("comment_reactions")
      .delete()
      .neq("id", 0);

    if (commentReactionsError) {
      console.error("❌ Fehler bei comment_reactions:");
      console.error(commentReactionsError);
      process.exit(1);
    }

    const { error: commentsError } = await supabase
      .from("comments")
      .delete()
      .neq("id", 0);

    if (commentsError) {
      console.error("❌ Fehler bei comments:");
      console.error(commentsError);
      process.exit(1);
    }

    const { error: postReactionsError } = await supabase
      .from("post_reactions")
      .delete()
      .neq("id", 0);

    if (postReactionsError) {
      console.error("❌ Fehler bei post_reactions:");
      console.error(postReactionsError);
      process.exit(1);
    }

    const { error: postsError } = await supabase
      .from("posts")
      .delete()
      .neq("id", 0);

    if (postsError) {
      console.error("❌ Fehler bei posts:");
      console.error(postsError);
      process.exit(1);
    }

    console.log("✅ Seed-Daten erfolgreich gelöscht");
  } catch (error) {
    console.error("❌ Unerwarteter Fehler:");
    console.error(error);
    process.exit(1);
  }
}

// =====================================================
// Run
// =====================================================

resetSeedData();