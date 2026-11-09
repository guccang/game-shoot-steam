import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
// 清缴耗时采样：正式刷怪、自动射击、装填、受伤与结算；提供环形走位及避开扑击、冲锋、孢子和羽刃预警的输入。
import {Game,freshProgress} from '../src/game.js';
import {nearest,worldDistance} from '../src/world/coordinates.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {blocked} from '../src/physics/motion.js';
import {vehicleParkingSite} from '../src/core/vehicles/camp-parking.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {wallet} from '../src/balance/model.js';
// 固定种子便于复核随机出生与暴击差异。
function random(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);}
// 单场固定阶段夹具输出正式战斗耗时与净收入；初始等级是样本条件，不冒充连续养成。
export function sampleClearing(group,level,seed,{heroLevel=group===1?1:2,maxSeconds=600,weaponIndex=0,vehicleIndex=null,vehicleLevel=1,turretLevel=1}={}){
 const progress=freshProgress();progress.weapons[weaponIndex]=level;progress.weapon=weaponIndex;
 if(vehicleIndex!==null){progress.vehicleIndex=vehicleIndex;progress.vehicleHulls[vehicleIndex]=vehicleLevel;grantVehicleArmament(progress,vehicleIndex);progress.vehicleWeapons[progress.vehicleLoadouts[vehicleIndex]]=turretLevel;}progress.heroes[0]=heroLevel;progress.bosses=group-1;const g=new Game(progress,random(seed));g.start();g.wave=(group-1)*5+1;g.waveGroupStart=g.wave;g.bossWave=group*5;g.roundBosses=group-1;g.progress.living.patrolActive=true;Object.assign(g.player,{x:BOSS_CLEARING.x,y:BOSS_CLEARING.y});g.mainlineTalkDelay=9999;if(vehicleIndex!==null){
 // 车辆必须先到实际停车位上车，再布置采样起点，不能把远程召车失败误记为车载样本。
 Object.assign(g.player,vehicleParkingSite(g,vehicleIndex));if(!g.summonVehicle())throw Error('采样载具未能上车');
 Object.assign(g.player,{x:BOSS_CLEARING.x,y:BOSS_CLEARING.y});
 }const waves=[];
 g.onEvent=type=>{if(type==='wave-clear'||type==='boss-ready')waves.push({wave:g.wave,time:+g.time.toFixed(1),kills:g.waveKills});};
 const before=wallet(g.progress);
 let elapsed=0,bossStart=null;
 while(elapsed<maxSeconds&&g.state==='playing'&&g.progress.living.patrolActive){
  if(g.bossReady&&!g.boss){g.summonBoss();bossStart=elapsed;}
  const angle=elapsed*.85;let target={x:1600+Math.cos(angle)*125,y:400+Math.sin(angle)*100};
  // 收尾时主动追近远程残兵，不能把固定绕圈永远不进射程误判为数值打不动。
  const remaining=g.enemies.filter(e=>e.hp>0);
  if(!g.boss&&remaining.length===1&&worldDistance(remaining[0],g.player)>g.weapon().range*.9){
   const enemy=remaining.reduce((a,b)=>worldDistance(a,g.player)<worldDistance(b,g.player)?a:b);
   const point=nearest(enemy,BOSS_CLEARING),dx=point.x-BOSS_CLEARING.x,dy=point.y-BOSS_CLEARING.y,d=Math.hypot(dx,dy);
   target={x:BOSS_CLEARING.x+dx*Math.min(1,250/d),y:BOSS_CLEARING.y+dy*Math.min(1,250/d)};
  }
  const dx=target.x-g.player.x,dy=target.y-g.player.y,length=Math.hypot(dx,dy);
  let input=length>3?{x:dx/length,y:dy/length}:{x:0,y:0};
  // 按可见怪物、扑击落点与领主预警走位，保持射程并避开树干；不读取随机数或改动伤害。
  if(g.boss||group>1){let best=-Infinity;
   for(let i=0;i<24;i++){const a=i*Math.PI/12,v={x:Math.cos(a),y:Math.sin(a)},q={x:g.player.x+v.x*12,y:g.player.y+v.y*12,mapId:'forest'},d=g.boss?Math.hypot(q.x-g.boss.x,q.y-g.boss.y):185,center=Math.hypot(q.x-1600,q.y-400);
    if(center>265||blocked(q.x,q.y,12,g.trees,q))continue;
    let score=g.boss?-Math.abs(d-185)-Math.max(0,135-d)*5-center*.08:-Math.hypot(q.x-target.x,q.y-target.y)*.2-center*.03;
    for(const e of g.enemies)if(e.hp>0){score-=Math.max(0,85-Math.hypot(q.x-e.x,q.y-e.y))*4;
     const a=e.assault;if(['windup','lunge'].includes(a?.phase)&&Number.isFinite(a.endX))score-=Math.max(0,65-Math.hypot(q.x-a.endX,q.y-a.endY))*10;
    }
    for(const h of g.hazards){if(['spore','slam'].includes(h.kind)&&h.age<h.warmup+h.duration)score-=Math.max(0,h.radius+28-Math.hypot(q.x-h.x,q.y-h.y))*8;
     if(h.kind==='feather'&&h.age<h.warmup+h.duration){const along=(q.x-h.x)*h.dx+(q.y-h.y)*h.dy,cross=Math.abs((q.x-h.x)*h.dy-(q.y-h.y)*h.dx);if(along>-20&&along<440)score-=Math.max(0,34-cross)*12;}
     if(h.kind==='charge'&&h.age<h.warmup+h.duration){const along=(q.x-h.x)*h.dx+(q.y-h.y)*h.dy,cross=Math.abs((q.x-h.x)*h.dy-(q.y-h.y)*h.dx);if(along>-60&&along<h.length+60)score-=Math.max(0,90-cross)*12;}}
    if(score>best){best=score;input=v;}
   }
  }
  g.update(.05,input);elapsed+=.05;if(g.boss&&bossStart===null)bossStart=elapsed;
 }
 return {group,level,heroLevel,weaponIndex,vehicleIndex,vehicleLevel,turretLevel,seed,income:Object.fromEntries(Object.entries(wallet(g.progress)).map(([key,n])=>[key,n-before[key]])),seconds:+elapsed.toFixed(1),bossSeconds:bossStart===null?null:+(elapsed-bossStart).toFixed(1),completed:!g.progress.living.patrolActive,vehicleActive:g.vehicle.active,state:g.state,hp:g.player.hp,waves,kills:g.waveKills,alive:g.enemies.filter(e=>e.hp>0).length,remainingEnemies:g.enemies.filter(e=>e.hp>0).map(e=>({species:e.species,x:e.x,y:e.y,hp:e.hp,speed:e.speed,phase:e.assault?.phase})),bossHp:g.boss?.hp,position:{x:g.player.x,y:g.player.y},bossPosition:g.boss&&{x:g.boss.x,y:g.boss.y}};
}
// 直接运行保留原采样入口；导入时不执行战斗或写文件。
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const results=[];
for(const [group,level] of [[1,1],[2,3],[3,3]])for(const seed of [11,42,97])results.push(sampleClearing(group,level,seed,{maxSeconds:240}));
mkdirSync('output/playwright/clearing-three-boss-pacing',{recursive:true});
writeFileSync('output/playwright/clearing-three-boss-pacing/timing.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));

// 耗时包含波间等待和自动进入领主战后的战斗，不包含赶路、暂停或站着不打的时间。
if(results.some(r=>!r.completed))process.exitCode=1;

}
