import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const scope = {};
vm.runInNewContext(fs.readFileSync(new URL('public/games/packing/levels.js', root), 'utf8'), scope);
const engine = scope.PackLevels;
const metadata = (level) => ({ revision: level.revision, par: level.par, pieceCount: level.pieces.length });
const catalog = {
  levels: Object.fromEntries(engine.levels.map(level => [level.id, { ...metadata(level), chapterId: level.chapterId }])),
  dailyEpoch: '2026-10-26',
  daily: Array.from({ length: engine.dailyPoolSize }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10);
    return metadata(engine.daily(date));
  }),
};
if (Object.keys(catalog.levels).length !== 84 || catalog.daily.length !== 28) throw new Error('Review the community catalog before changing campaign or Daily counts.');
fs.writeFileSync(new URL('lib/packing-catalog.json', root), JSON.stringify(catalog, null, 2) + '\n');
console.log('Updated server metadata for 84 campaign levels and 28 Daily templates.');
