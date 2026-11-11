// 烟幕按目标位置遮蔽锁定，地雷在部署后的世界坐标独立等待敌人。
import {seActive,seBuild,seLevel} from '../config/vehicle-se.js';
import {nearest,canonical,worldDistance} from '../world/coordinates.js';
import {statisticsSource} from './statistics-source.js';
import {terrainLineClear} from '../physics/terrain-navigation.js';
import {fightingNearVehicle} from '../world/vehicle-flares.js';

// 烟雾弹每四秒向行进方向投放一次，停车时沿炮口方向投放。
export function updateVehicleSmoke(game,dt){
 if(game.state!=='playing'||dt<=0)return;
 if(!seActive(game,'smoke')){game.smokeDeployment=null;return;}
 const hull=game.vehicle.index,previous=game.smokeDeployment;
 if(previous?.mapId===game.mapId&&previous?.hull===hull){
  previous.life-=dt;
  if(previous.life>0)return;
 }
 if(!fightingNearVehicle(game)){game.smokeDeployment=null;return;}
 const player=game.player;
 const heading=Math.hypot(player.vx,player.vy)>1?Math.atan2(player.vy,player.vx):game.vehicle.angle;
 const radius=45+10*seLevel(seBuild(game.progress,hull),'smoke');
 const deployment={mapId:game.mapId,hull,life:4,cloud:null};
 game.smokeDeployment=deployment;
 // 前方被墙挡住时依次尝试车侧和后方，封闭处等待下一轮投放。
 for(const offset of [0,Math.PI/2,-Math.PI/2,Math.PI]){
  const point={x:player.x+110*Math.cos(heading+offset),y:player.y+110*Math.sin(heading+offset)};
  const clear=game.combatLineClear?game.combatLineClear(player,point):terrainLineClear(player,point,0);
  if(!clear)continue;
  deployment.cloud={...point,radius};break;
 }
}

// 地表和当前矿层各自持有落点，关闭装置时立即停止遮蔽和显示。
export function vehicleSmokeCloud(game){
 const deployment=game.cottage?.kind==='mine'?game.cottage.combat?.smokeDeployment:game.smokeDeployment;
 if(!deployment?.cloud||deployment.mapId!==game.mapId||deployment.hull!==game.vehicle?.index||!seActive(game,'smoke'))return null;
 return deployment.cloud;
}

// 只影响新锁定及尚未释放的攻击，弹丸碰撞沿用原有规则。
export function smokeConceals(game,target){
 const cloud=vehicleSmokeCloud(game);
 return !!cloud&&worldDistance(cloud,target)<=cloud.radius;
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
