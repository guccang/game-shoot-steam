// 清缴结束只恢复当前主线，不续接下一轮，也不跳过任务自身的装备和交付条件。
import {updateMainline} from './mainline-manager.js';
import {clearWorldNavigation} from './world-navigation.js';

// 校验当前胜利收据；重复关闭、旧弹窗和主动续战都不能撤销正在进行的任务。
export function finishClearingNavigation(game,round){
 if(!round||round!==game.pendingClearingRound||round!==game.progress.bosses||game.progress.living.patrolActive)return false;
 game.pendingClearingRound=0;
 clearWorldNavigation(game);
 updateMainline(game,0);
 return true;
}
