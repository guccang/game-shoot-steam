// 潮汐水枪直接消耗袋内水量，补水规则与界面共享同一组参数。
export const WATER_BAG = {shoreRadius:48, refillSeconds:4, fastestSeconds:3, completeSeconds:1.5};
// 使用稳定装备标识，水袋形态与使用同类水罐的载具主炮区分。
export function isWaterBag(weapon){return weapon?.id==='water';}
