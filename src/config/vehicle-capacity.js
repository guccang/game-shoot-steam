// 车载额外供弹只作用于当前车载快照；升级后统一乘算，不改写基础目录。
export function vehicleCapacity(weapon,bonus=1.5) {
  return bonus===1?weapon:{...weapon,magazineSize:Math.max(1,Math.floor(weapon.magazineSize*bonus)),vehicleCapacityBonus:bonus};
}
