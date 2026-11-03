// 水域身份与常住鱼种为版本一确定性配方；只依赖既有地理，不占用战斗随机数或无限增长的存档。
import {FISH_SPECIES} from '../config/fish-catalog.js';
import {mineTerrain,mineHash} from '../config/mine-ecology.js';
import {mineCell,minePoint} from '../config/mining.js';
import {NATURAL_TERRAIN} from './natural-terrain.js';
import {JIUZHAIGOU_LAKES} from './jiuzhaigou.js';
const surfaceLakes={forest:NATURAL_TERRAIN.lakes,jiuzhaigou:JIUZHAIGOU_LAKES.filter(l=>l.kind==='lake')};
const pools=new Map();
// 字符串散列使地表湖泊标识、地下楼层与区域共同参与鱼群生成。
export function fishLakeHash(id){let n=2166136261;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
// 地表同一湖的所有岸点和周期镜像共享身份。
export function surfaceFishLake(mapId,lake){return {id:`surface:${mapId}:${lake.id}`,water:mapId,name:lake.name||'林间湖泊',depth:0,x:lake.x,y:lake.y};}
// 平滑岸线附近取最近的天然水格，沿用地质区域身份，避免把每一个水格误当一座湖。
export function mineFishLake(layer,point,depth=1){
 const cell=mineCell(point);let best=null,distance=Infinity;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const q={x:cell.x+dx,y:cell.y+dy},terrain=mineTerrain(q,layer);if(!terrain.water)continue;const p=minePoint(q),d=(p.x-point.x)**2+(p.y-point.y)**2;if(d<distance){distance=d;best={terrain,p};}}
 if(!best)return null;const {terrain,p}=best,seed=layer.seed||1847;
 return {id:`mine:${depth}:${seed}:${terrain.region}`,water:'mine',name:`地下${depth}层 · ${terrain.biome.name}`,depth,biome:terrain.biome.id,x:p.x,y:p.y};
}
// 每座水域固定六至十二种鱼，至少两种入门鱼；其余按阶位分层抽取，换湖才改变常住种类。
export function lakeFishPool(lake){
 if(!lake)return [];if(pools.has(lake.id))return pools.get(lake.id);
 const seed=fishLakeHash(lake.id),eligible=FISH_SPECIES.map((fish,index)=>({fish,index})).filter(e=>e.fish.waters.includes(lake.water)),lakes=surfaceLakes[lake.water],slot=lakes?.findIndex(l=>surfaceFishLake(lake.water,l).id===lake.id)??-1,chosen=slot>=0?eligible.filter((e,i)=>i%lakes.length===slot):[];
 // 有限地表湖先均分百鱼目录的对应种类，保证没有鱼因独立随机池而永久失去栖地。
 for(let tier=1;tier<=5;tier++){
  const candidates=eligible.filter(e=>e.fish.tier===tier&&!chosen.includes(e)).sort((a,b)=>mineHash(a.index,tier,seed)-mineHash(b.index,tier,seed)||a.index-b.index);
  const needed=Math.max(0,(tier===1?2:1)-chosen.filter(e=>e.fish.tier===tier).length);chosen.push(...candidates.slice(0,needed));
 }
 const count=Math.max(chosen.length,6+seed%7),rest=eligible.filter(e=>!chosen.includes(e)).sort((a,b)=>mineHash(a.index,17,seed)-mineHash(b.index,17,seed)||a.index-b.index);
 chosen.push(...rest.slice(0,count-chosen.length));const result=Object.freeze(chosen.map(e=>e.index).sort((a,b)=>a-b));
 if(pools.size>=256)pools.delete(pools.keys().next().value);pools.set(lake.id,result);return result;
}
// 栖点按常住鱼种的自然丰度取样，鱼竿和鱼饵不会改写已经看见的鱼。
export function lakeFishSpecies(lake,seed){
 const pool=lakeFishPool(lake),weights=pool.map(i=>[36,24,16,10,6][FISH_SPECIES[i].tier-1]),total=weights.reduce((a,b)=>a+b,0);let n=(seed>>>0)%total;
 for(let i=0;i<pool.length;i++){n-=weights[i];if(n<0)return pool[i];}return pool[0];
}
