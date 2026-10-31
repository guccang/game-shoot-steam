import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 秘境存档只保存关卡检查点；刷新重试未完成关卡，不重复发放已结算奖励。
import { GUARDIAN_PADS, GUARDIAN_ECONOMY } from '../config/guardian.js';
import { WEAPONS } from '../config/weapons.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import { validExpeditionLoadout, normalizeExpeditionLoadout } from '../config/expedition.js';
import { REALMS, BLESSINGS, ENCOUNTERS, ROGUE_BLESSINGS, TOWER_REST_SECONDS, GUARDIAN_REST_SECONDS, normalizeRealmArena } from '../config/realms.js';
import { validateRealmVehicles } from './realm-vehicles.js';
import { guardianSupplyLevels } from '../config/guardian-upgrades.js';
import {RACE,raceReward} from '../config/forest-race.js';
import { FOOTBALL, footballReward } from '../config/slime-football.js';
// 将外部数值收敛到有界整数，拒绝非数字和无穷值。
function integer(value, min, max, fallback = min) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
}
// 旧档补齐三种模式的独立纪录；损坏挑战安全退回森林。
export function validateRealms(raw,ledger=null) {
  const result = { records: {}, run: null, lastLoadout: validExpeditionLoadout(raw?.lastLoadout) ? normalizeExpeditionLoadout(raw.lastLoadout) : null };
  for (const mode of Object.keys(REALMS))
    result.records[mode] = { best: integer(raw?.records?.[mode]?.best, 0, Number.MAX_SAFE_INTEGER - 1),
      clears: integer(raw?.records?.[mode]?.clears, 0, 999999), bosses: integer(raw?.records?.[mode]?.bosses, 0, Number.MAX_SAFE_INTEGER) };
  result.records.race.bestTimeMs=integer(raw?.records?.race?.bestTimeMs,0,RACE.duration*1000);
  // 旧档从仍保留的逐场账本恢复累计；记录不全只承诺可核实下限，不用最高分乘场次伪造总分。
  const football=result.records.football,previous=raw?.records?.football;
  const scores=(ledger?.events||[]).filter(e=>e.type==='challenge'&&/^football:\d+$/.test(e.source)).map(e=>integer(Number(e.source.slice(9)),0,Number.MAX_SAFE_INTEGER-1));
  const recovered=scores.reduce((sum,n)=>Math.min(Number.MAX_SAFE_INTEGER-1,sum+n),0);
  football.totalGoals=Number.isFinite(previous?.totalGoals)?Math.max(football.best,integer(previous.totalGoals,0,Number.MAX_SAFE_INTEGER-1)):Math.max(football.best,recovered);
  football.totalGoalsPartial=Number.isFinite(previous?.totalGoals)?previous.totalGoalsPartial===true:scores.length<football.clears||recovered<football.best;
  const r = raw?.run;
  // 赛跑不保存半圈状态；已结算只展示结果，读档不再发奖。
  if(r?.mode==='race'){
    if(!['build','combat','won','lost'].includes(r.phase))return result;
    const done=['won','lost'].includes(r.phase),won=r.phase==='won',place=won?integer(r.place,1,4,4):0;
    result.run={mode:'race',phase:done?r.phase:'build',stage:1,cleared:won?1:0,place,elapsed:done?integer(r.elapsed*1000,0,RACE.duration*1000)/1000:0,arena:{...RACE.arena},buffs:{},offers:[],encounter:'swarm',startHp:integer(r.startHp,1,10000,120),goddessHp:GAMEPLAY_VALUES.realm.goddessHealth,earnings:Object.fromEntries(Object.entries(raceReward(place)).map(([key,max])=>[key,integer(r.earnings?.[key],0,max)])),forestVehicles:validateRealmVehicles(r.forestVehicles)};return result;
  }
  // 消防改为独立世界事件，忽略旧圈内检查点但保留历次奖励。
  if(r?.mode==='fire')return result; // 旧圈内火警退役，已入库奖励仍保留。
  // 比赛只保存开赛前或已结算检查点；刷新不能把旧进球和新倒计时拼接。
  if(r?.mode==='football'){
    if(!['build','combat','won'].includes(r.phase))return result;
    const won=r.phase==='won',score=won?integer(r.score,0,99999):0;
    result.run={mode:'football',phase:won?'won':'build',stage:1,cleared:won?1:0,score,gun:Number.isInteger(r.gun)&&WEAPONS[r.gun]&&!WEAPONS[r.gun].controller&&WEAPONS[r.gun].attackKind!=='melee'?r.gun:3,remaining:FOOTBALL.duration,arena:{...FOOTBALL.arena},buffs:{},offers:[],encounter:'swarm',startHp:integer(r.startHp,1,10000,120),goddessHp:GAMEPLAY_VALUES.realm.goddessHealth,earnings:won?footballReward(score):footballReward(0),forestVehicles:validateRealmVehicles(r.forestVehicles)};return result;
  }
  if (!r || !Object.hasOwn(REALMS, r.mode) || !['build', 'loadout', 'combat', 'choice', 'guide', 'rest', 'won', 'lost'].includes(r.phase)) return result;
  const buffs = {};
  for (const key of Object.keys(BLESSINGS)) buffs[key] = integer(r.buffs?.[key], 0, GAMEPLAY_VALUES.blessings.maxStacks);
  if (r.loadout !== undefined && (r.mode !== 'rogue' || !validExpeditionLoadout(r.loadout))) return result;
  if (r.phase === 'loadout' && (!r.loadout || r.mode !== 'rogue' || r.stage !== 1 || r.cleared !== 0)) return result;
  if (r.loadout && !['loadout', 'lost'].includes(r.phase) && (r.loadout.weapon === null || r.loadout.vehicle === null)) return result;
  const stage = integer(r.stage, 1, Number.MAX_SAFE_INTEGER - 1);
  // 旧版终点已结算奖励，迁移到休整/祝福阶段后继续下一关，不重发通关奖励。
  const legacyWon = r.phase === 'won' && stage === ({ rogue: 5, tower: 10, guardian: 6 })[r.mode] && r.cleared === stage;
  if (r.phase === 'won' && !legacyWon) return result;
  // 旧守护祝福待选存档直接进入休整，保留已结算的部署、余额和历史强化。
  const guardianChoice = r.mode === 'guardian' && r.phase === 'choice';
  const phase = guardianChoice ? 'rest' : legacyWon ? r.mode === 'rogue' ? 'choice' : 'rest' : r.phase;
  const restSeconds = r.mode === 'guardian' ? GUARDIAN_REST_SECONDS : TOWER_REST_SECONDS;
  const allowed = r.mode === 'rogue' ? ROGUE_BLESSINGS : [];
  const offers = legacyWon && phase === 'choice' ? allowed.slice(0, GAMEPLAY_VALUES.blessings.offerCount) : Array.isArray(r.offers) ? [...new Set(r.offers.filter(k => allowed.includes(k)))].slice(0, GAMEPLAY_VALUES.blessings.offerCount) : [];
  if (['choice', 'loadout'].includes(phase) && offers.length !== GAMEPLAY_VALUES.blessings.offerCount) return result;
  const used = new Set();
  let vehicleRefund = 0;
  const defenses = (Array.isArray(r.defenses) ? r.defenses : []).slice(0, GUARDIAN_PADS.length).filter(t => {
    if (!t || !Number.isInteger(t.slot) || !GUARDIAN_PADS[t.slot] || used.has(t.slot) ||
        !Number.isInteger(t.weaponIndex) || !WEAPONS[t.weaponIndex] ||
        !(t.kind === 'weapon' && t.index === t.weaponIndex || t.kind === 'vehicle' && Number.isInteger(t.index) && COLLECTED_VEHICLES[t.index] && !WEAPONS[t.weaponIndex].controller)) return false;
    used.add(t.slot); return true;
  }).map(t => {
    // 旧格位车体改为原搭载枪械，等级保留、差价返还一次，重复校验不再退款。
    if (t.kind === 'vehicle') vehicleRefund += GUARDIAN_ECONOMY.vehicle - GUARDIAN_ECONOMY.weapon;
    const modules = WEAPONS[t.weaponIndex].controller === 'funnel' && Array.isArray(t.funnelLoadout)
      ? Array.from({ length: 3 }, (_, i) => Number.isInteger(t.funnelLoadout[i]) &&
        (t.funnelLoadout[i] === 12 || WEAPONS[t.funnelLoadout[i]] && !WEAPONS[t.funnelLoadout[i]].controller) ? t.funnelLoadout[i] : 12) : null;
    return { slot: t.slot, kind: 'weapon', index: t.weaponIndex, weaponIndex: t.weaponIndex,
      level: integer(t.level, 1, GUARDIAN_ECONOMY.maxLevel, 1),
      ...(t.upgrades ? { upgrades: guardianSupplyLevels(t) } : {}), ...(modules ? { funnelLoadout: modules } : {}) };
  });
  result.run = { mode: r.mode, phase, stage, buffs, offers, arena: normalizeRealmArena(r.arena),
    ...(r.mode === 'rogue' ? { firstRun: r.firstRun === true } : {}),
    ...(r.blessingCounts && typeof r.blessingCounts === 'object' ? {
      blessingCounts: Object.fromEntries(Object.keys(BLESSINGS).map(key => [key, integer(r.blessingCounts[key], buffs[key], Number.MAX_SAFE_INTEGER, buffs[key])])),
      blessingCountsPartial: r.blessingCountsPartial === true,
    } : {}),
    ...(['tower', 'guardian'].includes(r.mode) ? { restRemaining: phase === 'rest' ? !guardianChoice && Number.isFinite(r.restRemaining) ? Math.max(0, Math.min(restSeconds, r.restRemaining)) : restSeconds : 0 } : {}),
    ...(r.mode === 'guardian' ? { realmCoins: Math.min(GAMEPLAY_VALUES.progress.counterCap, integer(r.realmCoins, 0, GAMEPLAY_VALUES.progress.counterCap, GUARDIAN_ECONOMY.start) + vehicleRefund), defenses } : {}),
    ...(r.loadout ? { loadout: normalizeExpeditionLoadout(r.loadout) } : {}),
    vehicles: validateRealmVehicles(r.vehicles), forestVehicles: validateRealmVehicles(r.forestVehicles),
    encounter: Object.hasOwn(ENCOUNTERS, r.encounter) ? r.encounter : 'swarm',
    cleared: integer(r.cleared, 0, stage),
    startHp: integer(r.startHp, 1, 10000, 120), goddessHp: integer(r.goddessHp, 0, GAMEPLAY_VALUES.realm.goddessHealth, GAMEPLAY_VALUES.realm.goddessHealth),
    earnings: Object.fromEntries(['coins', 'wood', 'parts', 'crystal', 'core'].map(k => [k, integer(r.earnings?.[k], 0, Number.MAX_SAFE_INTEGER)])),
  };
  // 阶段与已领取奖励必须吻合，损坏记录不能跳关、重发奖励或复活已失守祭坛。
  const cleared = result.run.cleared;
  if ((phase === 'build' && (r.mode !== 'guardian' || stage !== 1 || cleared !== 0)) ||
      (phase === 'guide' && (r.mode !== 'rogue' || !result.run.firstRun || stage !== 5 || cleared !== 4)) ||
      (phase === 'combat' && (cleared !== stage - 1 || (r.mode === 'guardian' && result.run.goddessHp <= 0))) ||
      (phase === 'rest' && (!['tower', 'guardian'].includes(r.mode) || cleared !== stage || (r.mode === 'guardian' && result.run.goddessHp <= 0))) ||
      (phase === 'choice' && !((r.mode === 'rogue' && stage === 1 && cleared === 0) || (r.mode !== 'tower' && cleared === stage)))) result.run = null;
  return result;
}
