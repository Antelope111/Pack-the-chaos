import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Nicknames are claimed atomically. Only a SHA-256 session digest reaches D1.
export const communityProfiles = sqliteTable("community_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull(),
  sessionHash: text("session_hash").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  uniqueIndex("community_profiles_name_key_unique").on(table.nameKey),
  uniqueIndex("community_profiles_session_hash_unique").on(table.sessionHash),
]);

// A row is one best campaign result or one UTC Daily date, never an aggregate.
export const communityScores = sqliteTable("community_scores", {
  profileId: text("profile_id").notNull().references(() => communityProfiles.id, { onDelete: "cascade" }),
  levelKey: text("level_key").notNull(),
  chapterId: text("chapter_id"),
  dailyKey: text("daily_key"),
  revision: integer("revision").notNull(),
  stars: integer("stars").notNull(),
  bestMoves: integer("best_moves"),
  hints: integer("hints"),
  bestUnassistedMoves: integer("best_unassisted_moves"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.profileId, table.levelKey] })]);

// Short-lived hashed buckets, used to slow bulk nickname claims and sync spam.
export const communityRateBuckets = sqliteTable("community_rate_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  hits: integer("hits").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("community_rate_expiry").on(table.expiresAt)]);
