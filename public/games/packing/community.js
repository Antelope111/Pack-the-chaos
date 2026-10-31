/* Optional public club membership. The puzzle keeps working without the API. */
(function (root) {
  'use strict';
  var doc = root.document;
  var options = {}, initialized = false, identityReady = false, identityPromise = null;
  var profile = null, entries = null, playerCount = 0, totalLevels = window.PackLevels.levels.length, maxStars = window.PackLevels.levels.length * 3;
  var boardState = 'idle', boardSequence = 0, boardUpdated = null, boardError = '';
  var syncState = 'idle', syncMessage = '', pendingSync = false, syncPromise = null;
  var refreshPromise = null, joining = false, joinUncertain = false;
  var checkedName = '', availableName = false, nameSequence = 0, nameTimer = null, nameController = null;
  var $ = function (id) { return doc.getElementById(id); };
  var escape = function (value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var count = function (value, max) { return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max == null ? Number.MAX_SAFE_INTEGER : max) : 0; };
  var normalizeName = function (value) { return String(value || '').normalize('NFKC').replace(/\s+/gu, ' ').trim(); };
  function nameError(name) {
    var length = Array.from(name).length;
    if (!length) return '';
    if (length < 2 || length > 20) return 'Choose a name with 2–20 characters.';
    if (!/^[\p{L}\p{N} _-]+$/u.test(name) || !/[\p{L}\p{N}]/u.test(name)) return 'Use letters or numbers, with spaces, _ or -.';
    return '';
  }
  function failure(message, code, status) {
    var error = new Error(message);
    error.code = code || 'NETWORK'; error.status = status || 0;
    return error;
  }
  function errorText(error) {
    if (root.navigator && root.navigator.onLine === false) return 'You are offline. Keep packing; your progress is saved on this browser.';
    if (error && error.code === 'TIMEOUT') return 'The club is taking a little longer. Your progress is safe here; try Refresh.';
    return error && error.message ? error.message : 'The club is unavailable right now. Please try Refresh.';
  }
  async function request(path, settings) {
    settings = settings || {};
    var controller = new AbortController(), external = settings.signal, timedOut = false;
    var abort = function () { controller.abort(); };
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener('abort', abort, {once:true});
    }
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, 10000);
    try {
      var response = await root.fetch('/api/community/' + path, {
        method:settings.method || 'GET', credentials:'same-origin', cache:'no-store',
        headers:settings.body === undefined ? {'Accept':'application/json'} : {'Accept':'application/json','Content-Type':'application/json'},
        body:settings.body === undefined ? undefined : JSON.stringify(settings.body), signal:controller.signal
      });
      var data;
      try { data = await response.json(); } catch (_) { throw failure('The club is unavailable right now. Please try Refresh.', 'UNAVAILABLE', response.status); }
      if (!response.ok) throw failure(data && data.error && data.error.message || 'The club is unavailable right now. Please try Refresh.', data && data.error && data.error.code, response.status);
      if (!data || typeof data !== 'object') throw failure('The club sent an incomplete reply. Please try Refresh.', 'UNAVAILABLE');
      return data;
    } catch (error) {
      if (timedOut) throw failure('The club request timed out.', 'TIMEOUT');
      if (error && error.name === 'AbortError') throw error;
      if (error && error.code) throw error;
      throw failure('The club is unavailable right now. Please try Refresh.');
    } finally {
      clearTimeout(timer);
      if (external) external.removeEventListener('abort', abort);
    }
  }
  function updateTotals(data) {
    if (Number.isSafeInteger(data.totalLevels) && data.totalLevels > 0) totalLevels = data.totalLevels;
    if (Number.isSafeInteger(data.maxStars) && data.maxStars > 0) maxStars = data.maxStars;
  }
  function setProfile(next) {
    if (next === null) {
      var hadProfile = !!profile;
      profile = null;
      if (hadProfile && typeof options.onProfile === 'function') {
        try { options.onProfile(null); } catch (_) { /* Keep the optional club independent. */ }
      }
      return true;
    }
    if (!next || typeof next.id !== 'string' || typeof next.name !== 'string') return false;
    var changed = !profile || profile.id !== next.id || profile.name !== next.name;
    profile = next;
    if (changed && typeof options.onProfile === 'function') {
      try { options.onProfile(profile); } catch (_) { /* A cosmetic name callback must not stop the game. */ }
    }
    return true;
  }
  function chapterCounts(person) {
    var chapters = person.chapters || {};
    return [['cats','Cats',count(chapters.cats,12)],['dogs','Dogs',count(chapters.dogs,12)],['odd','Odd',count(chapters.odd,12)],['rooftops','Rooftops',count(chapters.rooftops,12)],['seaside','Seaside',count(chapters.seaside,12)],['bazaar','Bazaar',count(chapters.bazaar,12)],['aurora','Aurora',count(chapters.aurora,12)]];
  }
  function rankText(person) { return count(person.rank) ? '#' + count(person.rank) : '—'; }
  function memberHTML() {
    var chapters = chapterCounts(profile);
    var initial = Array.from(profile.name)[0] || '♧';
    return '<div class="community-member-top"><span class="community-avatar" aria-hidden="true">' + escape(initial) + '</span><div class="community-member-identity"><small>YOUR CLUB PASSPORT</small><h3>' + escape(profile.name) + '</h3></div><div class="community-member-rank">' + rankText(profile) + '<small>YOUR RANK</small></div></div>' +
      '<div class="community-member-stats"><div><b>' + count(profile.completed,totalLevels) + '<small> / ' + totalLevels + '</small></b><span>TRIPS PACKED</span></div><div><b>' + count(profile.stars,maxStars) + '<small> / ' + maxStars + '</small></b><span>STARS EARNED</span></div><div><b>' + count(profile.dailyCompleted) + '</b><span>DAILY DEPARTURES</span></div></div>' +
      '<div class="community-chapters">' + chapters.map(function (chapter) { return '<div class="community-chapter"><div><span>' + chapter[1] + '</span><b>' + chapter[2] + ' / 12</b></div><div class="community-chapter-track" role="meter" aria-label="' + chapter[1] + ' chapter progress" aria-valuemin="0" aria-valuemax="12" aria-valuenow="' + chapter[2] + '"><i style="width:' + (chapter[2] / 12 * 100) + '%"></i></div></div>'; }).join('') + '</div>' +
      '<p class="community-sync-note" data-state="' + (syncState === 'error' ? 'error' : 'ok') + '" role="status">' + escape(syncMessage || 'This browser remembers your club membership.') + '</p>';
  }
  function rowHTML(person) {
    var me = profile && person.id === profile.id, completed = count(person.completed,totalLevels), chapters = chapterCounts(person);
    return '<div class="community-row' + (me ? ' is-me' : '') + '" data-place="' + count(person.rank) + '"><div class="community-row-identity"><span class="community-rank" aria-label="Rank ' + count(person.rank) + '">' + (count(person.rank) || '—') + '</span><div class="community-traveller"><strong>' + escape(person.name) + '</strong><small title="' + chapters.map(function (c) { return c[1] + ': ' + c[2] + ' of 12'; }).join('; ') + '">' + (me ? 'YOU · ' : '') + chapters.filter(function(c){ return c[2] === 12; }).length + ' / ' + chapters.length + ' chapters complete' + '</small></div></div><div class="community-journey"><b>' + completed + '<small> / ' + totalLevels + '</small></b><div class="community-progress-track" role="meter" aria-label="' + escape(person.name) + ' journey progress" aria-valuemin="0" aria-valuemax="' + totalLevels + '" aria-valuenow="' + completed + '"><i style="width:' + (completed / totalLevels * 100) + '%"></i></div></div><span class="community-row-stars" aria-label="' + count(person.stars,maxStars) + ' stars"><small aria-hidden="true">★ </small>' + count(person.stars,maxStars) + '</span><span class="community-row-daily" aria-label="' + count(person.dailyCompleted) + ' daily departures">' + count(person.dailyCompleted) + '</span></div>';
  }
  function emptyHTML(symbol, title, text) {
    return '<div class="community-empty"><span aria-hidden="true">' + symbol + '</span><h4>' + escape(title) + '</h4><p>' + escape(text) + '</p></div>';
  }
  function render() {
    if (!initialized) return;
    $('community-member').hidden = !profile;
    $('community-join').hidden = !!profile;
    if (profile) $('community-member').innerHTML = memberHTML();
    $('community-join-button').disabled = joining || joinUncertain || !identityReady || !availableName || checkedName !== normalizeName($('community-name').value);
    $('community-name').disabled = joining;
    $('community-join-button').textContent = joining ? 'SAVING YOUR SEAT…' : 'JOIN THE CLUB ↗';
    $('community-player-count').textContent = entries !== null ? '(' + playerCount + ')' : '';
    $('community-notice').hidden = !boardError;
    $('community-notice').textContent = boardError;
    $('community-refresh').disabled = !!refreshPromise || boardState === 'loading' || joining;
    if (entries && entries.length) $('community-rows').innerHTML = entries.map(rowHTML).join('');
    else if (boardState === 'error') $('community-rows').innerHTML = emptyHTML('↻', 'A short stopover.', 'The board could not load. Your puzzles still work — try Refresh when you are ready.');
    else if (entries) $('community-rows').innerHTML = emptyHTML('♧', 'The first seat is yours.', 'No travellers on the board yet. Join the club and bring your first packed suitcase.');
    else $('community-rows').innerHTML = emptyHTML('♧', 'Checking the departure board…', 'Pull up a suitcase. We’ll be right with you.');
    var stamp = boardUpdated && new Date(boardUpdated);
    $('community-updated').textContent = stamp && Number.isFinite(stamp.getTime()) ? 'LAST CHECKED ' + stamp.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
    $('win-leaderboard').textContent = profile ? '♧ See my club rank ' + rankText(profile) + ' ↗' : '♧ Join the club board ↗';
    $('win-community-status').textContent = profile ? syncMessage || 'Your club progress is public under ' + profile.name + '.' : 'Give your progress a place on the board.';
    $('win-community-status').dataset.state = syncState === 'error' ? 'error' : 'ok';
  }
  function nameStatus(text, state) {
    $('community-name-status').textContent = text;
    $('community-name-status').dataset.state = state || '';
    $('community-name').setAttribute('aria-invalid', state === 'error' && !!nameError(normalizeName($('community-name').value)) ? 'true' : 'false');
  }
  function checkName() {
    clearTimeout(nameTimer);
    if (nameController) nameController.abort();
    var sequence = ++nameSequence, name = normalizeName($('community-name').value), error = nameError(name);
    checkedName = ''; availableName = false;
    if (!name) nameStatus('Names ignore capitals. Letters, numbers, spaces, _ and -.');
    else if (error) nameStatus(error, 'error');
    else if (!identityReady || joinUncertain) nameStatus('Connect to the club with Refresh to check this name.');
    else {
      nameStatus('Checking this name…');
      nameTimer = setTimeout(async function () {
        nameController = new AbortController();
        try {
          var data = await request('name?name=' + encodeURIComponent(name), {signal:nameController.signal});
          if (sequence !== nameSequence || joining || profile) return;
          checkedName = name;
          availableName = data.available === true;
          nameStatus(availableName ? '✓ This name is available. Your seat is waiting.' : data.message || 'That name already has a suitcase. Try another.', availableName ? 'available' : 'error');
        } catch (error) {
          if (sequence !== nameSequence || error.name === 'AbortError') return;
          nameStatus(errorText(error), 'error');
        }
        render();
      }, 350);
    }
    render();
  }
  async function refreshIdentity() {
    if (identityPromise) return identityPromise;
    identityPromise = (async function () {
      try {
        var data = await request('me');
        updateTotals(data);
        if (data.profile) setProfile(data.profile);
        else setProfile(null);
        identityReady = true; joinUncertain = false;
        if (!profile && $('community-name').value) checkName();
        return true;
      } catch (error) {
        if (!identityReady) nameStatus(errorText(error), 'error');
        boardError = errorText(error);
        return false;
      } finally { identityPromise = null; render(); }
    })();
    return identityPromise;
  }
  async function loadBoard() {
    var sequence = ++boardSequence;
    boardState = 'loading'; boardError = ''; render();
    try {
      var data = await request('leaderboard');
      if (sequence !== boardSequence) return;
      if (!Array.isArray(data.entries)) throw failure('The board sent an incomplete reply. Please try Refresh.', 'UNAVAILABLE');
      updateTotals(data);
      entries = data.entries.filter(function (item) { return item && typeof item.id === 'string' && typeof item.name === 'string'; }).slice(0,50);
      playerCount = count(data.totalPlayers);
      boardUpdated = data.updatedAt || new Date().toISOString();
      if (data.me && (!profile || data.me.id === profile.id)) setProfile(data.me);
      boardState = 'ready';
    } catch (error) {
      if (sequence !== boardSequence) return;
      boardState = 'error'; boardError = errorText(error);
    }
    render();
  }
  function sync() {
    if (!initialized || !profile) return Promise.resolve({ok:false, joined:false});
    pendingSync = true;
    if (syncPromise) return syncPromise;
    syncPromise = (async function () {
      var result = {ok:false, profile:profile};
      while (pendingSync && profile) {
        pendingSync = false; syncState = 'syncing'; syncMessage = 'Pinning your latest progress to the board…'; render();
        try {
          var progress = typeof options.getProgress === 'function' ? options.getProgress() : {};
          var data = await request('progress', {method:'POST', body:{records:progress.records || {}, dailyRecords:progress.dailyRecords || {}}});
          if (!setProfile(data.profile)) throw failure('Your progress could not be confirmed. Please try Refresh.', 'UNAVAILABLE');
          syncState = 'synced'; syncMessage = '✓ All your saved progress is on the club board.';
          result = {ok:true, profile:profile};
        } catch (error) {
          syncState = 'error'; pendingSync = true;
          syncMessage = errorText(error);
          if (error.status === 401) {
            setProfile(null); identityReady = false;
            syncMessage = 'This browser’s membership has expired. Refresh to choose a new club name.';
            nameStatus(syncMessage, 'error');
          }
          result = {ok:false, error:error, profile:profile};
          break;
        }
        render();
      }
      return result;
    })().finally(function () { syncPromise = null; render(); });
    return syncPromise;
  }
  function refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async function () {
      if (!identityReady || joinUncertain) await refreshIdentity();
      if (profile) await sync();
      await loadBoard();
      if (!profile && identityReady && $('community-name').value && !availableName) checkName();
    })().finally(function () { refreshPromise = null; render(); });
    render();
    return refreshPromise;
  }
  async function join(event) {
    event.preventDefault();
    var name = normalizeName($('community-name').value);
    if (joining || profile || joinUncertain || !identityReady || !availableName || checkedName !== name || nameError(name)) return;
    clearTimeout(nameTimer); ++nameSequence;
    if (nameController) nameController.abort();
    joining = true; $('community-name').value = name;
    nameStatus('Saving your unique club name…'); render();
    try {
      var data = await request('join', {method:'POST',body:{name:name}});
      if (!setProfile(data.profile)) throw failure('Your membership could not be confirmed. Please try Refresh.', 'UNAVAILABLE');
      joining = false; identityReady = true;
      await sync();
      await loadBoard();
    } catch (error) {
      availableName = false;
      // A lost response can still have created a membership. Recheck the cookie
      // before allowing a second registration or claiming that this name is free.
      if (!error.status || error.status >= 500) {
        joinUncertain = true;
        await refreshIdentity();
        if (profile) { joining = false; await sync(); await loadBoard(); }
        else nameStatus(errorText(error), 'error');
      } else {
        nameStatus(error.status === 409 ? 'That name was just taken. Choose another club name.' : errorText(error), 'error');
      }
    } finally { joining = false; render(); }
  }
  function open() {
    if (!initialized) return;
    var win = $('win-dialog');
    if (win && win.open) win.close();
    if (!profile && !$('community-name').value && typeof options.getName === 'function') {
      try { $('community-name').value = normalizeName(options.getName()); } catch (_) { /* Optional keepsake name. */ }
      if ($('community-name').value) checkName();
    }
    if (!$('community-dialog').open) $('community-dialog').showModal();
    render();
    refresh();
  }
  function init(settings) {
    if (initialized) return identityPromise || Promise.resolve({profile:profile});
    options = settings || {}; initialized = true;
    $('community-open').addEventListener('click', open);
    $('win-leaderboard').addEventListener('click', open);
    $('community-close').addEventListener('click', function () { $('community-dialog').close(); });
    $('community-refresh').addEventListener('click', refresh);
    $('community-name').addEventListener('input', checkName);
    $('community-form').addEventListener('submit', join);
    root.addEventListener('online', function () {
      if (profile) sync().then(function () { if ($('community-dialog').open) loadBoard(); });
      else if ($('community-dialog').open) refresh();
    });
    root.addEventListener('offline', function () {
      if (profile) { syncState = 'error'; syncMessage = 'You are offline. Keep packing; your progress will sync when you reconnect.'; }
      if ($('community-dialog').open) boardError = 'You are offline. The last loaded board may be out of date.';
      render();
    });
    render();
    return refreshIdentity().then(function () { return profile ? sync() : {ok:true,joined:false}; }).catch(function () { return {ok:false}; });
  }
  root.PackCommunity = {init:init, open:open, sync:sync};
})(window);
