/* Standalone, dependency-free. The core is also exported for logic checks. */
(function (root) {
  'use strict';
  function snake(n) { const a=[]; for(let r=0;r<n;r++) for(let k=0;k<n;k++) a.push(r*n+(r%2?n-1-k:k)); return a; }
  function spiral(n) { const a=[]; let t=0,b=n-1,l=0,r=n-1; while(t<=b&&l<=r){for(let c=l;c<=r;c++)a.push(t*n+c);t++;for(let y=t;y<=b;y++)a.push(y*n+r);r--;if(t<=b){for(let c=r;c>=l;c--)a.push(b*n+c);b--;}if(l<=r){for(let y=b;y>=t;y--)a.push(y*n+l);l++;}} return a; }
  function rotate(route,n,times) {return route.map(cell=>{let r=Math.floor(cell/n),c=cell%n;for(let k=0;k<times;k++){const old=r;r=c;c=n-1-old;}return r*n+c;});}
  function makeLevel(n,route,nums,title) {const anchors={};nums.forEach(v=>anchors[route[v-1]]=v);return {n,route,anchors,title};}
  const levels=[
    makeLevel(4,snake(4),[1,4,8,12,16],'找到节奏'),
    makeLevel(4,spiral(4),[1,5,8,12,16],'向内探索'),
    makeLevel(4,rotate(snake(4),4,1),[1,6,11,16],'换个方向'),
    makeLevel(5,rotate(snake(5),5,2),[1,5,10,15,20,25],'更远一点'),
    makeLevel(5,spiral(5),[1,6,11,15,19,22,25],'走入中心'),
    makeLevel(5,rotate(spiral(5).slice().reverse(),5,3),[1,5,9,13,17,21,25],'最后一条轨迹')
  ];
  function neighbors(cell,n){const r=Math.floor(cell/n),c=cell%n,out=[];if(r>0)out.push(cell-n);if(c<n-1)out.push(cell+1);if(r<n-1)out.push(cell+n);if(c>0)out.push(cell-1);return out;}
  function legalStep(level,path,cell){if(!Number.isInteger(cell)||cell<0||cell>=level.n**2||path.includes(cell))return false;const prev=path[path.length-1];if(!neighbors(prev,level.n).includes(cell))return false;const step=path.length+1;if(level.anchors[cell]&&level.anchors[cell]!==step)return false;return !Object.entries(level.anchors).some(([c,v])=>v===step&&+c!==cell);}
  function solve(level,prefix,options){
    const n=level.n,total=n*n,adj=Array.from({length:total},(_,c)=>neighbors(c,n)),byNumber={};
    Object.keys(level.anchors).forEach(c=>byNumber[level.anchors[c]]=+c);
    if(!prefix.length||prefix[0]!==byNumber[1])return {status:'none',nodes:0};
    const checked=[prefix[0]];for(let i=1;i<prefix.length;i++){if(!legalStep(level,checked,prefix[i]))return {status:'none',nodes:0};checked.push(prefix[i]);}
    const used=new Uint8Array(total),path=prefix.slice();path.forEach(c=>used[c]=1);
    const budget=options&&options.maxNodes||1000000,deadline=Date.now()+(options&&options.maxMs||1500);let nodes=0,timedOut=false;
    const distance=(a,b)=>Math.abs(Math.floor(a/n)-Math.floor(b/n))+Math.abs(a%n-b%n);
    function viable(head,step){
      // Every upcoming anchor must remain reachable within its exact step budget.
      for(const k of Object.keys(byNumber)){const v=+k;if(v<=step)continue;const d=distance(head,byNumber[v]);if(d>v-step||(v-step-d)%2)return false;}
      // Unvisited cells and the head must form one connected component.
      const seen=new Uint8Array(total),stack=[head];seen[head]=1;let count=0;
      while(stack.length){const c=stack.pop();count++;for(const next of adj[c])if(!seen[next]&&(!used[next]||next===head)){seen[next]=1;stack.push(next);}}
      if(count!==total-step+1)return false;
      // An isolated future cell cannot be entered, except at the final step.
      for(let c=0;c<total;c++)if(!used[c]){let degree=0;for(const x of adj[c])if(!used[x]||x===head)degree++;if(degree===0)return false;if(degree===1&&byNumber[total]!==c)return false;}
      return true;
    }
    function dfs(head,step){
      nodes++;if(nodes>budget||((nodes&1023)===0&&Date.now()>deadline)){timedOut=true;return false;}
      if(step===total)return true;
      if(!viable(head,step))return false;
      let candidates=byNumber[step+1]!==undefined?[byNumber[step+1]]:adj[head].slice();
      candidates=candidates.filter(c=>!used[c]&&adj[head].includes(c)&&(!level.anchors[c]||level.anchors[c]===step+1));
      candidates.sort((a,b)=>adj[a].filter(c=>!used[c]).length-adj[b].filter(c=>!used[c]).length);
      for(const c of candidates){used[c]=1;path.push(c);if(dfs(c,step+1))return true;path.pop();used[c]=0;if(timedOut)return false;}
      return false;
    }
    if(dfs(prefix[prefix.length-1],prefix.length))return {status:'solved',path:path.slice(),nodes};
    return {status:timedOut?'timeout':'none',nodes};
  }
  root.PathPuzzleCore={levels,neighbors,legalStep,solve};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id),key='playlab-path-v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){}
  let current=Number.isInteger(saved.level)&&saved.level>=0&&saved.level<levels.length?saved.level:0;
  const completed=new Set(Array.isArray(saved.completed)?saved.completed.filter(v=>Number.isInteger(v)&&v>=0&&v<levels.length):[]);
  let level,path=[],cells=[],moves=0,hints=0,startTime=0,elapsed=0,won=false,dragging=false,pointerId=null,lastPointerCell=-1,lastPointerX=0,lastPointerY=0,hintCell=-1,hintTimer=0,solving=false,generation=0;
  function save(){try{localStorage.setItem(key,JSON.stringify({level:current,completed:Array.from(completed)}));}catch(e){}}
  function format(ms){const t=Math.floor(ms/1000);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
  function setMessage(text,tone){$('message').textContent=text;$('message').className='message'+(tone?' '+tone:'');$('live').textContent=text;}
  function renderNav(){const nav=$('levels');nav.textContent='';levels.forEach((item,i)=>{const b=document.createElement('button');b.className='level-dot'+(completed.has(i)?' done':'')+(i===current?' active':'');b.title='第 '+(i+1)+' 关 · '+item.title;b.setAttribute('aria-label',b.title+(completed.has(i)?'，已通关':''));b.setAttribute('aria-current',i===current?'step':'false');b.addEventListener('click',()=>load(i));nav.appendChild(b);});}
  function clearHint(){hintCell=-1;clearTimeout(hintTimer);}
  function paint(){
    cells.forEach((cell,i)=>{const index=path.indexOf(i),anchor=level.anchors[i];cell.className='cell'+(anchor?' anchor':'')+(index>=0?' visited':'')+(i===path[path.length-1]?' head':'')+(i===hintCell?' hint':'');const text=index>=0?index+1:anchor||'';cell.firstChild.textContent=text;cell.setAttribute('aria-label',(Math.floor(i/level.n)+1)+'行'+(i%level.n+1)+'列'+(text?'，数字'+text:'，空格')+(i===path[path.length-1]?'，当前位置':''));});
    const total=level.n**2;$('progress').textContent=path.length+' / '+total;$('nextNumber').textContent=won?'全部连接':('下一格 '+Math.min(total,path.length+1));$('progressFill').style.width=(path.length/total*100)+'%';$('undoBtn').disabled=path.length<=1||solving;$('hintBtn').disabled=won||solving;
    const svg=$('routeLine');if(svg){const rect=$('board').getBoundingClientRect();const points=path.map(c=>{const r=cells[c].getBoundingClientRect();return ((r.left+r.width/2-rect.left)/rect.width*100)+','+((r.top+r.height/2-rect.top)/rect.height*100);});svg.querySelector('polyline').setAttribute('points',points.join(' '));}
  }
  function load(index){
    generation++;current=index;level=levels[current];path=[level.route[0]];moves=0;hints=0;elapsed=0;startTime=0;won=false;solving=false;dragging=false;clearHint();$('complete').hidden=true;$('timer').textContent='00:00';$('levelName').textContent=String(current+1).padStart(2,'0')+' · '+level.title;$('levelMeta').textContent=level.n+' × '+level.n+' · '+level.n**2+' 个位置';
    const board=$('board');board.textContent='';board.style.gridTemplateColumns='repeat('+level.n+',1fr)';board.style.gridTemplateRows='repeat('+level.n+',1fr)';cells=[];
    for(let i=0;i<level.n**2;i++){const cell=document.createElement('button');cell.type='button';cell.dataset.cell=i;cell.appendChild(document.createElement('span'));if(i===path[0]){const s=document.createElement('small');s.className='start-label';s.textContent='起点';cell.appendChild(s);}cell.addEventListener('click',event=>{if(event.detail===0)visit(i);});board.appendChild(cell);cells.push(cell);}
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='routeLine';svg.classList.add('connector');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.innerHTML='<polyline fill="none" stroke="#d9ff68" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity=".65" />';board.appendChild(svg);
    renderNav();paint();save();setMessage(current===0?'从 1 出发，试着走到旁边的一格。':'按顺序经过预设数字，最后铺满全部格子。');
  }
  function fail(cell,text){cells[cell].classList.remove('error');void cells[cell].offsetWidth;cells[cell].classList.add('error');setTimeout(()=>cells[cell]&&cells[cell].classList.remove('error'),260);setMessage(text,'warn');}
  function visit(cell){
    if(won||solving||cell<0||cell>=cells.length)return;
    if(cell===path[path.length-1])return;
    const existing=path.indexOf(cell);if(existing>=0){clearHint();path.length=existing+1;setMessage('已退回第 '+path.length+' 格，可以换个方向。');paint();return;}
    const head=path[path.length-1];if(!neighbors(head,level.n).includes(cell)){if(!dragging)fail(cell,'只能上下左右相邻移动，不能斜走或跳格。');return;}
    const step=path.length+1,anchor=level.anchors[cell];if(anchor&&anchor!==step){fail(cell,'这格是 '+anchor+'，需要走到第 '+anchor+' 步时经过。');return;}
    const required=Object.entries(level.anchors).find(([,v])=>v===step);if(required&&+required[0]!==cell){fail(cell,'第 '+step+' 步需要进入标有 '+step+' 的那一格。');return;}
    clearHint();if(!startTime)startTime=Date.now();path.push(cell);moves++;paint();
    if(path.length===level.n**2)finish();else if(anchor)setMessage('正好抵达 '+anchor+'。继续寻找下一段轨迹。','good');else setMessage('下一步是 '+(path.length+1)+'。让路径继续向前。');
  }
  function finish(){won=true;dragging=false;elapsed=startTime?Date.now()-startTime:0;completed.add(current);save();renderNav();paint();$('winTime').textContent=format(elapsed);$('winMoves').textContent=moves;$('winHints').textContent=hints;$('winSubtitle').textContent=current===levels.length-1?'你已完成最后一关。也可以回到前面的关卡，寻找另一条路线。':'所有数字已经连成一条完整轨迹。';$('winNextBtn').textContent=current===levels.length-1?'回到第一关 →':'下一关 →';$('complete').hidden=false;setMessage('第 '+(current+1)+' 关完成。每一步，都刚刚好。','good');$('winNextBtn').focus({preventScroll:true});}
  function undo(){if(solving||path.length<=1)return;won=false;$('complete').hidden=true;clearHint();path.pop();paint();setMessage('已撤销一步，换个方向试试。');}
  function hint(){
    if(won||solving)return;solving=true;paint();setMessage('正在检查当前路线的可行延伸…');const requestGeneration=generation,requestPrefix=path.slice();
    setTimeout(()=>{if(generation!==requestGeneration||path.join(',')!==requestPrefix.join(','))return;const result=solve(level,path);solving=false;hints++;
      if(result.status==='solved'){hintCell=result.path[path.length];const r=Math.floor(hintCell/level.n)+1,c=hintCell%level.n+1;setMessage('一种可行走法：第 '+(path.length+1)+' 格在第 '+r+' 行、第 '+c+' 列。亮框处等你落笔。','good');hintTimer=setTimeout(()=>{clearHint();paint();},7000);}
      else if(result.status==='none')setMessage('这段路线已经无法铺满。沿原路回退几格，再试一个分岔方向。','warn');
      else setMessage('这条路线的分岔较多，暂时没有找到提示。可以回退几格后再试。');paint();
    },30);
  }
  function cellAt(event){const el=document.elementFromPoint(event.clientX,event.clientY);const cell=el&&el.closest&&el.closest('[data-cell]');return cell&&$('board').contains(cell)?+cell.dataset.cell:-1;}
  const board=$('board');
  board.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0||won||solving)return;const cell=cellAt(event);if(cell<0)return;event.preventDefault();dragging=true;pointerId=event.pointerId;lastPointerCell=cell;lastPointerX=event.clientX;lastPointerY=event.clientY;try{board.setPointerCapture(pointerId);}catch(e){}visit(cell);});
  board.addEventListener('pointermove',event=>{if(!dragging||event.pointerId!==pointerId)return;event.preventDefault();const dx=event.clientX-lastPointerX,dy=event.clientY-lastPointerY,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/6));for(let i=1;i<=steps;i++){const cell=cellAt({clientX:lastPointerX+dx*i/steps,clientY:lastPointerY+dy*i/steps});if(cell>=0&&cell!==lastPointerCell){lastPointerCell=cell;visit(cell);}}lastPointerX=event.clientX;lastPointerY=event.clientY;});
  function endPointer(event){if(event.pointerId!==pointerId)return;dragging=false;pointerId=null;lastPointerCell=-1;}
  board.addEventListener('pointerup',endPointer);board.addEventListener('pointercancel',endPointer);board.addEventListener('lostpointercapture',()=>{dragging=false;pointerId=null;lastPointerCell=-1;});
  board.addEventListener('keydown',event=>{const directions={ArrowUp:-level.n,ArrowDown:level.n,ArrowLeft:-1,ArrowRight:1};if(directions[event.key]!==undefined){event.preventDefault();const head=path[path.length-1],next=head+directions[event.key];if(neighbors(head,level.n).includes(next))visit(next);}else if(event.key==='Backspace'){event.preventDefault();undo();}});
  $('undoBtn').addEventListener('click',undo);$('resetBtn').addEventListener('click',()=>load(current));$('hintBtn').addEventListener('click',hint);$('nextBtn').addEventListener('click',()=>load((current+1)%levels.length));$('winNextBtn').addEventListener('click',()=>load((current+1)%levels.length));$('replayBtn').addEventListener('click',()=>load(current));
  window.addEventListener('resize',paint);setInterval(()=>{if(startTime&&!won)$('timer').textContent=format(Date.now()-startTime);},250);load(current);
})(typeof window==='undefined'?globalThis:window);
