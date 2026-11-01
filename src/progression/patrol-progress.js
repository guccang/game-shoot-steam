import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 当前巡游存档的白名单校验；不保存弹丸、粒子或怪物实例。
import { waveDifficulty, CLEARING_QUOTA_VERSION, WAVE_REST_SECONDS } from '../config/waves.js';
import { clamp } from '../core/math.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';

// 有界数值恢复，非法字段采用默认值，杜绝坏档造成无限波次或计时。
function number(value, fallback, max, integer = false) {
  const safe = Number.isFinite(value) ? clamp(value, 0, max) : fallback;
  return integer ? Math.floor(safe) : safe;
}

// 缺少巡游记录的旧存档照常从第一波开始，永久成长不受影响。
export function validatePatrol(raw) {
  if (!raw || raw.version !== 1 || !['active', 'dead'].includes(raw.state)) return null;
  const wave = Math.max(1, number(raw.wave, 1, 100000, true));
  const total=waveDifficulty(wave).total;
  const waveKills=number(raw.waveKills,0,total,true);
  const kills=number(raw.kills,0,GAMEPLAY_VALUES.progress.counterCap,true);
  const bossReady=raw.bossReady===true&&waveKills===waveDifficulty(wave).total;
  const bossWave=bossReady?wave:Math.max(wave,number(raw.bossWave,wave+3,wave+5,true));
  // 旧档只展示可确认的当前波；新档保留整组起点，胜利休整允许下一波为起点。
  const maxStart=wave+(!bossReady&&raw.waveRest>0&&waveKills===waveDifficulty(wave).total?1:0);
  const waveGroupStart=Math.max(1,bossWave-5,Math.min(bossWave,maxStart,number(raw.waveGroupStart,wave,maxStart,true)));
  return {
    version: 1,
    waveQuotaVersion: CLEARING_QUOTA_VERSION,
    state: raw.state,
    // null区分旧死亡档未结算与已结算但损失为零，活动存档不保留死亡收据。
    deathPenaltyCoins:raw.state==='dead'&&Number.isInteger(raw.deathPenaltyCoins)&&raw.deathPenaltyCoins>=0?Math.min(RESOURCE_CAP,raw.deathPenaltyCoins):null,
    wave,
    waveKills,
    bossWave,
    waveGroupStart,
    bossReady,
    waveRest:
      waveKills === waveDifficulty(wave).total ? number(raw.waveRest, 0, WAVE_REST_SECONDS) : 0,
    spawnTimer: number(raw.spawnTimer, 0.4, 2),
    kills,
    chopped: number(raw.chopped, 0, GAMEPLAY_VALUES.progress.counterCap, true),
    roundBosses: number(raw.roundBosses, 0, GAMEPLAY_VALUES.progress.counterCap, true),
    bossKillsAt: number(raw.bossKillsAt, 0, kills, true),
    recoveryRun: raw.recoveryRun === true,
    bossHp: Number.isFinite(raw.bossHp) && raw.bossHp > 0 ? number(raw.bossHp, 1, 1e12) : null,
    playerHp: raw.state === 'dead' ? 0 : number(raw.playerHp, 120, 1e9),
    // 乘坐状态只接受有效车型；死亡与未乘坐不自动上车。
    mountedVehicleIndex: raw.state !== 'dead' && Number.isInteger(raw.mountedVehicleIndex) && COLLECTED_VEHICLES[raw.mountedVehicleIndex]
      ? raw.mountedVehicleIndex : null,
  };
}
