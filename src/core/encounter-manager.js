import {observingMonsterCamp} from './monster-camps.js';
// 移动遭遇独立调度，复用怪物战斗与安全选点，不占用任何波次配额。
import {livingWaveAllowed} from './living-safety.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import { ENCOUNTERS } from '../config/encounters.js';
import { findNearbyArrivalSpot } from './enemy-arrival.js';

// 新巡游、死亡重建和切图重新等待，避免刚入场立即刷遭遇怪。
export function resetEncounters(game) {
  game.encounterTimer = ENCOUNTERS.minSeconds + game.random() * (ENCOUNTERS.maxSeconds - ENCOUNTERS.minSeconds);
  game.encounterSpawned = 0;
}

// 仅等待领主的探索时段累计移动时间；整组波次（含预警、休整）和专属战斗冻结随机刷怪。
export function updateEncounters(game, dt, moving) {
  const living=livingForest(game);
  if(observingMonsterCamp(game))return;
  if (game.campDefense || game.state !== 'playing' || (!living&&!game.bossReady) || game.story || game.realm || game.boss || game.fireActive || !moving) return;
  if(living&&(livingSafePoint(game.player)||livingWaveAllowed(game)||game.livingBattle))return;
  if (game.enemies.filter(e => e.ambient && e.hp > 0).length >= ENCOUNTERS.maxAlive) return;
  game.encounterTimer = Math.max(0, game.encounterTimer - dt);
  if (game.encounterTimer > 1e-8) return;
  const spot = findNearbyArrivalSpot(game, game.encounterSpawned, ENCOUNTERS);
  if (!spot||(living&&livingSafePoint(spot))) { game.encounterTimer = ENCOUNTERS.retrySeconds; return; }
  game.spawnEnemy(0, 0, spot, { ambient: true, rangedEncounter: true });
  game.encounterSpawned++;
  game.encounterTimer = ENCOUNTERS.minSeconds + game.random() * (ENCOUNTERS.maxSeconds - ENCOUNTERS.minSeconds);
}
