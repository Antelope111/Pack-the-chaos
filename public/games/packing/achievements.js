/* Travel badges are derived from best results, never incremented by repeat wins. */
(function(root){
'use strict';
const DAY=86400000, key=d=>new Date(d).toISOString().slice(0,10);
const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&key(s)===s;
function compute(state,levels,today=key(Date.now())){
 const records=levels.map(l=>({l,r:state.records?.[l.id]})).filter(({l,r})=>r&&r.revision===l.revision&&r.stars>=1&&r.stars<=3);
 const days=Object.keys(state.dailyRecords||{}).filter(d=>valid(d)&&d>='2020-01-01'&&d<=today&&state.dailyRecords[d].revision===2&&state.dailyRecords[d].stars>=1&&state.dailyRecords[d].stars<=3).sort();
 const set=new Set(days);let longest=0,run=0,prev=null;
 days.forEach(d=>{run=prev&&Date.parse(d)-Date.parse(prev)===DAY?run+1:1;longest=Math.max(longest,run);prev=d;});
 let current=0,t=Date.parse(today);if(!set.has(today))t-=DAY;while(set.has(key(t))){current++;t-=DAY;}
 const chapters={};records.forEach(({l})=>chapters[l.chapterId]=(chapters[l.chapterId]||0)+1);
 const stars=records.reduce((s,{r})=>s+r.stars,0),perfect=records.filter(({r})=>r.stars===3).length;
 const badges=[];function add(id,icon,title,description,value,target){badges.push({id,icon,title,description,value:Math.min(value,target),target,earned:value>=target});}
 add('first','✈','First departure','Pack your first journey trip.',records.length,1);
 add('ten','♧','Seasoned traveller','Complete 10 different journey trips.',records.length,10);
 add('all','♔','Around the odd world','Complete the original three chapters.',records.filter(({l})=>['cats','dogs','odd'].includes(l.chapterId)).length,36);
 add('world-84','♔','Beyond the horizon','Complete all seven chapters and 84 journey trips.',records.length,levels.length);
 [['cats','♧','Cat whisperer'],['dogs','♧','Pack leader'],['odd','☾','Midnight regular'],['rooftops','☾','Moonlight meower'],['seaside','☀','Seaside wanderer'],['bazaar','✧','Curiosity collector'],['aurora','✺','Northern dreamer']].forEach(([id,icon,title])=>add(id,icon,title,'Complete the entire '+id+' chapter.',chapters[id]||0,levels.filter(l=>l.chapterId===id).length));
 add('stars','★','Pocket constellation','Collect 54 journey stars.',stars,54);
 add('perfect','✧','Perfect fit','Earn three stars on 5 journey trips.',perfect,5);
 add('daily-first','☀','Daily departure','Complete your first daily suitcase.',days.length,1);
 [3,7,30].forEach(n=>add('streak-'+n,'☀',n+' days of wonder','Complete '+n+' consecutive daily puzzle dates.',longest,n));
 add('daily-50','✈','Frequent flyer','Complete 50 different daily puzzles.',days.length,50);
 const months=[...new Set([...days.map(d=>d.slice(0,7)),today.slice(0,7)])].sort();
 months.forEach(m=>{const total=new Date(Date.UTC(+m.slice(0,4),+m.slice(5),0)).getUTCDate(),done=days.filter(d=>d.startsWith(m)).length; if(done===total||m===today.slice(0,7))add('month-'+m,'✺',m+' · All aboard','Complete every daily puzzle in this month.',done,total);});
 return {days,current,longest,stars,completed:records.length,badges,todayDone:set.has(today)};
}
root.PackAchievements={compute};if(!root.document)return;
const $=id=>document.getElementById(id);let options,cloud={records:{},dailyRecords:{}},month=key(Date.now()).slice(0,7),known=new Set(),loading=false,notice='';
function state(){const local=options.getState(),merged={records:{...cloud.records},dailyRecords:{...cloud.dailyRecords}};for(const group of ['records','dailyRecords'])for(const [id,r] of Object.entries(local[group]||{})){const old=merged[group][id];if(!old||r.revision>old.revision||r.revision===old.revision&&r.stars>=old.stars)merged[group][id]=r;}return merged;}
function stats(){return compute(state(),options.levels);}
function medal(b){return `<article class="travel-badge ${b.earned?'earned':'locked'}"><div class="badge-seal" aria-hidden="true">${b.icon}</div><div><small>${b.earned?'COLLECTED':'IN PROGRESS'}</small><h3>${b.title}</h3><p>${b.description}</p><progress aria-label="${b.title}" max="${b.target}" value="${b.value}"></progress><span>${b.value} / ${b.target}</span></div></article>`;}
function render(){if(!options)return;const s=stats(),today=key(Date.now()),earned=s.badges.filter(b=>b.earned);$('achievement-total').textContent=earned.length;
 $('achievement-summary').textContent=earned.length+' travel badges collected · '+s.completed+' trips · '+s.stars+' stars';
 $('achievement-stats').innerHTML=`<div><b>${s.current}</b><span>CURRENT STREAK</span></div><div><b>${s.longest}</b><span>LONGEST STREAK</span></div><div><b>${s.days.length}</b><span>DAILY PUZZLES</span></div>`;
 $('achievement-today').textContent=s.todayDone?'✓ Today is packed. Explore another trip.':s.current?'Pack today to keep your '+s.current+'-day journey going.':'A new daily suitcase is waiting for you.';
 $('achievement-notice').textContent=loading?'Checking your club’s saved results…':notice;
 $('achievement-month').textContent=new Date(month+'-01T00:00:00Z').toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'});
 $('achievement-next-month').disabled=month>=today.slice(0,7);$('achievement-prev-month').disabled=month<='2020-01';
 const first=new Date(month+'-01T00:00:00Z'),length=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate(),data=state();
 let html=Array.from({length:(first.getUTCDay()+6)%7},()=>'<span></span>').join('');
 for(let d=1;d<=length;d++){const date=month+'-'+String(d).padStart(2,'0'),done=s.days.includes(date);html+=`<button data-ach-day="${date}" class="${done?'done ':''}${date===today?'today':''}" ${date>today?'disabled':''} aria-label="${date}${done?', completed, '+data.dailyRecords[date].stars+' stars':date>today?', upcoming':', play daily puzzle'}" ${date===today?'aria-current="date"':''}><b>${d}</b><small>${done?'★'.repeat(data.dailyRecords[date].stars):'·'}</small></button>`;}
 $('achievement-calendar').innerHTML=html;$('achievement-badges').innerHTML=s.badges.map(medal).join('');
}
async function open(){month=key(Date.now()).slice(0,7);render();$('achievement-dialog').showModal();if(loading)return;loading=true;render();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{const r=await fetch('/api/community/achievements',{credentials:'same-origin',cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();cloud=data.progress||{records:{},dailyRecords:{}};notice=data.joined?'Includes your saved club results and this browser’s latest progress.':'Saved on this browser. Join Club to keep a copy of your results online.';known=new Set(stats().badges.filter(b=>b.earned).map(b=>b.id));}
 catch(_){notice='Club results unavailable. Showing your saved progress on this browser.';}finally{clearTimeout(timer);loading=false;render();}
}
function update(){const s=stats(),fresh=s.badges.filter(b=>b.earned&&!known.has(b.id));known=new Set(s.badges.filter(b=>b.earned).map(b=>b.id));$('win-achievements').textContent=fresh.length?'✦ New badge: '+fresh.map(b=>b.title).join(' · '):'✦ View my travel badges';render();}
root.PackAchievements.init=function(o){options=o;known=new Set(stats().badges.filter(b=>b.earned).map(b=>b.id));['achievement-open','club-achievements','win-achievements'].forEach(id=>$(id).addEventListener('click',open));$('achievement-close').onclick=()=>$('achievement-dialog').close();
 $('achievement-calendar').onclick=e=>{const b=e.target.closest('[data-ach-day]');if(b&&!b.disabled){$('achievement-dialog').close();$('passport-dialog').close();$('community-dialog').close();options.onDay(b.dataset.achDay);}};
 $('achievement-play').onclick=()=>{$('achievement-dialog').close();$('community-dialog').close();options.onDay(key(Date.now()));};
 for(const [id,delta] of [['achievement-prev-month',-1],['achievement-next-month',1]])$(id).onclick=()=>{const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);month=key(d).slice(0,7);render();};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});setInterval(()=>{if($('achievement-dialog').open)render();},60000);render();};
root.PackAchievements.update=update;
})(typeof window==='undefined'?globalThis:window);
