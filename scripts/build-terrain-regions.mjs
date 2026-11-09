// 离线重建固定种子山湖参数，完整面积校验在生成器中执行；不写入玩家存档。
import fs from 'node:fs';
import {generateNaturalTerrain} from '../src/world/natural-terrain.js';
const terrain=generateNaturalTerrain({regenerate:true});
const rows=terrain.obstacles.filter(i=>i.regional).map(i=>[i.kind,i.id,i.x,i.y,i.rx,i.ry,i.height,i.phase,i.variant]);
fs.writeFileSync('src/config/terrain-regions.generated.js','// 固定种子山湖布局，由 scripts/build-terrain-regions.mjs 离线生成；手机不执行候选搜索。\nexport const REGIONAL_TERRAIN_SEED='+terrain.seed+';\nexport const REGIONAL_TERRAIN_ROWS='+JSON.stringify(rows)+';\n');
console.log(`已生成 ${rows.length} 处外围山湖。`);
