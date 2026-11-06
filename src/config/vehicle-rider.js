import {eraVehicle,eraHullScale} from './vehicle-eras.js';
// 电动车座位锚点由瞄准、真实弹道和角色绘制共用，不改变地面碰撞与移动坐标。
export const SCOOTER_RIDER_LIFT = 27;
// 返回独立的骑手姿态；普通步行和其他载具继续沿用原坐标。
export function riderPosition(player, vehicle) {
  const m=vehicle?.active&&eraVehicle(vehicle.index);
  if(m)return {...player,y:player.y+(m.neck-176)*eraHullScale(m)+12};
  return vehicle?.active && vehicle.index === 5 ? { ...player, y: player.y - SCOOTER_RIDER_LIFT } : player;
}

// 前罩外侧独立绘制手和武器的车型共用同一乘坐判断。
export function frontRider(vehicle){return vehicle?.active&&(vehicle.index===5||!!eraVehicle(vehicle.index));}
