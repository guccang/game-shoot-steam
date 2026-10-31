// 消防站搬迁只更新站内过场和施工落点，野外火点、资源与奖励记录保持原样。
import {FIRE_STATION,FIRE_STATION_LAYOUT_VERSION} from '../config/fire-station-layout.js';

const OLD_STATION={x:1420,y:1200};
// 只平移有效的持久坐标，不修改原始存档对象。
function move(point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
 point.x+=FIRE_STATION.x-OLD_STATION.x;point.y+=FIRE_STATION.y-OLD_STATION.y;
}
// 站内移动保留阶段进度，旧步行路线通过既有回镇流程重新规划。
export function migrateFireStationProgress(raw){
 if((raw.fireStationLayoutVersion||0)>=FIRE_STATION_LAYOUT_VERSION)return raw;
 const next=structuredClone(raw),run=next.fireDispatch?.run;
 next.fireStationLayoutVersion=FIRE_STATION_LAYOUT_VERSION;
 if(['boarding','departing','parking','exiting'].includes(run?.phase)){
  move(run.position);for(const point of Array.isArray(run.transit?.path)?run.transit.path:[])move(point);
 }else if(run?.phase==='approaching')run.townApproach=false;
 else if(run?.phase==='won'&&Math.hypot(run.position?.x-OLD_STATION.x,run.position?.y-OLD_STATION.y)<250)move(run.position);
 if(next.restoration?.build?.id==='fire'){
  move(next.restoration.build);
  if(next.mapId!=='jiuzhaigou'&&Math.hypot(next.living?.position?.x-OLD_STATION.x,next.living?.position?.y-OLD_STATION.y)<250)move(next.living.position);
 }
 return next;
}
