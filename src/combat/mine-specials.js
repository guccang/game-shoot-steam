// 地下特种团子的锁点、冲刺和首领轮招；投射物继续走正式地下碰撞。
import {smokeConceals} from './vehicle-field-devices.js';
import {MINE_SPECIALS} from '../config/mine-specials.js';
import {mineOccupancy,mineLineClear} from '../physics/mine-motion.js';

// 只发出有上限的独立弹丸，不跨墙伤害，不在暂停时使用墙钟计时。
function release(game,a,spec){
 const room=game.cottage,angle=Math.atan2(a.aimY-a.y,a.aimX-a.x),slots=Math.max(0,12-room.bolts.filter(b=>b.enemy).length);
 if(a.move==='slam'){
  if(slots&&mineLineClear(game,a,{x:a.aimX,y:a.aimY}))room.bolts.push({x:a.aimX,y:a.aimY,vx:0,vy:0,life:.65,delay:.5,radius:a.kind==='coreking'?62:42,enemy:true,blast:true,damage:spec.damage,owner:a.key});
 }else{
  const count=a.move==='ring'?8:3;
  for(let i=0;i<Math.min(count,slots);i++){const theta=a.move==='ring'?i*Math.PI/4:angle+(i-1)*.28;room.bolts.push({x:a.x,y:a.y,vx:Math.cos(theta)*150,vy:Math.sin(theta)*150,life:2.5,enemy:true,damage:spec.damage,owner:a.key,crystal:true});}
 }
}

// 返回true表示该实体已由专属AI处理，普通地下生态分支不能再次更新它。
export function advanceMineSpecial(game,a,spec,dt,{engaged,nearEntry,home,visible,hurt}){
 const form=MINE_SPECIALS[a.kind];if(!form)return false;
 const p=game.player,d=Math.hypot(p.x-a.x,p.y-a.y),boss=a.kind==='coreking';
 if(smokeConceals(game,p)&&(a.phase==='windup'?a.move:form.attack)!=='charge'&&a.phase!=='charge'){a.phase='roam';return true;}
 if(nearEntry||!engaged||!visible){a.phase='roam';a.timer=0;}
 if(a.phase==='charge'){
  const steps=Math.max(1,Math.ceil(230*dt/6));for(let i=0;i<steps;i++){const x=a.x+a.dirX*230*dt/steps,y=a.y+a.dirY*230*dt/steps;if(!mineOccupancy(game,x,y,16,false)){a.timer=0;break;}a.x=x;a.y=y;if(!a.chargedHit&&Math.hypot(x-p.x,y-p.y)<31){hurt(game,spec.damage);a.chargedHit=true;}}
  if(a.timer<=0){a.phase='recover';a.timer=spec.recover;}return true;
 }
 if(a.phase==='windup'){
  if(a.timer<=0){if(a.move==='charge'){const n=Math.max(1,Math.hypot(a.aimX-a.x,a.aimY-a.y));a.dirX=(a.aimX-a.x)/n;a.dirY=(a.aimY-a.y)/n;a.chargedHit=false;a.phase='charge';a.timer=.6;}else{release(game,a,spec);a.phase='recover';a.timer=spec.recover*(boss&&a.hp<a.maxHp/2?.65:1);}}return true;
 }
 if(a.phase==='recover'&&a.timer>0)return true;
 if(engaged&&!nearEntry&&visible&&d<spec.range){a.move=boss?['fan','slam','ring'][(a.cycle||0)%3]:form.attack;a.cycle=(a.cycle||0)+1;a.phase='windup';a.timer=spec.windup;a.aimX=p.x;a.aimY=p.y;return true;}
 const chase=engaged&&!nearEntry&&visible&&d<360&&Math.hypot(a.x-home.x,a.y-home.y)<165,tx=chase?p.x:home.x,ty=chase?p.y:home.y,n=Math.max(1,Math.hypot(tx-a.x,ty-a.y)),speed=spec.speed*(a.chill>0?a.chillFactor||.65:1),x=a.x+(tx-a.x)/n*speed*dt,y=a.y+(ty-a.y)/n*speed*dt;
 a.phase='roam';if(mineOccupancy(game,x,y,boss?32:16,false)){a.moving=Math.hypot(x-a.x,y-a.y)>.01;a.x=x;a.y=y;if(a.moving)a.walk=(a.walk||0)+dt*10;}return true;
}
