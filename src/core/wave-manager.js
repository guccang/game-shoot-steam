import {summonBoss} from './boss-manager.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 波次管理负责配额、休整和推进；Boss 战冻结全部波次时钟，击杀仍记录归属。
import {livingWaveAllowed} from './living-safety.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import { waveDifficulty, WAVE_REST_SECONDS, rollWaveGroup, WAVE_ARRIVAL } from '../config/waves.js';
import { findNearbyArrivalSpot } from './enemy-arrival.js';
import {CLEARING_DENSITY} from '../config/clearing-difficulty.js';

export const WAVE_WARNING_SECONDS = GAMEPLAY_VALUES.wave.warningSeconds;

// 新档从第一波开始；死亡快照保留已结算配额与整组节点，仅重建未击败的怪物。
export function resetWaves(game, wave = 1, continuation = null) {
  game.waveGroupStart = continuation?.waveGroupStart ?? wave;
  game.wave = wave;
  game.waveKills = continuation?.waveKills ?? 0;
  game.waveSpawned = game.waveKills;
  game.waveRest = continuation?.waveRest ?? 0;
  game.spawnTimer = 0;
  // 旧档击杀等待不再阻挡入场；休整续接不追加首次预警。
  game.respawnDelay = 0;
  game.waveWarning = continuation?.bossReady || game.waveRest > 0 ? 0 : WAVE_WARNING_SECONDS;
  game.waveElapsed = 0;
  game.bossWave = continuation?.bossWave ?? wave + rollWaveGroup(game.random) - 1;
  game.bossReady = continuation?.bossReady ?? false;
}

// 当前波次的普通击杀共用判定，任务怪、援军、Boss战与休整不会借此推进。
export function waveKillEligible(game,enemy){
 if(game.campDefense||game.story||game.realm||game.boss||game.bossReady||game.waveRest>0||enemy.type!=='enemy'||enemy.monsterCamp||enemy.bossOwner||enemy.realm||enemy.livingRequest||enemy.fireEvent||enemy.football)return false;
 if(game.waveKills>=waveDifficulty(game.wave,game.recoveryRun).total)return false;
 return enemy.wave===game.wave||!!(enemy.ambient&&game.state==='playing'&&game.waveWarning<=0&&livingWaveAllowed(game));
}
// 随机怪补入本波完成名额，奖励和计数共享同一序号；不会额外扩大刷怪总量。
export function recordWaveKill(game,enemy){
 if(!waveKillEligible(game,enemy))return;
 game.waveKills++;
 const total=waveDifficulty(game.wave,game.recoveryRun).total;
 if(enemy.ambient)game.waveSpawned=Math.min(total,Math.max(game.waveKills,game.waveSpawned+1));
 // 击杀只结算配额，不重置入场节拍或额外抽取等待时间。
}

// 远处回收仅退还出生配额，不能被误判为已击杀。
export function releaseWaveSlot(game, enemy) {
  if (enemy.wave === game.wave) game.waveSpawned = Math.max(game.waveKills, game.waveSpawned - 1);
}

// 按配额从周围可直达的近处入场，组内清波后休整，组末清波后自动进入本轮领主挑战。
export function updateWaves(game, dt) {
  if(!livingWaveAllowed(game))return;
  if (game.campDefense || game.state !== 'playing' || game.boss || game.story || game.realm) return;
  if(game.bossReady){summonBoss(game);return;}
  // 兼容旧会话遗留字段，但它不再参与任何刷怪门槛。
  game.respawnDelay = 0;
  if (game.waveRest > 0) {
    game.waveRest = Math.max(0, game.waveRest - dt);
    if (game.waveRest > 1e-8) return;
    game.wave++;
    game.waveKills = 0;
    game.waveSpawned = 0;
    game.waveRest = 0;
    game.spawnTimer = 0;
    // 波间三秒已结束，直接开始下一波，不再追加三秒预警。
    game.waveWarning = 0;
    game.waveElapsed = 0;
    game.onEvent('wave-start', { wave: game.wave });
    return;
  }
  const difficulty = waveDifficulty(game.wave, game.recoveryRun),
    alive = game.enemies.filter((e) => e.hp > 0 && e.wave === game.wave);
  if (game.waveKills >= difficulty.total) {
    // 达标立即推进；余怪留在现场继续战斗，不强迫寻找远处最后一只。
    for(const enemy of alive){enemy.wave=0;enemy.ambient=true;}
    if(game.wave>=game.bossWave){
      game.bossReady=true;game.waveRest=0;game.spawnTimer=0;game.respawnDelay=0;
      summonBoss(game);game.onEvent('boss-ready',{wave:game.wave});return;
    }
    game.waveRest = WAVE_REST_SECONDS;
    game.onEvent('wave-clear', { wave: game.wave });
    return;
  }
  if (game.waveWarning > 0) {
    game.waveWarning = Math.max(0, game.waveWarning - dt);
    return;
  }
  game.waveElapsed = (game.waveElapsed || 0) + dt;
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    // 每次只补一个小队；同组集中入场形成清场机会，避免低帧率追补多组。
    const cap = Math.min(difficulty.maxAlive, CLEARING_DENSITY.openingAlive + Math.floor(game.waveElapsed * CLEARING_DENSITY.alivePerSecond));
    // 旧波残留与环境怪也占现场名额，避免跨波叠加突破拥挤上限。
    const fieldAlive=game.enemies.filter(e=>e.hp>0).length;
    const count=Math.min(game.wave<=5?CLEARING_DENSITY.openingBatch:CLEARING_DENSITY.batch,difficulty.total-game.waveSpawned,cap-fieldAlive);
    // 受障碍阻挡时下一次换方向，固定随机种子也不会永远卡在同一片树林后。
    const range={...WAVE_ARRIVAL,angle:game.random()*Math.PI*2+Math.floor(game.waveElapsed/CLEARING_DENSITY.spawnInterval)*2.399963,spread:CLEARING_DENSITY.spread};
    for(let i=0;i<count;i++){
      const spot=findNearbyArrivalSpot(game,game.waveSpawned,range);
      if(spot&&(!livingForest(game)||!livingSafePoint(spot)))game.spawnEnemy(0,0,spot);
    }
    game.spawnTimer = CLEARING_DENSITY.spawnInterval;
  }
}
