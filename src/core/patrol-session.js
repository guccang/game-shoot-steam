import {syncSupplyAmmo} from '../combat/supply-ammo.js';
import {syncVehicleService} from './vehicle-repair.js';

// 巡游会话负责战场与可序列化进度之间的映射，不访问浏览器存储。
import { validatePatrol } from '../progression/patrol-progress.js';
import {CLEARING_QUOTA_VERSION} from "../config/waves.js";
import { restoreBoss } from './boss-manager.js';
import { WAVE_WARNING_SECONDS } from './wave-manager.js';
import {canonical} from '../world/coordinates.js';
import {vehicleModel} from '../config/vehicles.js';
import {settleDeathPenalty} from './death-penalty.js';

// 死亡只重建瞬态战场；已清怪配额、组起点和领主节点随快照续接，不重抽或回退。
export function restartPatrol(game) {
  if (game.state !== 'dead') return;
  // 新死亡已结算；旧版死亡档没有收据时仅在首次回城补结算一次。
  const coinsLost=settleDeathPenalty(game),coinsRemaining=game.progress.coins;
  const continuation = {
    ...capturePatrol(game),
    time: game.time,
    kills: game.kills,
    chopped: game.chopped,
    roundBosses: game.roundBosses,
    bossKillsAt: game.bossKillsAt,
  };
  game.recoveryRun = true;
  // 普通死亡统一返回森林营地，其他地图不再原地复活。
  game.mapId=game.progress.mapId='forest';
  game.reset(continuation);
  game.progress.living.position=canonical(game.player);
  return {coinsLost,coinsRemaining};
}

// 快照只记录已结算进度；剩余怪物重建配额，不重复奖励已击败的怪物。
export function capturePatrol(game) {
  syncSupplyAmmo(game);
  syncVehicleService(game);
  if (game.campDefense) return game.campDefense.patrol;
  if (game.story) return game.story.forestReturn.patrol;
  if (game.realm) return game.forestPatrol;
  if (game.state === 'ready') return null;
  if(game.mapId==='forest'&&!game.arrivalPending)game.progress.living.position=canonical(game.cottage?.outside||game.player);
  return validatePatrol({
    version: 1,
    waveQuotaVersion: CLEARING_QUOTA_VERSION,
    state: game.state === 'dead' ? 'dead' : 'active',
    deathPenaltyCoins:game.state==='dead'?game.deathPenaltyCoins:null,
    wave: game.wave,
    waveKills: game.waveKills,
    waveRest: game.waveRest,
    bossWave: game.bossWave,
    waveGroupStart: game.waveGroupStart,
    bossReady: game.bossReady,
    spawnTimer: game.spawnTimer,
    kills: game.kills,
    chopped: game.chopped,
    roundBosses: game.roundBosses,
    bossKillsAt: game.bossKillsAt,
    recoveryRun: game.recoveryRun,
    bossHp: game.boss?.hp ?? null,
    // 整备存档保留战区落点，不能刷新后把未完成领主搬到营地身边。
    bossPosition: game.boss?canonical(game.boss):null,
    bossDisengaged:!!game.boss?.disengaged,
    playerHp: game.player.hp,
    // 骑车投料施工保留乘坐状态，刷新后仍能完成下车教学；剧情借车不写入随行车。
    mountedVehicleIndex: !game.fireActive && (!game.arrivalCinematic || game.progress.arrival?.phase==='repairing') && game.vehicle.active && game.vehicle.hp > 0 && game.vehicle.cooldown === 0
      ? game.vehicle.index : null,
  });
}

// 刷新后暂停等待玩家继续；死亡记录保持死亡，不能靠刷新跳过重开规则。
export function restorePatrol(game, snapshot) {
  const saved = validatePatrol(snapshot);
  if (!saved) return;
  game.deathPenaltyCoins=saved.deathPenaltyCoins;
  for (const key of [
    'wave',
    'waveKills',
    'waveRest',
    'bossWave',
    'waveGroupStart',
    'bossReady',
    'spawnTimer',
    'kills',
    'chopped',
    'roundBosses',
    'bossKillsAt',
    'recoveryRun',
  ])
    game[key] = saved[key];
  game.roundBosses = Math.min(game.roundBosses, game.progress.bosses);
  game.player.hp = saved.state === 'dead' ? 0 : Math.max(1, Math.min(game.maxHp(), saved.playerHp));
  // 仅恢复当前仍拥有且未停入车位的随行车，不覆盖工坊最新选装或取走停车场车辆。
  const vehicle = game.vehicle;
  vehicle.active = saved.mountedVehicleIndex === vehicle.index && !!game.progress.vehicleHulls[vehicle.index]
    && !game.progress.campParking.owned.some(record => record.hull === vehicle.index)
    && !(vehicle.index === 4 && game.progress.fireDispatch.garage?.parked)
    && vehicle.hp > 0 && vehicle.cooldown === 0;
  game.player.flying = vehicle.active && !!vehicleModel(vehicle.index).flying;
  game.player.amphibious = vehicle.active && !!vehicleModel(vehicle.index).amphibious;
  game.player.treePass = vehicle.active && !!vehicleModel(vehicle.index).treePass;
  game.enemies = [];
  game.aimLock = null;
  game.waveSpawned = game.waveKills;
  if (saved.bossReady && saved.bossHp !== null) restoreBoss(game, saved.bossHp,saved.bossPosition,saved.bossDisengaged);
  // 只补剩余名额；休整期间不生成敌人，避免完成波次后又刷一轮。
  // 波中重建先准备三秒；波间只续接剩余休整，领主节点不增加准备时间。
  game.waveWarning = game.waveRest > 0 || game.bossReady || game.boss ? 0 : WAVE_WARNING_SECONDS;
  game.waveElapsed = 0;
  game.spawnTimer = 0;
  game.state = saved.state === 'dead' ? 'dead' : 'paused';
}
