/* Pack the Chaos — authored puzzle data and deterministic exact-cover solver.
 * Rotation is an integer number of clockwise quarter turns (0, 1, 2, 3).
 * Placement shape: { id, x, y, rotation }, with x/y the normalized top-left.
 * findSolution returns all placements, or null. Its lastSearch property reports
 * solved / unsatisfiable / invalid / limit. Default work limits: 20,000 search
 * nodes and 80ms (checked every 64 nodes). No network or generated AI content.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PackLevels = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var colors = ['#e1846c', '#e8c85e', '#b6c9a5', '#9ab5bd', '#c1a8c5', '#f2bc82'];
  function normalize(cells) {
    if (!Array.isArray(cells) || !cells.length) throw new TypeError('A piece needs cells.');
    var minX = Infinity, minY = Infinity, seen = Object.create(null);
    cells.forEach(function (c) {
      if (!Array.isArray(c) || c.length !== 2 || !Number.isInteger(c[0]) || !Number.isInteger(c[1])) throw new TypeError('Cells must be integer [x,y] pairs.');
      var key = c[0] + ',' + c[1];
      if (seen[key]) throw new TypeError('Duplicate piece cell.');
      seen[key] = true;
      minX = Math.min(minX, c[0]); minY = Math.min(minY, c[1]);
    });
    return cells.map(function (c) { return [c[0] - minX, c[1] - minY]; }).sort(function (a,b) { return a[1] - b[1] || a[0] - b[0]; });
  }
  function rotate(cells, quarterTurns) {
    if (quarterTurns === undefined) quarterTurns = 0;
    if (!Number.isInteger(quarterTurns)) throw new TypeError('Rotation must be integer quarter turns.');
    var result = normalize(cells), turns = ((quarterTurns % 4) + 4) % 4;
    while (turns--) result = normalize(result.map(function (c) { return [-c[1], c[0]]; }));
    return result;
  }
  var shapes = {
    coffin: { name: 'Travel coffin', cells: [[0,0],[0,1],[0,2],[0,3]] },
    sunscreen: { name: 'Moonblock SPF 999', cells: [[0,0],[0,1]] },
    parasol: { name: 'Tiny parasol', cells: [[0,0],[1,0],[2,0],[1,1]] },
    glasses: { name: 'Bat-eye shades', cells: [[1,0],[2,0],[0,1],[1,1]] },
    sandals: { name: 'Floppy sandals', cells: [[0,0],[0,1],[1,1]] },
    headphones: { name: 'Quiet-time headphones', cells: [[0,0],[2,0],[0,1],[1,1],[2,1]] },
    ice: { name: 'Emergency ice', cells: [[0,0],[1,0],[0,1],[1,1]] },
    fish: { name: 'Fish-shaped snack', cells: [[0,0],[1,0],[2,0],[1,1]] },
    mug: { name: 'Oversized coffee', cells: [[0,0],[1,0],[0,1],[1,1],[0,2]] },
    tent: { name: 'Pocket tent', cells: [[0,0],[1,0],[2,0],[1,1],[1,2]] },
    camera: { name: 'Holiday camera', cells: [[0,0],[1,0],[0,1],[1,1]] },
    toothbrush: { name: 'Fang brush', cells: [[0,0],[0,1],[0,2],[1,2]] },
    hat: { name: 'Very important hat', cells: [[0,0],[0,1],[0,2],[1,2]] },
    book: { name: 'Beach read', cells: [[0,0],[1,0],[0,1],[1,1]] },
    socks: { name: 'Spare woolly socks', cells: [[0,0],[1,0],[1,1],[2,1]] },
    snowglobe: { name: 'Home in a snow globe', cells: [[0,0],[1,0],[0,1],[1,1]] },
    plant: { name: 'Emotional-support plant', cells: [[0,0],[0,1],[1,1],[0,2],[0,3]] },
    passport: { name: 'Extra-long passport', cells: [[0,0],[0,1],[0,2]] }
  };
  var library = Object.keys(shapes).map(function (id, i) {
    return { id:id, name:shapes[id].name, cells:normalize(shapes[id].cells), color:colors[i % colors.length], icon:id };
  });
  function makePiece(id, index) {
    var p = shapes[id];
    return { id:id, name:p.name, cells:normalize(p.cells), color:colors[index % colors.length], icon:id };
  }
  function blockedMask(level) {
    return (level.blocked || []).reduce(function (mask, c) { return mask | (1 << (c[1] * level.width + c[0])); }, 0);
  }
  function validLevel(level) {
    if (!level || !Number.isInteger(level.width) || !Number.isInteger(level.height) || level.width < 1 || level.height < 1 || level.width * level.height > 30 || !Array.isArray(level.pieces) || !level.pieces.length || level.pieces.length > 30) return false;
    var ids = Object.create(null), area = 0, pockets = Object.create(null);
    try {
      for (var i = 0; i < level.pieces.length; i++) {
        var p = level.pieces[i];
        if (!p || typeof p.id !== 'string' || ids[p.id]) return false;
        ids[p.id] = true; area += normalize(p.cells).length;
      }
      if (level.blocked !== undefined && !Array.isArray(level.blocked)) return false;
      for (var c of (level.blocked || [])) {
        if (!Array.isArray(c) || c.length !== 2 || !Number.isInteger(c[0]) || !Number.isInteger(c[1]) || c[0] < 0 || c[1] < 0 || c[0] >= level.width || c[1] >= level.height || pockets[c.join(',')]) return false;
        pockets[c.join(',')] = true; area++;
      }
      if (level.rules !== undefined && !Array.isArray(level.rules)) return false;
      for (var rule of (level.rules || [])) {
        if (!rule || !ids[rule.pieceId]) return false;
        if (rule.type === 'edge') { if (!['top','bottom','left','right'].includes(rule.edge)) return false; }
        else if (rule.type === 'upright') { if (!Array.isArray(rule.rotations) || !rule.rotations.length || rule.rotations.some(function(r) { return !Number.isInteger(r) || r < 0 || r > 3; })) return false; }
        else return false;
      }
    } catch (e) { return false; }
    return area === level.width * level.height;
  }
  function placementInfo(level, piece, placement) {
    if (!placement || !Number.isInteger(placement.x) || !Number.isInteger(placement.y) || !Number.isInteger(placement.rotation === undefined ? 0 : placement.rotation)) return {error:'Choose a space inside the suitcase.'};
    var r = ((placement.rotation || 0) % 4 + 4) % 4;
    var cells = rotate(piece.cells, r).map(function(c) { return [c[0] + placement.x, c[1] + placement.y]; });
    var mask = 0;
    for (var i = 0; i < cells.length; i++) {
      var x = cells[i][0], y = cells[i][1];
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) return {error:'Keep the whole item inside the suitcase.'};
      mask |= 1 << (y * level.width + x);
    }
    if (mask & blockedMask(level)) return {error:'That leather pocket is fixed. Pack around it.'};
    for (var rule of (level.rules || [])) {
      if (rule.pieceId !== piece.id) continue;
      if (rule.type === 'upright' && !rule.rotations.includes(r)) return {error:rule.text || 'This item must stay upright.'};
      if (rule.type === 'edge' && !cells.some(function(c) {
        return rule.edge === 'top' ? c[1] === 0 : rule.edge === 'bottom' ? c[1] === level.height - 1 : rule.edge === 'left' ? c[0] === 0 : c[0] === level.width - 1;
      })) return {error:rule.text || 'This item must touch the ' + rule.edge + ' edge.'};
    }
    return {mask:mask, error:null};
  }
  // An existing placement of candidate.id is ignored, so moving stays atomic.
  function placementError(level, placements, candidate) {
    if (!validLevel(level) || !Array.isArray(placements) || !candidate) return 'This trip has invalid packing data.';
    var piece = level.pieces.find(function(p) { return p.id === candidate.id; });
    if (!piece) return 'Choose an item for this trip.';
    var info = placementInfo(level, piece, candidate);
    if (info.error) return info.error;
    var occupied = blockedMask(level), seen = Object.create(null);
    for (var pl of placements) {
      if (!pl || seen[pl.id]) return 'An item appears twice in this suitcase.';
      seen[pl.id] = true;
      if (pl.id === candidate.id) continue;
      var other = level.pieces.find(function(p) { return p.id === pl.id; });
      if (!other) return 'There is an unknown item in the suitcase.';
      var otherInfo = placementInfo(level, other, pl);
      if (otherInfo.error) return otherInfo.error;
      if (occupied & otherInfo.mask) return 'The packed items overlap.';
      occupied |= otherInfo.mask;
    }
    return occupied & info.mask ? 'Another item is already in that space.' : null;
  }
  function canPlace(level, placements, candidate) { return placementError(level, placements, candidate) === null; }
  function findSolution(level, placements, options) {
    placements = placements || []; options = options || {};
    var start = Date.now(), nodes = 0, limited = false;
    var maxNodes = options.maxNodes === undefined ? 20000 : Math.max(1, options.maxNodes);
    var maxMs = options.maxMs === undefined ? 80 : Math.max(1, options.maxMs);
    function finish(status, result) { findSolution.lastSearch = {status:status, nodes:nodes, elapsedMs:Date.now()-start}; return result; }
    if (!validLevel(level) || !Array.isArray(placements)) return finish('invalid', null);
    var width = level.width, height = level.height, area = width * height;
    var fullMask = (1 << area) - 1, occupied = blockedMask(level), remaining = (1 << level.pieces.length) - 1;
    var chosen = [], byCell = Array.from({length:area}, function() { return []; }), seen = Object.create(null);
    for (var pl of placements) {
      if (!pl || seen[pl.id]) return finish('invalid', null);
      var index = level.pieces.findIndex(function(p) { return p.id === pl.id; });
      if (index < 0) return finish('invalid', null);
      seen[pl.id] = true;
      var info = placementInfo(level, level.pieces[index], pl);
      if (info.error || (occupied & info.mask)) return finish('invalid', null);
      occupied |= info.mask; remaining &= ~(1 << index);
      chosen.push({id:pl.id,x:pl.x,y:pl.y,rotation:((pl.rotation || 0) % 4 + 4) % 4});
    }
    for (var pi = 0; pi < level.pieces.length; pi++) {
      if (!(remaining & (1 << pi))) continue;
      var piece = level.pieces[pi], usedRotations = Object.create(null);
      for (var r = 0; r < 4; r++) {
        // Check art orientation BEFORE geometry symmetry (a globe is still upright).
        if ((level.rules || []).some(function(rule) { return rule.pieceId === piece.id && rule.type === 'upright' && !rule.rotations.includes(r); })) continue;
        var cells = rotate(piece.cells, r), key = JSON.stringify(cells);
        if (usedRotations[key]) continue;
        usedRotations[key] = true;
        var pw = 1 + Math.max.apply(null,cells.map(function(c) { return c[0]; }));
        var ph = 1 + Math.max.apply(null,cells.map(function(c) { return c[1]; }));
        for (var y = 0; y <= height - ph; y++) for (var x = 0; x <= width - pw; x++) {
          var placement = {id:piece.id,x:x,y:y,rotation:r};
          var data = placementInfo(level,piece,placement);
          if (data.error || (data.mask & occupied)) continue;
          var candidate = {mask:data.mask,bit:1<<pi,placement:placement};
          cells.forEach(function(c) { byCell[(y+c[1])*width+x+c[0]].push(candidate); });
        }
      }
    }
    function search(occ, left) {
      nodes++;
      if (nodes > maxNodes || ((nodes & 63) === 0 && Date.now()-start > maxMs)) { limited = true; return false; }
      if (!left) return occ === fullMask;
      var candidates = null;
      for (var c = 0; c < area; c++) {
        if (occ & (1 << c)) continue;
        var possible = byCell[c].filter(function(v) { return (left & v.bit) && !(occ & v.mask); });
        if (!possible.length) return false;
        if (!candidates || possible.length < candidates.length) candidates = possible;
        if (possible.length === 1) break;
      }
      if (!candidates) return false;
      for (var k = 0; k < candidates.length; k++) {
        var next = candidates[k]; chosen.push(next.placement);
        if (search(occ | next.mask, left & ~next.bit)) return true;
        chosen.pop(); if (limited) return false;
      }
      return false;
    }
    return search(occupied, remaining) ? finish('solved', chosen.slice()) : finish(limited ? 'limit' : 'unsatisfiable', null);
  }
  findSolution.lastSearch = {status:'idle',nodes:0,elapsedMs:0};

  // These puzzle templates were curated offline and exhaustively checked.
  // solutionCount counts spatial arrangements, ignoring rotations of symmetric shapes.
  var campaignData = [{"width":5,"height":4,"items":["sunscreen","hat","headphones","coffin","fish"],"blocked":[[4,3]],"rules":[],"solution":[{"id":"sunscreen","x":4,"y":0,"rotation":0},{"id":"hat","x":3,"y":0,"rotation":0},{"id":"coffin","x":0,"y":3,"rotation":1},{"id":"headphones","x":0,"y":0,"rotation":1},{"id":"fish","x":1,"y":0,"rotation":1}],"solutionCount":30,"meta":["eight-arm-weekend","Eight-arm weekend","Otto","Coral Cove","An awkward handle. An even more awkward fish.","octopus"]},{"width":5,"height":4,"items":["coffin","sunscreen","plant","mug","sandals"],"blocked":[[0,0]],"rules":[],"solution":[{"id":"coffin","x":0,"y":3,"rotation":1},{"id":"plant","x":3,"y":0,"rotation":2},{"id":"sunscreen","x":3,"y":0,"rotation":0},{"id":"sandals","x":1,"y":0,"rotation":2},{"id":"mug","x":0,"y":1,"rotation":3}],"solutionCount":28,"meta":["snow-day-away","Snow day away","Yuki","Sunshine Springs","Make room for a very long cactus.","yeti"]},{"width":5,"height":5,"items":["headphones","socks","ice","mug","sandals","passport"],"blocked":[[4,0]],"rules":[{"type":"edge","pieceId":"socks","edge":"top","text":"Odd socks · touch the top edge."}],"solution":[{"id":"headphones","x":0,"y":3,"rotation":0},{"id":"sandals","x":0,"y":2,"rotation":2},{"id":"mug","x":0,"y":0,"rotation":3},{"id":"socks","x":2,"y":0,"rotation":0},{"id":"passport","x":2,"y":2,"rotation":1},{"id":"ice","x":3,"y":3,"rotation":0}],"solutionCount":12,"meta":["after-dark-departure","After-dark departure","Vlad","Midnight Marina","Keep the socks where I can reach them.","vampire"]},{"width":5,"height":5,"items":["sandals","ice","hat","plant","mug","passport"],"blocked":[[4,0]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Holiday cactus stays upright."}],"solution":[{"id":"ice","x":3,"y":3,"rotation":0},{"id":"sandals","x":3,"y":1,"rotation":2},{"id":"hat","x":1,"y":0,"rotation":1},{"id":"passport","x":0,"y":0,"rotation":0},{"id":"plant","x":2,"y":1,"rotation":0},{"id":"mug","x":0,"y":2,"rotation":2}],"solutionCount":11,"meta":["camp-coral","Camp Coral","Otto","Tentacle Trails","The cactus insists on standing tall.","octopus"]},{"width":5,"height":5,"items":["tent","snowglobe","socks","fish","mug","sunscreen"],"blocked":[[0,0]],"rules":[{"type":"upright","pieceId":"snowglobe","rotations":[0],"text":"Home snow globe stays upright."}],"solution":[{"id":"tent","x":2,"y":0,"rotation":0},{"id":"sunscreen","x":4,"y":1,"rotation":0},{"id":"snowglobe","x":3,"y":3,"rotation":0},{"id":"socks","x":0,"y":0,"rotation":1},{"id":"fish","x":1,"y":1,"rotation":1},{"id":"mug","x":0,"y":3,"rotation":3}],"solutionCount":12,"meta":["warm-weather-warning","Warm-weather warning","Yuki","Coconut Coast","Home travels upright. Always.","yeti"]},{"width":6,"height":5,"items":["coffin","parasol","plant","ice","headphones","sunscreen","hat"],"blocked":[[0,0],[5,2]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Holiday cactus stays upright."},{"type":"edge","pieceId":"ice","edge":"right","text":"Emergency ice · touch the right edge."}],"solution":[{"id":"coffin","x":2,"y":0,"rotation":1},{"id":"parasol","x":3,"y":1,"rotation":0},{"id":"plant","x":1,"y":0,"rotation":0},{"id":"sunscreen","x":0,"y":1,"rotation":0},{"id":"headphones","x":0,"y":3,"rotation":0},{"id":"hat","x":2,"y":2,"rotation":2},{"id":"ice","x":4,"y":3,"rotation":0}],"solutionCount":1,"meta":["midnight-campout","Midnight campout","Vlad","Batwing Bay","An upright cactus. Ice by the window.","vampire"]},{"width":6,"height":5,"items":["coffin","snowglobe","hat","mug","passport","headphones","socks"],"blocked":[[0,1]],"rules":[{"type":"upright","pieceId":"snowglobe","rotations":[0],"text":"Home snow globe stays upright."},{"type":"edge","pieceId":"headphones","edge":"right","text":"Holiday headphones · touch the right edge."}],"solution":[{"id":"coffin","x":0,"y":0,"rotation":1},{"id":"snowglobe","x":4,"y":0,"rotation":0},{"id":"passport","x":0,"y":2,"rotation":0},{"id":"hat","x":1,"y":1,"rotation":1},{"id":"mug","x":1,"y":3,"rotation":3},{"id":"socks","x":2,"y":2,"rotation":0},{"id":"headphones","x":4,"y":2,"rotation":3}],"solutionCount":6,"meta":["all-arms-aboard","All arms aboard","Otto","Shell City","Home stays upright. Music stays close.","octopus"]},{"width":6,"height":5,"items":["headphones","sandals","passport","tent","glasses","parasol","mug"],"blocked":[[4,0]],"rules":[{"type":"edge","pieceId":"glasses","edge":"left","text":"Sunset scarf · touch the left edge."},{"type":"edge","pieceId":"tent","edge":"top","text":"Aloha shirt · touch the top edge."}],"solution":[{"id":"tent","x":3,"y":0,"rotation":1},{"id":"parasol","x":1,"y":0,"rotation":0},{"id":"glasses","x":0,"y":0,"rotation":1},{"id":"headphones","x":0,"y":2,"rotation":0},{"id":"passport","x":0,"y":4,"rotation":1},{"id":"mug","x":3,"y":2,"rotation":0},{"id":"sandals","x":4,"y":3,"rotation":3}],"solutionCount":3,"meta":["the-great-thaw","The great thaw","Yuki","Palm Peak","A shirt at the top. A scarf along the side.","yeti"]},{"width":6,"height":5,"items":["parasol","mug","toothbrush","sunscreen","passport","headphones","plant"],"blocked":[[0,0],[0,1]],"rules":[{"type":"edge","pieceId":"mug","edge":"left","text":"Giant travel mug · touch the left edge."},{"type":"edge","pieceId":"passport","edge":"bottom","text":"Boarding pass · touch the bottom edge."}],"solution":[{"id":"parasol","x":4,"y":0,"rotation":1},{"id":"plant","x":1,"y":0,"rotation":1},{"id":"sunscreen","x":5,"y":3,"rotation":0},{"id":"mug","x":0,"y":1,"rotation":2},{"id":"toothbrush","x":2,"y":1,"rotation":0},{"id":"headphones","x":3,"y":2,"rotation":3},{"id":"passport","x":0,"y":4,"rotation":1}],"solutionCount":5,"meta":["red-eye-upgrade","Red-eye upgrade","Vlad","Graveyard Gate","Two requests. Very little wiggle room.","vampire"]},{"width":6,"height":5,"items":["glasses","sandals","plant","headphones","fish","coffin","toothbrush"],"blocked":[[4,4]],"rules":[{"type":"edge","pieceId":"glasses","edge":"right","text":"Sunset scarf · touch the right edge."},{"type":"edge","pieceId":"headphones","edge":"right","text":"Holiday headphones · touch the right edge."}],"solution":[{"id":"glasses","x":4,"y":2,"rotation":1},{"id":"headphones","x":3,"y":1,"rotation":2},{"id":"coffin","x":2,"y":0,"rotation":1},{"id":"sandals","x":0,"y":0,"rotation":2},{"id":"fish","x":0,"y":1,"rotation":3},{"id":"toothbrush","x":2,"y":1,"rotation":0},{"id":"plant","x":0,"y":3,"rotation":3}],"solutionCount":2,"meta":["all-hands-on-deck","All hands on deck","Otto","Tidepool Terminal","Seven essentials. Every arm is busy.","octopus"]},{"width":6,"height":5,"items":["coffin","plant","sandals","ice","fish","headphones","toothbrush"],"blocked":[[5,4]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Holiday cactus stays upright."},{"type":"edge","pieceId":"headphones","edge":"right","text":"Holiday headphones · touch the right edge."}],"solution":[{"id":"coffin","x":0,"y":0,"rotation":1},{"id":"ice","x":4,"y":0,"rotation":0},{"id":"headphones","x":3,"y":2,"rotation":2},{"id":"toothbrush","x":2,"y":3,"rotation":3},{"id":"fish","x":1,"y":1,"rotation":0},{"id":"plant","x":0,"y":1,"rotation":0},{"id":"sandals","x":1,"y":3,"rotation":1}],"solutionCount":1,"meta":["final-boarding-call","Final boarding call","Yuki","Northern Lights","The cactus refuses to lie down.","yeti"]}];
  var dailyData = [{"width":6,"height":5,"items":["fish","sandals","tent","plant","book","coffin","toothbrush"],"blocked":[[5,4]],"rules":[{"type":"upright","pieceId":"toothbrush","rotations":[0],"text":"Travel snorkel stays upright."},{"type":"edge","pieceId":"fish","edge":"top","text":"Flying-fish plush · touch the top edge."}],"solution":[{"id":"plant","x":0,"y":1,"rotation":0},{"id":"fish","x":0,"y":0,"rotation":0},{"id":"coffin","x":1,"y":4,"rotation":1},{"id":"tent","x":1,"y":1,"rotation":2},{"id":"book","x":4,"y":0,"rotation":0},{"id":"toothbrush","x":3,"y":0,"rotation":0},{"id":"sandals","x":4,"y":2,"rotation":3}],"solutionCount":3},{"width":6,"height":5,"items":["sandals","snowglobe","glasses","headphones","parasol","socks","mug"],"blocked":[[2,0]],"rules":[{"type":"upright","pieceId":"snowglobe","rotations":[0],"text":"Home snow globe stays upright."},{"type":"edge","pieceId":"socks","edge":"right","text":"Odd socks · touch the right edge."}],"solution":[{"id":"snowglobe","x":0,"y":0,"rotation":0},{"id":"mug","x":0,"y":2,"rotation":0},{"id":"parasol","x":1,"y":3,"rotation":2},{"id":"socks","x":3,"y":3,"rotation":0},{"id":"glasses","x":4,"y":1,"rotation":1},{"id":"headphones","x":3,"y":0,"rotation":2},{"id":"sandals","x":2,"y":1,"rotation":0}],"solutionCount":3},{"width":5,"height":5,"items":["headphones","fish","coffin","toothbrush","mug","sunscreen"],"blocked":[[4,0]],"rules":[{"type":"upright","pieceId":"toothbrush","rotations":[0],"text":"Travel snorkel stays upright."}],"solution":[{"id":"headphones","x":0,"y":0,"rotation":2},{"id":"sunscreen","x":3,"y":0,"rotation":0},{"id":"coffin","x":4,"y":1,"rotation":0},{"id":"fish","x":1,"y":1,"rotation":3},{"id":"toothbrush","x":0,"y":2,"rotation":0},{"id":"mug","x":2,"y":2,"rotation":2}],"solutionCount":19},{"width":6,"height":5,"items":["fish","ice","tent","hat","sandals","sunscreen","headphones"],"blocked":[[0,1],[3,4],[5,0]],"rules":[{"type":"edge","pieceId":"headphones","edge":"top","text":"Holiday headphones · touch the top edge."},{"type":"edge","pieceId":"fish","edge":"left","text":"Flying-fish plush · touch the left edge."}],"solution":[{"id":"fish","x":0,"y":0,"rotation":0},{"id":"ice","x":4,"y":3,"rotation":0},{"id":"sandals","x":4,"y":1,"rotation":2},{"id":"headphones","x":3,"y":0,"rotation":1},{"id":"hat","x":2,"y":1,"rotation":0},{"id":"sunscreen","x":0,"y":2,"rotation":0},{"id":"tent","x":0,"y":2,"rotation":2}],"solutionCount":3},{"width":6,"height":5,"items":["mug","glasses","socks","headphones","sandals","camera","parasol"],"blocked":[[5,0]],"rules":[{"type":"edge","pieceId":"socks","edge":"top","text":"Odd socks · touch the top edge."},{"type":"edge","pieceId":"headphones","edge":"bottom","text":"Holiday headphones · touch the bottom edge."}],"solution":[{"id":"mug","x":0,"y":0,"rotation":0},{"id":"sandals","x":2,"y":0,"rotation":0},{"id":"socks","x":3,"y":0,"rotation":0},{"id":"camera","x":0,"y":3,"rotation":0},{"id":"parasol","x":1,"y":2,"rotation":0},{"id":"glasses","x":2,"y":3,"rotation":0},{"id":"headphones","x":4,"y":2,"rotation":3}],"solutionCount":8},{"width":5,"height":5,"items":["coffin","headphones","sunscreen","fish","toothbrush","tent"],"blocked":[[4,0]],"rules":[{"type":"edge","pieceId":"coffin","edge":"bottom","text":"Travel coffin · touch the bottom edge."}],"solution":[{"id":"sunscreen","x":0,"y":0,"rotation":0},{"id":"headphones","x":1,"y":0,"rotation":1},{"id":"tent","x":0,"y":2,"rotation":3},{"id":"toothbrush","x":1,"y":3,"rotation":3},{"id":"coffin","x":4,"y":1,"rotation":0},{"id":"fish","x":2,"y":0,"rotation":1}],"solutionCount":16},{"width":6,"height":5,"items":["toothbrush","mug","passport","tent","headphones","plant","sunscreen"],"blocked":[[2,0]],"rules":[{"type":"upright","pieceId":"toothbrush","rotations":[0],"text":"Travel snorkel stays upright."},{"type":"edge","pieceId":"sunscreen","edge":"top","text":"Moonblock SPF 666 · touch the top edge."}],"solution":[{"id":"sunscreen","x":0,"y":0,"rotation":0},{"id":"plant","x":1,"y":0,"rotation":0},{"id":"toothbrush","x":0,"y":2,"rotation":0},{"id":"headphones","x":3,"y":0,"rotation":2},{"id":"tent","x":2,"y":1,"rotation":1},{"id":"passport","x":5,"y":2,"rotation":0},{"id":"mug","x":2,"y":3,"rotation":3}],"solutionCount":3},{"width":6,"height":5,"items":["socks","mug","coffin","camera","sunscreen","tent","parasol"],"blocked":[[0,0],[1,0]],"rules":[{"type":"edge","pieceId":"tent","edge":"bottom","text":"Aloha shirt · touch the bottom edge."},{"type":"edge","pieceId":"camera","edge":"top","text":"Instant camera · touch the top edge."}],"solution":[{"id":"socks","x":0,"y":1,"rotation":0},{"id":"tent","x":0,"y":2,"rotation":3},{"id":"coffin","x":1,"y":4,"rotation":1},{"id":"parasol","x":4,"y":2,"rotation":1},{"id":"sunscreen","x":3,"y":2,"rotation":0},{"id":"mug","x":4,"y":0,"rotation":0},{"id":"camera","x":2,"y":0,"rotation":0}],"solutionCount":3},{"width":6,"height":5,"items":["fish","sandals","mug","socks","toothbrush","tent","ice"],"blocked":[[4,0]],"rules":[{"type":"edge","pieceId":"fish","edge":"right","text":"Flying-fish plush · touch the right edge."},{"type":"edge","pieceId":"tent","edge":"top","text":"Aloha shirt · touch the top edge."}],"solution":[{"id":"fish","x":4,"y":0,"rotation":1},{"id":"sandals","x":4,"y":3,"rotation":2},{"id":"socks","x":2,"y":3,"rotation":0},{"id":"mug","x":0,"y":3,"rotation":3},{"id":"tent","x":2,"y":0,"rotation":2},{"id":"ice","x":1,"y":0,"rotation":0},{"id":"toothbrush","x":0,"y":0,"rotation":0}],"solutionCount":4},{"width":5,"height":5,"items":["fish","coffin","sunscreen","mug","sandals","socks"],"blocked":[[4,3],[0,0],[4,0]],"rules":[{"type":"edge","pieceId":"mug","edge":"top","text":"Giant travel mug · touch the top edge."}],"solution":[{"id":"fish","x":2,"y":3,"rotation":2},{"id":"coffin","x":1,"y":2,"rotation":1},{"id":"sunscreen","x":1,"y":3,"rotation":1},{"id":"sandals","x":0,"y":3,"rotation":0},{"id":"socks","x":0,"y":0,"rotation":1},{"id":"mug","x":2,"y":0,"rotation":3}],"solutionCount":18},{"width":6,"height":5,"items":["socks","snowglobe","coffin","tent","fish","sunscreen","toothbrush"],"blocked":[[5,2],[0,0],[5,4]],"rules":[{"type":"upright","pieceId":"snowglobe","rotations":[0],"text":"Home snow globe stays upright."},{"type":"edge","pieceId":"socks","edge":"left","text":"Odd socks · touch the left edge."}],"solution":[{"id":"snowglobe","x":4,"y":0,"rotation":0},{"id":"fish","x":3,"y":2,"rotation":2},{"id":"coffin","x":1,"y":4,"rotation":1},{"id":"toothbrush","x":0,"y":3,"rotation":1},{"id":"sunscreen","x":3,"y":0,"rotation":0},{"id":"tent","x":1,"y":0,"rotation":2},{"id":"socks","x":0,"y":0,"rotation":1}],"solutionCount":4},{"width":6,"height":5,"items":["coffin","tent","sunscreen","socks","fish","headphones","toothbrush"],"blocked":[[0,0],[1,0]],"rules":[{"type":"upright","pieceId":"toothbrush","rotations":[0],"text":"Travel snorkel stays upright."},{"type":"edge","pieceId":"fish","edge":"bottom","text":"Flying-fish plush · touch the bottom edge."}],"solution":[{"id":"coffin","x":5,"y":0,"rotation":0},{"id":"tent","x":3,"y":2,"rotation":2},{"id":"headphones","x":2,"y":0,"rotation":2},{"id":"sunscreen","x":3,"y":1,"rotation":0},{"id":"socks","x":0,"y":1,"rotation":0},{"id":"fish","x":1,"y":3,"rotation":0},{"id":"toothbrush","x":0,"y":2,"rotation":0}],"solutionCount":4},{"width":5,"height":5,"items":["hat","headphones","passport","mug","parasol","sunscreen"],"blocked":[[1,0],[4,0]],"rules":[{"type":"edge","pieceId":"hat","edge":"bottom","text":"Rain boot · touch the bottom edge."}],"solution":[{"id":"headphones","x":0,"y":0,"rotation":0},{"id":"parasol","x":3,"y":0,"rotation":3},{"id":"passport","x":4,"y":2,"rotation":0},{"id":"hat","x":1,"y":3,"rotation":3},{"id":"mug","x":0,"y":2,"rotation":0},{"id":"sunscreen","x":2,"y":2,"rotation":0}],"solutionCount":22},{"width":6,"height":5,"items":["coffin","hat","plant","book","sunscreen","mug","headphones"],"blocked":[[1,0]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Holiday cactus stays upright."},{"type":"edge","pieceId":"book","edge":"right","text":"Pocket travel guide · touch the right edge."}],"solution":[{"id":"plant","x":0,"y":0,"rotation":0},{"id":"coffin","x":0,"y":4,"rotation":1},{"id":"hat","x":1,"y":2,"rotation":1},{"id":"sunscreen","x":2,"y":3,"rotation":1},{"id":"mug","x":2,"y":0,"rotation":3},{"id":"headphones","x":4,"y":0,"rotation":3},{"id":"book","x":4,"y":3,"rotation":0}],"solutionCount":8},{"width":6,"height":5,"items":["fish","coffin","hat","tent","passport","plant","book"],"blocked":[[1,0]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Holiday cactus stays upright."},{"type":"edge","pieceId":"coffin","edge":"top","text":"Travel coffin · touch the top edge."}],"solution":[{"id":"coffin","x":0,"y":0,"rotation":0},{"id":"tent","x":0,"y":2,"rotation":2},{"id":"hat","x":1,"y":1,"rotation":2},{"id":"passport","x":2,"y":0,"rotation":1},{"id":"fish","x":4,"y":0,"rotation":1},{"id":"plant","x":3,"y":1,"rotation":0},{"id":"book","x":4,"y":3,"rotation":0}],"solutionCount":6},{"width":6,"height":5,"items":["snowglobe","sandals","tent","glasses","mug","hat","parasol"],"blocked":[[0,0]],"rules":[{"type":"edge","pieceId":"tent","edge":"right","text":"Aloha shirt · touch the right edge."},{"type":"edge","pieceId":"parasol","edge":"right","text":"Beach parasol · touch the right edge."}],"solution":[{"id":"hat","x":0,"y":3,"rotation":3},{"id":"snowglobe","x":0,"y":2,"rotation":0},{"id":"glasses","x":0,"y":0,"rotation":0},{"id":"sandals","x":2,"y":1,"rotation":1},{"id":"parasol","x":3,"y":0,"rotation":0},{"id":"tent","x":3,"y":1,"rotation":1},{"id":"mug","x":3,"y":3,"rotation":3}],"solutionCount":1},{"width":5,"height":5,"items":["snowglobe","sunscreen","coffin","sandals","toothbrush","fish"],"blocked":[[2,4],[0,0],[1,0],[4,1]],"rules":[{"type":"edge","pieceId":"snowglobe","edge":"bottom","text":"Home snow globe · touch the bottom edge."}],"solution":[{"id":"toothbrush","x":2,"y":0,"rotation":1},{"id":"coffin","x":0,"y":1,"rotation":0},{"id":"sunscreen","x":1,"y":1,"rotation":0},{"id":"sandals","x":1,"y":3,"rotation":1},{"id":"snowglobe","x":3,"y":3,"rotation":0},{"id":"fish","x":2,"y":1,"rotation":2}],"solutionCount":6},{"width":6,"height":5,"items":["glasses","parasol","headphones","mug","snowglobe","tent","sunscreen"],"blocked":[[1,0]],"rules":[{"type":"upright","pieceId":"snowglobe","rotations":[0],"text":"Home snow globe stays upright."},{"type":"edge","pieceId":"mug","edge":"bottom","text":"Giant travel mug · touch the bottom edge."}],"solution":[{"id":"parasol","x":0,"y":0,"rotation":3},{"id":"snowglobe","x":0,"y":3,"rotation":0},{"id":"tent","x":1,"y":2,"rotation":0},{"id":"sunscreen","x":2,"y":0,"rotation":0},{"id":"headphones","x":3,"y":0,"rotation":2},{"id":"glasses","x":4,"y":1,"rotation":1},{"id":"mug","x":3,"y":3,"rotation":3}],"solutionCount":5},{"width":6,"height":5,"items":["glasses","headphones","tent","socks","snowglobe","mug","sunscreen"],"blocked":[[0,0]],"rules":[{"type":"upright","pieceId":"snowglobe","rotations":[0],"text":"Home snow globe stays upright."},{"type":"edge","pieceId":"headphones","edge":"left","text":"Holiday headphones · touch the left edge."}],"solution":[{"id":"tent","x":3,"y":0,"rotation":0},{"id":"sunscreen","x":5,"y":1,"rotation":0},{"id":"mug","x":3,"y":3,"rotation":1},{"id":"socks","x":1,"y":3,"rotation":0},{"id":"headphones","x":0,"y":2,"rotation":1},{"id":"glasses","x":0,"y":0,"rotation":0},{"id":"snowglobe","x":2,"y":1,"rotation":0}],"solutionCount":4},{"width":5,"height":5,"items":["plant","socks","hat","headphones","sandals","sunscreen"],"blocked":[[4,4],[0,3]],"rules":[{"type":"edge","pieceId":"sunscreen","edge":"top","text":"Moonblock SPF 666 · touch the top edge."}],"solution":[{"id":"plant","x":0,"y":3,"rotation":3},{"id":"hat","x":0,"y":0,"rotation":0},{"id":"sandals","x":1,"y":0,"rotation":0},{"id":"sunscreen","x":2,"y":0,"rotation":1},{"id":"socks","x":3,"y":0,"rotation":1},{"id":"headphones","x":2,"y":2,"rotation":0}],"solutionCount":14},{"width":6,"height":5,"items":["coffin","sunscreen","plant","tent","hat","camera","socks"],"blocked":[[5,2],[0,0]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Holiday cactus stays upright."},{"type":"edge","pieceId":"socks","edge":"right","text":"Odd socks · touch the right edge."}],"solution":[{"id":"socks","x":4,"y":0,"rotation":1},{"id":"tent","x":2,"y":0,"rotation":0},{"id":"plant","x":1,"y":0,"rotation":0},{"id":"coffin","x":0,"y":1,"rotation":0},{"id":"sunscreen","x":2,"y":2,"rotation":0},{"id":"hat","x":1,"y":3,"rotation":3},{"id":"camera","x":4,"y":3,"rotation":0}],"solutionCount":1},{"width":6,"height":5,"items":["parasol","snowglobe","hat","headphones","sunscreen","glasses","sandals"],"blocked":[[0,1],[3,4],[2,4],[4,4]],"rules":[{"type":"upright","pieceId":"snowglobe","rotations":[0],"text":"Home snow globe stays upright."},{"type":"edge","pieceId":"sunscreen","edge":"left","text":"Moonblock SPF 666 · touch the left edge."}],"solution":[{"id":"sandals","x":4,"y":3,"rotation":2},{"id":"sunscreen","x":0,"y":0,"rotation":1},{"id":"headphones","x":0,"y":2,"rotation":1},{"id":"parasol","x":1,"y":2,"rotation":2},{"id":"glasses","x":1,"y":0,"rotation":0},{"id":"hat","x":4,"y":0,"rotation":2},{"id":"snowglobe","x":3,"y":1,"rotation":0}],"solutionCount":1},{"width":6,"height":5,"items":["toothbrush","passport","coffin","tent","sunscreen","ice","fish"],"blocked":[[2,4],[0,1],[3,4],[4,4]],"rules":[{"type":"upright","pieceId":"toothbrush","rotations":[0],"text":"Travel snorkel stays upright."},{"type":"edge","pieceId":"coffin","edge":"right","text":"Travel coffin · touch the right edge."}],"solution":[{"id":"passport","x":0,"y":0,"rotation":1},{"id":"coffin","x":5,"y":1,"rotation":0},{"id":"fish","x":3,"y":0,"rotation":0},{"id":"ice","x":3,"y":2,"rotation":0},{"id":"tent","x":1,"y":1,"rotation":0},{"id":"sunscreen","x":1,"y":2,"rotation":0},{"id":"toothbrush","x":0,"y":2,"rotation":0}],"solutionCount":8},{"width":5,"height":5,"items":["hat","glasses","parasol","camera","headphones","sandals"],"blocked":[[2,0]],"rules":[{"type":"edge","pieceId":"headphones","edge":"bottom","text":"Holiday headphones · touch the bottom edge."}],"solution":[{"id":"hat","x":0,"y":0,"rotation":0},{"id":"glasses","x":1,"y":0,"rotation":1},{"id":"camera","x":3,"y":0,"rotation":0},{"id":"headphones","x":3,"y":2,"rotation":3},{"id":"parasol","x":1,"y":3,"rotation":0},{"id":"sandals","x":0,"y":3,"rotation":0}],"solutionCount":7},{"width":6,"height":5,"items":["snowglobe","parasol","sunscreen","mug","plant","socks","headphones"],"blocked":[[0,0]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Holiday cactus stays upright."},{"type":"edge","pieceId":"sunscreen","edge":"bottom","text":"Moonblock SPF 666 · touch the bottom edge."}],"solution":[{"id":"parasol","x":3,"y":0,"rotation":0},{"id":"mug","x":4,"y":1,"rotation":2},{"id":"sunscreen","x":4,"y":4,"rotation":1},{"id":"snowglobe","x":1,"y":0,"rotation":0},{"id":"plant","x":0,"y":1,"rotation":0},{"id":"socks","x":2,"y":1,"rotation":1},{"id":"headphones","x":1,"y":3,"rotation":0}],"solutionCount":6},{"width":6,"height":5,"items":["fish","mug","glasses","passport","book","coffin","hat"],"blocked":[[0,0],[2,0]],"rules":[{"type":"edge","pieceId":"hat","edge":"bottom","text":"Rain boot · touch the bottom edge."},{"type":"edge","pieceId":"book","edge":"right","text":"Pocket travel guide · touch the right edge."}],"solution":[{"id":"fish","x":1,"y":0,"rotation":3},{"id":"coffin","x":0,"y":1,"rotation":0},{"id":"passport","x":3,"y":0,"rotation":0},{"id":"book","x":4,"y":0,"rotation":0},{"id":"mug","x":1,"y":2,"rotation":2},{"id":"glasses","x":3,"y":2,"rotation":0},{"id":"hat","x":3,"y":3,"rotation":3}],"solutionCount":4},{"width":5,"height":5,"items":["ice","fish","hat","mug","sunscreen","passport"],"blocked":[[4,1],[4,2],[4,4]],"rules":[{"type":"edge","pieceId":"fish","edge":"bottom","text":"Flying-fish plush · touch the bottom edge."}],"solution":[{"id":"hat","x":2,"y":0,"rotation":1},{"id":"sunscreen","x":3,"y":1,"rotation":0},{"id":"fish","x":2,"y":3,"rotation":0},{"id":"passport","x":0,"y":2,"rotation":1},{"id":"ice","x":0,"y":0,"rotation":0},{"id":"mug","x":0,"y":3,"rotation":3}],"solutionCount":13},{"width":6,"height":5,"items":["sandals","parasol","tent","plant","toothbrush","passport","camera"],"blocked":[[0,0],[5,3]],"rules":[{"type":"edge","pieceId":"sandals","edge":"left","text":"Beach sandals · touch the left edge."},{"type":"edge","pieceId":"camera","edge":"right","text":"Instant camera · touch the right edge."}],"solution":[{"id":"parasol","x":3,"y":3,"rotation":2},{"id":"camera","x":4,"y":0,"rotation":0},{"id":"tent","x":3,"y":1,"rotation":3},{"id":"passport","x":1,"y":0,"rotation":1},{"id":"plant","x":1,"y":1,"rotation":2},{"id":"toothbrush","x":0,"y":2,"rotation":0},{"id":"sandals","x":0,"y":1,"rotation":2}],"solutionCount":1}];
  var artNames = {"coffin":"Travel coffin","sunscreen":"Moonblock SPF 666","parasol":"Beach parasol","glasses":"Sunset scarf","sandals":"Beach sandals","headphones":"Holiday headphones","ice":"Emergency ice","fish":"Flying-fish plush","mug":"Giant travel mug","tent":"Aloha shirt","camera":"Instant camera","toothbrush":"Travel snorkel","hat":"Rain boot","book":"Pocket travel guide","socks":"Odd socks","snowglobe":"Home snow globe","plant":"Holiday cactus","passport":"Boarding pass"};
  function piecesFor(items) { return items.map(function(id,i) { var p=makePiece(id,i); p.name=artNames[id]; return p; }); }
  var tutorial = {"id":"moonlight-check-in","name":"Moonlight check-in","passenger":"Vlad","destination":"Moonbeam Beach","tagline":"A little shade. A lot of luggage.","theme":"vampire","width":5,"height":4,"difficulty":"Easy","pieces":[{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"ice"},{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#b6c9a5","icon":"camera"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"book"},{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"snowglobe"}],"solution":[{"id":"coffin","x":0,"y":0,"rotation":0},{"id":"ice","x":1,"y":0,"rotation":0},{"id":"camera","x":3,"y":0,"rotation":0},{"id":"book","x":1,"y":2,"rotation":0},{"id":"snowglobe","x":3,"y":2,"rotation":0}]};
  tutorial.blocked=[]; tutorial.rules=[]; tutorial.revision=1; tutorial.chapter='Warm-up'; tutorial.par=tutorial.pieces.length+2;
  var levels = [tutorial].concat(campaignData.map(function(d,i) {
    var m=d.meta;
    return {id:m[0],name:m[1],passenger:m[2],destination:m[3],tagline:m[4],theme:m[5],width:d.width,height:d.height,difficulty:i<2?'Tricky':i<5?'Expert':'Master',chapter:i<2?'Warm-up':i<5?'Odd requests':'Master class',revision:2,pieces:piecesFor(d.items),blocked:d.blocked,rules:d.rules,solution:d.solution,solutionCount:d.solutionCount,par:d.items.length+2};
  }));

  // Extra trips retain every original puzzle ID/revision so saved stamps and
  // drafts survive the expanded itinerary. Chapter membership is data-driven.
  var originalTripNames = ["All aboard, cats","The window seat","One more nap","Midnight meow","First day at camp","Stay, good dog","The whole pack","Last one in","The great thaw","Red-eye upgrade","All hands on deck","Final boarding call"];
  var chapterIds = ['cats','dogs','odd'];
  levels.forEach(function(level,i) { level.chapterId=chapterIds[Math.floor(i/4)]; level.tripName=originalTripNames[i]; });
  var extraTrips = [
  {
    "id": "cats-the-cardboard-castle",
    "name": "The cardboard castle",
    "tripName": "The cardboard castle",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "Every little corner is somebody’s favourite.",
    "theme": "vampire",
    "width": 5,
    "height": 4,
    "difficulty": "Tricky",
    "chapter": "Warm-up",
    "revision": 1,
    "items": [
      "sunscreen",
      "mug",
      "parasol",
      "plant",
      "passport"
    ],
    "blocked": [
      [
        0,
        3
      ]
    ],
    "rules": [],
    "solution": [
      {
        "id": "sunscreen",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "parasol",
        "x": 0,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "plant",
        "x": 1,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "passport",
        "x": 2,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 3,
        "y": 1,
        "rotation": 2
      }
    ],
    "solutionCount": 23,
    "par": 7
  },
  {
    "id": "cats-sunbeam-reserved",
    "name": "Sunbeam reserved",
    "tripName": "Sunbeam reserved",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "Every little corner is somebody’s favourite.",
    "theme": "vampire",
    "width": 5,
    "height": 4,
    "difficulty": "Tricky",
    "chapter": "Warm-up",
    "revision": 1,
    "items": [
      "headphones",
      "hat",
      "sunscreen",
      "sandals",
      "parasol"
    ],
    "blocked": [
      [
        3,
        3
      ],
      [
        4,
        3
      ]
    ],
    "rules": [],
    "solution": [
      {
        "id": "headphones",
        "x": 0,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "hat",
        "x": 0,
        "y": 2,
        "rotation": 3
      },
      {
        "id": "sunscreen",
        "x": 1,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "parasol",
        "x": 2,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "sandals",
        "x": 3,
        "y": 1,
        "rotation": 3
      }
    ],
    "solutionCount": 23,
    "par": 7
  },
  {
    "id": "cats-paws-in-the-hallway",
    "name": "Paws in the hallway",
    "tripName": "Paws in the hallway",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "Every little corner is somebody’s favourite.",
    "theme": "vampire",
    "width": 5,
    "height": 4,
    "difficulty": "Tricky",
    "chapter": "Warm-up",
    "revision": 1,
    "items": [
      "sandals",
      "mug",
      "toothbrush",
      "fish",
      "passport"
    ],
    "blocked": [
      [
        0,
        3
      ]
    ],
    "rules": [],
    "solution": [
      {
        "id": "sandals",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "fish",
        "x": 1,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "passport",
        "x": 4,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 0,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "toothbrush",
        "x": 3,
        "y": 1,
        "rotation": 0
      }
    ],
    "solutionCount": 21,
    "par": 7
  },
  {
    "id": "cats-the-yarn-detour",
    "name": "The yarn detour",
    "tripName": "The yarn detour",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "A special request. A little more room to think.",
    "theme": "vampire",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "ice",
      "mug",
      "toothbrush",
      "headphones",
      "passport",
      "sunscreen"
    ],
    "blocked": [
      [
        0,
        4
      ],
      [
        0,
        3
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "passport",
        "rotations": [
          0
        ],
        "text": "Extra-long passport stays upright."
      }
    ],
    "solution": [
      {
        "id": "ice",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 0,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "toothbrush",
        "x": 1,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "passport",
        "x": 4,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "sunscreen",
        "x": 3,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "headphones",
        "x": 2,
        "y": 0,
        "rotation": 2
      }
    ],
    "solutionCount": 34,
    "par": 8
  },
  {
    "id": "cats-do-not-disturb",
    "name": "Do not disturb",
    "tripName": "Do not disturb",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "A special request. A little more room to think.",
    "theme": "vampire",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "tent",
      "plant",
      "hat",
      "sunscreen",
      "mug",
      "sandals"
    ],
    "blocked": [
      [
        1,
        4
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "hat",
        "edge": "bottom",
        "text": "Very important hat touches the bottom edge."
      }
    ],
    "solution": [
      {
        "id": "tent",
        "x": 0,
        "y": 2,
        "rotation": 3
      },
      {
        "id": "hat",
        "x": 2,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "plant",
        "x": 1,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "sunscreen",
        "x": 4,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 1,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "sandals",
        "x": 0,
        "y": 0,
        "rotation": 0
      }
    ],
    "solutionCount": 20,
    "par": 8
  },
  {
    "id": "cats-room-for-whiskers",
    "name": "Room for whiskers",
    "tripName": "Room for whiskers",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "A special request. A little more room to think.",
    "theme": "vampire",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "coffin",
      "sandals",
      "plant",
      "fish",
      "headphones",
      "passport"
    ],
    "blocked": [
      [
        0,
        4
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "passport",
        "rotations": [
          0
        ],
        "text": "Extra-long passport stays upright."
      }
    ],
    "solution": [
      {
        "id": "coffin",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "sandals",
        "x": 1,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "fish",
        "x": 2,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "plant",
        "x": 3,
        "y": 1,
        "rotation": 2
      },
      {
        "id": "headphones",
        "x": 2,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "passport",
        "x": 1,
        "y": 2,
        "rotation": 0
      }
    ],
    "solutionCount": 19,
    "par": 8
  },
  {
    "id": "cats-nine-lives-one-box",
    "name": "Nine lives, one box",
    "tripName": "Nine lives, one box",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "A special request. A little more room to think.",
    "theme": "vampire",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "mug",
      "plant",
      "snowglobe",
      "parasol",
      "passport",
      "sunscreen"
    ],
    "blocked": [
      [
        4,
        0
      ],
      [
        2,
        0
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "mug",
        "edge": "left",
        "text": "Oversized coffee touches the left edge."
      }
    ],
    "solution": [
      {
        "id": "plant",
        "x": 3,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "passport",
        "x": 4,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "parasol",
        "x": 1,
        "y": 3,
        "rotation": 2
      },
      {
        "id": "mug",
        "x": 0,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "sunscreen",
        "x": 2,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "snowglobe",
        "x": 0,
        "y": 0,
        "rotation": 0
      }
    ],
    "solutionCount": 13,
    "par": 8
  },
  {
    "id": "cats-the-biscuit-shift",
    "name": "The biscuit shift",
    "tripName": "The biscuit shift",
    "chapterId": "cats",
    "passenger": "Whisker Crew",
    "destination": "Sunbeam House",
    "tagline": "A special request. A little more room to think.",
    "theme": "vampire",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "hat",
      "snowglobe",
      "glasses",
      "passport",
      "mug",
      "coffin"
    ],
    "blocked": [
      [
        4,
        4
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "passport",
        "rotations": [
          0
        ],
        "text": "Extra-long passport stays upright."
      }
    ],
    "solution": [
      {
        "id": "hat",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 0,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "snowglobe",
        "x": 1,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "coffin",
        "x": 4,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "passport",
        "x": 3,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "glasses",
        "x": 2,
        "y": 2,
        "rotation": 1
      }
    ],
    "solutionCount": 13,
    "par": 8
  },
  {
    "id": "dogs-morning-roll-call",
    "name": "Morning roll call",
    "tripName": "Morning roll call",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "A special request. A little more room to think.",
    "theme": "octopus",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "toothbrush",
      "passport",
      "headphones",
      "fish",
      "sandals",
      "tent"
    ],
    "blocked": [
      [
        3,
        0
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "tent",
        "rotations": [
          0
        ],
        "text": "Pocket tent stays upright."
      }
    ],
    "solution": [
      {
        "id": "toothbrush",
        "x": 2,
        "y": 0,
        "rotation": 3
      },
      {
        "id": "tent",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "passport",
        "x": 0,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "fish",
        "x": 0,
        "y": 3,
        "rotation": 2
      },
      {
        "id": "headphones",
        "x": 2,
        "y": 2,
        "rotation": 2
      },
      {
        "id": "sandals",
        "x": 3,
        "y": 3,
        "rotation": 0
      }
    ],
    "solutionCount": 13,
    "par": 8
  },
  {
    "id": "dogs-trail-mixup",
    "name": "Trail mix-up",
    "tripName": "Trail mix-up",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "A special request. A little more room to think.",
    "theme": "octopus",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "toothbrush",
      "sandals",
      "snowglobe",
      "passport",
      "plant",
      "sunscreen"
    ],
    "blocked": [
      [
        3,
        4
      ],
      [
        2,
        0
      ],
      [
        4,
        0
      ],
      [
        0,
        0
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "passport",
        "rotations": [
          0
        ],
        "text": "Extra-long passport stays upright."
      }
    ],
    "solution": [
      {
        "id": "passport",
        "x": 4,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "plant",
        "x": 3,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "sandals",
        "x": 1,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "sunscreen",
        "x": 0,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "toothbrush",
        "x": 1,
        "y": 2,
        "rotation": 2
      },
      {
        "id": "snowglobe",
        "x": 0,
        "y": 3,
        "rotation": 0
      }
    ],
    "solutionCount": 8,
    "par": 8
  },
  {
    "id": "dogs-the-muddy-shortcut",
    "name": "The muddy shortcut",
    "tripName": "The muddy shortcut",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "A special request. A little more room to think.",
    "theme": "octopus",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "snowglobe",
      "mug",
      "plant",
      "hat",
      "parasol",
      "sunscreen"
    ],
    "blocked": [
      [
        3,
        4
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "plant",
        "rotations": [
          0
        ],
        "text": "Emotional-support plant stays upright."
      }
    ],
    "solution": [
      {
        "id": "hat",
        "x": 3,
        "y": 2,
        "rotation": 2
      },
      {
        "id": "snowglobe",
        "x": 3,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "parasol",
        "x": 1,
        "y": 2,
        "rotation": 2
      },
      {
        "id": "sunscreen",
        "x": 1,
        "y": 4,
        "rotation": 1
      },
      {
        "id": "plant",
        "x": 0,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 0,
        "y": 0,
        "rotation": 1
      }
    ],
    "solutionCount": 8,
    "par": 8
  },
  {
    "id": "dogs-treats-by-the-window",
    "name": "Treats by the window",
    "tripName": "Treats by the window",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "A special request. A little more room to think.",
    "theme": "octopus",
    "width": 5,
    "height": 5,
    "difficulty": "Expert",
    "chapter": "Odd requests",
    "revision": 1,
    "items": [
      "passport",
      "mug",
      "book",
      "fish",
      "toothbrush",
      "glasses"
    ],
    "blocked": [
      [
        1,
        0
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "toothbrush",
        "edge": "right",
        "text": "Fang brush touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "passport",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 0,
        "y": 2,
        "rotation": 2
      },
      {
        "id": "fish",
        "x": 1,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "book",
        "x": 3,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "glasses",
        "x": 2,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "toothbrush",
        "x": 2,
        "y": 3,
        "rotation": 3
      }
    ],
    "solutionCount": 7,
    "par": 8
  },
  {
    "id": "dogs-operation-fetch",
    "name": "Operation fetch",
    "tripName": "Operation fetch",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "octopus",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "book",
      "passport",
      "headphones",
      "toothbrush",
      "fish",
      "mug",
      "socks"
    ],
    "blocked": [
      [
        0,
        2
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "passport",
        "rotations": [
          0
        ],
        "text": "Extra-long passport stays upright."
      },
      {
        "type": "edge",
        "pieceId": "mug",
        "edge": "top",
        "text": "Oversized coffee touches the top edge."
      }
    ],
    "solution": [
      {
        "id": "headphones",
        "x": 0,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "toothbrush",
        "x": 1,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "mug",
        "x": 0,
        "y": 0,
        "rotation": 3
      },
      {
        "id": "fish",
        "x": 2,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "socks",
        "x": 4,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "passport",
        "x": 5,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "book",
        "x": 3,
        "y": 3,
        "rotation": 0
      }
    ],
    "solutionCount": 3,
    "par": 9
  },
  {
    "id": "dogs-the-blanket-fort",
    "name": "The blanket fort",
    "tripName": "The blanket fort",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "octopus",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "snowglobe",
      "coffin",
      "headphones",
      "sandals",
      "mug",
      "parasol",
      "glasses"
    ],
    "blocked": [
      [
        1,
        4
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "headphones",
        "rotations": [
          0
        ],
        "text": "Quiet-time headphones stays upright."
      },
      {
        "type": "edge",
        "pieceId": "parasol",
        "edge": "right",
        "text": "Tiny parasol touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "coffin",
        "x": 0,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "sandals",
        "x": 0,
        "y": 0,
        "rotation": 2
      },
      {
        "id": "mug",
        "x": 2,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "snowglobe",
        "x": 4,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "glasses",
        "x": 1,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "parasol",
        "x": 3,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "headphones",
        "x": 3,
        "y": 3,
        "rotation": 0
      }
    ],
    "solutionCount": 3,
    "par": 9
  },
  {
    "id": "dogs-no-pup-left-behind",
    "name": "No pup left behind",
    "tripName": "No pup left behind",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "octopus",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "socks",
      "snowglobe",
      "mug",
      "parasol",
      "tent",
      "hat",
      "sunscreen"
    ],
    "blocked": [
      [
        5,
        2
      ],
      [
        0,
        2
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "mug",
        "edge": "top",
        "text": "Oversized coffee touches the top edge."
      },
      {
        "type": "edge",
        "pieceId": "socks",
        "edge": "right",
        "text": "Spare woolly socks touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "snowglobe",
        "x": 0,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "hat",
        "x": 3,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "tent",
        "x": 1,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "sunscreen",
        "x": 3,
        "y": 3,
        "rotation": 1
      },
      {
        "id": "mug",
        "x": 0,
        "y": 0,
        "rotation": 3
      },
      {
        "id": "parasol",
        "x": 2,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "socks",
        "x": 4,
        "y": 0,
        "rotation": 1
      }
    ],
    "solutionCount": 3,
    "par": 9
  },
  {
    "id": "dogs-one-last-adventure",
    "name": "One last adventure",
    "tripName": "One last adventure",
    "chapterId": "dogs",
    "passenger": "Wag Club",
    "destination": "Pinecone Camp",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "octopus",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "fish",
      "socks",
      "mug",
      "ice",
      "hat",
      "tent",
      "sandals"
    ],
    "blocked": [
      [
        0,
        2
      ]
    ],
    "rules": [
      {
        "type": "upright",
        "pieceId": "tent",
        "rotations": [
          0
        ],
        "text": "Pocket tent stays upright."
      },
      {
        "type": "edge",
        "pieceId": "hat",
        "edge": "right",
        "text": "Very important hat touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "socks",
        "x": 0,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "fish",
        "x": 1,
        "y": 3,
        "rotation": 2
      },
      {
        "id": "sandals",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "tent",
        "x": 1,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "hat",
        "x": 4,
        "y": 0,
        "rotation": 2
      },
      {
        "id": "mug",
        "x": 3,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "ice",
        "x": 4,
        "y": 3,
        "rotation": 0
      }
    ],
    "solutionCount": 2,
    "par": 9
  },
  {
    "id": "odd-lost-and-peculiar",
    "name": "Lost and peculiar",
    "tripName": "Lost and peculiar",
    "chapterId": "odd",
    "passenger": "Vlad",
    "destination": "After-hours Terminal",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "vampire",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "mug",
      "sunscreen",
      "book",
      "plant",
      "hat",
      "headphones",
      "glasses"
    ],
    "blocked": [
      [
        0,
        1
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "hat",
        "edge": "top",
        "text": "Very important hat touches the top edge."
      },
      {
        "type": "edge",
        "pieceId": "sunscreen",
        "edge": "right",
        "text": "Moonblock SPF 999 touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "mug",
        "x": 0,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "plant",
        "x": 0,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "book",
        "x": 0,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "glasses",
        "x": 2,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "headphones",
        "x": 4,
        "y": 2,
        "rotation": 3
      },
      {
        "id": "hat",
        "x": 3,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "sunscreen",
        "x": 4,
        "y": 1,
        "rotation": 1
      }
    ],
    "solutionCount": 5,
    "par": 9
  },
  {
    "id": "odd-cabin-baggage",
    "name": "Cabin baggage",
    "tripName": "Cabin baggage",
    "chapterId": "odd",
    "passenger": "Otto",
    "destination": "Tidepool Terminal",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "octopus",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "coffin",
      "ice",
      "plant",
      "fish",
      "headphones",
      "tent",
      "sunscreen"
    ],
    "blocked": [
      [
        0,
        3
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "plant",
        "edge": "left",
        "text": "Emotional-support plant touches the left edge."
      },
      {
        "type": "edge",
        "pieceId": "ice",
        "edge": "left",
        "text": "Emergency ice touches the left edge."
      }
    ],
    "solution": [
      {
        "id": "plant",
        "x": 0,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "sunscreen",
        "x": 5,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "fish",
        "x": 3,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "headphones",
        "x": 3,
        "y": 1,
        "rotation": 2
      },
      {
        "id": "coffin",
        "x": 2,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "tent",
        "x": 0,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "ice",
        "x": 0,
        "y": 0,
        "rotation": 0
      }
    ],
    "solutionCount": 5,
    "par": 9
  },
  {
    "id": "odd-the-umbrella-incident",
    "name": "The umbrella incident",
    "tripName": "The umbrella incident",
    "chapterId": "odd",
    "passenger": "Yuki",
    "destination": "Northern Lights",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "yeti",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "snowglobe",
      "plant",
      "toothbrush",
      "sunscreen",
      "headphones",
      "tent",
      "sandals"
    ],
    "blocked": [
      [
        0,
        0
      ],
      [
        4,
        4
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "toothbrush",
        "edge": "top",
        "text": "Fang brush touches the top edge."
      },
      {
        "type": "edge",
        "pieceId": "snowglobe",
        "edge": "right",
        "text": "Home in a snow globe touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "sunscreen",
        "x": 5,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "plant",
        "x": 0,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "tent",
        "x": 0,
        "y": 1,
        "rotation": 3
      },
      {
        "id": "headphones",
        "x": 2,
        "y": 1,
        "rotation": 3
      },
      {
        "id": "sandals",
        "x": 4,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "toothbrush",
        "x": 1,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "snowglobe",
        "x": 4,
        "y": 0,
        "rotation": 0
      }
    ],
    "solutionCount": 5,
    "par": 9
  },
  {
    "id": "odd-room-for-one-more",
    "name": "Room for one more",
    "tripName": "Room for one more",
    "chapterId": "odd",
    "passenger": "Vlad",
    "destination": "After-hours Terminal",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "vampire",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "book",
      "headphones",
      "mug",
      "hat",
      "socks",
      "passport",
      "coffin"
    ],
    "blocked": [
      [
        0,
        4
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "socks",
        "edge": "bottom",
        "text": "Spare woolly socks touches the bottom edge."
      },
      {
        "type": "edge",
        "pieceId": "passport",
        "edge": "top",
        "text": "Extra-long passport touches the top edge."
      }
    ],
    "solution": [
      {
        "id": "book",
        "x": 4,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "coffin",
        "x": 3,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "mug",
        "x": 4,
        "y": 0,
        "rotation": 2
      },
      {
        "id": "passport",
        "x": 2,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "headphones",
        "x": 0,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "hat",
        "x": 1,
        "y": 1,
        "rotation": 2
      },
      {
        "id": "socks",
        "x": 0,
        "y": 3,
        "rotation": 0
      }
    ],
    "solutionCount": 3,
    "par": 9
  },
  {
    "id": "odd-nothing-to-declare",
    "name": "Nothing to declare",
    "tripName": "Nothing to declare",
    "chapterId": "odd",
    "passenger": "Otto",
    "destination": "Tidepool Terminal",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "octopus",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "passport",
      "glasses",
      "ice",
      "mug",
      "headphones",
      "coffin",
      "socks"
    ],
    "blocked": [
      [
        5,
        0
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "coffin",
        "edge": "left",
        "text": "Travel coffin touches the left edge."
      },
      {
        "type": "edge",
        "pieceId": "socks",
        "edge": "right",
        "text": "Spare woolly socks touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "passport",
        "x": 3,
        "y": 4,
        "rotation": 1
      },
      {
        "id": "socks",
        "x": 3,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "glasses",
        "x": 4,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "headphones",
        "x": 2,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "coffin",
        "x": 0,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "mug",
        "x": 0,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "ice",
        "x": 0,
        "y": 1,
        "rotation": 0
      }
    ],
    "solutionCount": 2,
    "par": 9
  },
  {
    "id": "odd-strange-bedfellows",
    "name": "Strange bedfellows",
    "tripName": "Strange bedfellows",
    "chapterId": "odd",
    "passenger": "Yuki",
    "destination": "Northern Lights",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "yeti",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "plant",
      "coffin",
      "ice",
      "tent",
      "passport",
      "fish",
      "hat"
    ],
    "blocked": [
      [
        2,
        4
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "plant",
        "edge": "left",
        "text": "Emotional-support plant touches the left edge."
      },
      {
        "type": "edge",
        "pieceId": "ice",
        "edge": "right",
        "text": "Emergency ice touches the right edge."
      }
    ],
    "solution": [
      {
        "id": "passport",
        "x": 0,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "tent",
        "x": 1,
        "y": 2,
        "rotation": 3
      },
      {
        "id": "hat",
        "x": 3,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "coffin",
        "x": 0,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "plant",
        "x": 0,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "ice",
        "x": 4,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "fish",
        "x": 3,
        "y": 2,
        "rotation": 0
      }
    ],
    "solutionCount": 1,
    "par": 9
  },
  {
    "id": "odd-the-impossible-layover",
    "name": "The impossible layover",
    "tripName": "The impossible layover",
    "chapterId": "odd",
    "passenger": "Vlad",
    "destination": "After-hours Terminal",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "vampire",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "headphones",
      "ice",
      "parasol",
      "toothbrush",
      "socks",
      "passport",
      "coffin"
    ],
    "blocked": [
      [
        5,
        3
      ],
      [
        1,
        0
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "socks",
        "edge": "right",
        "text": "Spare woolly socks touches the right edge."
      },
      {
        "type": "edge",
        "pieceId": "toothbrush",
        "edge": "left",
        "text": "Fang brush touches the left edge."
      }
    ],
    "solution": [
      {
        "id": "headphones",
        "x": 0,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "coffin",
        "x": 2,
        "y": 4,
        "rotation": 1
      },
      {
        "id": "toothbrush",
        "x": 0,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "ice",
        "x": 1,
        "y": 2,
        "rotation": 0
      },
      {
        "id": "passport",
        "x": 3,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "parasol",
        "x": 3,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "socks",
        "x": 4,
        "y": 1,
        "rotation": 1
      }
    ],
    "solutionCount": 1,
    "par": 9
  },
  {
    "id": "odd-almost-out-of-space",
    "name": "Almost out of space",
    "tripName": "Almost out of space",
    "chapterId": "odd",
    "passenger": "Otto",
    "destination": "Tidepool Terminal",
    "tagline": "Two peculiar requests. A perfectly packed case.",
    "theme": "octopus",
    "width": 6,
    "height": 5,
    "difficulty": "Master",
    "chapter": "Master class",
    "revision": 1,
    "items": [
      "snowglobe",
      "sunscreen",
      "mug",
      "plant",
      "headphones",
      "glasses",
      "parasol"
    ],
    "blocked": [
      [
        0,
        2
      ]
    ],
    "rules": [
      {
        "type": "edge",
        "pieceId": "snowglobe",
        "edge": "right",
        "text": "Home in a snow globe touches the right edge."
      },
      {
        "type": "edge",
        "pieceId": "glasses",
        "edge": "left",
        "text": "Bat-eye shades touches the left edge."
      }
    ],
    "solution": [
      {
        "id": "glasses",
        "x": 0,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "plant",
        "x": 1,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "mug",
        "x": 4,
        "y": 0,
        "rotation": 2
      },
      {
        "id": "parasol",
        "x": 2,
        "y": 1,
        "rotation": 3
      },
      {
        "id": "sunscreen",
        "x": 0,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "headphones",
        "x": 1,
        "y": 3,
        "rotation": 0
      },
      {
        "id": "snowglobe",
        "x": 4,
        "y": 3,
        "rotation": 0
      }
    ],
    "solutionCount": 1,
    "par": 9
  }
];
  extraTrips.forEach(function(d) { var level=Object.assign({},d); level.pieces=piecesFor(d.items); delete level.items; levels.push(level); });
  var chapterItineraries = [["moonlight-check-in","eight-arm-weekend","snow-day-away","cats-the-cardboard-castle","cats-sunbeam-reserved","cats-paws-in-the-hallway","cats-the-yarn-detour","cats-do-not-disturb","cats-room-for-whiskers","cats-nine-lives-one-box","cats-the-biscuit-shift","after-dark-departure"],["dogs-morning-roll-call","warm-weather-warning","camp-coral","dogs-trail-mixup","dogs-the-muddy-shortcut","dogs-treats-by-the-window","dogs-operation-fetch","dogs-the-blanket-fort","dogs-no-pup-left-behind","dogs-one-last-adventure","midnight-campout","all-arms-aboard"],["red-eye-upgrade","odd-lost-and-peculiar","odd-cabin-baggage","odd-the-umbrella-incident","the-great-thaw","odd-room-for-one-more","all-hands-on-deck","odd-nothing-to-declare","odd-strange-bedfellows","odd-the-impossible-layover","odd-almost-out-of-space","final-boarding-call"]];
  var tripsById = Object.create(null);
  levels.forEach(function(level) { tripsById[level.id]=level; });
  levels = [].concat.apply([],chapterItineraries).map(function(id) { return tripsById[id]; });
  var extraChapters = [{"id":"rooftops","artTheme":"cats","name":"Rooftop moonwalk","description":"Chimneys, narrow ledges and cats who refuse to miss the moon.","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","quote":"Above the city, even the smallest paws leave a story.","titles":["Moonrise check-in","The chimney queue","Balcony biscuits","A window for everyone","Laundry-line limbo","The midnight ledge","Chasing moonbeams","Nine floors up","No room for shadows","Whiskers at the skylight","The last roof tile","Home before sunrise"]},{"id":"seaside","artTheme":"dogs","name":"Seaside wagaway","description":"Sandy paws, beach towels and a very full holiday suitcase.","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","quote":"A little sand in the suitcase. A whole ocean of memories.","titles":["First paws on sand","The towel shuffle","Shell seekers","Shade for the pack","Picnic at high tide","The driftwood detour","Lighthouse lookout","Sandy shortcuts","The crowded boardwalk","Sunset on the pier","One last splash","All paws aboard"]},{"id":"bazaar","artTheme":"odd","name":"The impossible bazaar","description":"Odd souvenirs, crowded stalls and two very particular requests.","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","quote":"We came for a souvenir. We left with a suitcase full of stories.","titles":["Lanterns at six","The curious counter","Souvenir shuffle","Tea with a stranger","The umbrella stall","Bottled moonlight","A very long receipt","The last lucky charm","Midnight bargain","No refunds on chaos","Closing-time squeeze","Treasures tucked away"]},{"id":"aurora","artTheme":"cats","name":"Aurora sleeper club","description":"Snowy windows and sleepy cats on the last train north.","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","quote":"Under the northern lights, there is room for every dream.","titles":["Tickets to the north","The mitten pocket","A seat by the snow","Cabin companions","Frost on the glass","The blanket puzzle","Polar-night picnic","The sleeping-car shuffle","Northern lights ahead","The final snowdrift","One warm corner","Dreams at the end of the line"]}];
  levels = levels.concat([{"id":"rooftops-01","name":"Moonrise check-in","tripName":"Moonrise check-in","chapterId":"rooftops","theme":"octopus","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[0,4]],"rules":[{"type":"upright","pieceId":"toothbrush","rotations":[0],"text":"Fang brush stays upright."}],"solution":[{"id":"headphones","x":2,"y":0,"rotation":2},{"id":"sandals","x":0,"y":0,"rotation":2},{"id":"passport","x":0,"y":1,"rotation":0},{"id":"fish","x":2,"y":1,"rotation":2},{"id":"toothbrush","x":1,"y":2,"rotation":0},{"id":"mug","x":2,"y":3,"rotation":1}],"solutionCount":19,"par":8},{"id":"rooftops-02","name":"The chimney queue","tripName":"The chimney queue","chapterId":"rooftops","theme":"yeti","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"}],"blocked":[[4,4]],"rules":[{"type":"edge","pieceId":"sunscreen","edge":"left","text":"Moonblock SPF 999 touches the left edge."}],"solution":[{"id":"headphones","x":3,"y":0,"rotation":3},{"id":"sandals","x":3,"y":3,"rotation":1},{"id":"plant","x":2,"y":0,"rotation":0},{"id":"mug","x":0,"y":3,"rotation":3},{"id":"ice","x":0,"y":0,"rotation":0},{"id":"sunscreen","x":0,"y":2,"rotation":1}],"solutionCount":15,"par":8},{"id":"rooftops-03","name":"Balcony biscuits","tripName":"Balcony biscuits","chapterId":"rooftops","theme":"vampire","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"}],"blocked":[[0,0],[4,4],[2,0]],"rules":[{"type":"upright","pieceId":"mug","rotations":[0],"text":"Oversized coffee stays upright."}],"solution":[{"id":"socks","x":0,"y":0,"rotation":1},{"id":"ice","x":0,"y":3,"rotation":0},{"id":"hat","x":1,"y":2,"rotation":2},{"id":"sunscreen","x":2,"y":1,"rotation":1},{"id":"sandals","x":3,"y":0,"rotation":2},{"id":"mug","x":3,"y":2,"rotation":0}],"solutionCount":14,"par":8},{"id":"rooftops-04","name":"A window for everyone","tripName":"A window for everyone","chapterId":"rooftops","theme":"octopus","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"}],"blocked":[[4,4]],"rules":[{"type":"upright","pieceId":"passport","rotations":[0],"text":"Extra-long passport stays upright."}],"solution":[{"id":"toothbrush","x":0,"y":0,"rotation":2},{"id":"coffin","x":0,"y":1,"rotation":0},{"id":"mug","x":1,"y":3,"rotation":3},{"id":"passport","x":4,"y":1,"rotation":0},{"id":"fish","x":2,"y":0,"rotation":0},{"id":"glasses","x":2,"y":1,"rotation":1}],"solutionCount":12,"par":8},{"id":"rooftops-05","name":"Laundry-line limbo","tripName":"Laundry-line limbo","chapterId":"rooftops","theme":"yeti","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"}],"blocked":[[5,3],[1,4]],"rules":[{"type":"edge","pieceId":"coffin","edge":"right","text":"Travel coffin touches the right edge."}],"solution":[{"id":"mug","x":0,"y":2,"rotation":0},{"id":"plant","x":2,"y":3,"rotation":3},{"id":"parasol","x":2,"y":1,"rotation":3},{"id":"hat","x":3,"y":1,"rotation":2},{"id":"sunscreen","x":5,"y":1,"rotation":0},{"id":"snowglobe","x":0,"y":0,"rotation":0},{"id":"coffin","x":2,"y":0,"rotation":1}],"solutionCount":9,"par":9},{"id":"rooftops-06","name":"The midnight ledge","tripName":"The midnight ledge","chapterId":"rooftops","theme":"vampire","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"}],"blocked":[[4,4]],"rules":[{"type":"edge","pieceId":"headphones","edge":"right","text":"Quiet-time headphones touches the right edge."}],"solution":[{"id":"sandals","x":4,"y":3,"rotation":2},{"id":"snowglobe","x":0,"y":0,"rotation":0},{"id":"socks","x":2,"y":0,"rotation":0},{"id":"headphones","x":4,"y":0,"rotation":3},{"id":"hat","x":0,"y":1,"rotation":3},{"id":"fish","x":2,"y":2,"rotation":1},{"id":"mug","x":0,"y":3,"rotation":3}],"solutionCount":7,"par":9},{"id":"rooftops-07","name":"Chasing moonbeams","tripName":"Chasing moonbeams","chapterId":"rooftops","theme":"octopus","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"}],"blocked":[[5,3],[5,1],[1,0]],"rules":[{"type":"edge","pieceId":"book","edge":"bottom","text":"Beach read touches the bottom edge."}],"solution":[{"id":"parasol","x":0,"y":0,"rotation":3},{"id":"plant","x":2,"y":0,"rotation":1},{"id":"sunscreen","x":4,"y":2,"rotation":1},{"id":"mug","x":3,"y":3,"rotation":3},{"id":"sandals","x":2,"y":1,"rotation":2},{"id":"hat","x":1,"y":2,"rotation":2},{"id":"book","x":0,"y":3,"rotation":0}],"solutionCount":6,"par":9},{"id":"rooftops-08","name":"Nine floors up","tripName":"Nine floors up","chapterId":"rooftops","theme":"yeti","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[1,0],[5,4]],"rules":[{"type":"upright","pieceId":"tent","rotations":[0],"text":"Pocket tent stays upright."}],"solution":[{"id":"hat","x":0,"y":0,"rotation":0},{"id":"book","x":0,"y":3,"rotation":0},{"id":"fish","x":1,"y":0,"rotation":2},{"id":"mug","x":3,"y":0,"rotation":1},{"id":"sunscreen","x":2,"y":3,"rotation":0},{"id":"tent","x":2,"y":2,"rotation":0},{"id":"socks","x":4,"y":2,"rotation":1}],"solutionCount":4,"par":9},{"id":"rooftops-09","name":"No room for shadows","tripName":"No room for shadows","chapterId":"rooftops","theme":"vampire","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"}],"blocked":[[0,4]],"rules":[{"type":"upright","pieceId":"passport","rotations":[0],"text":"Extra-long passport stays upright."},{"type":"edge","pieceId":"parasol","edge":"bottom","text":"Tiny parasol touches the bottom edge."}],"solution":[{"id":"tent","x":0,"y":0,"rotation":3},{"id":"plant","x":1,"y":0,"rotation":1},{"id":"passport","x":5,"y":0,"rotation":0},{"id":"socks","x":3,"y":1,"rotation":1},{"id":"snowglobe","x":4,"y":3,"rotation":0},{"id":"hat","x":2,"y":2,"rotation":0},{"id":"parasol","x":0,"y":2,"rotation":1}],"solutionCount":3,"par":9},{"id":"rooftops-10","name":"Whiskers at the skylight","tripName":"Whiskers at the skylight","chapterId":"rooftops","theme":"octopus","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"}],"blocked":[[3,0],[1,0],[5,2]],"rules":[{"type":"edge","pieceId":"passport","edge":"right","text":"Extra-long passport touches the right edge."},{"type":"edge","pieceId":"plant","edge":"top","text":"Emotional-support plant touches the top edge."}],"solution":[{"id":"plant","x":0,"y":0,"rotation":0},{"id":"glasses","x":2,"y":0,"rotation":1},{"id":"parasol","x":0,"y":3,"rotation":2},{"id":"socks","x":1,"y":2,"rotation":0},{"id":"sunscreen","x":4,"y":3,"rotation":1},{"id":"mug","x":4,"y":0,"rotation":0},{"id":"passport","x":3,"y":4,"rotation":1}],"solutionCount":1,"par":9},{"id":"rooftops-11","name":"The last roof tile","tripName":"The last roof tile","chapterId":"rooftops","theme":"yeti","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"}],"blocked":[[0,3],[0,1]],"rules":[{"type":"upright","pieceId":"headphones","rotations":[0],"text":"Quiet-time headphones stays upright."},{"type":"edge","pieceId":"coffin","edge":"left","text":"Travel coffin touches the left edge."}],"solution":[{"id":"coffin","x":0,"y":0,"rotation":1},{"id":"fish","x":0,"y":3,"rotation":2},{"id":"glasses","x":0,"y":1,"rotation":0},{"id":"snowglobe","x":4,"y":0,"rotation":0},{"id":"socks","x":2,"y":1,"rotation":1},{"id":"sandals","x":4,"y":2,"rotation":1},{"id":"headphones","x":3,"y":3,"rotation":0}],"solutionCount":1,"par":9},{"id":"rooftops-12","name":"Home before sunrise","tripName":"Home before sunrise","chapterId":"rooftops","theme":"vampire","passenger":"The Moonlight Meowers","destination":"Moonbeam Rooftops","tagline":"One rooftop. Twelve detours. Every cat comes along.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[1,4]],"rules":[{"type":"upright","pieceId":"tent","rotations":[0],"text":"Pocket tent stays upright."},{"type":"edge","pieceId":"plant","edge":"top","text":"Emotional-support plant touches the top edge."}],"solution":[{"id":"fish","x":0,"y":2,"rotation":3},{"id":"camera","x":0,"y":0,"rotation":0},{"id":"tent","x":1,"y":2,"rotation":0},{"id":"mug","x":3,"y":2,"rotation":2},{"id":"coffin","x":5,"y":1,"rotation":0},{"id":"plant","x":2,"y":0,"rotation":1},{"id":"sunscreen","x":2,"y":1,"rotation":1}],"solutionCount":1,"par":9},{"id":"seaside-01","name":"First paws on sand","tripName":"First paws on sand","chapterId":"seaside","theme":"octopus","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"}],"blocked":[[4,0]],"rules":[{"type":"edge","pieceId":"passport","edge":"bottom","text":"Extra-long passport touches the bottom edge."}],"solution":[{"id":"mug","x":0,"y":0,"rotation":0},{"id":"camera","x":2,"y":0,"rotation":0},{"id":"plant","x":3,"y":1,"rotation":2},{"id":"fish","x":1,"y":2,"rotation":0},{"id":"passport","x":1,"y":4,"rotation":1},{"id":"sandals","x":0,"y":3,"rotation":1}],"solutionCount":21,"par":8},{"id":"seaside-02","name":"The towel shuffle","tripName":"The towel shuffle","chapterId":"seaside","theme":"yeti","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"}],"blocked":[[0,1]],"rules":[{"type":"edge","pieceId":"mug","edge":"right","text":"Oversized coffee touches the right edge."}],"solution":[{"id":"headphones","x":0,"y":0,"rotation":3},{"id":"camera","x":0,"y":3,"rotation":0},{"id":"plant","x":2,"y":1,"rotation":0},{"id":"mug","x":2,"y":0,"rotation":1},{"id":"sunscreen","x":4,"y":2,"rotation":0},{"id":"sandals","x":3,"y":3,"rotation":0}],"solutionCount":15,"par":8},{"id":"seaside-03","name":"Shell seekers","tripName":"Shell seekers","chapterId":"seaside","theme":"vampire","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[1,0]],"rules":[{"type":"edge","pieceId":"toothbrush","edge":"top","text":"Fang brush touches the top edge."}],"solution":[{"id":"toothbrush","x":0,"y":0,"rotation":0},{"id":"fish","x":1,"y":0,"rotation":1},{"id":"camera","x":3,"y":0,"rotation":0},{"id":"mug","x":0,"y":3,"rotation":3},{"id":"sunscreen","x":2,"y":3,"rotation":1},{"id":"headphones","x":3,"y":2,"rotation":3}],"solutionCount":13,"par":8},{"id":"seaside-04","name":"Shade for the pack","tripName":"Shade for the pack","chapterId":"seaside","theme":"octopus","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[4,4]],"rules":[{"type":"edge","pieceId":"passport","edge":"right","text":"Extra-long passport touches the right edge."}],"solution":[{"id":"headphones","x":0,"y":0,"rotation":1},{"id":"hat","x":1,"y":1,"rotation":2},{"id":"passport","x":2,"y":0,"rotation":1},{"id":"mug","x":0,"y":3,"rotation":3},{"id":"sandals","x":3,"y":3,"rotation":1},{"id":"book","x":3,"y":1,"rotation":0}],"solutionCount":12,"par":8},{"id":"seaside-05","name":"Picnic at high tide","tripName":"Picnic at high tide","chapterId":"seaside","theme":"yeti","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"}],"blocked":[[2,4]],"rules":[{"type":"upright","pieceId":"headphones","rotations":[0],"text":"Quiet-time headphones stays upright."}],"solution":[{"id":"ice","x":0,"y":3,"rotation":0},{"id":"parasol","x":0,"y":0,"rotation":0},{"id":"headphones","x":0,"y":1,"rotation":0},{"id":"sandals","x":2,"y":3,"rotation":2},{"id":"mug","x":4,"y":2,"rotation":2},{"id":"toothbrush","x":3,"y":0,"rotation":1},{"id":"glasses","x":3,"y":1,"rotation":0}],"solutionCount":11,"par":9},{"id":"seaside-06","name":"The driftwood detour","tripName":"The driftwood detour","chapterId":"seaside","theme":"vampire","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"}],"blocked":[[1,0]],"rules":[{"type":"upright","pieceId":"passport","rotations":[0],"text":"Extra-long passport stays upright."}],"solution":[{"id":"passport","x":0,"y":0,"rotation":0},{"id":"camera","x":0,"y":3,"rotation":0},{"id":"mug","x":1,"y":0,"rotation":2},{"id":"glasses","x":2,"y":2,"rotation":0},{"id":"headphones","x":4,"y":1,"rotation":3},{"id":"hat","x":3,"y":0,"rotation":1},{"id":"coffin","x":2,"y":4,"rotation":1}],"solutionCount":7,"par":9},{"id":"seaside-07","name":"Lighthouse lookout","tripName":"Lighthouse lookout","chapterId":"seaside","theme":"octopus","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[5,1],[5,0],[0,1],[3,0]],"rules":[{"type":"upright","pieceId":"headphones","rotations":[0],"text":"Quiet-time headphones stays upright."}],"solution":[{"id":"sunscreen","x":0,"y":0,"rotation":1},{"id":"socks","x":1,"y":0,"rotation":1},{"id":"toothbrush","x":4,"y":0,"rotation":0},{"id":"coffin","x":3,"y":1,"rotation":0},{"id":"snowglobe","x":4,"y":3,"rotation":0},{"id":"headphones","x":0,"y":2,"rotation":0},{"id":"passport","x":0,"y":4,"rotation":1}],"solutionCount":6,"par":9},{"id":"seaside-08","name":"Sandy shortcuts","tripName":"Sandy shortcuts","chapterId":"seaside","theme":"yeti","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[0,2]],"rules":[{"type":"upright","pieceId":"tent","rotations":[0],"text":"Pocket tent stays upright."}],"solution":[{"id":"mug","x":0,"y":3,"rotation":3},{"id":"glasses","x":0,"y":0,"rotation":1},{"id":"tent","x":1,"y":0,"rotation":0},{"id":"coffin","x":5,"y":0,"rotation":0},{"id":"sunscreen","x":4,"y":0,"rotation":0},{"id":"hat","x":4,"y":2,"rotation":0},{"id":"plant","x":2,"y":1,"rotation":2}],"solutionCount":4,"par":9},{"id":"seaside-09","name":"The crowded boardwalk","tripName":"The crowded boardwalk","chapterId":"seaside","theme":"vampire","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[2,0],[5,4],[4,4],[4,0]],"rules":[{"type":"upright","pieceId":"mug","rotations":[0],"text":"Oversized coffee stays upright."},{"type":"edge","pieceId":"snowglobe","edge":"right","text":"Home in a snow globe touches the right edge."}],"solution":[{"id":"sandals","x":4,"y":0,"rotation":3},{"id":"fish","x":2,"y":0,"rotation":1},{"id":"mug","x":0,"y":0,"rotation":0},{"id":"snowglobe","x":4,"y":2,"rotation":0},{"id":"glasses","x":0,"y":2,"rotation":0},{"id":"hat","x":0,"y":3,"rotation":3},{"id":"sunscreen","x":3,"y":3,"rotation":0}],"solutionCount":3,"par":9},{"id":"seaside-10","name":"Sunset on the pier","tripName":"Sunset on the pier","chapterId":"seaside","theme":"octopus","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[5,1],[5,3],[5,4]],"rules":[{"type":"upright","pieceId":"passport","rotations":[0],"text":"Extra-long passport stays upright."},{"type":"edge","pieceId":"sandals","edge":"right","text":"Floppy sandals touches the right edge."}],"solution":[{"id":"sandals","x":4,"y":0,"rotation":1},{"id":"glasses","x":3,"y":2,"rotation":0},{"id":"plant","x":1,"y":3,"rotation":3},{"id":"fish","x":0,"y":2,"rotation":3},{"id":"toothbrush","x":0,"y":0,"rotation":1},{"id":"passport","x":3,"y":0,"rotation":0},{"id":"book","x":1,"y":1,"rotation":0}],"solutionCount":3,"par":9},{"id":"seaside-11","name":"One last splash","tripName":"One last splash","chapterId":"seaside","theme":"yeti","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"}],"blocked":[[0,2]],"rules":[{"type":"upright","pieceId":"tent","rotations":[0],"text":"Pocket tent stays upright."},{"type":"edge","pieceId":"sandals","edge":"bottom","text":"Floppy sandals touches the bottom edge."}],"solution":[{"id":"coffin","x":0,"y":0,"rotation":1},{"id":"socks","x":0,"y":1,"rotation":0},{"id":"tent","x":2,"y":1,"rotation":0},{"id":"headphones","x":4,"y":0,"rotation":3},{"id":"ice","x":4,"y":3,"rotation":0},{"id":"parasol","x":1,"y":3,"rotation":2},{"id":"sandals","x":0,"y":3,"rotation":1}],"solutionCount":1,"par":9},{"id":"seaside-12","name":"All paws aboard","tripName":"All paws aboard","chapterId":"seaside","theme":"vampire","passenger":"The Salty Paw Society","destination":"Driftwood Bay","tagline":"Leave only pawprints. Take the whole pack.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[4,4],[3,0]],"rules":[{"type":"edge","pieceId":"glasses","edge":"right","text":"Bat-eye shades touches the right edge."},{"type":"edge","pieceId":"ice","edge":"top","text":"Emergency ice touches the top edge."}],"solution":[{"id":"sunscreen","x":5,"y":3,"rotation":0},{"id":"ice","x":4,"y":0,"rotation":0},{"id":"glasses","x":3,"y":2,"rotation":0},{"id":"plant","x":0,"y":3,"rotation":3},{"id":"socks","x":0,"y":1,"rotation":1},{"id":"toothbrush","x":0,"y":0,"rotation":1},{"id":"mug","x":2,"y":1,"rotation":0}],"solutionCount":1,"par":9},{"id":"bazaar-01","name":"Lanterns at six","tripName":"Lanterns at six","chapterId":"bazaar","theme":"octopus","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"}],"blocked":[[0,3],[0,4],[1,4]],"rules":[{"type":"edge","pieceId":"socks","edge":"bottom","text":"Spare woolly socks touches the bottom edge."}],"solution":[{"id":"mug","x":0,"y":0,"rotation":0},{"id":"toothbrush","x":2,"y":0,"rotation":1},{"id":"sandals","x":3,"y":1,"rotation":1},{"id":"sunscreen","x":1,"y":2,"rotation":1},{"id":"parasol","x":3,"y":2,"rotation":1},{"id":"socks","x":1,"y":3,"rotation":0}],"solutionCount":30,"par":8},{"id":"bazaar-02","name":"The curious counter","tripName":"The curious counter","chapterId":"bazaar","theme":"yeti","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"}],"blocked":[[4,4],[0,4],[0,0]],"rules":[{"type":"upright","pieceId":"mug","rotations":[0],"text":"Oversized coffee stays upright."}],"solution":[{"id":"mug","x":3,"y":0,"rotation":0},{"id":"sandals","x":3,"y":2,"rotation":3},{"id":"sunscreen","x":2,"y":4,"rotation":1},{"id":"ice","x":1,"y":0,"rotation":0},{"id":"fish","x":0,"y":1,"rotation":3},{"id":"socks","x":1,"y":2,"rotation":1}],"solutionCount":18,"par":8},{"id":"bazaar-03","name":"Souvenir shuffle","tripName":"Souvenir shuffle","chapterId":"bazaar","theme":"vampire","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[0,4],[1,4],[1,0]],"rules":[{"type":"upright","pieceId":"passport","rotations":[0],"text":"Extra-long passport stays upright."}],"solution":[{"id":"coffin","x":0,"y":0,"rotation":0},{"id":"fish","x":2,"y":0,"rotation":0},{"id":"passport","x":4,"y":1,"rotation":0},{"id":"toothbrush","x":3,"y":2,"rotation":0},{"id":"glasses","x":1,"y":2,"rotation":1},{"id":"sandals","x":1,"y":1,"rotation":2}],"solutionCount":16,"par":8},{"id":"bazaar-04","name":"Tea with a stranger","tripName":"Tea with a stranger","chapterId":"bazaar","theme":"octopus","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"}],"blocked":[[4,0]],"rules":[{"type":"edge","pieceId":"sandals","edge":"right","text":"Floppy sandals touches the right edge."}],"solution":[{"id":"ice","x":0,"y":0,"rotation":0},{"id":"toothbrush","x":2,"y":0,"rotation":0},{"id":"sandals","x":3,"y":0,"rotation":0},{"id":"fish","x":3,"y":2,"rotation":1},{"id":"mug","x":0,"y":2,"rotation":3},{"id":"coffin","x":0,"y":4,"rotation":1}],"solutionCount":14,"par":8},{"id":"bazaar-05","name":"The umbrella stall","tripName":"The umbrella stall","chapterId":"bazaar","theme":"yeti","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"}],"blocked":[[1,4],[0,4],[5,3]],"rules":[{"type":"edge","pieceId":"sunscreen","edge":"top","text":"Moonblock SPF 999 touches the top edge."}],"solution":[{"id":"toothbrush","x":4,"y":2,"rotation":0},{"id":"parasol","x":4,"y":0,"rotation":1},{"id":"coffin","x":1,"y":0,"rotation":1},{"id":"sunscreen","x":0,"y":0,"rotation":0},{"id":"socks","x":0,"y":1,"rotation":1},{"id":"mug","x":1,"y":3,"rotation":1},{"id":"ice","x":2,"y":1,"rotation":0}],"solutionCount":11,"par":9},{"id":"bazaar-06","name":"Bottled moonlight","tripName":"Bottled moonlight","chapterId":"bazaar","theme":"vampire","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"}],"blocked":[[1,4]],"rules":[{"type":"edge","pieceId":"parasol","edge":"top","text":"Tiny parasol touches the top edge."}],"solution":[{"id":"headphones","x":0,"y":3,"rotation":2},{"id":"ice","x":4,"y":3,"rotation":0},{"id":"tent","x":2,"y":2,"rotation":0},{"id":"parasol","x":4,"y":0,"rotation":1},{"id":"coffin","x":1,"y":0,"rotation":1},{"id":"passport","x":0,"y":0,"rotation":0},{"id":"toothbrush","x":1,"y":1,"rotation":1}],"solutionCount":6,"par":9},{"id":"bazaar-07","name":"A very long receipt","tripName":"A very long receipt","chapterId":"bazaar","theme":"octopus","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"}],"blocked":[[5,2],[3,4],[1,0],[0,3]],"rules":[{"type":"edge","pieceId":"plant","edge":"right","text":"Emotional-support plant touches the right edge."}],"solution":[{"id":"passport","x":0,"y":0,"rotation":0},{"id":"hat","x":0,"y":3,"rotation":3},{"id":"parasol","x":1,"y":1,"rotation":3},{"id":"ice","x":4,"y":3,"rotation":0},{"id":"sunscreen","x":3,"y":2,"rotation":0},{"id":"plant","x":2,"y":1,"rotation":1},{"id":"coffin","x":2,"y":0,"rotation":1}],"solutionCount":4,"par":9},{"id":"bazaar-08","name":"The last lucky charm","tripName":"The last lucky charm","chapterId":"bazaar","theme":"yeti","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[5,1],[3,0],[5,3]],"rules":[{"type":"upright","pieceId":"mug","rotations":[0],"text":"Oversized coffee stays upright."}],"solution":[{"id":"headphones","x":4,"y":0,"rotation":1},{"id":"parasol","x":3,"y":3,"rotation":2},{"id":"book","x":0,"y":0,"rotation":0},{"id":"coffin","x":2,"y":0,"rotation":0},{"id":"passport","x":3,"y":1,"rotation":0},{"id":"sunscreen","x":1,"y":4,"rotation":1},{"id":"mug","x":0,"y":2,"rotation":0}],"solutionCount":4,"par":9},{"id":"bazaar-09","name":"Midnight bargain","tripName":"Midnight bargain","chapterId":"bazaar","theme":"vampire","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"}],"blocked":[[0,0],[5,1]],"rules":[{"type":"upright","pieceId":"headphones","rotations":[0],"text":"Quiet-time headphones stays upright."},{"type":"edge","pieceId":"coffin","edge":"left","text":"Travel coffin touches the left edge."}],"solution":[{"id":"sandals","x":4,"y":0,"rotation":1},{"id":"snowglobe","x":4,"y":3,"rotation":0},{"id":"tent","x":3,"y":1,"rotation":3},{"id":"toothbrush","x":1,"y":0,"rotation":1},{"id":"headphones","x":0,"y":1,"rotation":0},{"id":"passport","x":0,"y":3,"rotation":1},{"id":"coffin","x":0,"y":4,"rotation":1}],"solutionCount":3,"par":9},{"id":"bazaar-10","name":"No refunds on chaos","tripName":"No refunds on chaos","chapterId":"bazaar","theme":"octopus","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[5,0]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Emotional-support plant stays upright."},{"type":"edge","pieceId":"mug","edge":"left","text":"Oversized coffee touches the left edge."}],"solution":[{"id":"coffin","x":2,"y":4,"rotation":1},{"id":"sunscreen","x":4,"y":3,"rotation":1},{"id":"glasses","x":4,"y":0,"rotation":1},{"id":"tent","x":2,"y":0,"rotation":2},{"id":"toothbrush","x":1,"y":3,"rotation":1},{"id":"mug","x":0,"y":0,"rotation":1},{"id":"plant","x":0,"y":1,"rotation":0}],"solutionCount":2,"par":9},{"id":"bazaar-11","name":"Closing-time squeeze","tripName":"Closing-time squeeze","chapterId":"bazaar","theme":"yeti","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"}],"blocked":[[5,3]],"rules":[{"type":"edge","pieceId":"ice","edge":"right","text":"Emergency ice touches the right edge."},{"type":"edge","pieceId":"hat","edge":"right","text":"Very important hat touches the right edge."}],"solution":[{"id":"mug","x":3,"y":3,"rotation":3},{"id":"sandals","x":0,"y":3,"rotation":0},{"id":"parasol","x":0,"y":0,"rotation":0},{"id":"glasses","x":0,"y":1,"rotation":1},{"id":"plant","x":2,"y":1,"rotation":0},{"id":"hat","x":3,"y":0,"rotation":1},{"id":"ice","x":4,"y":1,"rotation":0}],"solutionCount":2,"par":9},{"id":"bazaar-12","name":"Treasures tucked away","tripName":"Treasures tucked away","chapterId":"bazaar","theme":"vampire","passenger":"The After-hours Shoppers","destination":"Lantern Lane","tagline":"Everything is a bargain. Space is not.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"}],"blocked":[[4,4],[5,0]],"rules":[{"type":"upright","pieceId":"headphones","rotations":[0],"text":"Quiet-time headphones stays upright."},{"type":"edge","pieceId":"parasol","edge":"top","text":"Tiny parasol touches the top edge."}],"solution":[{"id":"plant","x":4,"y":1,"rotation":2},{"id":"sunscreen","x":0,"y":3,"rotation":0},{"id":"toothbrush","x":1,"y":3,"rotation":3},{"id":"socks","x":0,"y":2,"rotation":0},{"id":"ice","x":0,"y":0,"rotation":0},{"id":"headphones","x":2,"y":1,"rotation":0},{"id":"parasol","x":2,"y":0,"rotation":0}],"solutionCount":1,"par":9},{"id":"aurora-01","name":"Tickets to the north","tripName":"Tickets to the north","chapterId":"aurora","theme":"octopus","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[0,4],[1,0],[2,0],[4,0]],"rules":[{"type":"upright","pieceId":"plant","rotations":[0],"text":"Emotional-support plant stays upright."}],"solution":[{"id":"toothbrush","x":0,"y":0,"rotation":0},{"id":"sandals","x":1,"y":1,"rotation":2},{"id":"passport","x":0,"y":3,"rotation":1},{"id":"coffin","x":1,"y":4,"rotation":1},{"id":"plant","x":3,"y":0,"rotation":0},{"id":"sunscreen","x":4,"y":2,"rotation":0}],"solutionCount":27,"par":8},{"id":"aurora-02","name":"The mitten pocket","tripName":"The mitten pocket","chapterId":"aurora","theme":"yeti","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"}],"blocked":[[0,4]],"rules":[{"type":"upright","pieceId":"tent","rotations":[0],"text":"Pocket tent stays upright."}],"solution":[{"id":"mug","x":3,"y":2,"rotation":2},{"id":"sandals","x":3,"y":0,"rotation":3},{"id":"fish","x":1,"y":0,"rotation":0},{"id":"plant","x":0,"y":0,"rotation":0},{"id":"tent","x":1,"y":2,"rotation":0},{"id":"sunscreen","x":1,"y":3,"rotation":0}],"solutionCount":19,"par":8},{"id":"aurora-03","name":"A seat by the snow","tripName":"A seat by the snow","chapterId":"aurora","theme":"vampire","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"}],"blocked":[[4,4]],"rules":[{"type":"edge","pieceId":"sunscreen","edge":"top","text":"Moonblock SPF 999 touches the top edge."}],"solution":[{"id":"mug","x":0,"y":2,"rotation":2},{"id":"tent","x":0,"y":0,"rotation":3},{"id":"sunscreen","x":1,"y":0,"rotation":1},{"id":"book","x":3,"y":0,"rotation":0},{"id":"headphones","x":2,"y":2,"rotation":2},{"id":"sandals","x":2,"y":3,"rotation":3}],"solutionCount":14,"par":8},{"id":"aurora-04","name":"Cabin companions","tripName":"Cabin companions","chapterId":"aurora","theme":"octopus","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Tricky","width":5,"height":5,"pieces":[{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[4,1]],"rules":[{"type":"upright","pieceId":"passport","rotations":[0],"text":"Extra-long passport stays upright."}],"solution":[{"id":"fish","x":2,"y":0,"rotation":0},{"id":"mug","x":0,"y":0,"rotation":3},{"id":"headphones","x":0,"y":2,"rotation":1},{"id":"glasses","x":1,"y":2,"rotation":0},{"id":"sandals","x":2,"y":3,"rotation":3},{"id":"passport","x":4,"y":2,"rotation":0}],"solutionCount":12,"par":8},{"id":"aurora-05","name":"Frost on the glass","tripName":"Frost on the glass","chapterId":"aurora","theme":"yeti","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"}],"blocked":[[2,4]],"rules":[{"type":"upright","pieceId":"mug","rotations":[0],"text":"Oversized coffee stays upright."}],"solution":[{"id":"book","x":0,"y":3,"rotation":0},{"id":"sandals","x":4,"y":3,"rotation":3},{"id":"mug","x":0,"y":0,"rotation":0},{"id":"hat","x":4,"y":0,"rotation":2},{"id":"plant","x":1,"y":0,"rotation":2},{"id":"parasol","x":3,"y":2,"rotation":3},{"id":"glasses","x":3,"y":0,"rotation":1}],"solutionCount":11,"par":9},{"id":"aurora-06","name":"The blanket puzzle","tripName":"The blanket puzzle","chapterId":"aurora","theme":"vampire","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"}],"blocked":[[1,4],[3,0],[5,1]],"rules":[{"type":"upright","pieceId":"mug","rotations":[0],"text":"Oversized coffee stays upright."}],"solution":[{"id":"sunscreen","x":4,"y":0,"rotation":1},{"id":"hat","x":0,"y":3,"rotation":1},{"id":"parasol","x":2,"y":3,"rotation":2},{"id":"sandals","x":4,"y":3,"rotation":2},{"id":"socks","x":3,"y":1,"rotation":0},{"id":"tent","x":1,"y":0,"rotation":2},{"id":"mug","x":0,"y":0,"rotation":0}],"solutionCount":5,"par":9},{"id":"aurora-07","name":"Polar-night picnic","tripName":"Polar-night picnic","chapterId":"aurora","theme":"octopus","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"}],"blocked":[[5,4],[1,4]],"rules":[{"type":"edge","pieceId":"hat","edge":"top","text":"Very important hat touches the top edge."}],"solution":[{"id":"socks","x":0,"y":2,"rotation":1},{"id":"headphones","x":0,"y":1,"rotation":2},{"id":"coffin","x":0,"y":0,"rotation":1},{"id":"sunscreen","x":2,"y":4,"rotation":1},{"id":"camera","x":3,"y":1,"rotation":0},{"id":"hat","x":4,"y":0,"rotation":2},{"id":"plant","x":2,"y":3,"rotation":1}],"solutionCount":5,"par":9},{"id":"aurora-08","name":"The sleeping-car shuffle","tripName":"The sleeping-car shuffle","chapterId":"aurora","theme":"yeti","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Expert","width":6,"height":5,"pieces":[{"id":"ice","name":"Emergency ice","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e1846c","icon":"ice"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"glasses","name":"Bat-eye shades","cells":[[1,0],[2,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"glasses"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[4,4]],"rules":[{"type":"upright","pieceId":"headphones","rotations":[0],"text":"Quiet-time headphones stays upright."}],"solution":[{"id":"fish","x":4,"y":2,"rotation":1},{"id":"ice","x":4,"y":0,"rotation":0},{"id":"hat","x":2,"y":2,"rotation":1},{"id":"headphones","x":1,"y":3,"rotation":0},{"id":"passport","x":0,"y":2,"rotation":0},{"id":"mug","x":1,"y":0,"rotation":1},{"id":"glasses","x":0,"y":0,"rotation":1}],"solutionCount":4,"par":9},{"id":"aurora-09","name":"Northern lights ahead","tripName":"Northern lights ahead","chapterId":"aurora","theme":"vampire","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"sunscreen","name":"Moonblock SPF 999","cells":[[0,0],[0,1]],"color":"#e8c85e","icon":"sunscreen"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"hat","name":"Very important hat","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#e1846c","icon":"hat"},{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[1,0],[5,3],[3,0]],"rules":[{"type":"edge","pieceId":"camera","edge":"left","text":"Holiday camera touches the left edge."},{"type":"edge","pieceId":"socks","edge":"bottom","text":"Spare woolly socks touches the bottom edge."}],"solution":[{"id":"headphones","x":0,"y":0,"rotation":0},{"id":"socks","x":3,"y":3,"rotation":0},{"id":"hat","x":2,"y":2,"rotation":0},{"id":"mug","x":3,"y":0,"rotation":2},{"id":"passport","x":5,"y":0,"rotation":0},{"id":"sunscreen","x":0,"y":2,"rotation":1},{"id":"camera","x":0,"y":3,"rotation":0}],"solutionCount":2,"par":9},{"id":"aurora-10","name":"The final snowdrift","tripName":"The final snowdrift","chapterId":"aurora","theme":"octopus","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"book","name":"Beach read","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#e8c85e","icon":"book"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"tent","name":"Pocket tent","cells":[[0,0],[1,0],[2,0],[1,1],[1,2]],"color":"#9ab5bd","icon":"tent"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"}],"blocked":[[5,0],[2,4]],"rules":[{"type":"upright","pieceId":"tent","rotations":[0],"text":"Pocket tent stays upright."},{"type":"edge","pieceId":"book","edge":"bottom","text":"Beach read touches the bottom edge."}],"solution":[{"id":"toothbrush","x":0,"y":2,"rotation":0},{"id":"coffin","x":0,"y":0,"rotation":1},{"id":"tent","x":0,"y":1,"rotation":0},{"id":"fish","x":4,"y":0,"rotation":3},{"id":"socks","x":2,"y":1,"rotation":1},{"id":"passport","x":5,"y":2,"rotation":0},{"id":"book","x":3,"y":3,"rotation":0}],"solutionCount":2,"par":9},{"id":"aurora-11","name":"One warm corner","tripName":"One warm corner","chapterId":"aurora","theme":"yeti","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"toothbrush","name":"Fang brush","cells":[[0,0],[0,1],[0,2],[1,2]],"color":"#f2bc82","icon":"toothbrush"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"},{"id":"fish","name":"Fish-shaped snack","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#e8c85e","icon":"fish"},{"id":"plant","name":"Emotional-support plant","cells":[[0,0],[0,1],[1,1],[0,2],[0,3]],"color":"#c1a8c5","icon":"plant"},{"id":"camera","name":"Holiday camera","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"camera"},{"id":"sandals","name":"Floppy sandals","cells":[[0,0],[0,1],[1,1]],"color":"#c1a8c5","icon":"sandals"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"}],"blocked":[[3,0],[0,4]],"rules":[{"type":"edge","pieceId":"sandals","edge":"left","text":"Floppy sandals touches the left edge."},{"type":"edge","pieceId":"plant","edge":"left","text":"Emotional-support plant touches the left edge."}],"solution":[{"id":"toothbrush","x":4,"y":0,"rotation":2},{"id":"headphones","x":3,"y":3,"rotation":0},{"id":"fish","x":3,"y":1,"rotation":1},{"id":"camera","x":1,"y":3,"rotation":0},{"id":"passport","x":0,"y":0,"rotation":1},{"id":"plant","x":0,"y":1,"rotation":1},{"id":"sandals","x":0,"y":2,"rotation":1}],"solutionCount":1,"par":9},{"id":"aurora-12","name":"Dreams at the end of the line","tripName":"Dreams at the end of the line","chapterId":"aurora","theme":"vampire","passenger":"The Northern Nap Club","destination":"Aurora Station","tagline":"The colder the night, the closer the cuddle.","revision":1,"difficulty":"Master","width":6,"height":5,"pieces":[{"id":"snowglobe","name":"Home in a snow globe","cells":[[0,0],[1,0],[0,1],[1,1]],"color":"#9ab5bd","icon":"snowglobe"},{"id":"passport","name":"Extra-long passport","cells":[[0,0],[0,1],[0,2]],"color":"#f2bc82","icon":"passport"},{"id":"socks","name":"Spare woolly socks","cells":[[0,0],[1,0],[1,1],[2,1]],"color":"#b6c9a5","icon":"socks"},{"id":"mug","name":"Oversized coffee","cells":[[0,0],[1,0],[0,1],[1,1],[0,2]],"color":"#b6c9a5","icon":"mug"},{"id":"parasol","name":"Tiny parasol","cells":[[0,0],[1,0],[2,0],[1,1]],"color":"#b6c9a5","icon":"parasol"},{"id":"coffin","name":"Travel coffin","cells":[[0,0],[0,1],[0,2],[0,3]],"color":"#e1846c","icon":"coffin"},{"id":"headphones","name":"Quiet-time headphones","cells":[[0,0],[2,0],[0,1],[1,1],[2,1]],"color":"#f2bc82","icon":"headphones"}],"blocked":[[2,4]],"rules":[{"type":"edge","pieceId":"snowglobe","edge":"left","text":"Home in a snow globe touches the left edge."},{"type":"edge","pieceId":"socks","edge":"top","text":"Spare woolly socks touches the top edge."}],"solution":[{"id":"snowglobe","x":0,"y":3,"rotation":0},{"id":"passport","x":3,"y":4,"rotation":1},{"id":"mug","x":0,"y":0,"rotation":0},{"id":"parasol","x":1,"y":1,"rotation":2},{"id":"coffin","x":2,"y":3,"rotation":1},{"id":"socks","x":2,"y":0,"rotation":0},{"id":"headphones","x":4,"y":0,"rotation":3}],"solutionCount":1,"par":9}]);

  // Calendar is UTC. Epoch 2026-10-26 starts a fixed, disclosed 28-day rotation.
  // Dates before the epoch wrap the same way; links always reconstruct that date.
  // No network request, live random generator, account, or clock mutation is needed.
  function daily(dateKey) {
    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
    var date = new Date(dateKey+'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==dateKey) return null;
    var day = Math.floor((date.getTime()-Date.UTC(2026,9,26))/86400000);
    var index = ((day % dailyData.length) + dailyData.length) % dailyData.length;
    var d = dailyData[index], themes=['vampire','octopus','yeti'], passengers=['Vlad','Otto','Yuki'];
    // Copy mutable arrays: a caller cannot change another date's template.
    return {id:'daily-'+dateKey,dateKey:dateKey,isDaily:true,name:'Daily departure',passenger:passengers[index%3],destination:'Mystery Gate '+String(index+1).padStart(2,'0'),tagline:d.rules.length===2?'One date. One suitcase. Two unusual requests.':'A fresh packing request for today.',theme:themes[index%3],width:d.width,height:d.height,difficulty:d.items.length===7?'Master':'Expert',chapter:'Daily departure',revision:2,pieces:piecesFor(d.items),blocked:d.blocked.map(function(c){return c.slice();}),rules:d.rules.map(function(r){return Object.assign({},r,r.rotations?{rotations:r.rotations.slice()}:{});}),solution:d.solution.map(function(p){return Object.assign({},p);}),solutionCount:d.solutionCount,par:d.items.length+2};
  }
  return {levels:levels,extraChapters:extraChapters,library:library,normalize:normalize,rotate:rotate,canPlace:canPlace,placementError:placementError,findSolution:findSolution,daily:daily,dailyPoolSize:dailyData.length,dailyCycleDays:dailyData.length};
});
