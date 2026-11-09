// 清缴进场提示只消费一次展示资格，波次变化、离场和读档不重新开启。
import {livingForest} from '../../world/living-spaces.js';
import {livingWaveAllowed} from '../camp/living-safety.js';

// 续接立即提示；普通接单等到真正进入刷怪范围，外围导航区域不提前消费。
export function claimClearingNotice(game){
 const living=game.progress.living;
 if(game.state!=='playing'||!livingForest(game)||!living.patrolActive||living.clearingNotice==='seen'||game.livingBattle||game.mainlineSpeech)return false;
 if(living.clearingNotice!=='continue'&&!livingWaveAllowed(game))return false;
 living.clearingNotice='seen';
 game.onEvent('clearing-notice-shown');
 return true;
}
