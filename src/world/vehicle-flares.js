// 一枚照明弹产生三个相邻的固定世界光池；渲染、索敌和补发距离共用坐标。
import {FLARE_RULES as R} from '../config/vehicle-special-ammo.js';
import {worldDistance,canonical} from './coordinates.js';
// 暂存照明随存档恢复剩余秒数，地图或室内切换不会在其他场景发光。
export function vehicleFlareLights(game){
 const f=game.progress?.supplies?.activeFlare;if(!f||f.life<=0||f.mapId!==game.mapId||game.cottage||game.realm||game.story)return [];
 return [-1,0,1].map((i)=>({...canonical({x:f.x+Math.cos(f.angle)*R.spacing*i,y:f.y+Math.sin(f.angle)*R.spacing*i}),id:'vehicle-flare-'+i,type:'fixture',kind:'flare',height:20,offset:0,phase:i,radius:R.radius,power:Math.min(1,f.life/3),flare:true}));
}
// 覆盖范围使用世界最短距离，跨地图接缝不误判走远。
export function vehicleFlareCovers(game,point=game.player){return vehicleFlareLights(game).some(l=>worldDistance(point,l)<R.departure);}
// 仅夜间驾驶自有载具自动消耗照明弹；不抢主炮弹匣，不因附近有怪而中断。
export function updateVehicleFlares(game,dt){
 if(game.state!=='playing')return;const s=game.progress.supplies;if(!s)return;
 if(s.activeFlare){s.activeFlare.life-=dt;if(s.activeFlare.life<=0)s.activeFlare=null;}
 if(!s.autoFlare||!game.vehicle?.active||game.vehicle.hp<=0||game.surfaceNight<.55||!Number.isFinite(game.surfaceNight)||game.cottage||game.realm||game.story||game.fireActive||game.workshopTrial||game.campDefense||game.arrivalCinematic||vehicleFlareCovers(game))return;
 const stock=s.vehicles[game.vehicle.index];if(!(stock?.flare>0))return;stock.flare--;
 s.activeFlare={...canonical(game.player),angle:game.vehicle.angle||0,life:R.duration,mapId:game.mapId};
 game.fx.add('ring',game.player.x,game.player.y,.6,{size:90,color:'#ffe5a1'});game.onEvent('story-hint',{text:'照明弹已升空 · 三片视野区域 · 45秒'});
}
