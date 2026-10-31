/* Pack the Chaos — local passport, transparent scoring, and daily results.
 * This module stores progress locally; community.js handles optional online sync.
 * Stars describe the best run for
 * this puzzle revision; previous versions never unlock redesigned puzzles.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PackProgress = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  var KEY = 'pack-the-chaos-v2', LEGACY_KEY = 'pack-the-chaos-v1';
  var OLD_IDS = ['moonlight-check-in', 'eight-arm-weekend', 'snow-day-away', 'after-dark-departure', 'camp-coral', 'warm-weather-warning', 'midnight-campout', 'all-arms-aboard', 'the-great-thaw'];
  var own = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  var isObject = function (value) { return value !== null && typeof value === 'object' && !Array.isArray(value); };
  var isCount = function (value) { return Number.isSafeInteger(value) && value >= 0; };
  var isId = function (value) { return typeof value === 'string' && value.length <= 120 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value) && value !== 'constructor' && value !== 'prototype'; };
  var revisionOf = function (level) { return level && isCount(level.revision) && level.revision > 0 ? level.revision : 2; };

  function storageOrDefault(storage) {
    if (storage !== undefined) return storage;
    try { return root && root.localStorage; } catch (_) { return null; }
  }
  function read(storage, key) {
    try {
      var value = storage && storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (_) { return null; }
  }
  function fresh() {
    return {version: 2, sound: false, records: Object.create(null), dailyRecords: Object.create(null), lastTripId: null, legacyCompleted: []};
  }
  function validDateKey(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function instant(date) {
    var value;
    try { value = date === undefined ? new Date() : new Date(date); } catch (_) { value = new Date(); }
    return Number.isFinite(value.getTime()) ? value : new Date();
  }
  function todayKey(date) { return instant(date).toISOString().slice(0, 10); }
  function dailyKey(level, date) {
    if (!level || !level.isDaily) return null;
    var candidate = level.dateKey || level.dailyDate || level.date;
    if (validDateKey(candidate)) return candidate;
    var fromId = typeof level.id === 'string' && /^daily-(\d{4}-\d{2}-\d{2})$/.exec(level.id);
    return fromId && validDateKey(fromId[1]) ? fromId[1] : todayKey(date);
  }
  function safeInstant(value) {
    if (typeof value !== 'string') return null;
    var date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  function legacyIds(value) {
    return Array.isArray(value) ? OLD_IDS.filter(function (id) { return value.indexOf(id) !== -1; }) : [];
  }
  function cleanRecord(raw, id, dateKey) {
    if (!isObject(raw) || !isId(id) || !isCount(raw.revision) || raw.revision < 1 || !Number.isInteger(raw.stars) || raw.stars < 1 || raw.stars > 3) return null;
    if (raw.levelId !== undefined && raw.levelId !== id) return null;
    var migrated = raw.migrated === true && id === 'moonlight-check-in' && raw.revision === 1 && raw.stars === 1;
    if ((!isCount(raw.bestMoves) || !isCount(raw.hints)) && !(migrated && raw.bestMoves === null && raw.hints === null)) return null;
    if (raw.stars >= 2 && raw.hints !== 0) return null;
    var unassisted = isCount(raw.bestUnassistedMoves) ? raw.bestUnassistedMoves : null;
    if (raw.stars >= 2) unassisted = unassisted === null ? raw.bestMoves : Math.min(unassisted, raw.bestMoves);
    var record = {
      levelId: id, revision: raw.revision, stars: raw.stars,
      bestMoves: raw.bestMoves, hints: raw.hints,
      bestUnassistedMoves: unassisted,
      completedAt: safeInstant(raw.completedAt), updatedAt: safeInstant(raw.updatedAt)
    };
    if (migrated) record.migrated = true;
    if (dateKey) record.dateKey = dateKey;
    return record;
  }
  function sanitize(raw) {
    var state = fresh();
    if (!isObject(raw) || raw.version !== 2) return state;
    state.sound = raw.sound === true;
    state.legacyCompleted = legacyIds(raw.legacyCompleted);
    state.lastTripId = isId(raw.lastTripId) ? raw.lastTripId : null;
    if (isObject(raw.records)) Object.keys(raw.records).forEach(function (id) {
      var record = cleanRecord(raw.records[id], id);
      if (record) state.records[id] = record;
    });
    if (isObject(raw.dailyRecords)) Object.keys(raw.dailyRecords).forEach(function (key) {
      if (!validDateKey(key)) return;
      var rawRecord = raw.dailyRecords[key];
      var record = cleanRecord(rawRecord, 'daily-' + key, key);
      if (record) state.dailyRecords[key] = record;
    });
    return state;
  }
  function load(levels, storage) {
    storage = storageOrDefault(storage);
    var raw = read(storage, KEY), state = sanitize(raw);
    var list = Array.isArray(levels) ? levels : [];
    var known = Object.create(null);
    list.forEach(function (level) { if (level && isId(level.id)) known[level.id] = level; });
    if (!isObject(raw) || raw.version !== 2) {
      var legacy = read(storage, LEGACY_KEY);
      if (isObject(legacy)) {
        state.sound = legacy.sound === true;
        state.legacyCompleted = legacyIds(legacy.completed);
        if (state.legacyCompleted.indexOf('moonlight-check-in') !== -1 && known['moonlight-check-in'] && revisionOf(known['moonlight-check-in']) === 1) {
          state.records['moonlight-check-in'] = {
            levelId: 'moonlight-check-in', revision: 1, stars: 1,
            bestMoves: null, hints: null, bestUnassistedMoves: null,
            completedAt: null, updatedAt: null, migrated: true
          };
        }
      }
    }
    Object.keys(state.records).forEach(function (id) {
      if (!known[id] || known[id].isDaily || revisionOf(known[id]) !== state.records[id].revision) {
        if (OLD_IDS.indexOf(id) !== -1 && state.legacyCompleted.indexOf(id) === -1) state.legacyCompleted.push(id);
        delete state.records[id];
      }
    });
    Object.keys(state.dailyRecords).forEach(function (key) {
      var record = state.dailyRecords[key], level = known[record.levelId];
      if (record.revision !== (level ? revisionOf(level) : 2)) delete state.dailyRecords[key];
    });
    if (state.lastTripId && !known[state.lastTripId] && !/^daily-\d{4}-\d{2}-\d{2}$/.test(state.lastTripId)) state.lastTripId = null;
    return state;
  }
  function save(state, storage) {
    try {
      storage = storageOrDefault(storage);
      if (!storage || typeof storage.setItem !== 'function') return false;
      storage.setItem(KEY, JSON.stringify(sanitize(state)));
      return true;
    } catch (_) { return false; }
  }
  function starsFor(level, run) {
    if (!isObject(run) || !isCount(run.moves) || !isCount(run.hints)) return 0;
    if (run.hints > 0) return 1;
    var par = level && isCount(level.par) ? level.par : ((level && Array.isArray(level.pieces) ? level.pieces.length : 0) + 2);
    return run.moves <= par ? 3 : 2;
  }
  function getRecord(state, level) {
    if (!isObject(state) || !level || !isId(level.id)) return null;
    var key = dailyKey(level), map = key ? state.dailyRecords : state.records;
    if (!isObject(map) || !own(map, key || level.id)) return null;
    var record = cleanRecord(map[key || level.id], level.id, key);
    return record && record.revision === revisionOf(level) ? record : null;
  }
  function record(state, level, run, date) {
    var stars = starsFor(level, run), previous = getRecord(state, level);
    if (!stars || !isObject(state) || !level || !isId(level.id)) return {stars: 0, newStamp: false, improved: false, best: previous};
    var timestamp = instant(date).toISOString(), key = dailyKey(level, date);
    if (!isObject(state.records)) state.records = Object.create(null);
    if (!isObject(state.dailyRecords)) state.dailyRecords = Object.create(null);
    var map = key ? state.dailyRecords : state.records;
    if (key) previous = cleanRecord(map[key], level.id, key);
    if (previous && previous.revision !== revisionOf(level)) previous = null;
    var newStamp = !previous;
    var improved = !previous || stars > previous.stars || (stars === previous.stars && (previous.bestMoves === null || run.moves < previous.bestMoves || (run.moves === previous.bestMoves && (previous.hints === null || run.hints < previous.hints))));
    var best = previous || {levelId: level.id, revision: revisionOf(level), completedAt: timestamp};
    if (improved) {
      best.stars = stars;
      best.bestMoves = run.moves;
      best.hints = run.hints;
      best.updatedAt = timestamp;
      delete best.migrated;
    }
    if (!best.completedAt) best.completedAt = timestamp;
    if (!isCount(best.bestUnassistedMoves)) best.bestUnassistedMoves = null;
    if (run.hints === 0) best.bestUnassistedMoves = best.bestUnassistedMoves === null ? run.moves : Math.min(best.bestUnassistedMoves, run.moves);
    if (key) best.dateKey = key;
    map[key || level.id] = best;
    state.version = 2;
    return {stars: stars, newStamp: newStamp, improved: improved, best: best};
  }
  function summary(state, levels) {
    var unique = Object.create(null), list = Array.isArray(levels) ? levels : [];
    list.forEach(function (level) { if (level && isId(level.id) && !level.isDaily) unique[level.id] = level; });
    var ids = Object.keys(unique), completed = 0, stars = 0;
    ids.forEach(function (id) { var entry = getRecord(state, unique[id]); if (entry) { completed++; stars += entry.stars; } });
    var dailyCompleted = 0;
    if (state && isObject(state.dailyRecords)) Object.keys(state.dailyRecords).forEach(function (key) {
      var entry = validDateKey(key) && cleanRecord(state.dailyRecords[key], 'daily-' + key, key);
      if (entry && entry.revision === 2) dailyCompleted++;
    });
    return {completed: completed, total: ids.length, stars: stars, maxStars: ids.length * 3, dailyCompleted: dailyCompleted, legacyCount: legacyIds(state && state.legacyCompleted).length};
  }
  function shareText(level, run, options) {
    var stars = starsFor(level, run);
    var name = level && typeof level.name === 'string' ? level.name.replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, 140) : 'Mystery trip';
    var key = dailyKey(level), lines = ['PACK THE CHAOS', (key ? 'Daily Dispatch · ' + key : 'Passport trip') + ' · ' + name];
    if (stars) lines.push('★'.repeat(stars) + '☆'.repeat(3 - stars) + ' · ' + run.moves + ' moves · ' + (run.hints === 0 ? 'No hints' : run.hints + (run.hints === 1 ? ' hint' : ' hints')));
    lines.push('Can you pack this trip?');
    var url = options && options.url;
    if (typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim()) && url.length <= 2048) lines.push(url.trim());
    return lines.join('\n');
  }
  return Object.freeze({load: load, save: save, todayKey: todayKey, record: record, getRecord: getRecord, summary: summary, shareText: shareText, starsFor: starsFor, storageKey: KEY});
});
