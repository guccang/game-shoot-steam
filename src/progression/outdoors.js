import {FISHING_RODS,FISHING_BAITS,rodOwned,baitCount} from '../config/fishing-tackle.js';
// 野外存档只保留装备、营地和已入护鱼获；抛竿及未结算鱼获不会在读档时复制。
import {OUTDOOR_GEAR,FISH_SPECIES,OUTDOOR_RULES} from '../config/outdoors.js';
import {WORLD,canonical} from '../world/coordinates.js';

// 旧档默认没有装备；非法营地、鱼种和超限数量不会进入正式状态。
export function normalizeOutdoors(raw){
 const c=raw?.camp,valid=c&&['forest','jiuzhaigou'].includes(c.mapId)&&['tent','vehicle'].includes(c.mode)&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&Math.abs(c.x)<WORLD.width*2&&Math.abs(c.y)<WORLD.height*2;
 const tent=raw?.tent===true,rod=raw?.rod===true;
 const rods=Object.fromEntries(Object.keys(FISHING_RODS).filter(id=>id!=='rod').map(id=>[id,raw?.rods?.[id]===true]));
 const baits=Object.fromEntries(Object.keys(FISHING_BAITS).filter(id=>id!=='bait').map(id=>[id,Math.max(0,Math.min(999,Math.floor(Number(raw?.baits?.[id])||0)))]));
 const selectedRod=Object.hasOwn(FISHING_RODS,raw?.selectedRod)&&rodOwned({rod,rods},raw.selectedRod)?raw.selectedRod:rod?'rod':Object.keys(rods).find(id=>rods[id])||'rod';
 return {version:2,tent,rod,rods,baits,selectedRod,selectedBait:Object.hasOwn(FISHING_BAITS,raw?.selectedBait)?raw.selectedBait:'bait',bait:Math.max(0,Math.min(999,Math.floor(Number(raw?.bait)||0))),
  fish:Object.fromEntries(FISH_SPECIES.map(f=>[f.id,Math.max(0,Math.min(OUTDOOR_RULES.maxFish,Math.floor(Number(raw?.fish?.[f.id])||0)))])),
  // 鱼种历史独立于鱼护，旧档只从现有鱼获迁移，不伪造已出售鱼的种类。
  collection:Object.fromEntries(FISH_SPECIES.map(f=>{const r=raw?.collection?.[f.id],owned=Math.max(0,Math.min(OUTDOOR_RULES.maxFish,Math.floor(Number(raw?.fish?.[f.id])||0)));return [f.id,{count:Math.max(owned,Math.min(1e7,Math.max(0,Math.floor(Number(r?.count)||0)))),best:Number.isFinite(r?.best)?Math.max(0,Math.min(200,r.best)):0}];})),
  caught:Math.max(0,Math.min(1e7,Math.floor(Number(raw?.caught)||0))),best:Math.max(0,Math.min(200,Number(raw?.best)||0)),
  camp:valid&&(c.mode!=='tent'||tent)?{...canonical(c),mapId:c.mapId,mode:c.mode,hull:Number.isInteger(c.hull)&&c.hull>=0&&c.hull<100?c.hull:null,kit:tent&&c.kit===true}:null};
}
// 背包明细与实际负重共享物品；已展开的露营套装留在地面，不重复计入背包。
export function outdoorInventory(progress){
 const p=progress.outdoors;if(!p)return [];
 const rows=[];
 for(const [id,gear] of Object.entries(OUTDOOR_GEAR)){
  const count=gear.kind==='tent'?Number(p.tent&&!p.camp?.kit):gear.kind==='rod'?Number(rodOwned(p,gear.tackleId)):baitCount(p,gear.tackleId);
  if(count)rows.push({id:'outdoor:'+id,name:gear.name,description:gear.description,category:'outdoor',count,mass:gear.mass,weight:count*gear.mass,note:gear.kind==='bait'?'抛竿消耗':'野外工具',use:gear.description,icon:{kind:'outdoor',key:gear.kind}});
 }
 for(const fish of FISH_SPECIES)if(p.fish[fish.id])rows.push({id:'fish:'+fish.id,name:fish.name,description:'湖中钓起的鲜活鱼获，可以保留或带到柜台出售。',category:'outdoor',count:p.fish[fish.id],mass:fish.mass,weight:p.fish[fish.id]*fish.mass,note:'可在弹药补给铺出售',use:'鲜活鱼获，保存在鱼护中。',icon:{kind:'outdoor',key:'fish'}});
 return rows;
}
