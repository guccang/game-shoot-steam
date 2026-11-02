import {observingMonsterCamp} from './monster-camps.js';
// 移动遭遇独立调度，复用怪物战斗与安全选点，不占用任何波次配额。
import {livingWaveAllowed} from './living-safety.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {forestThreatAt} from '../world/forest-levels.js';
import { LOW_RISK_ENCOUNTERS, ENCOUNTERS } from '../config/encounters.js';
import { findNearbyArrivalSpot } from './enemy-arrival.js';

// 新巡游、死亡重建和切图重新等待，避免刚入场立即刷遭遇怪。
export function resetEncounters(game) {
  const rules=encounterRules(game);
  game.encounterTimer = rules.minSeconds + game.random() * (rules.maxSeconds - rules.minSeconds);
  game.encounterSpawned = 0;game.encounterLowRisk=encounterRules(game)===LOW_RISK_ENCOUNTERS;game.encounterQuiet=0;game.encounterHadEnemies=false;
}

// 区域分级与地图显示共用等级圈，不按主线进度改变森林危险度。
export function encounterRules(game){return game.mapId==='forest'&&game.player&&forestThreatAt(game.player.x,game.player.y).max<=3?LOW_RISK_ENCOUNTERS:ENCOUNTERS;}

// 仅自由移动推进遭遇与喘息，暂停、清缴和专属战斗不积压补刷。
export function updateEncounters(game, dt, moving) {
  const living=livingForest(game);
  if(observingMonsterCamp(game))return;
  if (game.campDefense || game.state !== 'playing' || (!living&&!game.bossReady) || game.story || game.realm || game.boss || game.fireActive || !moving) return;
  if(living&&(livingSafePoint(game.player)||livingWaveAllowed(game)||game.livingBattle))return;
  const rules=encounterRules(game),low=rules===LOW_RISK_ENCOUNTERS,alive=game.enemies.filter(e=>e.ambient&&e.hp>0).length;
  // 从危险区回到营地周边时重新给予观察时间，已有怪物不删除、不重复发奖。
  if(low&&!game.encounterLowRisk)game.encounterTimer=Math.max(game.encounterTimer,rules.minSeconds);
  game.encounterLowRisk=low;
  if(low&&game.encounterHadEnemies&&!alive)game.encounterQuiet=rules.quietSeconds;
  game.encounterHadEnemies=alive>0;
  if(low&&game.encounterQuiet>0){game.encounterQuiet=Math.max(0,game.encounterQuiet-dt);return;}
  if (alive >= rules.maxAlive) return;
  game.encounterTimer = Math.max(0, game.encounterTimer - dt);
  if (game.encounterTimer > 1e-8) return;
  const spot = findNearbyArrivalSpot(game, game.encounterSpawned, ENCOUNTERS);
  if (!spot||(living&&livingSafePoint(spot))) { game.encounterTimer = ENCOUNTERS.retrySeconds; return; }
  game.spawnEnemy(0, 0, spot, { ambient: true, rangedEncounter: true });
  game.encounterSpawned++;game.encounterHadEnemies=true;
  game.encounterTimer = rules.minSeconds + game.random() * (rules.maxSeconds - rules.minSeconds);
}
