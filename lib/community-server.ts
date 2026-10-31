import catalog from "./packing-catalog.json" with { type: "json" };

const COOKIE = "pack_community_session";
const MAX_BODY_BYTES = 128 * 1024;
const MAX_DAILY_PER_SYNC = 366;
const DAY = 86_400_000;
const TOTAL_LEVELS = Object.keys(catalog.levels).length;
const TOTALS = { totalLevels: TOTAL_LEVELS, maxStars: TOTAL_LEVELS * 3 };
const CAMPAIGN_CATALOG = JSON.stringify(catalog.levels);
const RESERVED_NAMES = new Set(["admin", "administrator", "moderator", "mod", "system", "support", "official", "staff", "developer", "packthechaos", "playlab"]);

type Chapter = "cats" | "dogs" | "odd" | "rooftops" | "seaside" | "bazaar" | "aurora";
type LevelMeta = { revision: number; par: number; pieceCount: number; chapterId?: string };
type ProfileRow = { id: string; name: string; completed: number; stars: number; daily_completed: number; cats: number; dogs: number; odd: number; rooftops: number; seaside: number; bazaar: number; aurora: number; rank: number; total_players: number };
type Score = { level_key: string; chapter_id: string | null; daily_key: string | null; revision: number; stars: number; best_moves: number | null; hints: number | null; best_unassisted_moves: number | null };

export type CommunityProfile = {
  id: string; name: string; completed: number; stars: number; dailyCompleted: number;
  chapters: Record<Chapter, number>; rank: number;
};

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(value: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders } });
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function count(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 100_000;
}

export function normalizePlayerName(value: unknown) {
  if (typeof value !== "string" || value.length > 160) throw new ApiError(400, "INVALID_NAME", "Use a name with 2–20 letters or numbers, spaces, _ or -.");
  const name = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if ([...name].length < 2 || [...name].length > 20 || !/^[\p{L}\p{N} _-]+$/u.test(name) || !/[\p{L}\p{N}]/u.test(name)) {
    throw new ApiError(400, "INVALID_NAME", "Use a name with 2–20 letters or numbers, spaces, _ or -.");
  }
  const key = name.toLowerCase();
  if (RESERVED_NAMES.has(key.replace(/[ _-]/g, ""))) throw new ApiError(400, "RESERVED_NAME", "This name is reserved. Please choose another.");
  return { name, key };
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sessionId(request: Request, db: D1Database) {
  const token = (request.headers.get("cookie") || "").split(";").map((item) => item.trim()).find((item) => item.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await db.prepare("SELECT id FROM community_profiles WHERE session_hash = ?").bind(await digest(token)).first<{ id: string }>();
  return row?.id || null;
}

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== new URL(request.url).origin) || (!origin && site !== "same-origin") || (site && site !== "same-origin" && site !== "none")) {
    throw new ApiError(403, "CROSS_ORIGIN", "Open Pack the Chaos to update your player profile.");
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    throw new ApiError(415, "JSON_REQUIRED", "Send progress as JSON.");
  }
}

async function readBody(request: Request) {
  requireSameOrigin(request);
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_BODY_BYTES) throw new ApiError(413, "BODY_TOO_LARGE", "Please sync fewer results at a time.");
  if (!request.body) throw new ApiError(400, "INVALID_JSON", "A JSON request is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "BODY_TOO_LARGE", "Please sync fewer results at a time.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const payload: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!object(payload)) throw new Error("not an object");
    return payload;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Send a valid JSON object.");
  }
}

async function throttle(db: D1Database, key: string, limit: number, windowMs: number, now: number) {
  const bucket = Math.floor(now / windowMs);
  const bucketKey = await digest(key + ":" + bucket);
  const results = await db.batch([
    db.prepare("DELETE FROM community_rate_buckets WHERE expires_at <= ?").bind(now),
    db.prepare("INSERT INTO community_rate_buckets (bucket_key, hits, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket_key) DO UPDATE SET hits = hits + 1 RETURNING hits")
      .bind(bucketKey, (bucket + 1) * windowMs),
  ]);
  const hits = Number((results[1].results[0] as { hits: number } | undefined)?.hits || 0);
  if (hits > limit) throw new ApiError(429, "RATE_LIMITED", "A few too many requests. Please try again shortly.");
}

// Only current campaign revisions contribute. A stale result cannot silently
// regain a place on the leaderboard after a puzzle is redesigned.
const RANKED_SQL = `WITH current_levels AS (
  SELECT key AS level_key, json_extract(value, '$.revision') AS revision FROM json_each(?)
), totals AS (
  SELECT p.id, p.name, p.name_key,
    COUNT(CASE WHEN s.daily_key IS NULL THEN s.level_key END) AS completed,
    COALESCE(SUM(CASE WHEN s.daily_key IS NULL THEN s.stars ELSE 0 END), 0) AS stars,
    COUNT(s.daily_key) AS daily_completed,
    COALESCE(SUM(CASE WHEN s.chapter_id = 'cats' THEN 1 ELSE 0 END), 0) AS cats,
    COALESCE(SUM(CASE WHEN s.chapter_id = 'dogs' THEN 1 ELSE 0 END), 0) AS dogs,
    COALESCE(SUM(CASE WHEN s.chapter_id = 'odd' THEN 1 ELSE 0 END), 0) AS odd,
    COALESCE(SUM(CASE WHEN s.chapter_id = 'rooftops' THEN 1 ELSE 0 END), 0) AS rooftops,
    COALESCE(SUM(CASE WHEN s.chapter_id = 'seaside' THEN 1 ELSE 0 END), 0) AS seaside,
    COALESCE(SUM(CASE WHEN s.chapter_id = 'bazaar' THEN 1 ELSE 0 END), 0) AS bazaar,
    COALESCE(SUM(CASE WHEN s.chapter_id = 'aurora' THEN 1 ELSE 0 END), 0) AS aurora
  FROM community_profiles p
  LEFT JOIN community_scores s ON s.profile_id = p.id AND (
    (s.daily_key IS NOT NULL AND s.revision = 2) OR
    EXISTS(SELECT 1 FROM current_levels c WHERE c.level_key = s.level_key AND c.revision = s.revision)
  )
  GROUP BY p.id
), ranked AS (
  SELECT *, RANK() OVER(ORDER BY completed DESC, stars DESC, daily_completed DESC) AS rank,
    COUNT(*) OVER() AS total_players
  FROM totals
)`;

function profile(row: ProfileRow): CommunityProfile {
  return { id: row.id, name: row.name, completed: Number(row.completed), stars: Number(row.stars), dailyCompleted: Number(row.daily_completed),
    chapters: { cats: Number(row.cats), dogs: Number(row.dogs), odd: Number(row.odd), rooftops: Number(row.rooftops), seaside: Number(row.seaside), bazaar: Number(row.bazaar), aurora: Number(row.aurora) }, rank: Number(row.rank) };
}

async function getProfile(db: D1Database, id: string) {
  const row = await db.prepare(RANKED_SQL + " SELECT * FROM ranked WHERE id = ?").bind(CAMPAIGN_CATALOG, id).first<ProfileRow>();
  return row ? profile(row) : null;
}

function dateIsValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function validRecord(raw: unknown, id: string, meta: LevelMeta, dateKey: string | null): Score {
  const invalid = () => new ApiError(400, "INVALID_PROGRESS", "Some saved results are invalid. Reload the game and try again.");
  if (!object(raw) || raw.revision !== meta.revision || (raw.levelId !== undefined && raw.levelId !== id)) throw invalid();
  if (dateKey && raw.dateKey !== undefined && raw.dateKey !== dateKey) throw invalid();
  const migrated = id === "moonlight-check-in" && raw.revision === 1 && raw.migrated === true && raw.stars === 1 && raw.bestMoves === null && raw.hints === null;
  if (migrated) return { level_key: id, chapter_id: meta.chapterId || null, daily_key: dateKey, revision: meta.revision, stars: 1, best_moves: null, hints: null, best_unassisted_moves: null };
  if (!count(raw.bestMoves) || raw.bestMoves < meta.pieceCount || !count(raw.hints)) throw invalid();
  const stars = raw.hints > 0 ? 1 : raw.bestMoves <= meta.par ? 3 : 2;
  if (raw.stars !== stars) throw invalid();
  if (raw.bestUnassistedMoves !== null && raw.bestUnassistedMoves !== undefined && (!count(raw.bestUnassistedMoves) || raw.bestUnassistedMoves < meta.pieceCount || raw.bestUnassistedMoves !== raw.bestMoves || stars === 1)) throw invalid();
  return { level_key: id, chapter_id: meta.chapterId || null, daily_key: dateKey, revision: meta.revision, stars, best_moves: raw.bestMoves, hints: raw.hints, best_unassisted_moves: stars >= 2 ? raw.bestMoves : null };
}

export function validateProgress(payload: Record<string, unknown>, now = Date.now()) {
  const records = payload.records === undefined ? {} : payload.records;
  const dailyRecords = payload.dailyRecords === undefined ? {} : payload.dailyRecords;
  if (!object(records) || !object(dailyRecords) || Object.keys(records).length > TOTAL_LEVELS || Object.keys(dailyRecords).length > MAX_DAILY_PER_SYNC) {
    throw new ApiError(400, "INVALID_PROGRESS", `Sync up to ${TOTAL_LEVELS} trips and the latest 366 Daily results at a time.`);
  }
  const scores: Score[] = [];
  const levels: Record<string, LevelMeta> = catalog.levels;
  for (const [id, raw] of Object.entries(records)) {
    if (!Object.prototype.hasOwnProperty.call(levels, id)) throw new ApiError(400, "UNKNOWN_LEVEL", "This saved trip is no longer available. Reload the game and try again.");
    scores.push(validRecord(raw, id, levels[id], null));
  }
  const today = new Date(now).toISOString().slice(0, 10);
  for (const [date, raw] of Object.entries(dailyRecords)) {
    if (!dateIsValid(date) || date < "2020-01-01" || date > today) throw new ApiError(400, "INVALID_DAILY_DATE", "Daily results must have a valid date, no later than today (UTC).");
    const day = Math.round((Date.parse(date + "T00:00:00.000Z") - Date.parse(catalog.dailyEpoch + "T00:00:00.000Z")) / DAY);
    const index = ((day % catalog.daily.length) + catalog.daily.length) % catalog.daily.length;
    scores.push(validRecord(raw, "daily-" + date, catalog.daily[index], date));
  }
  return scores;
}

async function mergeProgress(db: D1Database, id: string, scores: Score[], now: number) {
  if (!scores.length) return;
  // A single statement makes concurrent imports atomic and avoids D1 variable
  // limits when a returning player syncs months of Daily results.
  await db.prepare(`INSERT INTO community_scores
    (profile_id, level_key, chapter_id, daily_key, revision, stars, best_moves, hints, best_unassisted_moves, created_at, updated_at)
    SELECT ?, json_extract(value, '$.level_key'), json_extract(value, '$.chapter_id'), json_extract(value, '$.daily_key'),
      json_extract(value, '$.revision'), json_extract(value, '$.stars'), json_extract(value, '$.best_moves'),
      json_extract(value, '$.hints'), json_extract(value, '$.best_unassisted_moves'), ?, ?
    FROM json_each(?) WHERE 1
    ON CONFLICT(profile_id, level_key) DO UPDATE SET
      chapter_id = excluded.chapter_id, daily_key = excluded.daily_key, revision = excluded.revision,
      stars = excluded.stars, best_moves = excluded.best_moves, hints = excluded.hints,
      best_unassisted_moves = excluded.best_unassisted_moves, updated_at = excluded.updated_at
    WHERE excluded.revision != community_scores.revision OR
      excluded.stars > community_scores.stars OR
      (excluded.stars = community_scores.stars AND excluded.best_moves IS NOT NULL AND
        (community_scores.best_moves IS NULL OR excluded.best_moves < community_scores.best_moves OR
          (excluded.best_moves = community_scores.best_moves AND excluded.hints < community_scores.hints)))`)
    .bind(id, now, now, JSON.stringify(scores)).run();
}

export async function handleCommunityRequest(request: Request, db: D1Database | undefined, now = Date.now()): Promise<Response> {
  try {
    if (!db) throw new ApiError(503, "COMMUNITY_UNAVAILABLE", "The community board is taking a short break. Your local progress is safe.");
    const url = new URL(request.url);
    const action = url.pathname.replace(/\/+$/, "").replace(/^\/api\/community\//, "");
    if (request.method === "GET" && action === "me") {
      const id = await sessionId(request, db);
      return json({ profile: id ? await getProfile(db, id) : null, ...TOTALS });
    }
    if (request.method === "GET" && action === "achievements") {
      const id = await sessionId(request, db);
      const progress: { records: Record<string, unknown>; dailyRecords: Record<string, unknown> } = { records: {}, dailyRecords: {} };
      if (id) {
        const rows = await db.prepare("SELECT level_key, daily_key, revision, stars FROM community_scores WHERE profile_id = ?").bind(id).all<Score>();
        for (const row of rows.results) {
          const group = row.daily_key ? progress.dailyRecords : progress.records;
          group[row.daily_key || row.level_key] = { revision: row.revision, stars: row.stars };
        }
      }
      return json({ joined: !!id, progress });
    }
    if (request.method === "GET" && action === "name") {
      let normalized;
      try { normalized = normalizePlayerName(url.searchParams.get("name")); }
      catch (error) {
        if (error instanceof ApiError) return json({ available: false, normalizedName: "", message: error.message });
        throw error;
      }
      const existing = await db.prepare("SELECT id FROM community_profiles WHERE name_key = ?").bind(normalized.key).first<{ id: string }>();
      const ownId = existing ? await sessionId(request, db) : null;
      const available = !existing || existing.id === ownId;
      return json({ available, normalizedName: normalized.name, message: existing?.id === ownId ? "This is your player name." : available ? "This name is available." : "This name is already taken. Try another." });
    }
    if (request.method === "GET" && action === "leaderboard") {
      const id = await sessionId(request, db);
      const rows = await db.prepare(RANKED_SQL + " SELECT * FROM ranked ORDER BY completed DESC, stars DESC, daily_completed DESC, name_key ASC, id ASC LIMIT 50").bind(CAMPAIGN_CATALOG).all<ProfileRow>();
      const ownRow = id ? rows.results.find((row) => row.id === id) : null;
      return json({ entries: rows.results.map(profile), me: ownRow ? profile(ownRow) : id ? await getProfile(db, id) : null,
        totalPlayers: Number(rows.results[0]?.total_players || 0), ...TOTALS, updatedAt: new Date(now).toISOString() });
    }
    if (request.method === "POST" && action === "join") {
      const payload = await readBody(request);
      const ownId = await sessionId(request, db);
      if (ownId) return json({ profile: await getProfile(db, ownId) });
      // Cloudflare supplies this header; do not use client-controlled forwarding
      // headers. No IP address or network identifier is exposed or stored raw.
      const clientIp = request.headers.get("cf-connecting-ip");
      if (clientIp) await throttle(db, "join:" + clientIp, 120, 60 * 60 * 1000, now);
      const normalized = normalizePlayerName(payload.name);
      const token = randomToken();
      const id = crypto.randomUUID();
      try {
        await db.prepare("INSERT INTO community_profiles (id, name, name_key, session_hash, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, normalized.name, normalized.key, await digest(token), now).run();
      } catch (error) {
        const taken = await db.prepare("SELECT id FROM community_profiles WHERE name_key = ?").bind(normalized.key).first();
        if (taken) throw new ApiError(409, "NAME_TAKEN", "This name has just been taken. Please choose another.");
        throw error;
      }
      const secure = url.protocol === "https:" ? "; Secure" : "";
      return json({ profile: await getProfile(db, id) }, 201, { "Set-Cookie": `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` });
    }
    if (request.method === "POST" && action === "progress") {
      const payload = await readBody(request);
      const id = await sessionId(request, db);
      if (!id) throw new ApiError(401, "JOIN_REQUIRED", "Choose a unique player name to join the community board.");
      await throttle(db, "sync:" + id, 120, 60 * 1000, now);
      const scores = validateProgress(payload, now);
      await mergeProgress(db, id, scores, now);
      return json({ profile: await getProfile(db, id) });
    }
    throw new ApiError(404, "NOT_FOUND", "This community route does not exist.");
  } catch (error) {
    if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message } }, error.status);
    // Database internals, session digests and raw progress never reach clients.
    console.error("Community request failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: { code: "COMMUNITY_UNAVAILABLE", message: "The community board is taking a short break. Your local progress is safe." } }, 503);
  }
}
