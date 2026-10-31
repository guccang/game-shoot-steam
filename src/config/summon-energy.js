// 只有原生召唤能源持续恢复，外挂普通枪与电锯仍保留各自装填规则。
export const SUMMON_RECHARGE_FACTOR = 4;

// 原生浮游炮各槽及无人机、机械核心、蜘蛛核心使用同一能源判定。
export function isSummonEnergy(weapon) {
  return ['funnel', 'drone', 'mechanical', 'spider'].includes(weapon.controller);
}

// 从正式容量与补能接口计算恢复速度，基础约10–13秒回满，升级同步作用于战斗和面板。
export function summonRegenRate(weapon) {
  return isSummonEnergy(weapon) ? weapon.magazineSize / Math.max(.1, weapon.reloadTime * SUMMON_RECHARGE_FACTOR) : 0;
}
