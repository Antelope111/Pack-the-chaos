(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const P = window.PackLevels, A = window.PackArt, C = window.PackCharacters, S = window.PackProgress, V = window.PackVictory;
  const chapters = [
    {theme:'cats',name:'The great cat move',description:'Long cats. Sleepy cats. A box everyone insists is theirs.',cast:'THE WHISKER CREW',passenger:'The Whisker Crew',destination:'Sunbeam House',tagline:'We packed the cats. The cats packed their opinions.'},
    {theme:'dogs',name:'Camp good dog',description:'Stretch out, curl up, squeeze in. The whole pack is coming.',cast:'THE WAG CLUB',passenger:'The Wag Club',destination:'Pinecone Camp',tagline:'The whole pack. Not a single light packer.'},
    {theme:'odd',name:'The midnight express',description:'Peculiar passengers. Impossible luggage. One last departure.',cast:'THE NIGHT TRAVELLERS'}
  ].concat(P.extraChapters.map(c=>({...c,theme:c.id,artTheme:c.id==='bazaar'?'cats':c.artTheme,cast:c.passenger.toUpperCase()})));
  chapters.forEach((chapter,index)=>{chapter.index=index;chapter.total=P.levels.filter(l=>l.chapterId===chapter.theme).length;});
  function themed(raw,index,theme) {
    const chapter=chapters.find(c=>c.theme===(theme||raw.chapterId))||chapters[2];
    const chapterPosition=raw.isDaily?-1:P.levels.filter(l=>l.chapterId===chapter.theme).findIndex(l=>l.id===raw.id);
    const result={...raw,artTheme:chapter.artTheme||chapter.theme,chapterInfo:chapter,chapterPosition,name:raw.isDaily?'Daily departure':raw.tripName||raw.name};
    if(chapter.passenger)Object.assign(result,{passenger:chapter.passenger,destination:chapter.destination,tagline:chapter.tagline});
    result.rules=(raw.rules||[]).map(rule=>({...rule,text:`${nameFor(rule.pieceId,result)} ${rule.type==='upright'?'stays upright ↑':`touches the ${rule.edge} edge`}.`}));
    return result;
  }
  function nameFor(id,trip){return trip.artTheme!=='odd'&&C?C.name(id,trip.artTheme,trip.chapterInfo.theme):A.displayNames?.[id]||P.library.find(p=>p.id===id)?.name||id;}
  const levels = P.levels.map((l,i)=>themed(l,i));
  const chapterLevels = chapter=>levels.filter(l=>l.chapterInfo===chapter);
  function dailyLevel(date){const raw=P.daily(date);return raw?themed(raw,0,chapters[((Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%3)+3)%3].theme):null;}
  const board = $('board'), tray = $('tray');
  const saved = S.load(levels), draftKey='pack-the-chaos-draft-v2';
  const nameKey='pack-the-chaos-player-name';let playerName='',settlement=null;
  try{playerName=V.cleanName(localStorage.getItem(nameKey));}catch(_){}
  let pendingDraft=null;try{pendingDraft=JSON.parse(localStorage.getItem(draftKey));}catch(_){}
  let levelIndex = 0, level, placements = [], suspended = null, rotations = {}, selected = null, history = [], moves = 0, hints = 0;
  let drag = null, cursor = { x:0, y:0 }, keyboardMode = false, audioContext, busy = false, closeTimer;
  let suppressClick = false, previewCandidate = null, hintedCandidate=null, runFinished=false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const flights = new Set();
  const softItems = new Set(['glasses','socks','tent','hat','sandals']);
  const itemName = id => nameFor(id,level);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pieceById = id => level.pieces.find(p => p.id === id);
  const clonePlacements = list => list.map(p => ({...p}));
  const getPlaced = id => placements.find(p => p.id === id);
  const inSuitcase = id => !!getPlaced(id) || !!(suspended && suspended.id === id);
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < level.width && y < level.height; }
  function worldCells(pl) { return P.rotate(pieceById(pl.id).cells, pl.rotation || 0).map(([x, y]) => [x + pl.x, y + pl.y]); }
  function occupiedCells(excludeId) {
    const taken = new Set((level.blocked || []).map(([x, y]) => x + ',' + y));
    for (const pl of placements) if (pl.id !== excludeId) for (const [x, y] of worldCells(pl)) taken.add(x + ',' + y);
    if (suspended && suspended.id !== excludeId) for (const [x, y] of worldCells(suspended)) taken.add(x + ',' + y);
    return taken;
  }
  function conflictLocalCells(pl) {
    const taken = occupiedCells(pl.id), local = [];
    for (const [x, y] of worldCells(pl)) if (!inBounds(x, y) || taken.has(x + ',' + y)) local.push([x - pl.x, y - pl.y]);
    return local;
  }
  function hitsSuspended(candidate) {
    if (!suspended || suspended.id === candidate.id) return false;
    const taken = new Set(worldCells(suspended).map(([x, y]) => x + ',' + y));
    return worldCells(candidate).some(([x, y]) => taken.has(x + ',' + y));
  }
  function canDrop(candidate) { return !!candidate && !P.placementError(level, placements, candidate) && !hitsSuspended(candidate); }
  function dropError(candidate) { return P.placementError(level, placements, candidate) || (hitsSuspended(candidate) ? 'Another item is already in that space.' : null); }
  // Keep a turn that would stick out of the case shifted just far enough to stay inside.
  function poseAfterTurn(pl, rotation) {
    const s = shape(pl.id, rotation), raw = {id: pl.id, x: pl.x, y: pl.y, rotation};
    if (worldCells(raw).every(([x, y]) => inBounds(x, y))) return raw;
    return {id: pl.id, x: s.w <= level.width ? Math.min(Math.max(0, pl.x), level.width - s.w) : 0, y: s.h <= level.height ? Math.min(Math.max(0, pl.y), level.height - s.h) : 0, rotation};
  }
  function persist() { S.save(saved); }
  function saveDraft(){try{if(runFinished){localStorage.removeItem(draftKey);return;}localStorage.setItem(draftKey,JSON.stringify({id:level.id,revision:level.revision,placements,rotations,moves,hints,suspended}));}catch(_){} }
  function restoreDraft(draft){
    if(!draft||draft.id!==level.id||draft.revision!==level.revision||!Array.isArray(draft.placements)||!Number.isSafeInteger(draft.moves)||draft.moves<0||!Number.isSafeInteger(draft.hints)||draft.hints<0)return false;
    const restored=[];for(const pl of draft.placements){if(restored.some(p=>p.id===pl.id)||!P.canPlace(level,restored,pl))return false;restored.push({...pl});}
    let parked=null;
    if(draft.suspended){
      const s=draft.suspended;
      if(!s||typeof s.id!=='string'||restored.some(p=>p.id===s.id)||!level.pieces.some(p=>p.id===s.id)||!Number.isInteger(s.x)||!Number.isInteger(s.y)||!Number.isInteger(s.rotation))return false;
      parked={id:s.id,x:s.x,y:s.y,rotation:((s.rotation%4)+4)%4};
      if(P.canPlace(level,restored,parked)){restored.push(parked);parked=null;}
    }
    placements=restored;suspended=parked;moves=draft.moves;hints=draft.hints;
    for(const p of level.pieces){const r=draft.rotations?.[p.id];rotations[p.id]=Number.isInteger(r)&&r>=0&&r<4?r:0;}
    for(const pl of placements)rotations[pl.id]=pl.rotation;
    if(suspended)rotations[suspended.id]=suspended.rotation;
    render();say('Welcome back. Your half-packed trip was kept safe.');return true;
  }
  function clearHint(){hintedCandidate=null;$('hint').innerHTML='<span>✧</span> Hint';}
  function portraitSVG(){return level.artTheme!=='odd'&&C?C.portrait(level.artTheme,level.chapterInfo.theme):A.portrait(level.theme);}
  const starsText = n=>'★'.repeat(n)+'☆'.repeat(3-n);
  function pocketSVG(){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true"><rect x="8" y="8" width="84" height="84" rx="14" fill="#ba7964" stroke="#684d40" stroke-width="3"/><rect x="15" y="15" width="70" height="70" rx="10" fill="none" stroke="#f4c7a4" stroke-width="2" stroke-dasharray="4 4"/><path d="M15 22L50 48 85 22" fill="#ce9077" stroke="#684d40" stroke-width="3"/><path d="M42 48v-7a8 8 0 0 1 16 0v7" fill="none" stroke="#f8e5b5" stroke-width="5"/><rect x="36" y="46" width="28" height="23" rx="5" fill="#ebcf81" stroke="#684d40" stroke-width="2"/><path d="M50 54v7" stroke="#684d40" stroke-width="3" stroke-linecap="round"/><text x="50" y="82" text-anchor="middle" fill="#fff2d8" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1">FIXED</text></svg>';}
  let pocketTipTimer;
  function hidePocketTip(){clearTimeout(pocketTipTimer);$('pocket-tip').hidden=true;document.querySelectorAll('.fixed-pocket.is-explained').forEach(el=>el.classList.remove('is-explained'));}
  function explainPocket(pocket){
    if(busy)return;
    hidePocketTip();hidePreview();pocket.classList.add('is-explained');
    const tip=$('pocket-tip'),x=Number(pocket.dataset.x),y=Number(pocket.dataset.y),below=y<level.height/2;
    tip.style.left=`clamp(105px,${(x+.5)/level.width*100}%,calc(100% - 105px))`;
    tip.style.top=`${(below?y+1:y)/level.height*100}%`;tip.dataset.side=below?'below':'above';tip.hidden=false;
    say('Fixed pocket — sewn into the case. It cannot move; pack your crew around it.');
    pocketTipTimer=setTimeout(hidePocketTip,4500);
  }
  function say(text, error = false) { $('feedback').textContent = text; $('feedback').classList.toggle('error', error); }
  function shape(id, rotation = rotations[id] || 0) {
    const cells = P.rotate(pieceById(id).cells, rotation);
    return {cells, w:Math.max(...cells.map(c=>c[0]))+1, h:Math.max(...cells.map(c=>c[1]))+1};
  }
  function pieceSVG(id, rotation = rotations[id] || 0) { return level.artTheme!=='odd'&&C?C.piece(id,rotation,level.artTheme,level.chapterInfo.theme):A.piece(id, rotation); }
  function sizedSVG(svg,x,y,width,height) {
    const end=svg.indexOf('>');
    return svg.slice(0,end).replace(/\s(?:x|y|width|height)="[^"]*"/g,'').replace('<svg ',`<svg x="${x}" y="${y}" width="${width}" height="${height}" `)+svg.slice(end);
  }
  function footprintSVG(id, rotation = rotations[id] || 0) {
    const s=shape(id,rotation);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w*100} ${s.h*100}" aria-hidden="true">${s.cells.map(([x,y])=>`<rect x="${x*100+4}" y="${y*100+4}" width="92" height="92" rx="10" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="2" stroke-dasharray="6 7"/>`).join('')}</svg>`;
  }
  function previewSVG(candidate, conflicts) {
    const s=shape(candidate.id,candidate.rotation), bad=new Set(conflicts.map(c=>c.join(',')));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w*100} ${s.h*100}" aria-hidden="true">${s.cells.map(([x,y])=>{const overlap=bad.has(x+','+y);return `<rect x="${x*100+4}" y="${y*100+4}" width="92" height="92" rx="10" fill="${overlap?'#c44b3c':'#67806a'}" fill-opacity="${overlap?'.45':'.16'}" stroke="${overlap?'#9d3428':'#67806a'}" stroke-width="3"${overlap?'':' stroke-dasharray="6 7"'}/>`;}).join('')}</svg>`;
  }
  function overlapMarkup(pl) {
    if(!suspended||suspended.id!==pl.id)return '';
    const s=shape(pl.id,pl.rotation), cells=conflictLocalCells(pl);
    if(!cells.length)return '';
    return `<span class="overlap-mask" aria-hidden="true">${cells.map(([x,y])=>`<i style="left:${x/s.w*100}%;top:${y/s.h*100}%;width:${100/s.w}%;height:${100/s.h}%"></i>`).join('')}</span>`;
  }
  function artRect(element) {
    const svg=element?.querySelector('.piece-art > svg') || element?.querySelector('svg');
    if(!svg)return null;
    const r=svg.getBoundingClientRect(),v=svg.viewBox.baseVal,scale=Math.min(svg.clientWidth/v.width,svg.clientHeight/v.height);
    const width=v.width*scale,height=v.height*scale;
    return {left:r.left+(r.width-width)/2,top:r.top+(r.height-height)/2,width,height};
  }
  function clearFlights() { for(const flight of [...flights])flight.finish(); }
  function flyPiece(id, rotation, from, target, turn=false) {
    if(!from || !target || reducedMotion.matches)return;
    const to=artRect(target);if(!to || !from.width || !from.height)return;
    // Hints may also turn an item; keep the flight artwork at its intrinsic ratio.
    if(!turn){const fit=Math.min(from.width/to.width,from.height/to.height),width=to.width*fit,height=to.height*fit;from={left:from.left+(from.width-width)/2,top:from.top+(from.height-height)/2,width,height};}
    const ghost=document.createElement('div');ghost.className='object-flight';ghost.innerHTML=pieceSVG(id,rotation);
    Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});
    document.body.appendChild(ghost);target.classList.add('in-flight');
    const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
    const scale=to.width/(turn?from.height:from.width),angle=turn?90:0;
    const end=`translate(${dx}px,${dy}px) rotate(${angle}deg) scale(${scale})`;
    const frames=turn?[{transform:'none'},{transform:`translate(${dx}px,${dy}px) rotate(96deg) scale(${scale})`,offset:.8},{transform:end}]:[{transform:'translateY(-4px) rotate(-2deg)',opacity:.97},{transform:end,opacity:1}];
    const anim=ghost.animate(frames,{duration:turn?270:280,easing:'cubic-bezier(.2,.75,.3,1)',fill:'forwards'});
    const flight={finish(){anim.cancel();ghost.remove();target.classList.remove('in-flight');flights.delete(flight);}};
    flights.add(flight);anim.finished.then(()=>{flight.finish();target.classList.add(turn?'just-turned':'just-placed');},()=>{});
  }
  function shapeClip(id, rotation) {
    const s=shape(id,rotation),occupied=new Set(s.cells.map(c=>c.join(','))),edges=new Map();
    function edge(x,y,nx,ny){edges.set(`${x},${y}`,[nx,ny]);}
    for(const [x,y] of s.cells){
      if(!occupied.has(`${x},${y-1}`))edge(x,y,x+1,y);
      if(!occupied.has(`${x+1},${y}`))edge(x+1,y,x+1,y+1);
      if(!occupied.has(`${x},${y+1}`))edge(x+1,y+1,x,y+1);
      if(!occupied.has(`${x-1},${y}`))edge(x,y+1,x,y);
    }
    const start=edges.keys().next().value,points=[];let current=start;
    do{const [x,y]=current.split(',').map(Number);points.push(`${x/s.w*100}% ${y/s.h*100}%`);const next=edges.get(current);if(!next)break;current=next.join(',');}while(current!==start&&points.length<=40);
    return `polygon(${points.join(',')})`;
  }
  function snapshot() { clearHint();runFinished=false;history.push({placements:clonePlacements(placements), rotations:{...rotations}, suspended:suspended?{...suspended}:null}); }
  function updateOptions() {
    $('trip').innerHTML=chapters.map((c,ci)=>`<optgroup label="${ci+1}. ${esc(c.name)}">${chapterLevels(c).map(l=>`<option value="${levels.indexOf(l)}">${S.getRecord(saved,l)?'✓ ':''}${String(levels.indexOf(l)+1).padStart(2,'0')} · ${esc(l.name)}</option>`).join('')}</optgroup>`).join('')+(level.isDaily?`<option value="daily">Daily · ${level.dateKey}</option>`:'');
    $('journey-count').textContent=`${levels.length} trips`;$('destination-total').textContent=`${levels.length} destinations · a daily departure`;
    $('trip').value=level.isDaily?'daily':String(levelIndex);
    const stats=S.summary(saved,levels);$('collection').textContent=`${stats.completed} of ${levels.length} trips packed · ${stats.stars} star${stats.stars===1?'':'s'}`;
    $('stamp-total').textContent=`${stats.completed} / ${levels.length}`;
    $('journey-mode').setAttribute('aria-pressed',String(!level.isDaily));$('daily-mode').setAttribute('aria-pressed',String(!!level.isDaily));
    updateDailyLabel();
  }
  function updateDailyLabel(){const today=S.todayKey(),done=S.getRecord(saved,dailyLevel(today));$('daily-badge').textContent=done?'✓ PACKED':'TODAY';$('flight-note').textContent=level.isDaily?`${level.dateKey} · Same puzzle for everyone · New departure at 00:00 UTC`:`${chapters.length} chapters. ${levels.length} trips. A little less room every time.`;}
  function loadLevel(index, updateURL = true, dayKey = null) {
    cancelDrag(); clearTimeout(closeTimer); busy=false;
    settlement=null;
    levelIndex = Math.max(0, Math.min(levels.length-1,index)); level=dayKey?dailyLevel(dayKey):levels[levelIndex];if(!level)level=levels[levelIndex];if(level.isDaily)levelIndex=-1;
    placements=[];suspended=null;rotations=Object.fromEntries(level.pieces.map(p=>[p.id,0]));selected=null;history=[];moves=0;hints=0;
    keyboardMode=false;cursor={x:0,y:0};previewCandidate=null;clearHint();runFinished=false;
    $('win-dialog').close();$('passport-dialog').close(); $('suitcase').classList.remove('zipping');
    $('portrait').innerHTML=portraitSVG();
    $('passenger-name').textContent=level.passenger;
    $('tagline').textContent=level.tagline;
    $('destination').textContent=level.destination;
    $('gate').textContent=level.isDaily?'D':String(levelIndex+1).padStart(2,'0');
    $('trip-label').textContent=`${level.isDaily?'DAILY '+level.dateKey:'TRIP '+String(levelIndex+1).padStart(2,'0')} / ${level.difficulty.toUpperCase()}`;
    $('photo-label').textContent={cats:'IF I FITS, WE ALL SITS.',dogs:'GOOD DOGS. BIG ADVENTURES.',odd:{vampire:'SUNSCREEN IS NOT OPTIONAL',octopus:'EIGHT ARMS. ONE CARRY-ON.',yeti:'WARM WEATHER. COLD FEET.'}[level.theme]}[level.artTheme];
    document.body.dataset.chapter=level.artTheme;document.body.dataset.journey=level.chapterInfo.theme;
    $('chapter-number').textContent=level.isDaily?'D':String(level.chapterInfo.index+1).padStart(2,'0');$('chapter-number').setAttribute('aria-label',level.isDaily?'Daily special':`Chapter ${level.chapterInfo.index+1} of ${chapters.length}`);
    $('chapter-title').textContent=level.chapterInfo.name;$('chapter-description').textContent=level.chapterInfo.description;$('chapter-characters').textContent=level.isDaily?level.chapterInfo.cast:`TRIP ${level.chapterPosition+1} / ${level.chapterInfo.total}`;
    $('tray-subtitle').textContent=level.artTheme==='cats'?'*each cat has a preferred shape':level.artTheme==='dogs'?'*bring the entire pack':'*according to a monster';
    document.querySelector('.aside-note').innerHTML=level.artTheme==='odd'?'Even monsters need<br>a little time off.':'A little room.<br>A lot of personality.';
    board.style.aspectRatio=`${level.width}/${level.height}`;
    $('grid-lines').style.gridTemplateColumns=`repeat(${level.width},1fr)`;
    $('grid-lines').style.gridTemplateRows=`repeat(${level.height},1fr)`;
    $('grid-lines').innerHTML='<i></i>'.repeat(level.width*level.height);
    $('fixed-pockets').innerHTML=(level.blocked||[]).map(([x,y])=>`<button type="button" class="fixed-pocket" data-x="${x}" data-y="${y}" aria-label="Fixed pocket at column ${x+1}, row ${y+1}. Cannot be moved. Show packing tip." title="Fixed pocket · cannot move" style="left:${x/level.width*100}%;top:${y/level.height*100}%;width:${100/level.width}%;height:${100/level.height}%">${pocketSVG()}</button>`).join('');
    saved.lastTripId=level.id;persist();updateOptions();render();say(levelIndex===0?`Start with ${itemName('coffin')}. Drag in, or tap to place.`:level.blocked.length?'The locked pockets stay put. Pack your crew around them.':level.rules.length?'Your crew has a few special requests.':'Every peculiar shape fits. Find a place for the whole crew.');
    if(updateURL)try { window.history.replaceState(null,'',challengeURL()); } catch (_) {}
  }
  function render() {
    clearFlights();hidePocketTip();
    const shown=placements.slice();if(suspended)shown.push(suspended);
    $('board-pieces').innerHTML=shown.map(pl=>{
      const s=shape(pl.id,pl.rotation),p=pieceById(pl.id),parked=!!(suspended&&suspended.id===pl.id),clashes=parked?conflictLocalCells(pl).length:0;
      return `<button class="piece${selected===pl.id?' selected':''}${parked?' illegal':''}${parked&&!clashes?' rule-blocked':''}" data-id="${pl.id}" data-source="board" data-material="${level.artTheme!=='odd'||softItems.has(pl.id)?'soft':'solid'}" aria-invalid="${parked?'true':'false'}" aria-label="${esc(itemName(p.id))}, ${parked?(clashes?'turned in the suitcase with overlapping red squares. Move it clear.':'turned in the suitcase, but this spot is not allowed yet. Move it.'):`packed at column ${pl.x+1}, row ${pl.y+1}. Select to move.`}" aria-pressed="${selected===pl.id}" style="left:${pl.x/level.width*100}%;top:${pl.y/level.height*100}%;width:${s.w/level.width*100}%;height:${s.h/level.height*100}%;clip-path:${shapeClip(pl.id,pl.rotation)}"><span class="piece-footprint">${footprintSVG(pl.id,pl.rotation)}</span><span class="piece-art">${pieceSVG(pl.id,pl.rotation)}</span>${overlapMarkup(pl)}</button>`;
    }).join('');
    const remaining=level.pieces.filter(p=>!inSuitcase(p.id));
    tray.innerHTML=remaining.length?remaining.map(p=>`<button class="tray-item${selected===p.id?' selected':''}" data-id="${p.id}" data-source="tray" aria-label="${esc(itemName(p.id))}, ${p.cells.length} squares. Select to pack." aria-pressed="${selected===p.id}" title="${esc(itemName(p.id))}"><span class="piece-art">${pieceSVG(p.id,rotations[p.id])}</span><span class="item-label">${esc(itemName(p.id))}</span></button>`).join(''):`<div class="tray-empty"><span class="empty-doodle">✧</span><div><strong>${suspended?'Almost.':'That\'s everyone.'}</strong><p>${suspended?'Red squares still overlap.<br>Slide that piece clear.':'The whole crew is ready.<br>Time to zip it up!'}</p></div></div>`;
    $('packed').textContent=`${placements.length} / ${level.pieces.length}`;
    $('remaining').textContent=suspended&&!remaining.length?'OVERLAP':remaining.length?`${remaining.length} LEFT`:'ALL IN!';
    $('moves').textContent=String(moves).padStart(2,'0');
    $('meter').style.width=placements.reduce((n,pl)=>n+pieceById(pl.id).cells.length,0)/(level.width*level.height-(level.blocked||[]).length)*100+'%';
    $('mission').innerHTML=(level.rules||[]).map(rule=>`<span class="rule${getPlaced(rule.pieceId)?' satisfied':''}">${getPlaced(rule.pieceId)?'✓':'○'} ${esc(rule.text)}</span>`).join('')+((level.blocked||[]).length?`<span class="mission-note">${level.blocked.length} fixed pocket${level.blocked.length>1?'s':''} · cannot move · pack around ${level.blocked.length>1?'them':'it'}</span>`:'');
    const best=S.getRecord(saved,level);$('mastery').innerHTML=`<span class="stars">${best?starsText(best.stars):'☆☆☆'}</span><small>${hints?'Hint used · finish for your stamp':moves>level.par?'No hints → two stars':`Three stars: no hints + ≤${level.par} moves`}${best?` · best ${best.bestMoves===null?'—':best.bestMoves}`:''}</small>`;
    $('zip').disabled=remaining.length>0 || !!suspended || busy;
    $('undo').disabled=!history.length || busy;
    $('hint').disabled=(remaining.length===0 && !suspended) || busy;
    $('rotate').disabled=!selected || busy;
    $('unpack').hidden=!selected || !inSuitcase(selected);
    $('selection-name').textContent=selected?itemName(selected):'Pick something up';
    $('case-status').textContent=suspended?'OVERLAPS — SLIDE TO FIT':remaining.length?'PACKING IN PROGRESS':'READY TO ZIP';
    board.classList.toggle('has-selection',!!selected);
    hidePreview(); updateCursor();saveDraft();
  }
  function updateSelection() {
    board.classList.toggle('has-selection',!!selected);
    document.querySelectorAll('[data-id]').forEach(el=>{el.classList.toggle('selected',el.dataset.id===selected);el.setAttribute('aria-pressed',el.dataset.id===selected?'true':'false');});
    $('selection-name').textContent=selected?itemName(selected):'Pick something up';
    $('rotate').disabled=!selected || busy;
    $('unpack').hidden=!selected || !inSuitcase(selected);
  }
  function select(id, focusBoard = false) {
    if(busy)return;
    clearHint();hidePocketTip();
    selected=id; const placed=getPlaced(id)||(suspended&&suspended.id===id?suspended:null); if(placed) {rotations[id]=placed.rotation;cursor={x:placed.x,y:placed.y};} else cursor={x:0,y:0};
    updateSelection();hidePreview();
    const request=level.rules.find(r=>r.pieceId===id);
    if(suspended&&suspended.id===id)say(conflictLocalCells(suspended).length?`Red squares on ${itemName(id)} overlap. Slide it clear to lock this turn.`:`${dropError(suspended)||'Slide it to a spot that meets its request.'}`,true);
    else say(request?request.text:`${itemName(id)}: tap a square to place, or rotate for a better fit.`);
    if(focusBoard){keyboardMode=true;board.focus();showPreview({id,x:cursor.x,y:cursor.y,rotation:rotations[id]});updateCursor();}
  }
  function updateCursor() {
    const el=$('cursor');el.style.display=keyboardMode&&selected?'block':'none';el.style.left=cursor.x/level.width*100+'%';el.style.top=cursor.y/level.height*100+'%';el.style.width=100/level.width+'%';el.style.height=100/level.height+'%';
  }
  function showPreview(candidate) {
    if(!candidate || busy)return;
    previewCandidate=candidate;
    const s=shape(candidate.id,candidate.rotation),el=$('preview'),conflicts=conflictLocalCells(candidate),ok=canDrop(candidate);
    el.innerHTML=ok?footprintSVG(candidate.id,candidate.rotation):previewSVG(candidate,conflicts);
    el.style.left=candidate.x/level.width*100+'%';el.style.top=candidate.y/level.height*100+'%';el.style.width=s.w/level.width*100+'%';el.style.height=s.h/level.height*100+'%';
    el.className='placement-preview '+(ok?'valid':conflicts.length?'overlap':'invalid');
  }
  function hidePreview(){ $('preview').className='placement-preview';previewCandidate=null; }
  function place(candidate, fromHint = false, dropRect = null) {
    if(busy||!candidate)return false;
    const next={id:candidate.id,x:candidate.x,y:candidate.y,rotation:((candidate.rotation||0)%4+4)%4};
    if(!canDrop(next)){
      // A turn that already overlaps can be slid around; it stays illegal until the red squares clear.
      if(suspended&&suspended.id===next.id&&worldCells(next).every(([x,y])=>inBounds(x,y))){
        suspended=next;rotations[next.id]=next.rotation;selected=next.id;cursor={x:next.x,y:next.y};
        render();updateSelection();
        say(conflictLocalCells(next).length?`${itemName(next.id)} still overlaps. The red squares have to clear.`:(dropError(next)||'That spot is not available yet.'),true);
        sound('no');return false;
      }
      say(dropError(next),true);sound('no');board.classList.remove('shake');void board.offsetWidth;board.classList.add('shake');return false;
    }
    const current=getPlaced(next.id);
    if(current && current.x===next.x&&current.y===next.y&&current.rotation===next.rotation) {selected=next.id;updateSelection();return true;}
    const from=dropRect || artRect(document.querySelector(`[data-id="${next.id}"]`));
    snapshot();if(suspended&&suspended.id===next.id)suspended=null;
    placements=placements.filter(pl=>pl.id!==next.id);placements.push(next);rotations[next.id]=next.rotation;moves++;
    selected=null;keyboardMode=false;render();
    const placedEl=$('board-pieces').querySelector(`[data-id="${next.id}"]`);if(placedEl){if(from&&!reducedMotion.matches)flyPiece(next.id,next.rotation,from,placedEl);else placedEl.classList.add('just-placed');}
    const photo=document.querySelector('.photo');photo.classList.remove('pleased');void photo.offsetWidth;photo.classList.add('pleased');
    sound('drop');
    say(placements.length===level.pieces.length?'A perfect fit. Zip it up and let the holiday begin!':fromHint?`${itemName(next.id)} found its spot. Your turn!`:["A very good fit.","Making room for the weird stuff.","One step closer to vacation.","Looking rather well packed."][moves%4]);
    return true;
  }
  function rotateSelected() {
    if(!selected||busy)return;
    cancelDrag();
    const id=selected,previous=rotations[id],next=(previous+1)%4,pl=getPlaced(id)||(suspended&&suspended.id===id?suspended:null);
    const rule=level.rules.find(r=>r.pieceId===id&&r.type==='upright');if(rule&&!rule.rotations.includes(next)){say(rule.text,true);sound('no');return;}clearHint();
    const from=artRect(document.querySelector(`[data-id="${id}"]`));
    if(!pl){
      rotations[id]=next;render();selected=id;updateSelection();sound('turn');
      flyPiece(id,previous,from,document.querySelector(`[data-id="${id}"]`),true);
      say(`${itemName(id)}, turned. Find its spot.`);
      if(keyboardMode){updateCursor();showPreview({id,x:cursor.x,y:cursor.y,rotation:next});}
      return;
    }
    const candidate=poseAfterTurn(pl,next),legal=canDrop(candidate),wasPacked=!!getPlaced(id);
    if(legal||wasPacked)snapshot();
    placements=placements.filter(p=>p.id!==id);rotations[id]=next;
    if(legal){if(suspended&&suspended.id===id)suspended=null;placements.push(candidate);moves++;}
    else suspended=candidate;
    cursor={x:candidate.x,y:candidate.y};
    render();selected=id;updateSelection();sound('turn');
    flyPiece(id,previous,from,document.querySelector(`[data-id="${id}"]`),true);
    const clashes=legal?[]:conflictLocalCells(candidate);
    say(legal?`${itemName(id)}, turned. Find its spot.`:clashes.length?`${itemName(id)} turned. Red squares overlap — slide it clear to make this turn count.`:`${dropError(candidate)||itemName(id)+' needs a clearer spot.'}`,!legal);
    if(keyboardMode){updateCursor();if(legal)showPreview({id,x:cursor.x,y:cursor.y,rotation:next});}
  }
  function removeSelected() {
    if(!selected||!inSuitcase(selected)||busy)return;
    const id=selected,from=artRect(document.querySelector(`[data-id="${id}"]`));snapshot();placements=placements.filter(pl=>pl.id!==id);if(suspended&&suspended.id===id)suspended=null;moves++;render();selected=id;updateSelection();flyPiece(id,rotations[id],from,document.querySelector(`[data-id="${id}"]`));say('Back on the packing list. Try a new angle.');
  }
  function boardCell(event) {const r=board.getBoundingClientRect();return {x:Math.floor((event.clientX-r.left)/r.width*level.width),y:Math.floor((event.clientY-r.top)/r.height*level.height)};}
  function tappedPlacement(event){const c=boardCell(event),anchor=shape(selected).cells[0];return {id:selected,x:c.x-anchor[0],y:c.y-anchor[1],rotation:rotations[selected]};}
  function bindItemEvents(container) {
    container.addEventListener('pointerdown',event=>{
      const item=event.target.closest('[data-id]');if(!item||busy||event.button>0||drag)return;
      const id=item.dataset.id,source=item.dataset.source;
      if(selected!==id)select(id);
      const s=shape(id),r=board.getBoundingClientRect(),cell=r.width/level.width,ir=item.getBoundingClientRect();
      const ar=artRect(item);
      let ax=source==='board'?(event.clientX-ir.left)/cell:(event.clientX-ar.left)/ar.width*s.w;
      let ay=source==='board'?(event.clientY-ir.top)/cell:(event.clientY-ar.top)/ar.height*s.h;
      if(source==='tray'&&!s.cells.some(([x,y])=>Math.floor(ax)===x&&Math.floor(ay)===y)){
        const nearest=s.cells.reduce((best,c)=>Math.hypot(c[0]+.5-ax,c[1]+.5-ay)<Math.hypot(best[0]+.5-ax,best[1]+.5-ay)?c:best);
        ax=nearest[0]+.5;ay=nearest[1]+.5;
      }
      drag={id,source,startX:event.clientX,startY:event.clientY,lastX:event.clientX,ax,ay,active:false,pointerId:event.pointerId,item,ghost:null,candidate:null};
      item.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    container.addEventListener('click',event=>{
      const item=event.target.closest('[data-id]');if(!item||busy)return;
      event.stopPropagation();if(suppressClick)return;
      select(item.dataset.id,event.detail===0);
    });
  }
  bindItemEvents(tray);bindItemEvents($('board-pieces'));
  $('fixed-pockets').addEventListener('pointerdown',event=>{
    const pocket=event.target.closest('.fixed-pocket');if(!pocket||event.button>0)return;
    // Keep a mistaken drag on the pocket from clicking the board on release.
    pocket.setPointerCapture(event.pointerId);event.stopPropagation();explainPocket(pocket);
  });
  $('fixed-pockets').addEventListener('click',event=>{
    const pocket=event.target.closest('.fixed-pocket');if(!pocket)return;
    event.stopPropagation();explainPocket(pocket);
  });
  window.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(!drag.active&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6)return;
    const s=shape(drag.id),r=board.getBoundingClientRect(),cell=r.width/level.width;
    if(!drag.active){drag.active=true;drag.item.classList.add('dragging');drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.innerHTML=pieceSVG(drag.id);document.body.appendChild(drag.ghost);}
    drag.ghost.style.width=s.w*cell+'px';drag.ghost.style.height=s.h*cell+'px';drag.ghost.style.left=event.clientX-drag.ax*cell+'px';drag.ghost.style.top=event.clientY-drag.ay*cell+'px';
    drag.ghost.style.setProperty('--tilt',Math.max(-5,Math.min(5,(event.clientX-drag.lastX)*.22))+'deg');drag.lastX=event.clientX;
    const candidate={id:drag.id,x:Math.round((event.clientX-r.left)/cell-drag.ax),y:Math.round((event.clientY-r.top)/cell-drag.ay),rotation:rotations[drag.id]};
    drag.candidate=candidate;showPreview(candidate);event.preventDefault();
  },{passive:false});
  window.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    const d=drag,active=d.active,candidate=d.candidate,dropRect=d.ghost?.getBoundingClientRect();
    cancelDrag();suppressClick=true;setTimeout(()=>suppressClick=false,0);
    if(active){const tr=tray.getBoundingClientRect();if(d.source==='board'&&event.clientX>=tr.left&&event.clientX<=tr.right&&event.clientY>=tr.top&&event.clientY<=tr.bottom){selected=d.id;removeSelected();}else if(candidate&&!place(candidate,false,dropRect)){const target=document.querySelector(`[data-id="${d.id}"]`);flyPiece(d.id,rotations[d.id],dropRect,target);}}else{select(d.id);}
    event.preventDefault();
  });
  window.addEventListener('pointercancel',()=>cancelDrag());
  window.addEventListener('blur',()=>cancelDrag());
  function cancelDrag(){if(drag){drag.ghost?.remove();drag.item?.classList.remove('dragging');try{drag.item.releasePointerCapture(drag.pointerId);}catch(_){}drag=null;}hidePreview();}
  board.addEventListener('click',event=>{
    if(suppressClick||busy||!selected||event.target.closest('[data-id],.fixed-pocket'))return;
    place(tappedPlacement(event));
  });
  board.addEventListener('pointermove',event=>{
    if(drag||!selected||event.pointerType==='touch'||busy)return;
    if(event.target.closest('.fixed-pocket')){hidePreview();return;}
    showPreview(tappedPlacement(event));
  });
  board.addEventListener('pointerleave',()=>{if(!drag&&!keyboardMode)hidePreview();});
  board.addEventListener('keydown',event=>{
    if(event.target!==board||!selected||busy)return;
    const key=event.key;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(key)){
      event.preventDefault();keyboardMode=true;
      if(key==='ArrowLeft')cursor.x=Math.max(0,cursor.x-1);
      if(key==='ArrowRight')cursor.x=Math.min(level.width-1,cursor.x+1);
      if(key==='ArrowUp')cursor.y=Math.max(0,cursor.y-1);
      if(key==='ArrowDown')cursor.y=Math.min(level.height-1,cursor.y+1);
      if(key==='Enter'||key===' '){place({id:selected,...cursor,rotation:rotations[selected]});return;}
      updateCursor();showPreview({id:selected,...cursor,rotation:rotations[selected]});
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.target.matches('input,select,textarea')||document.querySelector('dialog[open]'))return;
    if(event.key.toLowerCase()==='r'){event.preventDefault();rotateSelected();}
    if(event.key==='Escape'){cancelDrag();hidePocketTip();selected=null;keyboardMode=false;updateSelection();hidePreview();updateCursor();}
    if(event.key==='Delete'||event.key==='Backspace'){if(selected&&getPlaced(selected)){event.preventDefault();removeSelected();}}
  });
  $('rotate').addEventListener('click',rotateSelected);$('unpack').addEventListener('click',removeSelected);
  $('undo').addEventListener('click',()=>{if(!history.length||busy)return;cancelDrag();clearHint();runFinished=false;const prev=history.pop();placements=prev.placements;rotations=prev.rotations;suspended=prev.suspended?{...prev.suspended}:null;selected=null;keyboardMode=false;moves++;render();sound('turn');say('One step back. A fresh way forward.');});
  function restart(){loadLevel(levelIndex,true,level.isDaily?level.dateKey:null);}
  $('reset').addEventListener('click',restart);$('retry').addEventListener('click',restart);
  $('trip').addEventListener('change',event=>{if(event.target.value!=='daily')loadLevel(Number(event.target.value));});
  $('journey-mode').addEventListener('click',()=>{if(level.isDaily){const next=levels.findIndex(l=>!S.getRecord(saved,l));loadLevel(next<0?0:next);}});
  $('daily-mode').addEventListener('click',()=>{if(!level.isDaily||level.dateKey!==S.todayKey())loadLevel(0,true,S.todayKey());});
  function showPassport(){
    cancelDrag();const stats=S.summary(saved,levels);$('passport-summary').textContent=`${stats.completed} / ${stats.total} trip stamps · ${stats.stars} / ${stats.maxStars} stars · ${stats.dailyCompleted} daily departures`;
    $('passport-pages').innerHTML=chapters.map((chapter,ci)=>`<section class="passport-chapter" data-chapter="${chapter.theme}"><h3>${String(ci+1).padStart(2,'0')} · ${esc(chapter.name)}</h3><p>${chapterLevels(chapter).filter(l=>S.getRecord(saved,l)).length} / ${chapter.total} trips packed · ${esc(chapter.description)}</p><div class="passport-grid">${chapterLevels(chapter).map(l=>{const r=S.getRecord(saved,l),i=levels.indexOf(l);return `<button class="passport-trip${l.id===level.id?' current':''}" data-trip="${i}"><small>TRIP ${String(i+1).padStart(2,'0')}</small><strong>${esc(l.name)}</strong><span class="trip-stars">${starsText(r?.stars||0)}</span><small>${r?r.bestMoves===null?'Legacy travel stamp':`Best: ${r.bestMoves} moves`:'Ready to explore'}</small></button>`;}).join('')}</div></section>`).join('');
    const days=Object.keys(saved.dailyRecords).sort().reverse().slice(0,7);$('daily-log-copy').textContent=`A shared puzzle each day, from ${P.dailyPoolSize} verified layouts in a ${P.dailyCycleDays}-day cycle. Resets at 00:00 UTC.`;
    $('daily-log').innerHTML=days.length?days.map(date=>`<button data-day="${date}">${date} <span class="stars">${starsText(saved.dailyRecords[date].stars)}</span></button>`).join(''):'<button data-day="'+S.todayKey()+'">Try today’s departure ↗</button>';
    $('legacy-note').hidden=!stats.legacyCount;$('legacy-note').textContent=`${stats.legacyCount} old travel stamp${stats.legacyCount===1?'':'s'} kept in your archive. Redesigned trips have fresh stars to earn.`;
    $('passport-dialog').showModal();
  }
  $('passport-open').addEventListener('click',showPassport);
  $('passport-dialog').addEventListener('click',event=>{const trip=event.target.closest('[data-trip]'),day=event.target.closest('[data-day]');if(trip)loadLevel(Number(trip.dataset.trip));if(day)loadLevel(0,true,day.dataset.day);});
  $('hint').addEventListener('click',()=>{
    if(busy||placements.length===level.pieces.length)return;
    if(suspended){say('Red squares still overlap. Slide that item clear, then ask for a hint.',true);return;}
    if(hintedCandidate){const candidate={...hintedCandidate};place(candidate,true);return;}
    const solution=P.findSolution(level,placements);
    if(!solution){const limited=P.findSolution.lastSearch.status==='limit';say(limited?'That one needs more thinking. Try undoing a move, then ask again.':'This arrangement leaves no room for everything. Undo a move or unpack an item.',true);return;}
    const next=solution.find(pl=>!getPlaced(pl.id));if(next){hints++;selected=next.id;rotations[next.id]=next.rotation;cursor={x:next.x,y:next.y};keyboardMode=false;render();hintedCandidate={...next};$('hint').innerHTML='<span>✧</span> Place it';showPreview(next);say(`${itemName(next.id)} fits in the outlined spot. Place it yourself, or tap Place it. This run now uses a hint.`);}
  });
  function sound(kind){
    if(!saved.sound)return;
    try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const t=audioContext.currentTime;
      const notes=kind==='win'?[523.25,659.25,783.99,1046.5]:kind==='no'?[180]:kind==='turn'?[440]:[620+Math.min(moves,10)*22];
      notes.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=kind==='no'?'triangle':'sine';o.frequency.setValueAtTime(f,t+i*.09);g.gain.setValueAtTime(0,t+i*.09);g.gain.linearRampToValueAtTime(.055,t+i*.09+.012);g.gain.exponentialRampToValueAtTime(.001,t+i*.09+.22);o.connect(g).connect(audioContext.destination);o.start(t+i*.09);o.stop(t+i*.09+.24);});
    }catch(_){}
  }
  function updateSound(){ $('sound').setAttribute('aria-label',saved.sound?'Turn sound off':'Turn sound on');$('sound').setAttribute('aria-pressed',String(saved.sound));$('sound').querySelector('.sound-off').hidden=saved.sound; }
  $('sound').addEventListener('click',()=>{saved.sound=!saved.sound;persist();updateSound();sound('drop');});
  $('help').addEventListener('click',()=>{cancelDrag();$('help-dialog').showModal();});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  function chapterProgress(){return level.isDaily?[]:chapterLevels(level.chapterInfo).map(l=>!!S.getRecord(saved,l));}
  function updateSignature(){
    $('win-dedication').textContent=playerName?`Packed by ${playerName}`:'A little room. A lovely adventure.';
    $('clear-player-name').disabled=!$('player-name').value;
    // Refresh any already-visible copy fallback so it never retains a removed name.
    if(!$('share-fallback').hidden)$('share-fallback').value=resultShareText();
  }
  function rememberName(){
    playerName=V.cleanName($('player-name').value);
    try{if(playerName)localStorage.setItem(nameKey,playerName);else localStorage.removeItem(nameKey);}catch(_){}
    updateSignature();$('share-status').textContent='';
  }
  $('player-name').addEventListener('input',rememberName);
  $('player-name').addEventListener('blur',()=>{$('player-name').value=playerName;updateSignature();});
  $('clear-player-name').addEventListener('click',()=>{$('player-name').value='';rememberName();$('player-name').focus();});
  function resultShareText(){const text=S.shareText(level,{moves,hints},{url:challengeURL()});return text.replace('Can you pack this trip?',`${settlement?settlement.quote+'\n':''}${playerName?'Packed by '+playerName+'\n':''}Can you pack this trip?`);}
  $('zip').addEventListener('click',()=>{
    if(busy||placements.length!==level.pieces.length)return;
    busy=true;cancelDrag();render();sound('win');$('suitcase').classList.add('zipping');
    const result=S.record(saved,level,{moves,hints});runFinished=true;persist();saveDraft();updateOptions();
    window.PackCommunity?.sync();
    window.PackAchievements?.update();
    settlement=V.describe(level,levelIndex,chapterProgress().filter(Boolean).length);
    closeTimer=setTimeout(()=>{busy=false;$('suitcase').classList.remove('zipping');render();
      $('win-dialog').dataset.featured=String(settlement.featured);$('win-dialog').dataset.theme=settlement.theme;
      $('win-kicker').textContent=settlement.kicker;$('win-edition').textContent=settlement.edition;
      $('victory-scene').innerHTML=V.scene(settlement.theme,settlement.journey);$('win-title').textContent=settlement.title;
      $('win-copy').textContent=settlement.copy;$('win-quote').textContent=settlement.quote;
      $('player-name').value=playerName;updateSignature();
      $('win-rating').textContent=starsText(result.stars);$('win-record').textContent=`${result.newStamp?'New passport stamp!':result.improved?'A new personal best!':'Another lovely departure.'} Best: ${starsText(result.best.stars)} · ${result.best.bestMoves} moves.`;
      $('win-passenger').textContent=level.passenger;$('win-moves').textContent=String(moves);$('win-hints').textContent=String(hints);
      $('next').textContent=level.isDaily?'BACK TO THE JOURNEY ↗':settlement.scope==='finale'?'FINISH THIS CHAPTER ↗':settlement.scope==='chapter'?level.chapterInfo.index===chapters.length-1?'TRY THE DAILY DEPARTURE ↗':'EXPLORE THE NEXT CHAPTER ↗':'NEXT TRIP ↗';$('retry').textContent=result.stars===3?'PACK IT AGAIN ↻':'TRY FOR THREE STARS ↻';$('share-status').textContent='';$('share-fallback').hidden=true;
      $('win-dialog').showModal();$('win-dialog').scrollTop=0;celebrate();
    },1000);
  });
  function celebrate(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=$('confetti');el.innerHTML=Array.from({length:30},(_,i)=>`<i style="left:${Math.random()*100}%;background:${['#e1846c','#e8c85e','#b6c9a5','#9ab5bd'][i%4]};animation-delay:${Math.random()*.35}s;--drift:${(Math.random()-.5)*200}px;transform:rotate(${Math.random()*180}deg)"></i>`).join('');setTimeout(()=>el.replaceChildren(),2100);}
  $('next').addEventListener('click',()=>{if(level.isDaily){const next=levels.findIndex(l=>!S.getRecord(saved,l));loadLevel(next<0?0:next);}else if(settlement?.scope==='finale'){const missing=chapterLevels(level.chapterInfo).find(l=>!S.getRecord(saved,l));loadLevel(levels.indexOf(missing));}else if(settlement?.scope==='chapter'){const nextChapter=chapters[level.chapterInfo.index+1];if(!nextChapter)loadLevel(0,true,S.todayKey());else loadLevel(levels.indexOf(chapterLevels(nextChapter)[0]));}else loadLevel(levelIndex+1);board.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'center'});});
  function challengeURL(){const u=new URL(location.href);u.searchParams.delete('trip');u.searchParams.delete('daily');u.searchParams.set(level.isDaily?'daily':'trip',level.isDaily?level.dateKey:level.id);return u.href;}
  $('share').addEventListener('click',async()=>{
    const text=resultShareText();try{await navigator.clipboard.writeText(text);$('share-status').textContent='Result copied. Same puzzle, no solution spoilers.';}catch(_){$('share-fallback').value=text;$('share-fallback').hidden=false;$('share-fallback').focus();$('share-fallback').select();$('share-status').textContent='Copy your result and challenge link above.';}
  });
  async function downloadPNG(svg,filename){
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'})),img=new Image();
    try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('No image');const link=URL.createObjectURL(png),a=document.createElement('a');a.href=link;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(link),5000);}finally{URL.revokeObjectURL(url);}
  }
  $('save-victory').addEventListener('click',async()=>{
    if(!settlement)return;const button=$('save-victory');button.disabled=true;
    try{await downloadPNG(V.cardSVG(settlement,{moves,hints,stars:S.starsFor(level,{moves,hints})},playerName),`pack-the-chaos-victory-${level.id}.png`);$('share-status').textContent='Your personalized victory card is ready to save.';}
    catch(_){$('share-status').textContent='Could not save on this browser. You can take a screenshot of your victory card.';}finally{button.disabled=false;}
  });
  $('save-card').addEventListener('click',async()=>{
    const button=$('save-card');button.disabled=true;
    try{
      const w=900,cell=130,boardY=400,h=Math.max(1120,boardY+level.height*cell+120),boardX=(w-level.width*cell)/2;
      const pieces=placements.map(pl=>{const s=shape(pl.id,pl.rotation);return sizedSVG(pieceSVG(pl.id,pl.rotation),boardX+pl.x*cell,boardY+pl.y*cell,s.w*cell,s.h*cell);}).join('');
      const portrait=sizedSVG(portraitSVG(),60,140,170,170);
      const pockets=(level.blocked||[]).map(([x,y])=>sizedSVG(pocketSVG(),boardX+x*cell,boardY+y*cell,cell,cell)).join('');
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f6f1e4"/><rect x="24" y="24" width="852" height="${h-48}" rx="20" fill="none" stroke="#2d3c32" stroke-width="2"/><text x="60" y="93" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#2d3c32" letter-spacing="4">PACK THE CHAOS</text><path d="M60 118h780" stroke="#bcc1ac"/>${portrait}<text x="255" y="208" font-family="Georgia,serif" font-size="44" fill="#2d3c32">${esc(level.name)}</text><text x="255" y="257" font-family="Arial,sans-serif" font-size="19" fill="#74836a">${esc(level.destination)} · ${moves} moves · ${hints} hints</text><text x="255" y="292" font-family="Arial,sans-serif" font-size="16" fill="#a66a52">${esc(level.isDaily?level.dateKey:level.chapterInfo.name)} · ${starsText(S.starsFor(level,{moves,hints}))}</text>${playerName?`<text x="255" y="332" font-family="Arial,sans-serif" font-size="20" fill="#74836a">${esc("Packed by "+playerName)}</text>`:""}<rect x="${boardX-25}" y="375" width="${level.width*cell+50}" height="${level.height*cell+50}" rx="25" fill="#e3957d" stroke="#2d3c32" stroke-width="3"/>${pockets}${pieces}<text x="450" y="${boardY+level.height*cell+65}" text-anchor="middle" font-family="Georgia,serif" font-size="28" font-style="italic" fill="#2d3c32">A perfectly peculiar fit.</text></svg>`;
      const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
      try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('No image');const downloadURL=URL.createObjectURL(png);const a=document.createElement('a');a.href=downloadURL;a.download=`pack-the-chaos-${level.id}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(downloadURL),5000);$('share-status').textContent='Your travel postcard is ready to save.';}finally{URL.revokeObjectURL(url);}
    }catch(_){$('share-status').textContent='Could not save on this browser. Try a screenshot of your suitcase.';}finally{button.disabled=false;}
  });
  window.addEventListener('resize',()=>{cancelDrag();updateCursor();});
  const query=new URLSearchParams(location.search),initialTrip=query.get('trip'),initialDaily=query.get('daily');
  const initialIndex=levels.findIndex(l=>l.id===(initialTrip||saved.lastTripId));
  const initialDate=initialDaily&&P.daily(initialDaily)?initialDaily:!initialTrip&&!initialDaily&&saved.lastTripId?.startsWith('daily-')?S.todayKey():null;
  updateSound();loadLevel(initialIndex<0?0:initialIndex,false,initialDate);restoreDraft(pendingDraft);pendingDraft=null;
  window.PackAchievements?.init({getState:()=>saved,levels,onDay:date=>loadLevel(0,true,date)});
  window.PackCommunity?.init({
    getProgress:()=>({records:saved.records,dailyRecords:Object.fromEntries(Object.entries(saved.dailyRecords).filter(([date])=>date>='2020-01-01'&&date<=S.todayKey()).sort(([a],[b])=>b.localeCompare(a)).slice(0,366))}),
    getName:()=>playerName,
    onProfile:profile=>{
      $('player-name').readOnly=!!profile;$('clear-player-name').hidden=!!profile;
      document.querySelector('.victory-personalize label').textContent=profile?'Your club name':'Make it yours';
      document.querySelector('.victory-personalize > small').textContent=profile?'unique · club member':'optional · up to 24 characters';
      $('name-note').textContent=profile?'Your unique club name appears on the public board and your victory cards.':'Saved on this browser. Your name appears on cards and results you choose to share.';
      if(profile){playerName=profile.name;try{localStorage.setItem(nameKey,playerName);}catch(_){}$('player-name').value=playerName;updateSignature();}
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateDailyLabel();});setInterval(updateDailyLabel,60000);
})();
