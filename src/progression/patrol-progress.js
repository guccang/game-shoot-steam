import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 巡游存档的白名单与版本迁移；不保存弹丸、粒子或怪物实例。
import { waveDifficulty, legacyWaveTotal, CLEARING_MIX_MINIMUM, PREVIOUS_CLEARING_WAVE_CAPS, PREVIOUS_V4_WAVE_CAPS, CLEARING_QUOTA_VERSION, CLEARING_OPENING_TOTALS, FIRST_CLEARING_TOTALS, WAVE_REST_SECONDS } from '../config/waves.js';
import { clamp } from '../core/math.js';
import {clearingRewardTotal} from '../config/waves.js';
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
  // 已完成节点保持完成，波中按原版本配额换算进度，避免扩容后重复领取奖励。
  const total=waveDifficulty(wave).total;
  const uncappedTotal=Math.max(CLEARING_MIX_MINIMUM[(wave-1)%5],legacyWaveTotal(wave));
  // 各历史版本按自身配额折算完成比例，版本5的上限固定为原来的四十只。
  // 版本7保留未减量的原配额，前两轮缩减时不能误用更早版本的击杀基数。
  const oldTotal=raw.waveQuotaVersion===7?Math.min(64,FIRST_CLEARING_TOTALS[(wave-1)%5]+4*Math.floor((wave-1)/5)):raw.waveQuotaVersion===6?clearingRewardTotal(wave):raw.waveQuotaVersion===5?Math.min(40,CLEARING_OPENING_TOTALS[(wave-1)%5]+2*Math.floor((wave-1)/5)):raw.waveQuotaVersion===4?Math.min(PREVIOUS_V4_WAVE_CAPS[(wave-1)%5],uncappedTotal):raw.waveQuotaVersion===3?Math.min(PREVIOUS_CLEARING_WAVE_CAPS[(wave-1)%5],uncappedTotal):raw.waveQuotaVersion===2?uncappedTotal:legacyWaveTotal(wave);
  const completedLegacy=raw.waveQuotaVersion!==CLEARING_QUOTA_VERSION&&raw.waveKills>=oldTotal&&(raw.bossReady===true||raw.waveRest>0);
  // 每个历史版本均按自己的配额向上换算已结算比例，缩减或扩容都不重新发奖。
  const previousKills=number(raw.waveKills,0,oldTotal,true);
  const migratedKills=raw.waveQuotaVersion!==CLEARING_QUOTA_VERSION?Math.ceil(previousKills*total/oldTotal):raw.waveKills;
  const waveKills = completedLegacy?total:number(migratedKills, 0, total, true);
  // 配额换算不是实际击杀，累计战绩不能随怪群扩容凭空增加；重载继续保持原值。
  const kills = number(raw.kills,raw.waveQuotaVersion===CLEARING_QUOTA_VERSION?waveKills:previousKills,GAMEPLAY_VALUES.progress.counterCap,true);
  // 旧档从当前波开始一组四波；活跃领主需由会话层确认有效强度后再恢复节点。
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
    // 保留旧字段以兼容历史快照，击杀等待统一归零且不影响已结算配额。
    respawnDelay: 0,
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
