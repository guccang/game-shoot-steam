// 地面木材与背包分别持久化，换图或刷新不删除未拾取的掉落。
import {canonical} from '../world/coordinates.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
// 新存档没有地面物品，倒计时仅存在当前游戏会话。
export function freshWoodDrops(){return {nextId:1,piles:[]};}
// 只接收有效数量、地图和坐标，重复实例不重复发放资源。
export function normalizeWoodDrops(raw){
 const result=freshWoodDrops(),seen=new Set();
 for(const item of Array.isArray(raw?.piles)?raw.piles:[]){
  if(!item||!Number.isSafeInteger(item.id)||item.id<1||seen.has(item.id)||!['forest','jiuzhaigou'].includes(item.mapId)||!Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isFinite(item.count)||item.count<1)continue;
  seen.add(item.id);result.piles.push({id:item.id,mapId:item.mapId,...canonical(item),count:Math.min(RESOURCE_CAP,Math.floor(item.count)),source:item.source==='tree'?'tree':'enemy',saw:!!item.saw});
  result.nextId=Math.max(result.nextId,item.id+1);
 }
 return result;
}
