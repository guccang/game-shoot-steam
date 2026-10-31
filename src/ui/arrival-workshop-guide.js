// 入职工坊教学直接指向真实房屋和页面按钮，文案按阶段配置，不代替实际交易。
import {RANGER} from '../config/ranger-arrival.js';
import {arrivalWorkReady,arrivalGuidanceVisible} from '../core/ranger-arrival.js';
import {parkedOwned} from '../core/camp-parking.js';
import {worldDistance} from '../world/coordinates.js';
const STEPS={repair:{scene:'靠近自动修复武器工坊',action:'点击这里修复'},craft:{scene:'点击房屋购买手枪',action:'点击购买第一把手枪'}};

// 收齐木料后出现；未到门前先指向工坊，骑乘时同样可以购买。
export function arrivalWorkshopGuide(game,dialogId=null){
 const savedPhase=game.progress.arrival?.phase,phase=savedPhase==='dismount-guide'?'craft':savedPhase,step=STEPS[phase];
 if(!arrivalGuidanceVisible(game)||game.arrivalError)return null;
 // 来信尚未阅读时指向真实任务按钮，打开任意弹窗后让出引导层。
 if(phase==='letter'&&!dialogId)return {id:'arrival-letter',source:'#arrival-goal',text:'点击任务，阅读松伯的信'};
 // 远处先高亮任务路线，走到赠车旁才指向实际可点击的上车按钮。
 if(phase==='ride-guide'&&!dialogId){
  const parked=parkedOwned(game).find(s=>s.record.hull===RANGER.scooter),site=parked||(game.progress.arrival.parked?RANGER.parking:null);
  return site&&worldDistance(game.player,site)>155?{id:'arrival-scooter-route',source:'#arrival-goal',text:'沿路线前往北广场停车场'}:{id:'arrival-scooter-board',source:'#vehicle-button',text:'点击这里，骑上电动车'};
 }
 if(!step)return null;
 // 刚建成时先看新建筑，随后再提示购买，避免提示牌盖住完成徽记。
 if(!dialogId&&phase==='craft'&&game.progress.arrival.elapsed<RANGER.rebuildRevealSeconds)return null;
 if(dialogId)return phase==='craft'&&dialogId==='workshop-dialog'?{id:'arrival-craft-submit',source:'#ws-purchase',text:'购买松果手枪'}:phase==='repair'&&dialogId==='arrival-workshop-dialog'?{id:'arrival-repair-submit',source:'#arrival-workshop-action',text:step.action}:null;
 // 到达修复区交给正式更新自动开工，不再提示多点一次。
 if(phase==='repair'&&arrivalWorkReady(game))return null;
 return {id:'arrival-'+phase,source:'.world-workshop-entry[data-workshop-kind="weapons"]',text:arrivalWorkReady(game)?step.scene:'走到这间工坊门前'};
}
