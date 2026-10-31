// 套件对应现有互斥分支；锚点处于枪身内，保持原枪口、握持点和碰撞不变。
export const WORKSHOP_PARTS = [
  ['receiver', 'barrel'], ['crystal', 'crystal'], ['rotor', 'barrel'],
  ['nozzle', 'magazine'], ['core', 'core'], ['nozzle', 'nozzle'],
  ['grenade', 'magazine'], ['barrel', 'tank'], ['receiver', 'core'],
  ['coil', 'coil'], ['capacitor', 'capacitor'], ['crystal', 'nozzle'],
  ['chip', 'chip'], ['chip', 'chip'], ['teeth', 'motor'], ['teeth', 'motor'], ['coil', 'chip'], ['coil','capacitor'],
];
// 每个型号的装配锚点只定义一次，零件托盘、工作台热点和正式绘制共用。
export function workshopPart(index, choice) {
  const kind = WORKSHOP_PARTS[index]?.[choice - 1];
  return kind ? { kind, choice, x: [12, 13].includes(index) ? 0 : index === 14 ? 2 : 13,
    y: -5, width: choice === 1 ? 14 : 20 } : null;
}
