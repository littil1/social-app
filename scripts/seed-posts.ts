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

const POSTS = [
  "Wenn du ein Café zum Arbeiten suchst: Orte ohne Hintergrundmusik sind oft deutlich besser für längere Sessions.",
  "Kleine Restaurants mit kurzer Karte sind oft die bessere Wahl.",
  "Hotel-Lobbys sind unterschätzt, wenn du unterwegs arbeiten musst.",
  "Die besten Aussichtspunkte sind selten die bekanntesten.",
  "Starte Wanderungen früh oder spät.",
  "Wenn du eine Stadt erkundest: Geh zuerst in Nebenstrassen.",
  "Bei Unterkünften ist Lage wichtiger als Ausstattung.",
  "Wenn du dich konzentrieren musst: Geh bewusst an einen Ort dafür.",
  "Gute Lunch-Spots erkennst du an Einheimischen.",
  "Restaurants bei Sehenswürdigkeiten sind selten die besten.",
];

// =====================================================
// Main
// =====================================================

async function seedPosts() {
  try {
    console.log("🚀 Starte Seed...");

    // Test Query (wichtig für Debug)
    const { error: testError } = await supabase
      .from("posts")
      .select("id")
      .limit(1);

    if (testError) {
      console.error("❌ DB Verbindung fehlgeschlagen:");
      console.error(testError);
      process.exit(1);
    }

    console.log("✅ DB Verbindung ok");

    // User holen
    const { data: users, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("❌ Fehler beim Laden der User:");
      console.error(userError);
      process.exit(1);
    }

    if (!users?.users.length) {
      console.error("❌ Keine User gefunden");
      process.exit(1);
    }

    console.log(`👤 ${users.users.length} User gefunden`);

    const userIds = users.users.map((u) => u.id);

    const inserts = POSTS.map((content, index) => ({
      user_id: userIds[index % userIds.length],
      content,
    }));

    const { error } = await supabase.from("posts").insert(inserts);

    if (error) {
      console.error("❌ Insert Fehler:");
      console.error(error);
      process.exit(1);
    }

    console.log("✅ 10 Posts erfolgreich erstellt");
  } catch (err) {
    console.error("❌ Unerwarteter Fehler:");
    console.error(err);
    process.exit(1);
  }
}

// =====================================================
// Run
// =====================================================

seedPosts();
