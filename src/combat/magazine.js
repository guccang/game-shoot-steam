import {ammoKind} from '../config/supplies.js';
import {advanceEnergyShield} from './energy-shield.js';
import { advanceRotary } from './rotary.js';
import { isSummonEnergy, summonRegenRate } from '../config/summon-energy.js';
// 永久装备消耗实物备用弹药，换枪保留余弹和装填进度。
import { funnelWeapon } from '../config/funnel-loadouts.js';
import { WEAPONS } from '../config/weapons.js';
import { recordGatlingShot, advanceGatlingHeat } from './weapon-heat.js';
// 播放标记不写入弹夹数据；弱引用随旧战场释放，切枪仍沿用原弹夹的提示状态。
const announcedReloads = new WeakSet();

// 从保存的弹夹恢复；新装备从备用库存装填，活动使用独立供给。
export function createMagazines(progress) {
  return WEAPONS.map((weapon,index) =>
    weapon.independentSupply
      ? {
          modules: Array.from({ length: 3 }, (_, i) => ({
            ammo: progress ? funnelWeapon(progress, i).magazineSize : weapon.magazineSize,
            remaining: 0,
          })),
        }
      : progress?.supplies&&!progress.temporaryGrowth&&ammoKind(weapon)?{ammo:progress.supplies.handMags[index]?.ammo||0,remaining:progress.supplies.handMags[index]?.remaining??weapon.reloadTime}:{ ammo: weapon.magazineSize, remaining: 0 },
  );
}

// 一次有效射击只消耗一发：散弹的多颗弹丸和弹射不额外扣弹。
export function consumeRound(magazine, weapon) {
  if (magazine.remaining > 0 || magazine.ammo <= 0) return false;
  recordGatlingShot(magazine, weapon);
  if(weapon.id==='gatling')magazine.rotorDrive=.16;
  magazine.ammo--;
  if (magazine.ammo === 0 && !isSummonEnergy(weapon)) {
    magazine.remaining = weapon.reloadTime;
    announcedReloads.delete(magazine);
  }
  return true;
}

// 推进单个供给槽的热量和装填，返回装填后可射击时间；原生能源逐格恢复，普通独立炮在入坞时装填。
export function advanceReload(magazine, weapon, dt, onEvent, takeAmmo=null, reserve=Infinity) {
  if (magazine.modules || dt <= 0) return dt; // 独立炮各槽由编队控制器推进，外层不重复恢复。
  if(weapon.attackKind==='defense'){advanceEnergyShield(magazine,weapon,dt);return dt;}
  advanceRotary(magazine,weapon,dt);
  if (isSummonEnergy(weapon)) {
    // 能源只按时间逐格恢复；兼容旧的空仓等待，不直接回满，也不触发反复装填声。
    magazine.remaining = 0;
    if (magazine.ammo >= weapon.magazineSize) { magazine.regenProgress = 0; return dt; }
    const progress = (magazine.regenProgress || 0) + summonRegenRate(weapon) * dt;
    const restored = Math.floor(progress + 1e-8);
    magazine.ammo = Math.min(weapon.magazineSize, magazine.ammo + restored);
    magazine.regenProgress = magazine.ammo >= weapon.magazineSize ? 0 : Math.max(0, progress - restored);
    return dt;
  }
  advanceGatlingHeat(magazine, weapon, dt, magazine.remaining > 0);
  if(takeAmmo&&magazine.ammo===0&&reserve<=0){magazine.remaining=0;announcedReloads.delete(magazine);return dt;}
  if(takeAmmo&&magazine.ammo===0&&magazine.remaining<=0)magazine.remaining=weapon.reloadTime;
  if (magazine.remaining <= 0) return dt;
  // 真正开始供给时才发声；返航、暂停与切枪不推进，也不重复播放拔弹夹声。
  if (!announcedReloads.has(magazine)) {
    announcedReloads.add(magazine);
    onEvent?.('reload-start', { kind: weapon.id });
  }
  const used = Math.min(dt, magazine.remaining);
  magazine.remaining = Math.max(0, magazine.remaining - used);
  if (magazine.remaining < 1e-8) {
    magazine.remaining = 0;
    magazine.ammo = takeAmmo?takeAmmo(weapon.magazineSize):weapon.magazineSize;
    announcedReloads.delete(magazine);
    onEvent?.('reload-complete', { kind: weapon.id });
  }
  return Math.max(0, dt - used);
}
