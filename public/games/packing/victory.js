/* Theme-aware victory cards. No network; names never enter challenge URLs. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PackVictory=api;})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  const themes={
    cats:{color:'#b66e48',soft:'#f1dfb8',title:'The whole crew is home.',finale:'A purr-fect final trip.',quote:'New home. Same cats. Every box is theirs.',daily:['One small box. A whole lot of cat.','No empty spaces. Plenty of opinions.',"Today's forecast: tightly packed, partly purring."]},
    dogs:{color:'#577f6b',soft:'#dbe6ce',title:'Adventure, with the whole pack.',finale:'One very good finale.',quote:'Every good adventure starts with the whole pack.',daily:['All packed. All good dogs.',"Personal space can wait. Adventure can't.",'A perfect fit for a very good pack.']},
    odd:{color:'#897399',soft:'#e4daeb',title:'Next stop: wonderfully weird.',finale:'The last odd piece fits.',quote:'The strangest company makes the best journey.',daily:['Strange cargo. Flawless delivery.','Odd shapes. Excellent company.','Chaos packed. Weirdness preserved.']}
  };
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function cleanName(value){
    if(typeof value!=='string')return '';
    const wellFormed=Array.from(value).filter(c=>!(c.length===1&&c.charCodeAt(0)>=0xd800&&c.charCodeAt(0)<=0xdfff)).join('');
    const text=wellFormed.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\ufffe\uffff]/g,'').replace(/\s+/g,' ').trim();
    const parts=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),x=>x.segment):Array.from(text);
    return parts.slice(0,24).join('');
  }
  function describe(level,index,completed=0){
    const theme=themes[level.artTheme]?level.artTheme:'odd',t=themes[theme],chapter=level.chapterInfo.index,total=level.chapterInfo.total;
    const scope=level.isDaily?'daily':completed===total?'chapter':level.chapterPosition===total-1?'finale':'trip';
    const dailyNumber=level.isDaily?Array.from(level.dateKey||'').reduce((n,c)=>n+c.charCodeAt(0),0):0;
    return {theme,journey:level.chapterInfo.theme,scope,featured:scope!=='trip',color:t.color,soft:t.soft,
      kicker:scope==='daily'?'DAILY DEPARTURE COMPLETE':scope==='chapter'?'CHAPTER COMPLETE':scope==='finale'?'FINAL TRIP PACKED':'A PERFECTLY PECULIAR FIT',
      edition:level.isDaily?`${level.dateKey} · ${level.chapterInfo.name}`:`CHAPTER ${String(chapter+1).padStart(2,'0')} · ${completed} / ${total} TRIPS PACKED`,
      title:scope==='daily'?"Today's chaos, beautifully packed.":scope==='chapter'?(level.chapterInfo.quote?'Every traveller made it.':t.title):scope==='finale'?t.finale:'A perfectly peculiar fit.',
      copy:scope==='daily'?'One shared puzzle. Your own little victory.':scope==='chapter'?`All ${total} trips through ${level.chapterInfo.name} are complete.`:scope==='finale'?`${completed} of ${total} trips packed. A few more adventures will complete this chapter.`:`${level.name} is ready for departure.`,
      quote:scope==='daily'?t.daily[dailyNumber%t.daily.length]:(level.chapterInfo.quote||t.quote)};
  }
  function sized(svg,x,y,w,h){const end=svg.indexOf('>');return svg.slice(0,end).replace(/\s(?:x|y|width|height)="[^"]*"/g,'').replace('<svg ',`<svg x="${x}" y="${y}" width="${w}" height="${h}" `)+svg.slice(end);}
  function scene(theme,journey=''){
    const t=themes[theme]||themes.odd,C=root.PackCharacters,A=root.PackArt;
    const sparkle=(x,y,s)=>`<path d="M${x} ${y-s}q0 ${s} ${s} ${s}q-${s} 0 -${s} ${s}q0 -${s} -${s} -${s}q${s} 0 ${s} -${s}Z" fill="${t.color}" opacity=".6"/>`;
    let background='',cast='';
    if(theme==='cats'&&C){
      background='<path d="M120 240V70q0-45 45-45h85q45 0 45 45v170" fill="#e7c886" opacity=".55"/><path d="M207 35v185M135 126h143" stroke="#fff6df" stroke-width="8"/><path d="M680 233v-92m0 55q-68-15-45-63q55 12 45 63m0-25q62-7 43-49q-47 10-43 49" fill="#b8c59d" stroke="#7c9169" stroke-width="3"/><path d="M654 204h53l-8 40h-37Z" fill="#c89171"/>';
      cast=sized(C.piece('ice',0,'cats',journey),273,61,184,184)+sized(C.piece('sunscreen',0,'cats',journey),465,62,92,184)+sized(C.piece('sandals',0,'cats',journey),555,97,145,145);
    }else if(theme==='dogs'&&C){
      background='<path d="m124 240 104-190 116 190Z" fill="#d0b178" stroke="#8a8261" stroke-width="3"/><path d="m228 50 8 190h-70Z" fill="#f7edce"/><path d="M710 239V45m-55 110 55-92 58 92m-75 15 18-60 65 105" fill="#a7bca2" stroke="#7c987a" stroke-width="5" stroke-linejoin="round"/>';
      cast=sized(C.piece('ice',0,'dogs',journey),302,66,181,181)+sized(C.piece('sunscreen',0,'dogs',journey),475,58,95,190)+sized(C.piece('sandals',0,'dogs',journey),570,104,143,143);
    }else if(A){
      background='<circle cx="180" cy="103" r="64" fill="#f4e8b4"/><circle cx="205" cy="84" r="53" fill="#e4daeb"/><path d="m688 171 33 16 50-37-30 49 20 26-34-14-40 27 23-41Z" fill="#ad9ab8"/>';
      cast=sized(A.portrait('vampire'),266,68,150,170)+sized(A.portrait('octopus'),414,45,170,193)+sized(A.portrait('yeti'),582,83,135,154);
    }
    const destinations={
      seaside:'<circle cx="170" cy="69" r="36" fill="#ebca77"/><path d="M80 228q60-30 120 0t120 0m300 0q60-30 120 0t80 0" fill="none" stroke="#8cbdc2" stroke-width="13"/><path d="M725 215V69m-65 44q65-95 130 0Z" fill="#e39a7c" stroke="#6f938f" stroke-width="4"/>',
      rooftops:'<circle cx="164" cy="62" r="35" fill="#e6d59b"/><path d="M65 237V140l71-52 70 52v97m490 0V129l51-42 66 42v108" fill="#bbc2d7" stroke="#7c88a5" stroke-width="4"/><path d="m125 156 27 0m574 4h26" stroke="#fff1bd" stroke-width="12"/>',
      bazaar:'<path d="M78 28q365 70 744 0" fill="none" stroke="#9d7657" stroke-width="4"/><g fill="#dc936a" stroke="#a66b51" stroke-width="3"><rect x="126" y="48" width="56" height="76" rx="20"/><rect x="710" y="49" width="56" height="76" rx="20"/></g><path d="M154 124v20m584-19v20" stroke="#d8bc73" stroke-width="5"/>',
      aurora:'<path d="M55 85q160-110 340-35t445-5M55 113q160-110 340-35t445-5" fill="none" stroke="#a4cbb8" stroke-width="17" opacity=".6"/><path d="m66 238 93-99 93 99m411 0 79-104 92 104" fill="#dce7e6" stroke="#a9c6c3" stroke-width="3"/>'
    };
    background=destinations[journey]||background;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 270" width="900" height="270" aria-hidden="true"><path d="M58 232q392-77 784 0v38H58Z" fill="${t.soft}"/><ellipse cx="469" cy="239" rx="250" ry="15" fill="${t.color}" opacity=".1"/>${background}${sparkle(352,36,15)}${sparkle(625,54,10)}${sparkle(105,173,10)}${sparkle(790,110,13)}${cast}</svg>`;
  }
  function wrap(text,max=38){const lines=[];let line='';for(const word of text.split(' ')){if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
  function cardSVG(details,run,name){
    const player=cleanName(name),quote=wrap(details.quote),title=wrap(details.title,33),stars='★'.repeat(run.stars)+'☆'.repeat(3-run.stars);
    const text=(value,y,size=28,extra='')=>{const color=/fill="([^"]+)"/.exec(extra)?.[1]||'#2d3c32';return `<text x="450" y="${y}" text-anchor="middle" font-family="Arial, 'PingFang SC', sans-serif" font-size="${size}" fill="${color}" ${extra.replace(/fill="[^"]*"/g,'')}>${escape(value)}</text>`;};
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100"><rect width="900" height="1100" fill="#f6f1e4"/><rect x="26" y="26" width="848" height="1048" rx="24" fill="none" stroke="${details.color}" stroke-width="2"/><rect x="42" y="42" width="816" height="1016" rx="17" fill="none" stroke="${details.color}" stroke-dasharray="3 8" opacity=".35"/>${text('PACK THE CHAOS',97,21,'letter-spacing="4" font-weight="bold"')}${text(details.kicker,150,18,`letter-spacing="2" fill="${details.color}"`)}${sized(scene(details.theme,details.journey),0,170,900,270)}${text(details.edition,473,19)}${title.map((l,i)=>text(l,535+i*49,39,'font-weight="bold"')).join('')}${quote.map((l,i)=>text(l,667+i*39,28,'font-style="italic"')).join('')}${player?text('Packed by '+player,800,/[^\x00-\x7f]/.test(player)?25:28):text('A little room. A lovely adventure.',800,24)}${text(stars,872,42,`fill="${details.color}" letter-spacing="8"`)}${text(`${run.moves} moves   ·   ${run.hints===0?'No hints':run.hints+' hints'}`,925,22)}<path d="M190 969h520" stroke="${details.color}" opacity=".35"/>${text('ODD SHAPES. GOOD COMPANY.',1012,17,'letter-spacing="3"')}</svg>`;
  }
  return Object.freeze({cleanName,describe,scene,cardSVG,escape});
});
