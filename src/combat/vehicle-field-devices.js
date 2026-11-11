// 烟幕按目标位置遮蔽锁定，地雷在部署后的世界坐标独立等待敌人。
import {seActive,seBuild,seLevel} from '../config/vehicle-se.js';
import {nearest,canonical,worldDistance} from '../world/coordinates.js';
import {statisticsSource} from './statistics-source.js';
import {terrainLineClear} from '../physics/terrain-navigation.js';

// 同一半径用于技能判定和烟幕显示，未安装或已关闭时返回零。
export function smokeRadius(game){
 if(!game.progress?.vehicleSE||!seActive(game,'smoke'))return 0;
 return 45+10*seLevel(seBuild(game.progress,game.vehicle.index),'smoke');
}

// 只影响新锁定及尚未释放的攻击，弹丸碰撞沿用原有规则。
export function smokeConceals(game,target){
 const radius=smokeRadius(game);
 return radius>0&&worldDistance(game.player,target)<=radius;
}

// 地雷部署和爆炸均检查通路，地表与矿层分别持有自己的临时列表。
export function updateVehicleMines(game,dt){
 if(game.state!=='playing'||dt<=0)return;
 const mines=game.vehicleMines??=[];
 const active=seActive(game,'mine');
 if(!active&&!mines.length)return;
 const targets=game.boss?[...game.enemies,game.boss]:game.enemies;
 const clear=(a,b)=>game.combatLineClear?game.combatLineClear(a,b):terrainLineClear(a,nearest(b,a),0);
 for(let i=mines.length-1;i>=0;i--){
  const m=mines[i];m.life-=dt;
  if(m.mapId!==game.mapId||m.life<=0){mines.splice(i,1);continue;}
  if(m.life>24.5||!targets.some(e=>e.hp>0&&worldDistance(e,m)<=34+(e.radius||0)&&clear(m,e)))continue;
  mines.splice(i,1);
  game.fx.add('blast',m.x,m.y,.48,{size:90,color:'#f4c272'});
  game.fx.add('ring',m.x,m.y,.58,{size:90,color:'#ffc374'});
  for(let j=0;j<8;j++){
   const angle=j*Math.PI/4,speed=j%2?150:205;
   game.fx.add('spark',m.x,m.y,.38,{vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,angle,size:4,color:'#ffe4a4'});
  }
  for(const e of targets)if(e.hp>0&&worldDistance(e,m)<=90+(e.radius||0)&&clear(m,e))
   game.hit(e,m.damage,false,{kind:'se-mine',statisticsSource:m.source});
 }
 game.mineWait=Math.max(0,(game.mineWait||0)-dt);
 if(!active||game.mineWait>0||mines.length>=3)return;
 const enemy=targets.find(e=>e.hp>0&&worldDistance(e,game.player)<=240&&clear(game.player,e));
 if(!enemy)return;
 const p=nearest(enemy,game.player),a=Math.atan2(p.y-game.player.y,p.x-game.player.x);
 for(const offset of [0,Math.PI/2,-Math.PI/2,Math.PI]){
  const point=canonical({x:game.player.x+48*Math.cos(a+offset),y:game.player.y+48*Math.sin(a+offset)});
  if(!clear(game.player,point)||mines.some(m=>worldDistance(m,point)<30))continue;
  const level=seLevel(seBuild(game.progress,game.vehicle.index),'mine');
  mines.push({...point,launchDx:-48*Math.cos(a+offset),launchDy:-48*Math.sin(a+offset),life:25,mapId:game.mapId,damage:240+60*level,source:statisticsSource(game,{id:'se-mine'},game.vehicle.index)});
  game.mineWait=4;break;
 }
}
