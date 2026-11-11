// 九秒入职短剧：到站、急速接送、退休出发；说明留在可反复阅读的信里。
import {ERA_VEHICLES} from './vehicle-eras.js';
import {townPoint} from './town-layout.js';
import {PATHS} from '../world/paths.js';
import {WORLD} from '../world/coordinates.js';
import {PARKING_SPOTS} from './parking.js';
import {RESTORATION_SECONDS,RESTORATION_FLIGHT} from './building-repair-timing.js';
// 赠车停在北广场靠近入口的正式泊位，演出与停车接管共用位置。
const giftParking=PARKING_SPOTS.find(s=>s.id==='north-0-2');
// 只取当前世界北侧最后660单位，不把扩展地图的远路串入九秒接送。
const road=[...PATHS[1].filter(p=>p.y>=WORLD.height-660).map(p=>({x:p.x,y:p.y-WORLD.height})),...PATHS[1].filter(p=>p.y>0&&p.y<=160)];
export const RANGER = Object.freeze({scooter:5,giftHull:ERA_VEHICLES.find(v=>v.id==='wood-bicycle').index,saw:14,repairWood:80,pistolWood:8,
  passengerFootY:-28,rideSeconds:2.8,handoverSeconds:.3,dismountSeconds:.5,leaveSeconds:1.1,
  workSeconds:3,rebuildSeconds:RESTORATION_SECONDS-RESTORATION_FLIGHT,rebuildRevealSeconds:1.2,
  busStop:townPoint({x:490,y:-650}),bus:road[0],waiting:{x:road[0].x-42,y:road[0].y+12},
  parkingId:giftParking.id,parking:{x:giftParking.x,y:giftParking.y},
  stop:road.at(-1),doorstep:townPoint({x:610,y:185}),elderDoorstep:{x:road.at(-1).x,y:133},
  route:road,pickupRoute:road.filter(p=>p.y<=-460).slice().reverse(),
  leaveRoute:road.filter(p=>p.y>=-360).slice().reverse(),
});
// 旧档已经交付的车仍在原车位，新交接统一赠送木制自行车。
export function arrivalGiftHull(progress){
 return progress.arrival?.giftHull??RANGER.giftHull;
}
// 来信和骑车任务按已交付的车型显示。
export function arrivalGiftName(progress){return arrivalGiftHull(progress)===RANGER.scooter?'电动车':'木制自行车';}
// 十个动作节拍组成三个场景，总长九秒；等待的一秒从双脚落地后开始。
export const RANGER_STAGES = {
  bus:{seconds:.6,lines:[]},
  alight:{seconds:.6,lines:[]},
  wait:{seconds:1,lines:['接我的人呢？']},
  pickup:{seconds:.8,travel:.8,route:RANGER.pickupRoute,lines:['上车！']},
  board:{seconds:.3,lines:[]},
  ride:{seconds:2.8,travel:2.8,route:RANGER.route,lines:['坐稳，晴叶营地到啦！']},
  dismount:{seconds:.5,lines:[]},
  handover:{seconds:.3,lines:[]},
  leave:{seconds:1.1,travel:1.1,route:RANGER.leaveRoute,lines:['退休喽！钓鱼去！']},
  watch:{seconds:1,lines:['……这就上班了？']},
};
export const RANGER_LETTER={title:'松伯留给你的一封信',paragraphs:[
  '小巡林员，随信给你三粒雏菊种子和一把电锯。先种出第一笔收入，再慢慢把营地建起来吧。',
  '种地赚钱：在地面打开「种地」，用锄头开田，选雏菊种子播下，浇水能加快成熟。用镰刀收割，把作物带到快递站或种子小屋出售，就能拿到金币。',
  '采集木头：拿上电锯，到营地外靠近树木伐木。锯倒树后收好木材，扩建时会用到。',
  '解锁建筑：打开手机大地图，点「扩建营地」。选方向就能看到所需金币、木材和将开放的建筑，确认后地块与设施一起解锁。',
  '使用仓库：向东扩建可开放小屋仓库。靠近仓库会存入木材、出售未保留的作物。打开仓库，点选物品，选择数量并确认，就能在仓库与随身库存之间存取。',
  '接下来由你安排。想知道一个功能有什么用，点它旁边的猫猫问号。信收在小背包里，随时可以再读。',
],signature:'—— 松伯（已退休）'};
export const RANGER_PHASES=[...Object.keys(RANGER_STAGES),'letter','ride-guide','gather','repair','repairing','craft','crafting','complete'];
export const RANGER_LINES=Object.values(RANGER_STAGES).flatMap(stage=>stage.lines);
// 当前入职检查点仅恢复正式阶段，非法阶段从到站开始。
export function validateArrival(raw){
  if(!raw||raw.version!==3)return null;
  const phase=RANGER_PHASES.includes(raw.phase)?raw.phase:'bus';
  return {version:3,phase,elapsed:Math.max(0,Math.min(RANGER_STAGES[phase]?.seconds||30,Number(raw.elapsed)||0)),
    ...([RANGER.scooter,RANGER.giftHull].includes(raw.giftHull)?{giftHull:raw.giftHull}:{}),
    ...(phase==='repairing'?{workWood:Number.isSafeInteger(raw.workWood)&&raw.workWood>0?raw.workWood:RANGER.repairWood}:{}),
    line:0,wood:Math.max(0,Math.min(999999,Math.floor(Number(raw.wood)||0))),keys:!!raw.keys,parked:raw.parked!==false,
    x:Number.isFinite(raw.x)?raw.x:RANGER.doorstep.x,
    y:Number.isFinite(raw.y)?raw.y:RANGER.doorstep.y};
}
// 完成标记保留，普通旧档不重新播放。
export function arrivalPending(progress){return !!progress.arrival&&progress.arrival.phase!=='complete';}
// 首枪只在工坊建成且钥匙已交接时开放正式购买，其他入职交易继续锁定。
export function arrivalPistolPurchase(progress,kind,index,action){return ['craft'].includes(progress?.arrival?.phase)&&progress.arrival.keys&&kind==='weapons'&&index===0&&action==='buy'&&!progress.weapons[0];}
// 施工与采集、购买准备一样交回操控，只有接送短剧和旧制枪演出冻结移动。
export function arrivalCinematic(progress){return arrivalPending(progress)&&!['letter','ride-guide','gather','repair','repairing','craft'].includes(progress.arrival.phase);}
