// 栅栏只按底盘与车轮占地阻挡，不把高处武器、旋翼或车身阴影当作地面实体。
import {eraVehicle,eraHullScale} from './vehicle-eras.js';
const footprints=[[46,30],[55,34],[12,12],[57,40],[49,54],[24,34],[64,44],[48,54],[46,44],[55,44],[68,44]];
// 绘制器保持正面底盘，因此占地轴不随瞄准方向旋转；下车立即恢复步行半径。
export function vehicleFenceFootprint(vehicle,radius=12){if(!vehicle?.active)return {x:radius,y:radius};const model=eraVehicle(vehicle.index);if(model){const scale=eraHullScale(model),wheel=model.wheels.reduce((n,p)=>Math.max(n,Math.abs(p[0]-125)+14),0);return {x:Math.max(radius,Math.ceil(Math.max(model.width/2,wheel)*scale)+2),y:Math.max(radius,Math.ceil(64*scale))};}const [x,y]=footprints[vehicle.index]||[46,40];return {x:Math.max(radius,x),y:Math.max(radius,y)};}
