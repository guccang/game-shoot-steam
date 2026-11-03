// 每层独立保存地形、生态和设施；矿石与木材仍使用共同库存。
import {MINING,mineKey,minePoint} from '../config/mining.js';
import {createMineGeography,mineBounds,mineCellArea,mineCellOpen,MINE_ANIMALS,mineAnimalStats} from '../config/mine-ecology.js';
const progressCache=new WeakMap();
// 一层继续使用原根记录，兼容所有旧矿道与施工事务。
export function mineLayer(mining,depth=1){return depth===1?mining:mining.layers?.[depth]||null;}
// 初始化一个首次解锁的地下层，入口平台以相同世界坐标接通上层。
export function freshMineLayer(depth,entry,random=Math.random){
 const layer={...createMineGeography(depth,minePoint(entry),random),dug:{},rails:{},decor:{},shafts:[],carts:[],nextCart:1,bridges:{},harvested:{},animals:{},age:0,entry:mineKey(entry),descent:null};
 for(let y=entry.y-1;y<=entry.y+1;y++)for(let x=entry.x-1;x<=entry.x+1;x++)if(mineCellArea({x,y},layer)>0)layer.dug[mineKey({x,y})]=true;
 return layer;
}
// 正式开发率以全层面积为分母，只累计实际开掘或走访的格子，不按镜头或起始区域计算。
export function mineDevelopment(layer){
 if(!layer)return {area:0,opened:0,ratio:0};const old=progressCache.get(layer.dug);if(old&&old.bounds===layer.bounds)return old.value;
 const b=mineBounds(layer),area=(b.right-b.left)*(b.bottom-b.top);let opened=0;
 for(const key of Object.keys(layer.dug)){const [x,y]=key.split(',').map(Number);if(layer.dug[key])opened+=mineCellArea({x,y},layer);}
 const value={area,opened,ratio:Math.min(1,opened/area)};progressCache.set(layer.dug,{bounds:layer.bounds,value});return value;
}
// 生态附加字段的读档只恢复有限数值和层内开放地块设施，不触发随机生成。
export function normalizeLayerEcology(target,raw,depth=1){
 const base=createMineGeography(1,MINING.home,()=>.5),b=raw?.bounds;
 const valid=b&&['left','top','right','bottom'].every(k=>Number.isFinite(b[k]))&&b.left>=0&&b.top>=0&&b.right<=base.bounds.right&&b.bottom<=base.bounds.bottom&&b.right-b.left>=100&&b.bottom-b.top>=100;
 target.seed=Number.isSafeInteger(raw?.seed)&&raw.seed>0?raw.seed:1847;target.bounds=valid?{...b}:base.bounds;
 const area=(target.bounds.right-target.bounds.left)*(target.bounds.bottom-target.bounds.top),fraction=area/(base.bounds.right*base.bounds.bottom)*100;
 if(depth===1||depth===2&&(fraction<10-1e-7||fraction>50+1e-7)||depth>=3&&(fraction<10-1e-7||fraction>100+1e-7))target.bounds=depth===1?base.bounds:{left:0,top:0,right:base.bounds.right*Math.sqrt(.1),bottom:base.bounds.bottom*Math.sqrt(.1)};
 target.coverage=Math.round((target.bounds.right-target.bounds.left)*(target.bounds.bottom-target.bounds.top)/(base.bounds.right*base.bounds.bottom)*1e8)/1e6;
 target.entry=Object.hasOwn(target.dug,raw?.entry)?raw.entry:'0,0';target.descent=Object.hasOwn(target.dug,raw?.descent)?raw.descent:null;target.age=Number.isFinite(raw?.age)?Math.max(0,raw.age):0;
 target.bridges={};target.harvested={};target.animals={};
 // 天然景观的生态记录不依赖开掘，读档仅恢复真实层内开放地块。
 const keys=new Set([...Object.keys(target.dug),...Object.keys(raw?.bridges||{}),...Object.keys(raw?.harvested||{}),...Object.keys(raw?.animals||{})]);
 for(const key of keys){const [x,y]=key.split(',').map(Number);if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||key!==mineKey({x,y})||!mineCellOpen({x,y},target)){delete target.dug[key];delete target.rails[key];delete target.decor[key];continue;}
  if(raw?.bridges?.[key]===true)target.bridges[key]=true;
  if(Number.isFinite(raw?.harvested?.[key])&&raw.harvested[key]>=0)target.harvested[key]=Math.min(target.age+180,raw.harvested[key]);
  const a=raw?.animals?.[key];if(a&&MINE_ANIMALS[a.kind]){const home=minePoint({x,y}),spec=mineAnimalStats(a.kind,depth);target.animals[key]={key,kind:a.kind,maxHp:spec.hp,x:Number.isFinite(a.x)&&Math.abs(a.x-home.x)<192?a.x:home.x,y:Number.isFinite(a.y)&&Math.abs(a.y-home.y)<192?a.y:home.y,hp:Number.isFinite(a.hp)?Math.max(0,Math.min(spec.hp,a.hp)):spec.hp,respawn:Number.isFinite(a.respawn)?Math.max(0,Math.min(target.age+180,a.respawn)):0,clock:Number.isFinite(a.clock)?Math.max(0,a.clock):0,walk:Number.isFinite(a.walk)?a.walk:0,phase:'roam',timer:0,flash:0,death:0};}
 }
 // 清理被层边界裁掉的设施，坡道和入口只能指向本层真实地块。
 target.shafts=target.shafts.filter(key=>target.dug[key]);target.carts=target.carts.filter(c=>target.rails[mineKey({x:Math.floor((c.x-MINING.home.x)/MINING.tile+.5),y:Math.floor((c.y-MINING.home.y)/MINING.tile+.5)})]);
 if(!target.dug[target.entry])target.entry=Object.keys(target.dug)[0]||'0,0';if(!target.dug[target.descent])target.descent=null;
 return target;
}
