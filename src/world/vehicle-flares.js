import {seActive} from '../config/vehicle-se.js';
// 单枚空中照明弹：抛物线升空、慢速下降与落地熄灭，灯光与可见性共用同一时钟。
import {FLARE_RULES as R} from '../config/vehicle-special-ammo.js';
import {campBoundary} from './camp-boundary.js';
import {REGIONAL_SETTLEMENTS} from '../config/regional-camps.js';
import {worldDistance,canonical,nearest} from './coordinates.js';
// 固定正面车体的后甲板朝画面上方，炮塔独立转动；同一筒口用于装置绘制与世界发射。
export function rearFlareMuzzle(player,hull){
 const compact=hull===5||hull>=11;
 return {x:player.x+(compact?13:30),y:player.y-(compact?12:22)};
}
// 连续平滑插值用于升空扩光和落地余辉，暂停不依赖真实时间。
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// 返回弹体脚下投影与真实高度；原点只保存发射位置，老档剩余时间由校验层限幅。
export function vehicleFlarePose(game){
 const f=game.progress?.supplies?.activeFlare;if(!f||f.life<=0||f.mapId!==game.mapId||game.cottage||game.realm||game.story)return null;
 const age=Math.max(0,R.duration-f.life),up=Math.min(1,age/R.rise),fall=Math.max(0,Math.min(1,(age-R.rise)/(R.landing-R.rise))),fade=1-smooth((age-R.landing)/(R.duration-R.landing));
 const height=age<R.rise?R.height*(2*up-up*up):R.height*(1-fall),spread=age<R.rise?1-(1-up)**2:Math.pow(1-fall,.55);
 // 移动中的弹先快速飞向前路，再在升空顶点减速展开。
 const travel=f.travel??R.throwDistance;
 const distance=travel*(travel>R.throwDistance?1-(1-up)**3:up)+18*fall;
 const point=canonical({x:f.x+Math.cos(f.angle)*distance,y:f.y+Math.sin(f.angle)*distance});
 return {...point,age,height,angle:f.angle,phase:age<R.rise?'rise':age<R.landing?'descent':'fade',radius:(24+(R.radius-24)*spread)*Math.sqrt(fade),power:(age<R.rise?.15+.85*spread:1-.35*fall)*fade,origin:{x:f.x,y:f.y}};
}
// 一枚光源照亮约三片基础视野面积；高度只影响弹体，不把地面光池移到空中。
export function vehicleFlareLights(game){const p=vehicleFlarePose(game);return p&&p.radius>1?[{...p,id:'vehicle-flare',type:'fixture',kind:'flare',height:0,flightHeight:p.height,offset:0,flare:true,flying:true}]:[];}
// 补发按发射区域判定，不因升空初期光圈小或落地衰减反复消耗；到期后完整补发。
export function vehicleFlareCovers(game,point=game.player){const f=game.progress?.supplies?.activeFlare;const pose=vehicleFlarePose(game);
 return !!pose&&(worldDistance(point,f)<R.departure||worldDistance(point,pose)<Math.min(R.departure,pose.radius));}
// 交战射程只在真正亮起的光圈内恢复，余辉暗下去时平滑恢复夜间限制。
export function vehicleFlareIllumination(game,point=game.player){const p=vehicleFlarePose(game);if(!p)return 0;const d=worldDistance(point,p);return Math.max(0,Math.min(1,(p.radius-d)/Math.max(1,p.radius*.2)))*p.power;}
// 车辆位于当前地契围栏或地区营地内时暂停发射，边界采用最近的地图镜像。
function insideFlareCamp(game){
 if(game.mapId!=='forest')return false;
 const contains=region=>{
  const p=nearest(game.player,{x:(region.left+region.right)/2,y:(region.top+region.bottom)/2});
  return p.x>=region.left&&p.x<=region.right&&p.y>=region.top&&p.y<=region.bottom;
 };
 return REGIONAL_SETTLEMENTS.some(contains)||campBoundary(game.progress).regions.some(contains);
}
// 仅夜间驾驶自有载具消耗，离开范围或本枚完全熄灭后发射下一枚。
export function updateVehicleFlares(game,dt,input=null,driveSpeed=0){
 if(game.state!=='playing'||dt<=0)return;const s=game.progress.supplies;if(!s)return;
 if(s.activeFlare){s.activeFlare.life-=dt;if(s.activeFlare.life<=0)s.activeFlare=null;}
 if(!seActive(game,'flare')||!s.autoFlare||!game.vehicle?.active||game.vehicle.hp<=0||game.surfaceNight<.55||!Number.isFinite(game.surfaceNight)||game.cottage||game.realm||game.story||game.fireActive||game.workshopTrial||game.campDefense||game.arrivalCinematic)return;
 const stock=s.vehicles[game.vehicle.index];if(!(stock?.flare>0))return;
 // 优先使用这一帧的驾驶指令，自动导航起步和转向时也能提前照向新路段。
 const inputLength=Math.hypot(input?.x||0,input?.y||0);
 const steering=inputLength>.01&&driveSpeed>0;
 const vx=steering?driveSpeed*input.x/Math.max(1,inputLength):game.player.vx||0;
 const vy=steering?driveSpeed*input.y/Math.max(1,inputLength):game.player.vy||0;
 const speed=Math.hypot(vx,vy);
 const moving=Number.isFinite(speed)&&speed>1;
 const pose=vehicleFlarePose(game);
 if(pose){
  if(!moving){if(vehicleFlareCovers(game))return;}
  else {
   // 给新弹留足升空时间；巡航时在前方道路即将离开有效光区之前补射。
   const lookAhead=Math.min(R.radius*.4,speed*R.rise);
   const road={x:game.player.x+vx/speed*lookAhead,y:game.player.y+vy/speed*lookAhead};
   if(pose.age<R.rise||worldDistance(road,pose)<pose.radius*.82)return;
  }
 }
 const angle=moving?Math.atan2(vy,vx):-Math.PI/9;
 const travel=moving?Math.min(R.maxThrowDistance,R.throwDistance+speed*R.leadSeconds):R.throwDistance;
 if(insideFlareCamp(game))return;
 stock.flare--;
 s.activeFlare={...canonical(rearFlareMuzzle(game.player,game.vehicle.index)),angle,travel,life:R.duration,mapId:game.mapId};
 game.onEvent('story-hint',{text:`车尾照明弹升空 · 照明约${R.duration}秒`});
}
