// 普通巡游死亡只扣金币；金额向下取整，收据随死亡快照保存，读档不重复结算。
import {recordEconomy} from '../progression/economy-ledger.js';
import {DEATH_COIN_LOSS_RATE} from '../config/death-penalty.js';

// 金币保持整数，零金币和不足十枚时允许损失为零。
export function deathCoinLoss(coins){return Math.floor(Math.max(0,Number(coins)||0)*DEATH_COIN_LOSS_RATE);}

// 同一次死亡重复调用返回原收据；真正再次死亡前由战场重建清空。
export function settleDeathPenalty(game){
 if(Number.isInteger(game.deathPenaltyCoins)&&game.deathPenaltyCoins>=0)return game.deathPenaltyCoins;
 const loss=deathCoinLoss(game.progress.coins);game.progress.coins-=loss;game.deathPenaltyCoins=loss;
 recordEconomy(game.progress,'expense','death:coins',{coins:loss});return loss;
}
