import {rearSEMount} from '../config/vehicle-se-mount.js';
import {seActive,seBuild,seLevel} from '../config/vehicle-se.js';
// 空中照明弹：抛物线升空、慢速下降与落地熄灭，灯光与可见性共用同一时钟。
import {FLARE_RULES as R} from '../config/vehicle-special-ammo.js';
import {insideSurfaceCamp} from './camp-boundary.js';
import {worldDistance,canonical,nearest} from './coordinates.js';
// 固定正面车体的后甲板朝画面上方，炮塔独立转动；同一筒口用于装置绘制与世界发射。
export function rearFlareMuzzle(player,hull,installed=['flare']){
 const mount=rearSEMount(player,hull,installed,'flare');
 return {x:mount.x,y:mount.y-6};
}
// 连续平滑插值用于升空扩光和落地余辉，暂停不依赖真实时间。
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// 返回弹体脚下投影与真实高度；原点只保存发射位置，老档剩余时间由校验层限幅。
export function vehicleFlarePose(game,f=game.progress?.supplies?.activeFlare){
 if(!f||f.life<=0||f.mapId!==game.mapId||game.cottage||game.realm||game.story)return null;
 const age=Math.max(0,R.duration-f.life),up=Math.min(1,age/R.rise);
 // 开伞后在高空轻缓下沉，末段才集中下降；高度、亮度和光圈沿用同一连续曲线。
 const drift=smooth((age-R.rise)/(R.descentStart-R.rise));
 const fall=.06*drift+.94*smooth((age-R.descentStart)/(R.landing-R.descentStart));
 const fade=1-smooth((age-R.landing)/(R.duration-R.landing));
 const spread=age<R.rise?1-(1-up)**2:Math.pow(1-fall,.55);
 // 水平飞行独立于升空扩光；按发射速度前移，达到投射距离后随下降轻微漂移。
 const travel=f.travel??R.throwDistance;
 const forward=f.flightSpeed===undefined?travel*(travel>R.throwDistance?1-(1-up)**3:up):Math.min(travel,f.flightSpeed*age);
 const distance=forward+(f.combat?4:18)*fall;
 const point=canonical({x:f.x+Math.cos(f.angle)*distance,y:f.y+Math.sin(f.angle)*distance});
 // 战斗弹的弹芯与伞顶在短屏也留有余量，地面光圈独立按燃烧阶段计算。
 let peak=f.combat?R.combatHeight:R.height;
 if(f.combat&&Number.isFinite(game.arrivalView?.top))peak=Math.max(0,Math.min(peak,nearest(point,game.player).y-game.player.y-game.arrivalView.top-50));
 const height=peak*(age<R.rise?2*up-up*up:1-fall);
 return {...point,age,height,angle:f.angle,phase:age<R.rise?'rise':age<R.descentStart?'aloft':age<R.landing?'descent':'fade',radius:(24+(R.radius*(1+.15*(f.level||0))-24)*spread)*Math.sqrt(fade),power:(age<R.rise?.15+.85*spread:1-.35*fall)*fade,origin:{x:f.x,y:f.y}};
}
// 弹体悬在空中，夜雾和目标可见性都使用下方同一个局部光圈。
export function vehicleFlareLights(game){
 const supplies=game.progress?.supplies;
 const lights=[];
 for(const flare of [supplies?.activeFlare,...(supplies?.previousFlares||[])]){
  const p=vehicleFlarePose(game,flare);
  if(p&&p.radius>0)lights.push({...p,id:flare===supplies.activeFlare?'vehicle-flare':`vehicle-flare-${flare.mapId}-${flare.x}-${flare.y}`,type:'fixture',kind:'flare',height:0,flightHeight:p.height,offset:0,flare:true,flying:true});
 }
 return lights;
}
// 补发按发射区域判定，不因升空初期光圈小或落地衰减反复消耗；到期后完整补发。
export function vehicleFlareCovers(game,point=game.player,f=game.progress?.supplies?.activeFlare){const pose=vehicleFlarePose(game,f);
 return !!pose&&(worldDistance(point,f)<R.departure||worldDistance(point,pose)<Math.min(R.departure,pose.radius));}
// 交战射程只在真正亮起的光圈内恢复，余辉暗下去时平滑恢复夜间限制。
export function vehicleFlareIllumination(game,point=game.player){let power=0;
 for(const p of vehicleFlareLights(game)){const d=worldDistance(point,p);power=Math.max(power,Math.max(0,Math.min(1,(p.radius-d)/Math.max(1,p.radius*.2)))*p.power);}
 return power;
}
// 照明器与烟雾弹共用交战判定：有存活的近敌或已锁定目标。
export function fightingNearVehicle(game){
 const threat=t=>t?.hp>0&&(t.id!=null&&t.id===game.vehicle.targetId||worldDistance(t,game.player)<=280);
 return threat(game.boss)||(game.enemies||[]).some(threat);
}
// 仅夜间驾驶自有载具消耗，离开范围或本枚完全熄灭后发射下一枚。
export function updateVehicleFlares(game,dt,input=null,driveSpeed=0){
 if(game.state!=='playing'||dt<=0)return;const s=game.progress.supplies;if(!s)return;
 // 已经飞离镜头的弹体继续使用游戏时钟，只有燃尽才移除。
 for(const flare of s.previousFlares||[])flare.life-=dt;
 if(s.previousFlares?.length)s.previousFlares=s.previousFlares.filter(flare=>flare.life>0);
 if(s.activeFlare){s.activeFlare.life-=dt;if(s.activeFlare.life<=0)s.activeFlare=null;}
 if(!seActive(game,'flare')||game.surfaceNight<.55||!Number.isFinite(game.surfaceNight)||game.cottage)return;
 const stock=s.vehicles[game.vehicle.index];if(!(stock?.flare>0))return;
 const combat=fightingNearVehicle(game),build=seBuild(game.progress,game.vehicle.index);
 if(build.flareAuto?.[combat?'combat':'travel']===false)return;
 // 优先使用这一帧的驾驶指令，自动导航起步和转向时也能提前照向新路段。
 const inputLength=Math.hypot(input?.x||0,input?.y||0);
 const steering=inputLength>.01&&driveSpeed>0;
 const vx=steering?driveSpeed*input.x/Math.max(1,inputLength):game.player.vx||0;
 const vy=steering?driveSpeed*input.y/Math.max(1,inputLength):game.player.vy||0;
 const speed=Math.hypot(vx,vy);
 const moving=Number.isFinite(speed)&&speed>1;

 for(const flare of [s.activeFlare,...(s.previousFlares||[])]){
  const pose=vehicleFlarePose(game,flare);if(!pose)continue;
  if(combat){
   // 原弹仍在车边时继续使用，闪避和倒车不会反复换弹。
   if(pose.age<R.rise||worldDistance(game.player,pose)<R.combatDeparture)return;
  }else if(!moving){if(vehicleFlareCovers(game,game.player,flare))return;}
  else {
   // 给新弹留足升空时间；巡航时在前方道路即将离开有效光区之前补射。
   const lookAhead=Math.min(R.radius*.4,speed*R.rise);
   const road={x:game.player.x+vx/speed*lookAhead,y:game.player.y+vy/speed*lookAhead};
   if(pose.age<R.rise||worldDistance(road,pose)<pose.radius*.82)return;
  }
 }
 const angle=moving?Math.atan2(vy,vx):-Math.PI/9;
 const travel=combat?R.combatTravel:moving?Math.min(R.maxThrowDistance,R.throwDistance+speed*R.leadSeconds):R.throwDistance;
 if(insideSurfaceCamp(game))return;
 // 弹道朝向取驾驶指令，初速取车身实速，避免起步或转向时按满速将光区甩远。
 const actualSpeed=Math.hypot(game.player.vx||0,game.player.vy||0);
 const flightSpeed=moving?Math.max(1,actualSpeed)*1.18:R.throwDistance/R.rise;
 if(s.activeFlare)(s.previousFlares??=[]).push(s.activeFlare);
 stock.flare--;
 s.activeFlare={...canonical(rearFlareMuzzle(game.player,game.vehicle.index,build.installed)),angle,travel,flightSpeed,...(combat?{combat:true}:{}),level:seLevel(build,'flare'),life:R.duration,mapId:game.mapId};
 game.onEvent('story-hint',{text:`车尾照明弹升空 · 照明约${R.duration}秒`});
}
