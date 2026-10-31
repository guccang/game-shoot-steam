// 九秒入职短剧：到站、急速接送、退休出发；说明留在可反复阅读的信里。
import {townPoint} from './town-layout.js';
import {PATHS} from '../world/paths.js';
import {WORLD} from '../world/coordinates.js';
import {PARKING_SPOTS} from './parking.js';
import {RESTORATION_SECONDS,RESTORATION_FLIGHT} from './building-repair-timing.js';
// 赠车停在北广场靠近入口的正式泊位，演出与停车接管共用位置。
const giftParking=PARKING_SPOTS.find(s=>s.id==='north-0-2');
// 只取当前世界北侧最后660单位，不把扩展地图的远路串入九秒接送。
const road=[...PATHS[1].filter(p=>p.y>=WORLD.height-660).map(p=>({x:p.x,y:p.y-WORLD.height})),...PATHS[1].filter(p=>p.y>0&&p.y<=160)];
export const RANGER = Object.freeze({scooter:5,saw:14,repairWood:80,pistolWood:8,
  passengerFootY:-28,rideSeconds:2.8,handoverSeconds:.3,dismountSeconds:.5,leaveSeconds:1.1,
  workSeconds:3,rebuildSeconds:RESTORATION_SECONDS-RESTORATION_FLIGHT,rebuildRevealSeconds:1.2,
  busStop:townPoint({x:490,y:-650}),bus:road[0],waiting:{x:road[0].x-42,y:road[0].y+12},
  parkingId:giftParking.id,parking:{x:giftParking.x,y:giftParking.y},
  stop:road.at(-1),doorstep:townPoint({x:610,y:185}),elderDoorstep:{x:road.at(-1).x,y:133},
  route:road,pickupRoute:road.filter(p=>p.y<=-460).slice().reverse(),
  leaveRoute:road.filter(p=>p.y>=-360).slice().reverse(),
});
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
  '小巡林员，欢迎来到晴叶营地！从今天起，这片林子就拜托你照看啦。巡路、帮帮邻居，累了就回小屋歇脚。',
  '前阵子的暴风雨掀坏了屋顶，也砸坏了工坊和路牌，幸好大家都平安。我和邻居清理了险处，可镇上的设施还用不了。地基和梁架大多完好，照着巡林簿采些木料，一处处修好，就能重新开张。',
  '房子钥匙、这封信和巡林手机都放在小背包里。手机能看地图、打电话问问邻居，也能帮你找回家的路。电锯也交给你了，北广场停车场靠入口的小电动车送你了，走到车旁点击就能骑，不用等工坊修好。我骑的是自己的退休专车，可别等我回来！',
  '先去北广场骑上电动车，带着电锯采些木料，修好武器工坊。到时按提示下车，再去买第一把手枪。以后换枪、升级去武器工坊，换车去载具工坊，准备好了再去探索林子。',
  '邻居的委托办完，记得回去领谢礼。春天看花，秋天听风；别光顾着工作，也要好好过日子。',
  '我先去湖边占个钓鱼位。退休第一天，忙得很！',
],signature:'—— 松伯（已退休）'};
export const RANGER_PHASES=[...Object.keys(RANGER_STAGES),'letter','ride-guide','gather','repair','repairing','dismount-guide','craft','crafting','complete'];
export const RANGER_LINES=Object.values(RANGER_STAGES).flatMap(stage=>stage.lines);
// 旧导览检查点统一迁移到营门交接，任务及完成档原样续接，不重复扣料。
export function validateArrival(raw){
  if(!raw||![1,2,3].includes(raw.version))return null;
  const legacy=raw.version<3,oldScene=['ride','dialogue','cottage','weapons','vehicle','dismount','parking','handover','leave','watch'].includes(raw.phase);
  let phase=legacy&&oldScene?(raw.keys?'gather':'handover'):RANGER_PHASES.includes(raw.phase)?raw.phase:'bus';
  return {version:3,phase,elapsed:legacy&&oldScene?0:Math.max(0,Math.min(RANGER_STAGES[phase]?.seconds||30,Number(raw.elapsed)||0)),
    ...(phase==='repairing'?{workWood:Number.isSafeInteger(raw.workWood)&&raw.workWood>0?raw.workWood:RANGER.repairWood}:{}),
    line:0,wood:Math.max(0,Math.min(999999,Math.floor(Number(raw.wood)||0))),keys:!!raw.keys,parked:raw.parked!==false,
    x:legacy&&oldScene?RANGER.doorstep.x:Number.isFinite(raw.x)?raw.x:RANGER.doorstep.x,
    y:legacy&&oldScene?RANGER.doorstep.y:Number.isFinite(raw.y)?raw.y:RANGER.doorstep.y};
}
// 完成标记保留，普通旧档不重新播放。
export function arrivalPending(progress){return !!progress.arrival&&progress.arrival.phase!=='complete';}
// 首枪只在工坊建成且钥匙已交接时开放正式购买，其他入职交易继续锁定。
export function arrivalPistolPurchase(progress,kind,index,action){return ['dismount-guide','craft'].includes(progress?.arrival?.phase)&&progress.arrival.keys&&kind==='weapons'&&index===0&&action==='buy'&&!progress.weapons[0];}
// 施工与采集、购买准备一样交回操控，只有接送短剧和旧制枪演出冻结移动。
export function arrivalCinematic(progress){return arrivalPending(progress)&&!['letter','ride-guide','gather','repair','repairing','dismount-guide','craft'].includes(progress.arrival.phase);}
