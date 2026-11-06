// 扩图时把旧森林西、北接缝的坐标搬回营地同一侧。旧林区内的正坐标地标仍在原地。
import {WORLD,PREVIOUS_FOREST_WORLD as previous,wrap,delta,canonical} from '../world/coordinates.js';
import {normalizeClearingSite} from './clearing-site.js';

// 旧图最东、最南的留白作为拼接处，负坐标和已经取模的坐标得到同一结果。
function restoreAxis(value,oldSize,seam,newSize){
 const old=wrap(value,oldSize);
 return wrap(old>=seam?old-oldSize:old,newSize);
}

// 只处理森林的世界位置，跳过湖谷、固定泊位和已投影到新边界的坐标。
function relocate(point){
 if(!point||point.mapId==='jiuzhaigou'||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
 if(point.x<previous.width)point.x=restoreAxis(point.x,previous.width,9700,WORLD.width);
 if(point.y<previous.height)point.y=restoreAxis(point.y,previous.height,7800,WORLD.height);
}

// 在白名单恢复出的独立对象上迁移；玩家、地块、故障车与其救援订单一起移动。
export function restoreForestExtent(p,raw){
 relocate(p.living.position);
 if(p.mapId==='forest')relocate(p.patrol?.bossPosition);
 for(const resident of Object.values(p.living.residents))relocate(resident);
 const site=raw.living?.clearingSite;
 if(site?.origin){
  const restored={...site,origin:{...site.origin}};
  relocate(restored);relocate(restored.origin);
  p.living.clearingSite=normalizeClearingSite(restored);
 }
 for(const point of [...p.farm.plots,p.farm.oxSite,p.production.bench,...p.production.sprinklers,p.outdoors.camp])relocate(point);
 for(const point of p.campParking.owned)if(point.spot==null)relocate(point);
 for(const service of p.vehicleService){
  if(!service||service.mapId!=='forest'||!['wrecked','outbound','hooking','towing'].includes(service.phase))continue;
  relocate(service.position);relocate(service.truck);
  for(const point of service.route)relocate(point);
  service.layoutVersion=0;
 }
 // 正在牵引的车与猫可能跨在扩建拼接线两侧，按旧图中的绳长和方向一起迁移。
 const target=p.logistics.tow?.target,oldPlayer=raw.living?.position,oldWreck=raw.vehicleService?.[target]?.position;
 if(p.mapId==='forest'&&p.vehicleService[target]?.mapId==='forest'&&p.living.position&&Number.isFinite(oldWreck?.x)&&Number.isFinite(oldWreck?.y)){
  p.vehicleService[target].position=canonical({
   x:p.living.position.x+delta(oldWreck.x-oldPlayer.x,previous.width),
   y:p.living.position.y+delta(oldWreck.y-oldPlayer.y,previous.height),
  });
 }
}
