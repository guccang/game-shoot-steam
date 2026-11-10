// 地貌选种和水域选点共享正式山湖数据，不另造不可见生态圈。
import {NATURAL_TERRAIN,isLakeWater} from './natural-terrain.js';
import {nearest} from './coordinates.js';
import {BIOME_DUMPLINGS} from '../config/biome-dumplings.js';

// 水团整个脚底须处于湖内；沿岸八点约束也用于实际物理移动与击退。
export function dumplingWaterFits(x,y,radius=16){
  if(!isLakeWater(x,y))return false;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;if(!isLakeWater(x+Math.cos(a)*radius,y+Math.sin(a)*radius))return false;}
  return true;
}

// 出生地附近的真实地貌决定族群；普通森林保持既有团子编成。
export function dumplingHabitatAt(point){
  if(isLakeWater(point.x,point.y))return 'lake';
  let best=null,distance=Infinity;
  for(const f of NATURAL_TERRAIN.earth||[]){const p=nearest(f,point),d=Math.hypot((point.x-p.x)/(f.rx+270),(point.y-p.y)/(f.ry+270));if(d<1.5&&d<distance){best=f.kind;distance=d;}}
  return best;
}

// 稳定序号轮换同地貌变体，不消耗世界生成随机流。
export function regionalDumpling(point,ordinal=0){
  const options=BIOME_DUMPLINGS.filter(p=>p.habitat===dumplingHabitatAt(point));
  return options.length?options[Math.abs(ordinal)%options.length]:null;
}

// 移动遭遇可选择近岸水中落点；仍占用原遭遇配额且远离玩家安全距离。
export function nearbyWaterDumplingSpot(player,ordinal){
  for(let i=0;i<24;i++){const a=(i+ordinal)*Math.PI/12,r=210+(i%3)*20,x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;if(dumplingWaterFits(x,y,30))return {x,y};}
  return null;
}
