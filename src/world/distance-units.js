// 世界坐标继续用于移动、碰撞和交互；仅在显示距离时换算为米。
export const WORLD_UNITS_PER_METER=10;
// 距离向上取整到整米，尚未到达时不会提前显示为零。
export function displayMeters(distance){return Math.ceil(distance/WORLD_UNITS_PER_METER);}
