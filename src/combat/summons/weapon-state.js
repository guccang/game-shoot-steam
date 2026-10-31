// 召唤挂枪与载具炮塔的共同瞬态结构，不决定装填地点或攻击时钟。
import { createPulseState } from '../pulse.js';
import { createWeaponCycle } from '../grenades.js';

// 弹夹由调用方传入并保持引用，首次空仓、出发满仓及三炮供给规则各自保留。
export function createMountedWeaponState(magazine) {
  return {magazine,cooldown:0,pulse:createPulseState(),cycle:createWeaponCycle()};
}

// 套件变化只清除尚未释放的技能，不补弹、不改变装填或脉冲冷却。
export function resetMountedWeaponCharge(state) {
  if(!state)return;
  state.pulse.charge=0;
  state.cycle.charge=0;
  state.cycle.firing=false;
}
