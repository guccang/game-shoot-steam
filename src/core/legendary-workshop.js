import {bindEconomy,economyFor} from '../config/economy.js';
// 传奇工坊入口、解锁与外观提交共用严格的红狼身份和场景校验。
import {LEGENDARY_WORKSHOP as SITE,normalizeLegendaryWorkshop,normalizeTankDesign} from '../config/legendary-workshop.js';
import {worldDistance} from '../world/coordinates.js';
import {validateProgress} from '../progression/progress.js';
import {capturePatrol} from './patrol-session.js';
// 暂停仅供已打开的说明与工坊确认，不放行故事、秘境和停驻状态。
export function legendaryAccessReason(game){
 if(!['playing','paused'].includes(game.state)||game.realm||game.story||game.cottage||game.campDefense||game.fireActive||game.workshopTrial||game.arrivalCinematic)return '请先结束当前活动，回到森林自由探索。';
 if(game.mapId!=='forest')return '请先回到晴叶森林，再驾驶红狼寻找工坊。';
 if(!game.progress.vehicleHulls[6]||!game.vehicle?.active||game.vehicle.index!==6||game.vehicle.hp<=0)return '只有驾驶红狼坦克，旧铭牌才能唤醒传奇工坊。';
 return '';
}
// 显现与点击共享条件，其他车型来到同一坐标也不显示入口。
export function legendaryVisible(game){return !legendaryAccessReason(game);}
// 门前距离使用循环世界距离，远程调用不能跳过实际抵达。
export function legendaryNearby(game){return legendaryVisible(game)&&worldDistance(game.player,SITE)<=SITE.radius;}
// 行程只移动当前红狼，保留车体生命、武器、主线与资源。
export function travelLegendary(game){const reason=legendaryAccessReason(game);if(reason)return {ok:false,reason};Object.assign(game.player,SITE.arrival,{vx:0,vy:0,recoilX:0,recoilY:0});game.aimLock=null;return {ok:true};}
// 保存成功后才替换永久档，失败不解锁、不覆盖外观或方案。
export function commitLegendary(game,action,persist){
 if(!legendaryNearby(game))return {ok:false,reason:legendaryAccessReason(game)||'请驾驶红狼靠近传奇工坊门前。'};
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
