// 电动车座位锚点由瞄准、真实弹道和角色绘制共用，不改变地面碰撞与移动坐标。
export const SCOOTER_RIDER_LIFT = 27;
// 返回独立的骑手姿态；普通步行和其他载具继续沿用原坐标。
export function riderPosition(player, vehicle) {
  return vehicle?.active && vehicle.index === 5 ? { ...player, y: player.y - SCOOTER_RIDER_LIFT } : player;
}
