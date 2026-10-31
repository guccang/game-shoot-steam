// 尾怪目标复用正式计数规则，只读战场，不生成怪物或推进波次。
import {waveDifficulty} from '../config/waves.js';
import {WAVE_TAIL_NAVIGATION} from '../config/wave-tail-navigation.js';
import {waveKillEligible} from './wave-manager.js';
import {livingWaveAllowed} from './living-safety.js';
import {worldDistance} from '../world/coordinates.js';

// 在最后三个名额内优先指引最近可计数的怪物，随机怪也可帮助清波。
export function waveTailTargets(game){
 const remaining=waveDifficulty(game.wave,game.recoveryRun).total-game.waveKills;
 if(game.state!=='playing'||game.waveWarning>0||remaining<1||remaining>WAVE_TAIL_NAVIGATION.remaining||!livingWaveAllowed(game))return [];
 return game.enemies.filter(e=>e.hp>0&&(!e.mapId||e.mapId===game.mapId)&&waveKillEligible(game,e))
  .map(enemy=>({enemy,distance:worldDistance(game.player,enemy)}))
  .sort((a,b)=>a.distance-b.distance||a.enemy.id-b.enemy.id).slice(0,remaining);
}
