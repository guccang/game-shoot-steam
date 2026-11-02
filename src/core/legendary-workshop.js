import {bindEconomy,economyFor} from '../config/economy.js';
// 传奇工坊入口、解锁与外观提交共用严格的红狼身份和场景校验。
import {LEGENDARY_WORKSHOP as SITE,normalizeLegendaryWorkshop,normalizeTankDesign} from '../config/legendary-workshop.js';
import {worldDistance} from '../world/coordinates.js';
import {validateProgress} from '../progression/progress.js';
import {capturePatrol} from './patrol-session.js';
import {WORKSHOP_INTERIORS} from '../config/workshop-interiors.js';
import {requestWorldNavigation} from './world-navigation.js';
// 暂停仅供已打开的说明与工坊确认，不放行故事、秘境和停驻状态。
export function legendaryAccessReason(game){
 if(!['playing','paused'].includes(game.state)||game.realm||game.story||(game.cottage&&game.cottage.kind!=='legendary')||game.campDefense||game.fireActive||game.workshopTrial||game.arrivalCinematic)return '请先结束当前活动，回到森林自由探索。';
 if(game.mapId!=='forest')return '请先回到晴叶森林，再寻找传奇工坊。';
 if(!game.progress.vehicleHulls[6])return '先获得红狼坦克，它的铭牌就是传奇工坊的钥匙，无需另外购买钥匙。';
 return '';
}
// 红狼所有权解锁显现，步行和驾驶其他车型也可到访，方便下车入室。
export function legendaryVisible(game){return !legendaryAccessReason(game);}
// 载具工坊中的红狼档案允许标记室外去向，但不能远程解锁或使用传奇服务。
export function legendaryNavigationReason(game){return legendaryAccessReason(game.cottage?.kind==='vehicle'?Object.assign(Object.create(game),{cottage:null}):game);}
// 门前距离使用循环世界距离，远程调用不能跳过实际抵达。
export function legendaryNearby(game){return legendaryVisible(game)&&(game.cottage?.kind==='legendary'||worldDistance(game.player,SITE)<=SITE.radius);}
// 传奇室内的枪械页面和实际提交共享权限，未解锁、其他房间及车体整备不放行。
export function canLegendaryForge(game,kind){return kind==='weapons'&&game.cottage?.kind==='legendary'&&game.progress.legendaryWorkshop?.unlocked===true&&legendaryNearby(game);}
// 前往只开启真实门口的路线，不将室内局部坐标当作室外坐标，也不传送玩家或车辆。
export function travelLegendary(game){
 const reason=legendaryNavigationReason(game);if(reason)return {ok:false,reason};
 const room=WORKSHOP_INTERIORS.legendary;
 requestWorldNavigation(game,{id:'legendary-workshop-door',mapId:SITE.mapId,...room.door},'前往传奇工坊门口',{direct:true,arrivalRadius:room.radius});
 return {ok:true,exitFirst:!!game.cottage};
}
// 保存成功后才替换永久档，失败不解锁、不覆盖外观或方案。
export function commitLegendary(game,action,persist){
 if(!legendaryNearby(game))return {ok:false,reason:legendaryAccessReason(game)||'请沿路线抵达传奇工坊门口。'};
 const next=validateProgress(bindEconomy(JSON.parse(JSON.stringify(game.progress)),economyFor(game.progress))),state=next.legendaryWorkshop;
 if(action.type==='unlock')state.unlocked=true;
 else{
  if(!state.unlocked)return {ok:false,reason:'请先阅读传承并解锁传奇工坊。'};
  if(![1,6].includes(action.vehicle)||!next.vehicleHulls[action.vehicle])return {ok:false,reason:'请先拥有这辆坦克。'};
  const design=normalizeTankDesign(action.design);
  if(action.type==='paint')state.designs[action.vehicle]=design;
  else if(action.type==='save-scheme'&&Number.isInteger(action.slot)&&action.slot>=0&&action.slot<=state.schemes.length&&action.slot<3)state.schemes[action.slot]={vehicle:action.vehicle,design};
  else return {ok:false,reason:'请选择有效的外观方案。'};
 }
 next.legendaryWorkshop=normalizeLegendaryWorkshop(state);next.patrol=capturePatrol(Object.assign(Object.create(game),{progress:next}));
 try{if(persist(next)!==true)return {ok:false,reason:'保存失败，尚未应用，请重试。'};}catch{return {ok:false,reason:'保存失败，尚未应用，请重试。'};}
 game.progress=next;return {ok:true};
}
