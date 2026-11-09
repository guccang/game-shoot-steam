// 洒水器扫描时序：世界坐标投影、双向喷嘴命中与土壤渐湿共用稳定田块身份。
import {SPRINKLER,sprinklerSweepAngle} from '../../config/farm-production.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
// 使用田格比例还原喷嘴方位；双向喷口半圈覆盖全部田格，起始等待水压升起。
export function sprinklerHitDelay(device,plot){
 const p=nearest(plot,device),angle=(Math.atan2((p.y-device.y)/SPRINKLER.cellHeight,(p.x-device.x)/SPRINKLER.cellWidth)+Math.PI)%Math.PI;
 let lo=0,hi=SPRINKLER.spraySeconds/2;
 for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(sprinklerSweepAngle(mid)<angle)lo=mid;else hi=mid;}
 return Math.max(.18,hi);
}
// 防止同编号田块被移除重建或收获换种后沿用旧一茬的扫描与渐湿记录。
export function sameSprinklerPlot(a,b){return a.id===b.id&&a.mapId===b.mapId&&a.crop===b.crop&&a.plantedAt===b.plantedAt&&worldDistance(a,b)<.1;}
// 正式地面绘制读取成功落水时间；减少动态直接显示已结算状态，未命中仍保持干燥。
export function sprinklerSoilWetness(plot,time,event,reduced=false){
 if(!plot.watered)return 0;
 if(reduced)return 1;
 const hit=event?.wetPlots?.find(p=>sameSprinklerPlot(p,plot));
 return !hit||time<hit.time?1:Math.min(1,(time-hit.time)/SPRINKLER.wetFadeSeconds);
}
