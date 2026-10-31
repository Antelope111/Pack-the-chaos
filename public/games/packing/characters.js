/* Original pose-shaped cats and dogs for Pack the Chaos.
 * Bodies, paws and tails form the puzzle silhouette. Each illustration is
 * clipped to the exact occupied-cell union; there are no tile backgrounds.
 * Rotation is a clockwise quarter-turn applied to the entire illustration.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PackCharacters = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ink = '#433c39', cream = '#fff5df', pink = '#e5a19c';
  const data = {
    coffin: { cells:[[0,0],[0,1],[0,2],[0,3]], pose:'long', head:[50,48], cat:['Noodle · the long nap','#d49c62','#a66a42','sleepy'], dog:['Frankie · the dachshund','#b97750','#714b3d','happy'] },
    sunscreen: { cells:[[0,0],[0,1]], pose:'bean', head:[50,48], cat:['Miso · pocket kitten','#e8c875','#bc9450','curious'], dog:['Pip · pocket terrier','#d4b58b','#8f795c','curious'] },
    parasol: { cells:[[0,0],[1,0],[2,0],[1,1]], pose:'sploot', head:[50,48], cat:['Peaches · the pancake','#e4aa90','#ba7c69','happy'], dog:['Waffles · the sploot','#dda45d','#976535','happy'] },
    glasses: { cells:[[1,0],[2,0],[0,1],[1,1]], pose:'zig', head:[250,48], cat:['Ziggy · liquid cat','#a5b6ba','#708d95','curious'], dog:['Pretzel · the twist','#bf8a68','#765442','wink'] },
    sandals: { cells:[[0,0],[0,1],[1,1]], pose:'curl', head:[50,48], cat:['Fig · the little curl','#b9a5bf','#8a7793','sleepy'], dog:['Bean · curled corgi','#e0af6a','#a37744','happy'] },
    headphones: { cells:[[0,0],[2,0],[0,1],[1,1],[2,1]], pose:'hug', head:[50,48], cat:['Velcro · needs a cuddle','#b6c2a2','#819572','happy'], dog:['Boomer · belly rubs','#e9d2ab','#b19a73','happy'] },
    ice: { cells:[[0,0],[1,0],[0,1],[1,1]], pose:'round', head:[65,56], cat:['Dumpling · round loaf','#dfd8c5','#aaa595','sleepy'], dog:['Mochi · cloud puppy','#eee2cc','#c8b99c','sleepy'] },
    fish: { cells:[[0,0],[1,0],[2,0],[1,1]], pose:'sploot', head:[250,48], cat:['Pickle · the drama cat','#a5b79d','#748e6d','grumpy'], dog:['Scout · flying ears','#b9aa97','#877969','curious'] },
    mug: { cells:[[0,0],[1,0],[0,1],[1,1],[0,2]], pose:'perch', head:[150,48], cat:['Biscuit · sofa royalty','#e6bd7f','#b38650','grumpy'], dog:['Maple · sitting pretty','#bb8061','#855540','curious'] },
    tent: { cells:[[0,0],[1,0],[2,0],[1,1],[1,2]], pose:'star', head:[150,48], cat:['Socks · big stretch','#9caeae','#647f85','happy'], dog:['Rocket · play bow','#c99770','#875c43','happy'] },
    camera: { cells:[[0,0],[1,0],[0,1],[1,1]], pose:'round', head:[135,57], cat:['Truffle · tuxedo loaf','#777b83','#535660','wink'], dog:['Dot · the dalmatian','#e9dfcf','#7b7975','wink'] },
    toothbrush: { cells:[[0,0],[0,1],[0,2],[1,2]], pose:'longcurl', head:[50,48], cat:['Chai · tail-first traveler','#bf9d77','#927250','curious'], dog:['Stretch · long weekend','#bd8157','#79523e','happy'] },
    hat: { cells:[[0,0],[0,1],[0,2],[1,2]], pose:'longcurl', head:[50,48], cat:['Cleo · the diva','#d5b6b1','#ab8585','grumpy'], dog:['Olive · sleepy spaniel','#b8b499','#898a6e','sleepy'] },
    book: { cells:[[0,0],[1,0],[0,1],[1,1]], pose:'round', head:[66,57], cat:['Pudding · cinnamon roll','#d8a46a','#a57142','sleepy'], dog:['Toast · cinnamon pup','#d9aa76','#9e764b','sleepy'] },
    socks: { cells:[[0,0],[1,0],[1,1],[2,1]], pose:'zag', head:[50,48], cat:['Domino · bendy bandit','#b6afa7','#736e6a','wink'], dog:['Tango · sideways snooze','#d9bc98','#97785b','sleepy'] },
    snowglobe: { cells:[[0,0],[1,0],[0,1],[1,1]], pose:'round', head:[134,57], cat:['Cloud · enormous fluff','#dddcd0','#a7aca2','curious'], dog:['Flurry · fluffy cloud','#eee5d5','#c5bbaa','happy'] },
    plant: { cells:[[0,0],[0,1],[1,1],[0,2],[0,3]], pose:'wave', head:[50,48], cat:['Gizmo · high five','#b1a4bb','#83758e','happy'], dog:['Captain · high five','#c5a983','#8c7357','wink'] },
    passport: { cells:[[0,0],[0,1],[0,2]], pose:'long', head:[50,48], cat:['Ribbon · elegant stretch','#dcae9d','#b77d70','wink'], dog:['Slinky · sausage dog','#c89462','#865e40','curious'] }
  };
  let serial = 0;
  const path = (d, fill, extra = '') => `<path d="${d}"${fill ? ` fill="${fill}"` : ''}${extra}/>`;
  const ellipse = (x,y,rx,ry,fill,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"${extra}/>`;
  const detail = (d, color=ink, width=3) => path(d,'none',` stroke="${color}" stroke-width="${width}"`);
  function bodyFor(spec, coat, shade, species) {
    const h=(Math.max(...spec.cells.map(c=>c[1]))+1)*100;
    const parts=[];
    switch (spec.pose) {
      case 'long':
        parts.push(path(`M21 60Q4 110 15 ${h-55}Q15 ${h-14} 42 ${h-10}Q58 ${h-3} 73 ${h-17}Q89 ${h-28} 86 ${h-64}L81 73Z`,coat));
        parts.push(ellipse(50,h/2+24,23,h/2-64,cream,' stroke="none" opacity=".82"'));
        parts.push(detail(`M28 98Q24 150 33 ${h-71}M72 98Q78 150 68 ${h-71}`,shade,4));
        parts.push(path(`M72 ${h-99}Q87 ${h-68} 80 ${h-37}Q70 ${h-14} 41 ${h-22}Q26 ${h-27} 35 ${h-42}Q43 ${h-49} 54 ${h-43}`,coat));
        parts.push(path(`M20 ${h-46}Q12 ${h-14} 31 ${h-11}Q48 ${h-6} 48 ${h-34}M51 ${h-35}Q48 ${h-8} 69 ${h-12}Q84 ${h-17} 76 ${h-45}`,coat));
        parts.push(detail(`M28 ${h-23}v7m9-7v8m24-8v8m9-10v7`,shade,2.5));
        break;
      case 'bean':
        parts.push(path('M24 64C9 82 7 146 19 174Q26 195 50 192Q75 195 83 173C95 145 88 80 76 64Z',coat));
        parts.push(ellipse(50,125,25,45,cream,' stroke="none"'));
        parts.push(path('M20 153Q8 177 26 187Q42 194 43 175M61 174Q59 194 77 186Q91 176 80 153',coat));
        parts.push(detail('M29 176v6m41-6v6M28 95q-9 20-4 36m48-36q9 20 4 36',shade,3));
        break;
      case 'sploot': {
        parts.push(path('M48 20C96 5 215 6 252 20Q286 31 289 55Q293 82 263 89L190 91Q190 134 181 164Q174 191 159 192Q144 194 148 164Q143 195 125 187Q109 179 111 150L112 91Q71 91 43 84Z',coat));
        parts.push(path('M92 34Q160 17 220 32Q250 43 247 69Q179 84 96 70Z',cream,' stroke="none" opacity=".88"'));
        parts.push(detail('M163 101v65m-30-6-2 17m38-6-2 11',shade,3));
        parts.push(path('M232 25Q279 14 282 42Q284 63 259 67Q249 68 250 58',coat));
        parts.push(detail('M109 39q22 12 17 33m22-35q22 12 17 33m22-35q22 12 17 30',shade,6));
        break;
      }
      case 'zig':
        parts.push(path('M255 19Q214 7 145 13Q111 16 111 50L111 115L45 113Q10 112 9 148Q8 185 44 188L155 190Q188 189 189 157L189 87L256 85Z',coat));
        parts.push(detail('M219 48H155Q149 48 149 74V139Q148 151 135 151H39',cream,26));
        parts.push(path('M73 126Q26 115 23 146Q24 171 55 169Q73 168 77 156',coat));
        parts.push(detail('M163 97q12 3 20 11m-23 9 23 7m-61 50v10m10-10v11',shade,4));
        break;
      case 'zag':
        parts.push(path('M45 19Q86 7 155 13Q189 16 189 50L189 115L255 113Q290 112 291 148Q292 185 256 188L145 190Q112 189 111 157L111 87L44 85Z',coat));
        parts.push(detail('M81 48H145Q151 48 151 74V139Q152 151 165 151H261',cream,26));
        parts.push(path('M227 126Q274 115 277 146Q276 171 245 169Q227 168 223 156',coat));
        parts.push(detail('M137 97q-12 3-20 11m23 9-23 7m61 50v10m-10-10v11',shade,4));
        break;
      case 'curl':
      case 'longcurl': {
        const bottom=h-1;
        parts.push(path(`M22 57Q5 105 14 ${h-61}Q17 ${h-15} 60 ${h-11}L150 ${h-10}Q190 ${h-8} 191 ${h-43}Q193 ${h-76} 154 ${h-83}L88 ${h-85}L84 61Z`,coat));
        parts.push(path(`M36 90Q27 145 45 ${h-58}Q59 ${h-36} 98 ${h-39}`,cream,' stroke="none"'));
        parts.push(path(`M88 ${h-64}Q132 ${h-94} 167 ${h-65}Q192 ${h-43} 160 ${h-23}Q129 ${h-10} 111 ${h-34}Q102 ${h-47} 119 ${h-52}`,coat));
        parts.push(detail(`M30 ${h-91}q12 8 28 8m-26 12q12 7 26 5m-9 36v8m10-9v9`,shade,3.5));
        break;
      }
      case 'hug':
        parts.push(path('M19 59Q5 107 15 152Q23 193 80 190H228Q282 187 287 148L286 55Q286 18 252 16Q217 17 216 51L216 112Q184 105 151 112Q115 108 85 114L84 62Z',coat));
        parts.push(path('M40 101Q29 155 75 166Q153 185 222 165Q255 155 251 106',cream,' stroke="none"'));
        parts.push(path('M219 80Q215 38 245 32Q278 28 275 59Q273 77 252 80',coat));
        parts.push(path('M88 131Q121 118 135 145Q146 169 122 178Q101 183 92 163M180 130Q153 121 145 145Q139 169 158 175Q176 178 185 159',coat));
        parts.push(detail('M107 158l7 10m-1-18 7 10m44-3-6 9m0-17-7 9',shade,2.5));
        break;
      case 'round':
        parts.push(path('M27 39C49 6 130 3 164 31C201 59 202 132 174 169C146 202 65 198 29 172C1 149 2 74 27 39Z',coat));
        parts.push(ellipse(103,115,63,58,cream,' stroke="none" opacity=".85"'));
        parts.push(path('M164 90C203 132 167 182 114 181C80 183 72 153 95 144Q111 138 124 147',coat));
        parts.push(path('M39 116Q22 151 41 163Q64 173 75 149M68 112Q51 147 71 158Q92 171 101 147',coat));
        parts.push(detail('M45 146l7 9m22-14 7 9M138 85q16-7 29-2m-28 12q17-5 28 0',shade,3));
        if(species==='dogs' && spec.dog[0].startsWith('Dot'))parts.push(ellipse(160,54,12,16,shade,' stroke="none"'),ellipse(32,100,10,14,shade,' stroke="none"'),ellipse(132,170,15,9,shade,' stroke="none"'),ellipse(159,139,11,16,shade,' stroke="none"'));
        if(spec.cat[0].startsWith('Cloud')||spec.dog[0].startsWith('Flurry')) parts.push(detail('M23 75l7 5-9 8m158 14-8 7 8 7M45 181l7-8 7 10',shade,3));
        break;
      case 'perch':
        parts.push(path('M68 15Q116 6 156 22Q191 42 189 92L190 145Q190 185 149 190L88 189L89 248Q89 291 52 291Q12 291 12 247L13 71Q12 24 68 15Z',coat));
        parts.push(ellipse(72,126,42,73,cream,' stroke="none"'));
        parts.push(path('M87 96Q126 81 146 112Q168 148 145 169Q126 188 110 165L91 135',coat));
        parts.push(detail('M134 149l-3 12m12-8-3 11M31 205v46q0 24 18 25m16-54v53',shade,3.5));
        parts.push(path('M20 203Q9 259 32 277Q49 292 66 276',coat));
        break;
      case 'star':
        parts.push(path('M113 34Q75 13 32 16Q8 20 9 48Q8 78 37 83L110 88L111 250Q109 288 132 291Q151 294 151 264Q151 293 171 290Q192 286 189 247L189 88L262 84Q293 80 290 49Q291 20 267 16Q227 11 186 34Z',coat));
        parts.push(ellipse(150,170,24,78,cream,' stroke="none"'));
        parts.push(detail('M150 219v48M28 46h10m-10 12h10m224-12h10m-10 12h10m-145 214v8m8-9v9m30-9v9m9-10v9',shade,3));
        parts.push(detail('M119 111l18 8m44-8-18 8m-44 17 18 8m44-8-18 8',shade,5));
        break;
      case 'wave':
        parts.push(path('M22 65Q9 106 14 176L16 340Q14 387 40 391Q56 394 57 362Q57 391 75 387Q90 380 86 342L84 191H147Q190 192 190 153Q190 119 164 114Q142 110 137 131L135 143H86L83 67Z',coat));
        parts.push(ellipse(50,242,24,95,cream,' stroke="none"'));
        parts.push(detail('M151 139l14-3m-14 12 17-3m-18 13h17M33 365v12m9-13v14m26-14v11M25 206l14 8m-14 12 14 8',shade,3));
        parts.push(path('M71 260Q90 301 75 326Q66 340 51 335',coat));
        break;
    }
    if(species==='dogs' && !['round','long'].includes(spec.pose)) {
      const spot=spec.cells[Math.floor(spec.cells.length/2)];
      parts.push(ellipse(spot[0]*100+57,spot[1]*100+55,17,23,shade,' stroke="none" opacity=".65" transform="rotate(18 '+(spot[0]*100+57)+' '+(spot[1]*100+55)+')"'));
    }
    return parts.join('');
  }
  function face(x,y,coat,shade,mood,species,index) {
    const isDog=species==='dogs';
    let art='';
    if(isDog) {
      art += path(`M${x-26} ${y-23}Q${x-49} ${y-40} ${x-43} ${y+14}Q${x-38} ${y+36} ${x-24} ${y+16}M${x+26} ${y-23}Q${x+49} ${y-40} ${x+43} ${y+14}Q${x+38} ${y+36} ${x+24} ${y+16}`,shade);
      art += path(`M${x-28} ${y-26}Q${x} ${y-41} ${x+28} ${y-26}Q${x+40} ${y-14} ${x+34} ${y+18}Q${x+28} ${y+40} ${x} ${y+39}Q${x-31} ${y+40} ${x-35} ${y+16}Q${x-40} ${y-14} ${x-28} ${y-26}Z`,coat);
      if(index%3===0) art+=ellipse(x-17,y-3,16,23,shade,' stroke="none"');
      art+=path(`M${x-5} ${y-30}Q${x+7} ${y-7} ${x+4} ${y+14}L${x-10} ${y+13}Q${x-13} ${y-13} ${x-5} ${y-30}`,cream,' stroke="none" opacity=".8"');
      art+=ellipse(x,y+22,26,19,cream,' stroke="none"');
    } else {
      art+=path(`M${x-36} ${y-10}L${x-35} ${y-40}Q${x-32} ${y-45} ${x-13} ${y-27}Q${x} ${y-31} ${x+13} ${y-27}Q${x+33} ${y-46} ${x+36} ${y-39}L${x+37} ${y-9}Q${x+46} ${y+7} ${x+31} ${y+26}Q${x+17} ${y+40} ${x} ${y+36}Q${x-22} ${y+40} ${x-36} ${y+24}Q${x-45} ${y+9} ${x-36} ${y-10}Z`,coat);
      art+=path(`M${x-29} ${y-29}l11 7-11 4Z M${x+29} ${y-29}l-11 7 11 4Z`,pink,' stroke="none"');
      art+=path(`M${x-11} ${y-28}l6 12m6-14v12m7-10-3 11`,shade,' stroke-width="4.5"');
      if(index%3===2)art+=path(`M${x-27} ${y+13}Q${x-7} ${y+5} ${x} ${y+22}Q${x+9} ${y+6} ${x+27} ${y+13}Q${x+26} ${y+31} ${x} ${y+33}Q${x-24} ${y+32} ${x-27} ${y+13}`,cream,' stroke="none"');
    }
    const eyeY=y+2;
    let eyes='';
    if(mood==='sleepy') eyes=detail(`M${x-24} ${eyeY}q8 8 15 0m18 0q8 8 15 0`,ink,3);
    else if(mood==='happy') eyes=detail(`M${x-24} ${eyeY+3}q7-10 14 0m20 0q7-10 14 0`,ink,3);
    else if(mood==='wink') eyes=ellipse(x-17,eyeY,4,6,ink,' stroke="none"')+detail(`M${x+10} ${eyeY}l12 5-12 3`,ink,3);
    else if(mood==='grumpy') eyes=detail(`M${x-25} ${eyeY-4}l15 4m20 0 15-4`,ink,3)+ellipse(x-16,eyeY+5,3.5,4,ink,' stroke="none"')+ellipse(x+16,eyeY+5,3.5,4,ink,' stroke="none"');
    else eyes=ellipse(x-17,eyeY,5,7,ink,' stroke="none"')+ellipse(x+17,eyeY,5,7,ink,' stroke="none"')+ellipse(x-18,eyeY-2,1.6,2,cream,' stroke="none"')+ellipse(x+16,eyeY-2,1.6,2,cream,' stroke="none"');
    art+=`<g class="pet-eyes">${eyes}</g>`;
    if(isDog) {
      art+=path(`M${x-8} ${y+14}Q${x} ${y+10} ${x+8} ${y+14}Q${x+9} ${y+22} ${x} ${y+24}Q${x-9} ${y+21} ${x-8} ${y+14}Z`,ink,' stroke-width="2"');
      art+=detail(`M${x} ${y+24}v5m0-1q-7 7-13 0m13 0q7 7 13 0`,ink,2.5);
      if(mood==='happy'||mood==='wink')art+=path(`M${x-5} ${y+32}h11q2 12-5 12-8 0-6-12Z`,pink,' stroke-width="2"');
    } else {
      art+=path(`M${x-5} ${y+14}q5-4 10 0l-5 5Z`,pink,' stroke-width="2"');
      art+=detail(`M${x} ${y+19}v4m0 0q-6 7-12 0m12 0q6 7 12 0`,ink,2.4);
      art+=detail(`M${x-27} ${y+14}l-12-3m12 10-12 2m66-9 12-3m-12 10 12 2`,ink,2);
    }
    art+=ellipse(x-27,y+14,5,2.5,pink,' stroke="none" opacity=".65"')+ellipse(x+27,y+14,5,2.5,pink,' stroke="none" opacity=".65"');
    return `<g class="pet-face">${art}</g>`;
  }
  // Costumes live inside the same cell-union clip as the pet; collision shapes stay unchanged.
  const outfits={
    rooftops:['moonbeam scout','chimney explorer','midnight lookout'],
    seaside:['sunshine surfer','beach nap expert','tide-pool tourist'],
    bazaar:['lantern keeper','lucky-charm seller','midnight merchant'],
    aurora:['northern dreamer','snowflake catcher','cocoa companion']
  };
  function accessory(x,y,journey,index=0){
    if(!outfits[journey])return '';
    const color=['#da826c','#6f9c9a','#d4af62'][index%3];
    let art='';
    if(journey==='seaside'){
      art=`<path d="M-33 27Q0 39 33 27l-8 17H-23Z" fill="${color}"/><path d="m-22 32 39 7m-34 1 22 2" stroke="${cream}" stroke-width="3"/><g class="holiday-shades"><path d="M-36-6h29v12q-4 14-23 5Zm43 0h29l-6 17Q11 20 7 6Z" fill="#354652"/><path d="M-7-1Q0-6 7-1m-43-3-6-3m78 3 6-3"/><g class="lens-glint" stroke="#c2e9e3" stroke-width="3"><path d="m-28-1 10 10m35-10 10 10"/></g></g>`;
    }else if(journey==='aurora'){
      art=`<path d="M-36 0Q-38-32 0-33 38-32 36 0" stroke="${color}" stroke-width="7"/><ellipse cx="-35" cy="3" rx="10" ry="16" fill="${color}"/><ellipse cx="35" cy="3" rx="10" ry="16" fill="${color}"/><path d="M-33 29Q0 40 33 29v12Q0 51-33 40Z" fill="${color}"/><path d="m-22 33 2 9m12-7 1 10m13-10-1 10m14-12-2 10" stroke="${cream}" stroke-width="2.5"/><g class="scarf-tail"><path d="m14 38 13-1 8 11-18 1Z" fill="${color}"/><path d="m19 45 12-1m-10 5v3m6-4 1 3m5-4 2 3" stroke="${cream}" stroke-width="2"/></g>`;
    }else if(journey==='rooftops'){
      art=`<path d="M-30-19Q0-28 30-19" stroke="#596482" stroke-width="10"/><circle cy="-24" r="10" fill="#e4c975"/><circle cy="-24" r="5" fill="#fff4ce" stroke-width="2"/><circle class="headlamp-glow" cy="-24" r="14" fill="#ffe89a" stroke="none" opacity=".25"/><path d="M-28 29Q0 40 28 29" stroke="#667895" stroke-width="7"/><g class="moon-charm"><path d="M4 35Q-10 34-9 44q1 10 13 8-9-6 0-17Z" fill="#e9c971" stroke-width="2"/></g>`;
    }else if(journey==='bazaar'){
      art=`<path d="M-27-24Q0-43 27-24l2 6h-58Z" fill="${color}"/><path d="M-30-18h60" stroke="#e9c971" stroke-width="5"/><path d="M-28 29Q0 37 28 29l-7 15h-42Z" fill="#e2c995"/><path d="m-16 32 5 10m11-8v10m13-12-4 11" stroke="#ab614f" stroke-width="3"/><g class="lantern-charm"><path d="M0 35v4" stroke-width="2"/><rect x="-8" y="39" width="16" height="13" rx="5" fill="#de8262" stroke-width="2"/><path d="M0 41v8m-3 3v3m6-3v3" stroke="#ffe5ac" stroke-width="2"/></g>`;
    }
    return `<g class="pet-costume costume-${journey}" transform="translate(${x} ${y})" stroke-width="3">${art}</g>`;
  }
  function name(id,theme,journey='') { const d=data[id]; if(!d)return 'Little traveler';const base=d[theme==='dogs'?'dog':'cat'][0];return outfits[journey]?base.split(' · ')[0]+' · '+outfits[journey][Object.keys(data).indexOf(id)%3]:base; }
  function piece(id,rotation=0,theme='cats',journey='') {
    const spec=data[id]; if(!spec) return '';
    theme=theme==='dogs'?'dogs':'cats';
    const [label,coat,shade,mood]=spec[theme==='dogs'?'dog':'cat'];
    const w=(Math.max(...spec.cells.map(c=>c[0]))+1)*100,h=(Math.max(...spec.cells.map(c=>c[1]))+1)*100;
    const r=((Math.round(rotation)%4)+4)%4, width=r%2?h:w,height=r%2?w:h;
    const transform=['',`translate(${h} 0) rotate(90)`,`translate(${w} ${h}) rotate(180)`,`translate(0 ${w}) rotate(270)`][r];
    const clip=`pet-shape-${++serial}`;
    const union=spec.cells.map(c=>`<rect x="${c[0]*100}" y="${c[1]*100}" width="100" height="100"/>`).join('');
    const index=Object.keys(data).indexOf(id);
    const body=bodyFor(spec,coat,shade,theme);
    const shapedBody=spec.pose==='sploot' && spec.head[0]>150 ? `<g transform="translate(300 0) scale(-1 1)">${body}</g>` : body;
    const art=shapedBody+face(...spec.head,coat,shade,mood,theme,index)+accessory(...spec.head,journey,index);
    return `<svg xmlns="http://www.w3.org/2000/svg" class="piece-illustration animal-character ${theme} journey-${outfits[journey]?journey:'classic'}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${name(id,theme,journey)}" fill="none" stroke="${ink}" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round"><defs><clipPath id="${clip}">${union}</clipPath></defs><g class="object-art" transform="${transform}"><g clip-path="url(#${clip})">${art}</g></g></svg>`;
  }
  function portrait(theme='cats',journey='') {
    theme=theme==='dogs'?'dogs':'cats';
    const cat=theme==='cats',coat=cat?'#d49c62':'#b97750',shade=cat?'#a66a42':'#714b3d';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" class="holiday-portrait" role="img" aria-label="${cat?'Miso the cat':'Frankie the dog'} on holiday" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="120" cy="118" r="103" fill="#faf3dc" stroke="none"/><circle cx="186" cy="55" r="25" fill="#e8c85e" stroke="none"/><path d="M45 225q-1-77 75-78 74 0 75 78" fill="${coat}"/><path d="M71 185q48 40 99 0l8 40H63Z" fill="#b6c9a5"/><path d="m75 160 44 25 44-25 9 31-52 9-53-9Z" fill="#e1846c"/><path d="m121 186 12 40h29l-18-35Z" fill="#e1846c"/><path d="m132 205 18-3m-15 13 21-3" stroke="#faf3dc" stroke-width="4"/><g transform="translate(120 103) scale(1.8) translate(-50 -48)">${face(50,48,coat,shade,'happy',theme,1)}${accessory(50,48,journey,0)}</g><path d="M41 196q-11 5-7 22 5 14 25 8l20-11-9-21Z" fill="${coat}"/><path d="m57 189 36-8 9 41-36 8Z" fill="#e8c85e"/><circle cx="79" cy="204" r="8" fill="#faf3dc" stroke-width="2"/><path d="m75 218 14-3M187 107v11m-5-5h10M38 66v12m-6-6h12" stroke="#b6c9a5" stroke-width="3"/></svg>`;
  }
  const themes=Object.freeze({cats:Object.freeze({name:'Catnap Express',subtitle:'A suitcase full of very liquid cats',passenger:'Miso',chapter:1}),dogs:Object.freeze({name:'The Good Dog Getaway',subtitle:'Long dogs, floppy ears, very good travelers',passenger:'Frankie',chapter:2})});
  return Object.freeze({piece,name,portrait,themes,pieceKeys:Object.freeze(Object.keys(data)),names:Object.freeze({cats:Object.freeze(Object.fromEntries(Object.keys(data).map(id=>[id,name(id,'cats')]))),dogs:Object.freeze(Object.fromEntries(Object.keys(data).map(id=>[id,name(id,'dogs')])))}),cells:id=>data[id]?data[id].cells.map(c=>c.slice()):[]});
});
