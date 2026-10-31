/* Original holiday illustrations for Pack the Chaos.
 * API: PackArt.piece(itemKey, clockwiseQuarterTurns), PackArt.portrait(theme),
 * and legacy PackArt.icon(itemKey) return complete, dependency-free SVG strings.
 * Piece silhouettes use the exact occupied-cell dimensions from levels.js.
 */
(function () {
  'use strict';
  const ink = '#29382e', paper = '#faf3dc', coral = '#e1846c', butter = '#e8c85e', sage = '#b6c9a5';
  const wrap = (body, label, portrait = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${portrait ? '240 240' : '100 100'}" role="img" aria-label="${label}" fill="none" stroke="${ink}" stroke-width="${portrait ? '3.5' : '3.2'}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const icons = {
    coffin: `<path d="M32 9 67 9 81 29 66 89 32 89 18 29Z" fill="${coral}"/><path d="m35 17 28 0 9 15-12 49H38L27 32Z" fill="${paper}"/><path d="m49 30 1 30m-10-20h20"/><path d="m24 30 6 1m39 0 7-1M33 83l-1 6m31-6 3 6"/>`,
    sunscreen: `<path d="m31 22 39 0-3 60H34Z" fill="${butter}"/><path d="M34 82h33v10H34z" fill="${coral}"/><path d="M31 22v-9h39v9" fill="${paper}"/><path d="M37 19h27"/><circle cx="50" cy="50" r="11" fill="${paper}"/><path d="M50 32v-4m0 44v-4M32 50h-4m44 0h-4M37 37l-3-3m32 32-3-3M37 63l-3 3m32-32-3 3"/><path d="m40 76 20 0" stroke="${paper}" stroke-width="4"/>`,
    parasol: `<path d="M12 48C15 21 34 13 50 13s36 10 39 35c-8-7-15-7-22 0-10-8-23-8-33 0-7-7-14-7-22 0Z" fill="${coral}"/><path d="M34 48c1-17 5-29 16-35 12 9 16 21 17 35" fill="${butter}"/><path d="M50 14v-7m0 36v38c0 13 17 13 17 0"/><path d="m27 28-5 6" stroke="${paper}" stroke-width="4"/><path d="M74 89h12" stroke="${sage}"/>`,
    glasses: `<path d="m10 37 6-13m74 13-6-13"/><path d="M9 36h33l-3 22c-1 11-21 13-26 1Zm49 0h33l-4 23c-5 12-25 10-26-1Z" fill="${ink}"/><path d="M42 41q8-9 16 0"/><path d="m18 42 14 0m38 0 12 0" stroke="${paper}" stroke-width="5"/><path d="m20 50 7 0m44 0 5 0" stroke="${sage}" stroke-width="3"/>`,
    sandals: `<g transform="rotate(-14 28 50)"><path d="M16 20C23 8 39 12 41 28l-2 42c-1 18-24 24-28 8C7 62 10 34 16 20Z" fill="${coral}"/><path d="m14 45 11-17 14 14M25 28v-7"/><path d="m17 65 16 1" stroke="${paper}" stroke-width="4"/></g><g transform="rotate(15 72 52)"><path d="M61 23C68 11 84 15 86 31l-2 42c-1 18-24 24-28 8-4-16-1-44 5-58Z" fill="${butter}"/><path d="m59 48 11-17 14 14M70 31v-7"/><path d="m62 69 16 1" stroke="${paper}" stroke-width="4"/></g>`,
    headphones: `<path d="M18 58V43C18 4 82 4 82 43v15" stroke-width="10"/><path d="M18 38C21 6 79 6 82 38" stroke="${sage}" stroke-width="5"/><rect x="12" y="44" width="22" height="38" rx="10" fill="${coral}"/><rect x="66" y="44" width="22" height="38" rx="10" fill="${coral}"/><path d="M24 54v18m52-18v18" stroke="${paper}" stroke-width="4"/><path d="M82 81c0 8-16 12-28 10"/><rect x="44" y="85" width="15" height="8" rx="4" fill="${butter}"/>`,
    ice: `<path d="m14 32 36-17 35 19-3 43-34 14-34-18Z" fill="${sage}"/><path d="m14 32 35 17 36-15-3 43-34 14-34-18Z" fill="${paper}"/><path d="m49 49-1 42m1-42 36-15-3 43-34 14Z" fill="${sage}"/><path d="m23 39 17 8m-17 7v12m36-8 16-7m-17 17 8-4" stroke="white" stroke-width="4"/><path d="M16 11v10m-5-5h10M85 9v10m-5-5h10" stroke="${butter}"/>`,
    fish: `<path d="M67 50 90 30 85 51 91 72Z" fill="${coral}"/><path d="M74 50C56 19 24 25 9 50c16 28 49 31 65 0Z" fill="${sage}"/><path d="m37 30 10-13 12 17M39 73l12 12 9-17" fill="${butter}"/><circle cx="25" cy="46" r="3" fill="${ink}" stroke="none"/><path d="M36 37c8 8 8 19 0 27m14-24 8 11-8 11M9 50h9"/><path d="m19 37 6-3" stroke="${paper}" stroke-width="4"/>`,
    mug: `<path d="M68 35h11c20 0 18 33-2 34H66" fill="${paper}"/><path d="M69 44h8c9 0 9 15-1 16h-8"/><path d="M20 31h50l-3 44c-2 13-40 13-43 0Z" fill="${coral}"/><path d="M20 31q25-10 50 0" fill="${paper}"/><path d="M30 42v21" stroke="${paper}" stroke-width="5"/><path d="M35 21c-10-9 8-10 0-19m19 19c-10-9 8-10 0-19" stroke="${sage}"/><path d="M30 90h35"/>`,
    tent: `<path d="m49 14 44 64-66 9L8 72Z" fill="${sage}"/><path d="m49 14 10 66-32 7L8 72Z" fill="${butter}"/><path d="m49 14-11 40 21 26L27 87 38 54 8 72"/><path d="m38 54 5 26-16 7Z" fill="${ink}"/><path d="m49 14 2-9m-40 68-5 9m86-4 4 8"/><path d="m61 39 15 21" stroke="${paper}" stroke-width="4"/>`,
    camera: `<path d="m35 29 5-12h25l5 12" fill="${coral}"/><rect x="9" y="29" width="82" height="54" rx="10" fill="${sage}"/><path d="M9 47h82"/><circle cx="51" cy="56" r="21" fill="${paper}"/><circle cx="51" cy="56" r="12" fill="${ink}"/><path d="m46 51 4-3" stroke="${paper}" stroke-width="4"/><rect x="73" y="36" width="10" height="7" rx="1" fill="${butter}"/><path d="M17 21h10v8H17" fill="${coral}"/><path d="m20 62 0 9" stroke="${paper}" stroke-width="4"/>`,
    toothbrush: `<g transform="rotate(23 50 50)"><path d="M41 38h18v47c0 12-18 12-18 0Z" fill="${coral}"/><path d="M42 38V12h17v26" fill="${paper}"/><path d="M43 16h24m-24 7h24m-24 7h24" stroke="${sage}" stroke-width="4"/><path d="M47 53v21" stroke="${paper}" stroke-width="4"/></g><path d="m75 13 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="${butter}" stroke-width="2"/>`,
    hat: `<path d="M10 66c0-11 80-11 80 0S10 90 10 66Z" fill="${butter}"/><path d="m26 60 7-33c2-10 31-10 34 0l7 33c-10 13-36 13-48 0Z" fill="${butter}"/><path d="m29 47-3 13c12 13 38 13 48 0l-3-13c-10 9-31 9-42 0Z" fill="${coral}"/><path d="m40 31-2 9" stroke="${paper}" stroke-width="5"/><path d="M15 71q36 10 70 0" stroke-width="2"/>`,
    book: `<path d="m19 21 53-9 11 66-55 10-9-8Z" fill="${coral}"/><path d="m19 21 8 8 56-10-11-7Z" fill="${paper}"/><path d="m27 29 11 59-10 0-9-8-9-56Z" fill="${sage}"/><path d="m27 29 56-10 9 59-54 10Z" fill="${coral}"/><path d="m39 43 29-5m-27 13 21-4m-19 14 29-5" stroke="${paper}" stroke-width="4"/><path d="m65 16 5 19 4-6 6 4-3-19" fill="${butter}"/>`,
    socks: `<g transform="rotate(-12 30 48)"><path d="M14 13h26v38l10 12c12 15-2 30-16 19L13 65Z" fill="${coral}"/><path d="M14 24h26m-26 9h26" stroke="${paper}" stroke-width="5"/><path d="m34 51-8 10m10 14 8-7" stroke-width="2"/></g><g transform="rotate(11 73 50)"><path d="M60 17h25v38l-9 13C66 85 48 76 55 61l5-10Z" fill="${sage}"/><path d="M60 28h25m-25 9h25" stroke="${paper}" stroke-width="5"/><path d="m65 53 9 9m-14 4 7 6" stroke-width="2"/></g>`,
    snowglobe: `<circle cx="50" cy="43" r="32" fill="${paper}"/><path d="M23 61q25-10 54 0" fill="${sage}"/><path d="m33 57 13-27 18 27Z" fill="${sage}"/><path d="m40 42 6-12 8 13-7-3Z" fill="white"/><path d="M29 72h42l8 16H21Z" fill="${coral}"/><path d="M21 88h58" stroke-width="5"/><circle cx="29" cy="38" r="2" fill="${butter}" stroke="none"/><circle cx="63" cy="27" r="2" fill="${butter}" stroke="none"/><circle cx="69" cy="48" r="2" fill="${butter}" stroke="none"/><path d="M30 25q-7 5-7 14" stroke="white" stroke-width="4"/><path d="M43 80h14" stroke="${paper}" stroke-width="3"/>`,
    plant: `<path d="M48 61V31m0 18L30 30m18 13 23-19"/><path d="M48 35C30 20 41 9 48 6c10 8 17 20 0 29Z" fill="${sage}"/><path d="M37 37C16 40 13 25 14 16c18-1 26 5 23 21Z" fill="${sage}"/><path d="M57 37c-2-20 13-26 29-21-1 16-12 27-29 21Z" fill="${sage}"/><path d="M25 58h50l-9 31H35Z" fill="${coral}"/><path d="M23 57h54v10H23z" fill="${butter}"/><path d="m39 73 3 9" stroke="${paper}" stroke-width="4"/>`,
    passport: `<g transform="rotate(-8 50 50)"><rect x="20" y="9" width="59" height="82" rx="7" fill="${sage}"/><path d="M28 10v80"/><circle cx="53" cy="45" r="17" fill="${butter}"/><path d="M36 45h34M53 28c-10 11-10 23 0 34m0-34c10 11 10 23 0 34M39 36h28m-28 18h28" stroke-width="2"/><path d="M41 75h25m-20 7h15" stroke="${paper}" stroke-width="4"/></g>`,
    umbrella: null,
    shoes: null,
    laptop: `<path d="M19 17h62v47H19Z" fill="${sage}"/><path d="M25 23h50v34H25Z" fill="${paper}"/><path d="M19 64 7 81c-2 4 4 7 9 7h68c5 0 11-3 9-7L81 64Z" fill="${coral}"/><path d="M29 73h42m-45 6h48m-33 6h18" stroke="${paper}" stroke-width="3"/><path d="m43 36 7-7 7 7-7 12Z" fill="${butter}"/>`,
    scarf: `<path d="M26 17c9-9 40-9 48 0v24c-5 12-44 12-48 0Z" fill="${coral}"/><path d="M26 25q23 12 48 0m-48 9q23 12 48 0" stroke="${paper}" stroke-width="4"/><path d="m44 46 23-2 9 40-24 6Z" fill="${coral}"/><path d="m49 58 22-5m-18 21 22-5" stroke="${paper}" stroke-width="5"/><path d="m52 90 1 6m8-8 1 7m8-9 1 7"/>`
  };
  icons.umbrella = icons.parasol;
  icons.shoes = icons.sandals;
  icons.coffee = icons.mug;
  icons.sunglasses = icons.glasses;
  icons.icecube = icons.ice;

  // Puzzle artwork uses one 100-unit square per occupied cell. The object itself
  // supplies the silhouette; there is deliberately no tile or polyomino backing.
  const displayNames = Object.freeze({
    coffin: 'Travel coffin', sunscreen: 'Moonblock SPF 666', parasol: 'Beach parasol',
    glasses: 'Sunset scarf', sandals: 'Beach sandals', headphones: 'Holiday headphones',
    ice: 'Emergency ice', fish: 'Flying-fish plush', mug: 'Giant travel mug',
    tent: 'Aloha shirt', camera: 'Instant camera', toothbrush: 'Travel snorkel',
    hat: 'Rain boot', book: 'Pocket travel guide', socks: 'Odd socks',
    snowglobe: 'Home snow globe', plant: 'Holiday cactus', passport: 'Boarding pass'
  });
  const pieces = {
    coffin: { w: 100, h: 400, body: `
      <path d="M29 8H71L92 54 79 383Q50 397 21 383L8 54Z" fill="#bc6658"/>
      <path d="M29 8H71L87 53 75 375Q50 387 25 375L13 53Z" fill="${coral}"/>
      <path d="M34 22H66L75 58 65 359Q50 366 35 359L25 58Z" fill="#f0ae88" stroke-width="3"/>
      <path d="m34 30-2 29 8 288M64 31l5 29-9 282" stroke="${paper}" stroke-width="3" opacity=".65"/>
      <path d="m28 82 2 26m1 13 2 51m35 48-3 87m-28 20 1 22" stroke="#bc6658" stroke-width="2.5"/>
      <path d="M42 99h16v24h14v15H58v47H42v-47H28v-15h14Z" fill="${butter}" stroke-width="3.5"/>
      <path d="M46 104h7m-7 26h-9" stroke="${paper}" stroke-width="3"/>
      <path d="M11 115h10v30H12m67-30h10l-1 30H78M17 267h10v30H18m55-30h10l-1 30H72" fill="${butter}" stroke-width="3.5"/>
      <path d="M33 235q17-16 34 0v38q-17 12-34 0Z" fill="${sage}" stroke-width="3"/>
      <path d="m36 249 10 3 4-8 4 8 10-3-4 13-10-3-10 3Z" fill="${ink}" stroke-width="2"/>
      <circle cx="47" cy="254" r="1.4" fill="${paper}" stroke="none"/><circle cx="53" cy="254" r="1.4" fill="${paper}" stroke="none"/>
      <path d="m33 370 4 4m26-4-4 4M32 16h3m30 0h3" stroke="${paper}" stroke-width="3"/>
    ` },
    sunscreen: { w: 100, h: 200, body: `
      <path d="M12 9Q50 4 88 9L80 164H20Z" fill="${butter}"/>
      <path d="M12 9Q50 4 88 9L87 26Q50 33 13 26Z" fill="${paper}" stroke-width="3"/>
      <path d="m20 14 1 8m10-9v10m10-10v10m10-10v10m10-10v10m10-10v10m10-9-1 8" stroke="#c8b996" stroke-width="2"/>
      <path d="m76 34-6 115H29" stroke="#d3a650" stroke-width="7"/>
      <path d="M20 163h60v24q-30 11-60 0Z" fill="${coral}"/>
      <path d="M24 174h52m-48 10h44" stroke="#bc6658" stroke-width="3"/>
      <path d="M23 46q26-8 52 0v96q-26 8-52 0Z" fill="${paper}" stroke="none"/>
      <text x="49" y="62" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="8" font-weight="bold">MOONBLOCK</text>
      <circle cx="49" cy="90" r="15" fill="${coral}" stroke-width="2.8"/>
      <path d="M49 69v-5m0 52v-5m-21-21h-5m52 0h-5M34 75l-3-3m36 36-3-3m-30 0-3 3m36-36-3 3" stroke-width="2.4"/>
      <path d="m43 88 2 1m9-1-2 1m-7 8q5 4 9-1" stroke-width="2"/>
      <text x="49" y="121" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="9" font-weight="bold" letter-spacing="2">SPF</text>
      <text x="49" y="139" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="19" font-weight="bold">666</text>
      <path class="object-highlight" d="m20 39-2 28" stroke="white" stroke-width="4" opacity=".7"/>
    ` },
    parasol: { w: 300, h: 200, body: `
      <path d="M146 75h9v82q0 22 13 22t13-18" stroke="${ink}" stroke-width="15"/>
      <path d="M146 75h9v82q0 22 13 22t13-18" stroke="${butter}" stroke-width="7"/>
      <path d="M150 10v-3" stroke-width="6"/>
      <path d="M9 90Q37 13 150 11 261 13 291 90q-26-13-47 0-23-13-47 0-24-13-47 0-24-13-47 0-24-13-47 0-24-13-47 0Z" fill="${coral}"/>
      <path d="M150 11Q83 30 56 90q24-13 47 0 5-57 47-79Z" fill="${paper}" stroke-width="2.8"/>
      <path d="M150 11q42 22 47 79 24-13 47 0-27-60-94-79Z" fill="${sage}" stroke-width="2.8"/>
      <path d="M150 11q-5 35 0 79" stroke-width="2.8"/>
      <path d="M37 61q19-25 42-33M218 35q21 12 33 28" stroke="${paper}" stroke-width="5" opacity=".7"/>
      <path d="M14 89v4m42-4v4m47-4v4m47-4v4m47-4v4m47-4v4m42-4v4" stroke="${butter}" stroke-width="5"/>
      <path d="M169 178q8 0 10-9" stroke="${paper}" stroke-width="3"/>
    ` },
    glasses: { w: 300, h: 200, body: `
      <path d="M114 9q52 7 94 1l78 1 3 75q-53 10-98 4l-1 90q-84 13-177 6l-2-77q47-7 96-3l1-77q0-16 6-20Z" fill="${coral}"/>
      <path d="M112 12q19 44 79 78l-1 90q-12-35-83-74l1-77q0-16 4-17Z" fill="#c76f61" stroke-width="3"/>
      <path d="M125 13q17 29 66 61m-75-36q17 30 75 51" stroke="${paper}" stroke-width="12"/>
      <path d="M217 12v73m27-73v73m27-72 1 72M37 109v73m27-74v75m27-75 1 75" stroke="${paper}" stroke-width="11"/>
      <path d="M123 20q16 25 63 57M20 117q43-5 81-3m20 62 61-6m22-153q37 2 72-1" stroke="#f3b39a" stroke-width="2.6" stroke-dasharray="4 6"/>
      <path d="m285 17 8 2m-7 11 7 1m-7 12 7 1m-7 12 7 1m-7 12 7 1m-8 11 8 2M13 119l-6 1m6 13-6 1m6 13-6 1m6 13-6 1m6 13-6 1" stroke="${ink}" stroke-width="3"/>
      <path d="M126 118q18 6 30 16m-27-6q14 5 24 14" stroke="#b25c51" stroke-width="2.6"/>
      <path d="m155 149 19-3 3 17-19 3Z" fill="${butter}" stroke-width="2"/>
      <path d="m161 154 9-1m-9 5 6-1" stroke-width="1.8"/>
    ` },
    sandals: { w: 200, h: 200, body: `
      <path d="M181 111c22 4 17 60-4 74-22 12-117 8-144-1-34-11-32-53 3-64 37-12 116-15 145-9Z" fill="#bb9651"/>
      <path d="M178 106c22 4 17 60-4 74-22 12-117 8-144-1-34-11-32-53 3-64 37-12 116-15 145-9Z" fill="${butter}"/>
      <path d="m170 117-17 31 21 25" stroke="${ink}" stroke-width="19"/>
      <path d="m170 117-17 31 21 25" stroke="${sage}" stroke-width="11"/>
      <path d="m153 148-15 1" stroke-width="6"/>
      <path d="M125 120q-22-2-44 1m44 49q-25 5-44 1" stroke="${paper}" stroke-width="4"/>
      <path d="M20 19C36-3 77 5 88 32c11 28 7 108-4 137-12 30-53 28-66 1C5 143 3 43 20 19Z" fill="#bc6658"/>
      <path d="M19 15C35-4 76 6 86 31c11 28 7 105-4 134-12 30-53 28-66 1C3 139 3 38 19 15Z" fill="${coral}"/>
      <path d="M22 33c9-15 40-15 49 2m-49 86c-1 18 4 41 13 48m33-52q-1 32-11 45" stroke="#f3b39a" stroke-width="4"/>
      <path d="m17 77 34-35 34 35" stroke="${ink}" stroke-width="19"/>
      <path d="m17 77 34-35 34 35" stroke="${paper}" stroke-width="11"/>
      <path d="M51 42V29" stroke-width="6"/>
      <path d="m26 74 20-20m12 1 16 16" stroke="#ccbba0" stroke-width="2.5"/>
      <path d="m35 141 17 7 13-8" stroke="#bc6658" stroke-width="3"/>
    ` },
    headphones: { w: 300, h: 200, body: `
      <path d="M29 82v39c0 45 44 72 121 72s121-27 121-72V82h-34v39c0 27-31 44-87 44s-87-17-87-44V82Z" fill="${sage}"/>
      <path d="M41 122c0 38 43 58 109 58s109-20 109-58" stroke="${paper}" stroke-width="9"/>
      <path d="M113 176q38 7 74-1" stroke="${ink}" stroke-width="17"/>
      <path d="M114 174q37 7 72-1" stroke="#667759" stroke-width="10"/>
      <path d="M23 11q29-9 56 0c15 24 14 87 0 109q-27 9-56 0C9 96 9 35 23 11Z" fill="${coral}"/>
      <path d="M221 11q29-9 56 0c14 24 14 85 0 109q-29 9-56 0c-14-22-15-85 0-109Z" fill="${coral}"/>
      <path d="M25 23q18-6 35-2c8 24 8 67 0 90q-17 4-35-2c-9-23-9-62 0-86Z" fill="${paper}" stroke-width="3.5"/>
      <path d="M240 21q17-4 35 2c9 24 9 63 0 86q-18 6-35 2c-8-24-8-67 0-90Z" fill="${paper}" stroke-width="3.5"/>
      <path d="M62 21q18 36 0 90m176-90q-18 36 0 90" stroke="#af6259" stroke-width="5"/>
      <path d="M30 35v57m240-57v57" stroke="#c8b996" stroke-width="3" stroke-dasharray="3 6"/>
      <circle cx="72" cy="66" r="7" fill="${butter}" stroke-width="2.5"/><circle cx="228" cy="66" r="7" fill="${butter}" stroke-width="2.5"/>
      <path d="M39 16h13m196 0h13" stroke="${paper}" stroke-width="4"/>
      <path d="M138 179h24" stroke="${butter}" stroke-width="3"/>
    ` },
    ice: { w: 200, h: 200, body: `
      <path d="m14 53 81-44 90 40-6 110-82 33-84-41Z" fill="#b4d5c9"/>
      <path d="m14 53 83 39 88-43-90-40Z" fill="#e4eee1"/>
      <path d="m97 92 88-43-6 110-82 33Z" fill="#89b8ac"/>
      <path d="m14 53 83 39v100l-84-41Z" fill="#b4d5c9"/>
      <path d="m30 51 65-29 64 27-63 29Z" fill="${paper}" stroke="none" opacity=".7"/>
      <path d="m27 72 24 12m-24 3v41m10 10 15 7m65-42 44-21m-43 35 22-11m23-1-2 37" stroke="white" stroke-width="7" opacity=".8"/>
      <path d="m64 112 10 12-5 18 12 15m48-110-12 7 9 7m25 85-10-5-12 14" stroke="#709e94" stroke-width="3" opacity=".65"/>
      <ellipse cx="56" cy="115" rx="5" ry="7" fill="#e4eee1" stroke="none"/><ellipse cx="144" cy="128" rx="6" ry="8" fill="#c8e3d4" stroke="none"/>
      <path d="m96 97 1 86" stroke="#709e94" stroke-width="2"/>
      <path d="m69 47 13-6m18 21 13-5" stroke="white" stroke-width="4"/>
    ` },
    fish: { w: 300, h: 200, body: `
      <path d="M116 80q-10 55 22 110 20-31 50-78L170 75Z" fill="${coral}"/>
      <path d="M129 96q-4 38 10 74m4-69q2 24 5 40m10-47-4 27" stroke="#bd6657" stroke-width="3"/>
      <path d="M213 44 287 12l-14 39 17 39-78-27Z" fill="${butter}"/>
      <path d="m252 37 21-13m-21 39 23 14m-35-25h27" stroke="#b88e45" stroke-width="3"/>
      <path d="M10 51C43 0 151-8 222 49c-50 58-155 62-212 2Z" fill="${sage}"/>
      <path d="M15 55q81 48 188 6-54 48-132 28-34-8-56-34Z" fill="${paper}" stroke="none"/>
      <path d="M10 51C43 0 151-8 222 49c-50 58-155 62-212 2Z" fill="none"/>
      <path d="M71 18q27 31 0 69" stroke-width="3.5"/>
      <path d="m105 30 18 19-18 20m31-39 18 19-18 20m31-32 13 12-13 13" stroke="#789875" stroke-width="4"/>
      <circle cx="44" cy="43" r="12" fill="${paper}" stroke-width="3"/><circle cx="44" cy="43" r="6" fill="${ink}" stroke="none"/>
      <path d="m41 40 6 6m0-6-6 6" stroke="${paper}" stroke-width="1.6"/>
      <path d="m12 53 15 4M31 66q12 5 23 4" stroke-width="3"/>
      <path d="M88 17q72-5 114 29m-94 44 15 33" stroke="${paper}" stroke-width="2" stroke-dasharray="4 6"/>
      <path d="m143 169 14-22" stroke="${paper}" stroke-width="4"/>
    ` },
    mug: { w: 200, h: 300, body: `
      <path d="M79 24h49q63 0 64 77 0 81-67 87H80v-39h42q31-3 31-47 0-39-29-39H80Z" fill="${butter}"/>
      <path d="M98 37h27q53 0 53 65 0 66-52 72h-26" stroke="${paper}" stroke-width="5"/>
      <path d="M13 30h76l-5 241q-1 18-33 19-31-1-33-19Z" fill="${coral}"/>
      <path d="M74 39 70 266q0 8-13 11" stroke="#bf6557" stroke-width="10"/>
      <path d="M23 44 27 251" stroke="#f2b49b" stroke-width="6"/>
      <path d="M10 16q39-14 80 0v20q-39 11-80 0Z" fill="${paper}"/>
      <path d="M13 17q36 8 74 0m-67 7v8m12-6v8m13-6v8m13-8v8m13-10v8m12-10v7" stroke="#c5b89b" stroke-width="2.5"/>
      <path d="M29 113q20-12 42 0l-2 78q-20 14-38 0Z" fill="${paper}" stroke-width="3"/>
      <path d="M48 173v-35m0 5q-13-20-17-6 9-4 17 6Zm0 0q16-22 20-8-9-3-20 8Z" fill="${sage}" stroke-width="2.8"/>
      <path d="M37 179q12-7 25 0" stroke="${coral}" stroke-width="3"/>
      <path d="m28 265 43 0m-39 13q17 5 32 0" stroke="${paper}" stroke-width="3"/>
      <path d="m167 78 0 32" stroke="#c5a146" stroke-width="3"/>
    ` },
    tent: { w: 300, h: 300, body: `
      <path d="m111 9-84 13-17 63 84 10 12-28-1 218q45 15 90 0l-1-218 12 28 84-10-17-63-84-13q-38 25-78 0Z" fill="${coral}"/>
      <path d="m111 9-15 34 31 25 23-35 24 35 31-25-16-34q-38 25-78 0Z" fill="${paper}" stroke-width="3"/>
      <path d="M150 34v253" stroke="#ab5e51" stroke-width="4"/>
      <path d="m14 73 77 10m118 0 77-10m-174 201q37 10 76 0" stroke="${paper}" stroke-width="5"/>
      <path d="M159 102h29v38q-14 12-29 0Z" fill="#d37662" stroke-width="2.6"/>
      <path d="M159 108h29" stroke="${paper}" stroke-width="3"/>
      <circle cx="150" cy="88" r="3.4" fill="${butter}" stroke-width="1.5"/><circle cx="150" cy="133" r="3.4" fill="${butter}" stroke-width="1.5"/><circle cx="150" cy="178" r="3.4" fill="${butter}" stroke-width="1.5"/><circle cx="150" cy="223" r="3.4" fill="${butter}" stroke-width="1.5"/><circle cx="150" cy="265" r="3.4" fill="${butter}" stroke-width="1.5"/>
      <g fill="${paper}" stroke="none">
        <path d="M54 36c-13-11-23 7-7 13-16 6-5 23 7 12 3 17 22 11 18-3 15 6 22-13 6-16-3-14-20-16-24-6Z"/>
        <path d="M233 37c-11-9-20 6-6 11-14 5-4 20 6 10 3 15 19 10 16-3 13 6 19-11 5-13-3-13-17-14-21-5Z"/>
        <path d="M121 174c-10-10-21 4-9 11-14 3-7 20 5 12 0 15 18 13 17 0 12 8 21-8 8-13 0-13-16-18-21-10Z"/>
        <path d="M172 224c-8-8-18 3-8 10-12 2-6 17 4 10 0 13 16 11 15 0 10 6 18-8 6-12 0-11-13-15-17-8Z"/>
      </g>
      <g fill="${butter}" stroke="none"><circle cx="61" cy="49" r="5"/><circle cx="240" cy="49" r="4"/><circle cx="125" cy="186" r="4"/><circle cx="175" cy="235" r="4"/></g>
      <path d="M112 115q4-22 23-19-2 18-23 19Zm51 71q4-20 23-17-2 18-23 17Zm-43 62q-1-21 17-24 4 18-17 24ZM75 30q12-13 20-6-5 13-20 6Zm142 35q-7 13-16 11 0-16 16-11Z" fill="${sage}" stroke="none"/>
      <path d="M111 78v43m80 74v58m-82 29q41 12 82 0" stroke="#f0b096" stroke-width="2.5" stroke-dasharray="4 6"/>
    ` },
    camera: { w: 200, h: 200, body: `
      <path d="M65 34V13q31-10 61 0v21" fill="${sage}"/>
      <path d="M75 17h41v18H75Z" fill="${ink}" stroke-width="2.5"/>
      <path d="M147 24h29v16h-29Z" fill="${coral}" stroke-width="3"/>
      <path d="M10 55q0-20 20-20h141q20 0 20 20v113q0 21-20 21H30q-20 0-20-21Z" fill="${paper}"/>
      <path d="M10 76h181v91q0 22-20 22H30q-20 0-20-22Z" fill="${coral}"/>
      <path d="M17 90h24v77H17Z" fill="#ba6658" stroke="none"/>
      <path d="M23 95v63m10-63v63" stroke="#e6a285" stroke-width="3"/>
      <circle cx="109" cy="113" r="57" fill="${sage}"/>
      <circle cx="109" cy="113" r="45" fill="${paper}" stroke-width="3"/>
      <circle cx="109" cy="113" r="33" fill="${ink}" stroke-width="3"/>
      <circle cx="109" cy="113" r="23" fill="#4e7168" stroke="none"/>
      <path d="M93 103q8-14 23-9" stroke="${paper}" stroke-width="8"/>
      <circle cx="123" cy="125" r="6" fill="#89b8ac" stroke="none"/>
      <rect x="22" y="46" width="35" height="19" rx="4" fill="${butter}" stroke-width="3"/>
      <path d="M28 51h23m-23 7h23" stroke="${paper}" stroke-width="2.5"/>
      <rect x="154" y="47" width="23" height="14" rx="3" fill="${ink}" stroke-width="2.5"/>
      <path d="m72 176 76 0" stroke="#ad5b51" stroke-width="8"/>
      <path d="m75 173 70 0" stroke="${paper}" stroke-width="3"/>
      <path d="M78 19h10" stroke="${paper}" stroke-width="3"/>
      <circle cx="176" cy="174" r="3" fill="${butter}" stroke-width="1.5"/>
    ` },
    toothbrush: { w: 200, h: 300, body: `
      <path d="M20 24h62v191q0 22 26 22h59v53h-66q-81 0-81-77Z" fill="${sage}"/>
      <path d="M34 38v177q0 59 65 59h51" stroke="${paper}" stroke-width="11"/>
      <path d="M73 40v173q0 35 30 35h42" stroke="#819e7c" stroke-width="5"/>
      <path d="M11 12q39-13 79 0v29q-39 10-79 0Z" fill="${butter}"/>
      <path d="M18 19h65m-65 13h65" stroke="#c4a24d" stroke-width="3"/>
      <path d="M145 220q21-15 46-2v61q-23 16-46 2Z" fill="${coral}"/>
      <path d="M155 225v49m24-49v49" stroke="#bb6558" stroke-width="7"/>
      <path d="m162 218 0-11h15v11m-15 66v9h15v-9" fill="${paper}" stroke-width="3"/>
      <path d="M23 109h58v29H23Z" fill="${coral}" stroke-width="3"/>
      <rect x="63" y="104" width="25" height="39" rx="7" fill="${paper}" stroke-width="3"/>
      <path d="M70 113h11v21H70Z" fill="${butter}" stroke-width="2"/>
      <path d="M34 53v37m0 67v43m31 59q10 9 26 12" stroke="white" stroke-width="4" opacity=".55"/>
      <path d="m162 235 8 0m-8 11h8m-8 11h8" stroke="${paper}" stroke-width="2"/>
    ` },
    hat: { w: 200, h: 300, body: `
      <path d="M12 16h77l-3 181q12 26 64 27 38 2 42 34l-1 24q-76 13-177 3Z" fill="${butter}"/>
      <path d="M77 42 72 205q15 34 78 33 26 1 29 24" stroke="#c9a34e" stroke-width="9"/>
      <path d="M13 274q93 10 179-4v17q-87 12-179 4Z" fill="#657a5c"/>
      <path d="m26 282 0 8m18-7v9m18-8v9m18-8v8m18-8v8m18-8v7m18-9v8m18-10v8m18-10v8" stroke="#435442" stroke-width="3"/>
      <path d="M10 11q41-8 81 0v29q-40 7-81 0Z" fill="${coral}"/>
      <path d="M17 18q33-5 67 0m-67 13q33 5 67 0" stroke="${paper}" stroke-width="3"/>
      <path d="M25 54v141q1 34 38 51" stroke="${paper}" stroke-width="5"/>
      <path d="M38 95q16-8 33 0v52q-16 11-33 0Z" fill="${sage}" stroke-width="2.8"/>
      <path d="m54 105 4 11 12 1-9 7 3 12-10-7-10 7 4-12-9-7 11-1Z" fill="${paper}" stroke-width="2"/>
      <path d="m24 218 12-5m-8 16 14-6m-7 17 13-8m69 17 25 2m-7 9 24-1" stroke="#b28d44" stroke-width="2.5"/>
      <path d="M14 48h8v38h-8" fill="${coral}" stroke-width="3"/>
      <path d="m154 230 10 4" stroke="${paper}" stroke-width="4"/>
    ` },
    book: { w: 200, h: 200, body: `
      <path d="m28 17 145-8 17 167q-75 15-155 16l-19-13Z" fill="${sage}"/>
      <path d="m25 22 145-6 15 158q-72 12-152 13l-9-10Z" fill="${paper}" stroke-width="3"/>
      <path d="m39 174 135-10m-134 17 135-10" stroke="#c5b89b" stroke-width="2"/>
      <path d="M17 8 167 7l15 157q-67 17-149 15l-18-9Z" fill="${coral}"/>
      <path d="M17 8h18l15 169-17 2-18-9Z" fill="#bd6859"/>
      <path d="M24 18 37 158" stroke="#f2b49b" stroke-width="2.5"/>
      <path d="m52 23 105-1 12 132q-50 11-108 10Z" fill="none" stroke="${paper}" stroke-width="2"/>
      <text x="107" y="48" text-anchor="middle" fill="${paper}" stroke="none" font-family="Georgia,serif" font-size="16" font-weight="bold" transform="rotate(-1 107 48)">FAR AWAY</text>
      <text x="108" y="65" text-anchor="middle" fill="${paper}" stroke="none" font-family="Georgia,serif" font-size="9" letter-spacing="2">A POCKET GUIDE</text>
      <circle cx="134" cy="90" r="13" fill="${butter}" stroke="none"/>
      <path d="m68 134 24-44 20 28 14-18 31 31" fill="${sage}" stroke="${paper}" stroke-width="3"/>
      <path d="m83 107 9-17 10 14-9-2Z" fill="${paper}" stroke="none"/>
      <path d="m72 144 83-5m-78 12 31-1" stroke="${paper}" stroke-width="3"/>
      <path d="m137 9 4 41 10-10 12 7-5-39Z" fill="${butter}" stroke-width="2.5"/>
      <path d="m143 12 3 22" stroke="${paper}" stroke-width="2"/>
      <path d="m21 172 10 6" stroke="${paper}" stroke-width="3"/>
    ` },
    socks: { w: 300, h: 200, body: `
      <path d="M11 10h126q48 0 53 46l2 108q0 26-29 27-36 0-41-26l-7-79H11Z" fill="${coral}"/>
      <path d="M11 10h34v76H11Z" fill="${paper}" stroke-width="3"/>
      <path d="M21 16v63m11-63v63" stroke="#c6b99e" stroke-width="3"/>
      <path d="m56 16 0 63m22-63v63" stroke="${paper}" stroke-width="9"/>
      <path d="M144 24q28 9 30 38m-49 25 14 17" stroke="#f2b49b" stroke-width="3"/>
      <path d="M110 13h78v100q3 12 23 12h44q36 0 36 31 0 35-35 35h-84q-62 0-62-65Z" fill="${sage}"/>
      <path d="M110 13h78v31h-78Z" fill="${paper}" stroke-width="3"/>
      <path d="M119 19v18m12-18v18m12-18v18m12-18v18m12-18v18m12-18v18" stroke="#c6b99e" stroke-width="2.5"/>
      <path d="M114 61h70m-70 22h70" stroke="${paper}" stroke-width="10"/>
      <path d="M188 112q-35 0-36 37m112-22q-22 30 1 62" stroke="#789875" stroke-width="3.5"/>
      <path d="M119 101v21q0 55 53 58h64" stroke="${paper}" stroke-width="2" stroke-dasharray="4 6"/>
      <path d="m159 155 9 6m-11 4 9 6m-8 3 9 5m101-36 8 3m-9 8 9 3m-7 8 8 3" stroke="#88a27e" stroke-width="2.8"/>
      <path d="m212 138 0 33m15-33v33" stroke="${paper}" stroke-width="8"/>
    ` },
    snowglobe: { w: 200, h: 200, body: `
      <circle cx="100" cy="89" r="80" fill="#dfe9d8"/>
      <path d="M28 121q72-29 143 0-19 48-71 48-53 0-72-48Z" fill="${paper}" stroke="none"/>
      <path d="m47 130 42-74 25 43 18-23 27 54Z" fill="${sage}" stroke-width="3"/>
      <path d="m73 86 16-30 17 30-11-4-7 8-7-7Z" fill="white" stroke-width="2"/>
      <path d="m113 100 19-24 14 24-12-4-7 6-7-5Z" fill="${paper}" stroke-width="2"/>
      <path d="M102 130v-16l13-14 13 14v16Z" fill="${coral}" stroke-width="2.5"/>
      <path d="M111 130v-10h8v10" fill="${butter}" stroke-width="1.8"/>
      <path d="M43 57q12-24 34-30M36 77l-1 16" stroke="white" stroke-width="9"/>
      <path d="M156 101q-4 18-15 29" stroke="white" stroke-width="4" opacity=".75"/>
      <g fill="white" stroke="none"><circle cx="59" cy="98" r="4"/><circle cx="116" cy="37" r="4"/><circle cx="144" cy="63" r="3.5"/><circle cx="98" cy="104" r="3"/><circle cx="75" cy="135" r="3"/><circle cx="154" cy="87" r="3"/></g>
      <path d="M55 152h90l19 33q-64 14-128 0Z" fill="${coral}"/>
      <path d="M36 185q64 14 128 0v6q-64 12-128 0Z" fill="#bd6859" stroke-width="3"/>
      <path d="M61 160h78" stroke="${paper}" stroke-width="3"/>
      <path d="M75 166h50v16H75Z" fill="${butter}" stroke-width="2"/>
      <text x="100" y="178" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="9" font-weight="bold" letter-spacing="1.5">HOME</text>
    ` },
    plant: { w: 200, h: 400, body: `
      <path d="M19 313V51q0-42 35-42 34 0 34 42v95h40v-19q0-18 27-18 31 0 31 22v35q0 26-31 26H88v121Z" fill="${sage}"/>
      <path d="M42 25q-10 13-10 31v238M62 24q12 14 12 34v238m16-124h61q18 0 18-17v-29" stroke="#7e9b75" stroke-width="5"/>
      <path d="M45 29q-5 9-5 24v235" stroke="${paper}" stroke-width="3"/>
      <path d="M23 73l13-7M60 83l12 7M24 115l13-5M59 122l12 6M25 153l12-5M58 161l13 6M24 199l12-5M58 207l13 6M25 244l12-5M58 253l13 6M24 280l12-5M58 288l13 6M111 181l3-12M140 181l3-12M166 160l10-6" stroke="#607f5b" stroke-width="2.5"/>
      <path d="M144 119q-10-12-17-3 2 11 16 10-10 9 0 15 11-3 9-14 11 9 17-1-2-11-14-8 5-15-7-14-8 3-4 15Z" fill="${coral}" stroke-width="2.5"/>
      <circle cx="148" cy="122" r="5" fill="${butter}" stroke-width="2"/>
      <path d="M10 305h81l-8 77q-31 17-63 0Z" fill="${coral}"/>
      <path d="M8 298h85v24q-42 8-85 0Z" fill="${butter}"/>
      <path d="M15 308h71m-68 23 6 42m54-42-5 43" stroke="${paper}" stroke-width="3"/>
      <path d="M34 339h31v32H34Z" fill="${paper}" stroke-width="2.5"/>
      <text x="50" y="360" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="14" font-weight="bold">OW!</text>
      <path d="m34 382 10 3m11 0 10-3" stroke="#b76154" stroke-width="3"/>
    ` },
    passport: { w: 100, h: 300, body: `
      <path d="M15 8h70q8 0 8 9v196q-11 3-11 12t11 12v47q0 8-8 8H15q-8 0-8-8v-47q11-3 11-12t-11-12V17q0-9 8-9Z" fill="${paper}"/>
      <path d="M15 8h70q8 0 8 9v39H7V17q0-9 8-9Z" fill="${sage}"/>
      <text x="50" y="29" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="10" font-weight="bold" letter-spacing="1">ONE WAY</text>
      <text x="50" y="44" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="8">MONSTER AIR</text>
      <path d="m51 69 5 26 23 18v7l-24-10-1 18 8 9v5l-12-5-12 5v-5l8-9-1-18-24 10v-7l23-18 5-26Z" fill="${coral}" stroke-width="2.5"/>
      <text x="50" y="165" text-anchor="middle" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="20" font-weight="bold" letter-spacing="1">M00N</text>
      <path d="M22 178h56" stroke="#c7bda2" stroke-width="2"/>
      <text x="24" y="192" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="8">GATE</text><text x="61" y="192" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="8">SEAT</text>
      <text x="24" y="209" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="14" font-weight="bold">04</text><text x="60" y="209" fill="${ink}" stroke="none" font-family="Georgia,serif" font-size="14" font-weight="bold">13A</text>
      <path d="M24 225h52" stroke="#bcb397" stroke-width="2" stroke-dasharray="3 5"/>
      <path d="M22 241v35m5-35v35m8-35v35m5-35v35m6-35v35m9-35v35m5-35v35m5-35v35m9-35v35m5-35v35" stroke="${ink}" stroke-width="2"/>
      <path d="M31 241v35m20-35v35m19-35v35" stroke="${ink}" stroke-width="4"/>
      <path d="M13 65v86m74 94v34" stroke="white" stroke-width="3"/>
    ` }
  };

  const piece = (name, rotation = 0) => {
    const art = pieces[name];
    if (!art) return wrap(icons[name] || fallback, 'Luggage illustration');
    const turn = ((Math.round(rotation) % 4) + 4) % 4;
    const transforms = ['', `translate(${art.h} 0) rotate(90)`, `translate(${art.w} ${art.h}) rotate(180)`, `translate(0 ${art.w}) rotate(270)`];
    const width = turn % 2 ? art.h : art.w, height = turn % 2 ? art.w : art.h;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="piece-illustration" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${displayNames[name]}" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><g class="object-art" transform="${transforms[turn]}">${art.body}</g></svg>`;
  };

  const portraits = {
    vampire: `<circle cx="121" cy="117" r="102" fill="${paper}" stroke="none"/><circle cx="174" cy="57" r="27" fill="${butter}" stroke="none"/><path d="M25 174q36-10 60 0m83 0q25-10 48 0" stroke="${sage}" stroke-width="3"/><path d="M52 224c0-47 27-74 68-74s74 28 74 74" fill="${sage}"/><path d="m96 150 24 29 23-29 23 25-17 49H91l-18-49Z" fill="${coral}"/><path d="m120 178 0 46M99 170l-10 23 31-14 28 13-6-23" fill="${paper}"/><path d="m64 184 17 5-12 12m105-16-13 8 12 9M88 209l-11 5m80-5 10 5" stroke="${paper}" stroke-width="4"/><path d="m82 89-26-12 8 39 20 7m72-34 27-12-8 39-19 7" fill="${sage}"/><path d="M79 67c4-33 71-38 81 0l-4 62c-2 41-67 43-73 0Z" fill="${sage}"/><path d="M78 82c-10-31 2-51 23-54 25-16 63 0 66 26 2 13-3 28-8 37l-8-38-29 19-21-20-20 38Z" fill="${ink}"/><path d="m83 87 32-1-4 22c-12 10-27 3-28-21Zm43-1 32 1c0 24-23 27-29 19Z" fill="${ink}"/><path d="M114 91q6-6 12 0m-40-10-8-5m78 5 9-6"/><path d="m89 92 13 0m31 0 11 0" stroke="${paper}" stroke-width="4"/><path d="m119 99-4 17 9 2m-19 14q18 14 34-2"/><path d="m128 133 8-2-4 14Z" fill="${paper}" stroke-width="2"/><path d="m88 121 11 2m43-2 9-2" stroke="${coral}" stroke-width="5"/><path d="M27 61v12m-6-6h12M194 124v9m-5-5h10" stroke="${butter}" stroke-width="2.5"/>`,
    octopus: `<circle cx="120" cy="117" r="102" fill="${paper}" stroke="none"/><path d="m179 28 17 7-5 20-18-7Z" fill="${butter}" stroke="none"/><path d="M36 185c-22-32-21-46-10-50 14-5 17 24 29 26 12 1 10-23 28-27m82 0c20 4 18 33 31 29 11-3 5-26 18-27 16-2 13 32-1 48" fill="${coral}"/><path d="M77 180c-23 8-29 34-47 26-13-6 3-17 8-14m55-5c-14 17-10 34-24 38-14 5-16-8-11-15m59-21c3 26-2 38 10 39 15 1 14-13 8-21m15-18c13 18 11 34 28 35 13 1 18-9 11-17m-19-26c18 2 20 20 37 17 15-2 13-16 5-17" fill="${coral}" stroke-width="10"/><path d="M74 131h93l12 47c-24 31-86 27-111-1Z" fill="${paper}"/><path d="M72 149h99m-101 18h105m-94 18h82" stroke="${sage}" stroke-width="9"/><path d="M71 110c-11-10-6-26 4-30-4-52 95-58 100-2 13 1 16 23 3 29-3 25-25 44-53 44-27 0-48-15-54-41Z" fill="${coral}"/><path d="M92 58q18-14 38-9" stroke="${paper}" stroke-width="6"/><ellipse cx="103" cy="95" rx="6" ry="9" fill="${ink}" stroke="none"/><ellipse cx="149" cy="95" rx="6" ry="9" fill="${ink}" stroke="none"/><path d="M98 77q6-4 12 0m32 0q7-4 13 1M115 116q12 11 24-2"/><path d="m86 113 11 1m58-2 10-2" stroke="${paper}" stroke-width="5"/><path d="m82 140 57 52" stroke="${ink}" stroke-width="9"/><path d="m82 140 57 52" stroke="${butter}" stroke-width="5"/><path d="M167 158h16c12 0 11 20-1 20h-13" fill="${paper}"/><path d="M145 152h29l-2 35c-2 8-22 8-25 0Z" fill="${butter}"/><path d="M153 144c-6-7 7-10 1-16" stroke="${sage}" stroke-width="3"/><path d="M42 88v13m-6-6h12" stroke="${butter}" stroke-width="3"/>`,
    yeti: `<circle cx="120" cy="117" r="102" fill="${paper}" stroke="none"/><path d="m178 34 12 24h-24Z" fill="${sage}" stroke="none"/><path d="m29 175 22-37 25 37m99-12 18-27 21 27" stroke="${sage}" stroke-width="2.5"/><path d="m53 224 4-36-10-3 14-22-9-7 18-24-6-11 16-16-3-17 20-12 7-22 21 4 20-13 11 18 20 5-2 19 17 15-4 17 14 20-11 9 15 24-10 8 14 21-10 6 3 24" fill="${sage}"/><path d="m83 75-2-18 15 7m47-4 10-21 8 24" fill="${sage}"/><path d="M81 100c4-29 75-31 79 2l-4 39c-4 27-67 29-72 0Z" fill="${paper}"/><path d="m89 97 13 3m39-3-13 3"/><ellipse cx="104" cy="112" rx="5" ry="7" fill="${ink}" stroke="none"/><ellipse cx="137" cy="112" rx="5" ry="7" fill="${ink}" stroke="none"/><path d="M113 124q8-7 16 0l-8 8Z" fill="${coral}" stroke-width="2"/><path d="M111 143q11 9 21-1"/><path d="m91 131 10 1m37 0 10-1" stroke="${coral}" stroke-width="5"/><path d="m73 155 18-8q29 18 62-1l17 11-5 27q-43 19-88-1Z" fill="${coral}"/><path d="m77 165 12 17m8-24 18 29m6-28 15 27m7-31 14 24" stroke="${paper}" stroke-width="5"/><path d="m136 186 28-4 11 42h-33Z" fill="${coral}"/><path d="m141 197 25-5m-23 18 26-5" stroke="${paper}" stroke-width="5"/><path d="m148 224 0 9m10-9 0 9m10-9 0 9"/><path d="M71 204c-1 17 34 24 38 10 3-10-17-22-25-17m91-7c12 11 18 27 5 32" fill="${sage}"/><path d="m82 196 33-4 5 30-32 5Z" fill="${butter}"/><circle cx="101" cy="209" r="7" fill="${paper}" stroke-width="2"/><path d="m93 219 14-2" stroke-width="2"/><path d="M32 75v12m-6-6h12m169 17v12m-6-6h12" stroke="${butter}" stroke-width="3"/>`
  };
  const fallback = `<rect x="21" y="20" width="58" height="61" rx="12" fill="${butter}"/><path d="M36 20v-8h28v8M21 43h58M43 39h14v9H43Z" fill="${paper}"/>`;
  window.PackArt = Object.freeze({
    piece,
    displayNames,
    pieceKeys: Object.freeze(Object.keys(pieces)),
    icon: (name) => wrap(icons[name] || fallback, `${String(name || 'luggage').replace(/[^a-z0-9 ]/gi, ' ')} illustration`),
    portrait: (theme) => wrap(portraits[theme] || portraits.vampire, `${String(theme || 'vampire').replace(/[^a-z0-9 ]/gi, ' ')} on holiday`, true),
    colors: Object.freeze({ ink, paper, coral, butter, sage }),
    itemKeys: Object.freeze(Object.keys(icons))
  });
}());
