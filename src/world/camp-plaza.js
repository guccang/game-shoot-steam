import {CAMP_BUILDINGS,campBuildingPosition} from '../config/camp-layout.js';
import {campDecorDefinition} from '../config/camp-management.js';
// 中央庆典广场位于两座工坊之间；保留横向通路，永久装饰集中在边缘。
import {nearest} from './coordinates.js';
export const CAMP_PLAZA={x:90,y:740,width:200,depth:100};
export const CAMP_DECOR_ZONES=[{name:'庆典广场',x:90,y:740,note:'中央留白，边缘布灯与花箱'},{name:'生活庭园',x:650,y:390,note:'小屋与仓库之间，适合盆景与座椅'},{name:'营门迎宾',x:500,y:70,note:'门边陈列，保留进出通道'},{name:'工坊休憩',x:-800,y:800,note:'长椅、水景与路灯成组布置'}];
// 农田和装饰用相同矩形保护广场，不产生额外行走阻挡。
export function overlapsCampPlaza(x,y,rx=0,ry=rx){const p=nearest({x,y},CAMP_PLAZA);return Math.abs(p.x-CAMP_PLAZA.x)<CAMP_PLAZA.width/2+rx&&Math.abs(p.y-CAMP_PLAZA.y)<CAMP_PLAZA.depth/2+ry;}

const occupancyCache=new WeakMap();
// 旧档自定义布局不强制搬家；占用广场时暂停庆典陈列，移走后立即恢复。
export function campPlazaOccupied(progress){const state=progress.campManagement,layout=progress.campLayout,plots=progress.farm?.plots,count=plots?.length,old=occupancyCache.get(progress);if(old&&old.state===state&&old.layout===layout&&old.plots===plots&&old.count===count)return old.occupied;const occupied=CAMP_BUILDINGS.some(b=>{if(!progress.campLayout?.positions?.[b.id])return false;const p=campBuildingPosition(progress.campLayout,b);return overlapsCampPlaza(p.x,p.y-p.height/2,p.width/2,p.height/2);})||(progress.campManagement?.items||[]).some(i=>{if(i.x===null)return false;const d=campDecorDefinition(i.type);return overlapsCampPlaza(i.x,i.y-d.height/2,d.width/2,d.height/2+d.depth/2);})||(progress.farm?.plots||[]).some(p=>p.mapId==='forest'&&overlapsCampPlaza(p.x,p.y,24,18));occupancyCache.set(progress,{state,layout,plots,count,occupied});return occupied;}
