// 换季后台工作只使用稳定空闲帧；战斗与慢帧先保住现有场景，不承诺强行赶上历法。
import {clearingCombatActive} from '../core/camp/living-safety.js';
import {worldDistance} from '../world/coordinates.js';

// 显式战斗包含波次间隙；野外近敌也暂停预制，远处游荡怪物不阻塞营地预热。
export function seasonPrewarmCombat(game){
  if(!['playing','realm'].includes(game.state))return false;
  if(game.boss||game.livingBattle||game.story||game.realm||game.fireActive||game.workshopTrial||
    game.campDefense&&game.campDefense.phase!=='result'||clearingCombatActive(game))return true;
  return game.enemies.some(enemy=>enemy.hp>0&&worldDistance(game.player,enemy)<900);
}

export class SeasonPrewarmScheduler {
  // 退避只持有时间和原因，不记录游戏对象或画布。
  constructor(renderHz=60){this.slowInterval=1.2/renderHz;this.blockedUntil=0;this.reason='settling';this.allowed=false;}
  // 先于正式绘制设置门禁，战斗中既不构建也不发起新的季节渐变。
  begin({now,elapsed,combat=false,hidden=false}){
    const reason=hidden?'hidden':combat?'combat':elapsed>this.slowInterval?'slow-frame':null;
    if(reason){this.blockedUntil=Math.max(this.blockedUntil,now+500);this.reason=reason;}
    this.allowed=!reason&&now>=this.blockedUntil;
    if(this.allowed)this.reason='idle';
    return this.allowed;
  }
  // 完成当前帧所有渲染和面板更新后再核算余量，不借用必需地块的保底预算。
  budget(spent,now){
    if(spent>10){this.blockedUntil=Math.max(this.blockedUntil,now+500);this.allowed=false;if(this.reason==='idle')this.reason='busy-frame';}
    return this.allowed?Math.max(0,Math.min(1,12-spent)):0;
  }
  // 单步无法中途抢占；一旦超时立即退避，避免下一帧继续叠加负担。
  record(ms,now){if(ms>2){this.blockedUntil=Math.max(this.blockedUntil,now+1000);this.allowed=false;this.reason='long-step';}}
}
