// 离线面积审计同时提供分位点校准；不修改玩家存档，也不把树冠重复计入林地。
import fs from 'node:fs';
import {WORLD} from '../src/world/coordinates.js';
import {NATURAL_TERRAIN,isLakeWater,isMountainArea} from '../src/world/natural-terrain.js';
import {landformArea} from '../src/world/regional-landforms.js';
import {coverPotential,coverReserved,forestCoverAt} from '../src/world/forest-cover.js';
import {TERRAIN_COVERAGE} from '../src/config/terrain-coverage.js';
const step=Number(process.argv[2])||80,counts=Object.fromEntries(Object.keys(TERRAIN_COVERAGE).map(k=>[k,0])),available=[];
for(let y=step/2;y<WORLD.height;y+=step)for(let x=step/2;x<WORLD.width;x+=step){
 counts[forestCoverAt(x,y)]++;
 if(!isLakeWater(x,y)&&!isMountainArea(x,y,0)&&!coverReserved(x,y))available.push(coverPotential(x,y));
}
const total=Object.values(counts).reduce((a,b)=>a+b,0),forestCount=Math.round(total*TERRAIN_COVERAGE.forest),meadowCount=Math.round(total*TERRAIN_COVERAGE.meadow);
available.sort((a,b)=>b.forest-a.forest);const forest=(available[forestCount-1].forest+available[forestCount].forest)/2;
const rest=available.slice(forestCount).sort((a,b)=>b.meadow-a.meadow),meadow=(rest[meadowCount-1].meadow+rest[meadowCount].meadow)/2;
const result={step,total,counts,percent:Object.fromEntries(Object.entries(counts).map(([k,n])=>[k,n/total*100])),thresholds:{forest,meadow},polygonPercent:{lake:NATURAL_TERRAIN.lakes.reduce((n,i)=>n+landformArea(i),0)/WORLD.width/WORLD.height*100,mountain:NATURAL_TERRAIN.mountains.reduce((n,i)=>n+landformArea(i),0)/WORLD.width/WORLD.height*100},features:{lakes:NATURAL_TERRAIN.lakes.length,mountains:NATURAL_TERRAIN.mountains.length}};
fs.mkdirSync('output/terrain-coverage',{recursive:true});fs.writeFileSync(`output/terrain-coverage/audit-${step}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
