// 地貌团子独立施法状态机，共用正式弹丸、掩体、护盾、伙伴受伤与全场弹量预算。
import {BIOME_DUMPLING_BY_ID,dumplingShotAngles} from '../config/biome-dumplings.js';
import {RANGED_LIMITS} from '../config/ranged-enemies.js';
import {nearest,WORLD} from '../world/coordinates.js';
import {surfaceTargetVisible,surfaceAttackRange} from '../world/surface-vision.js';
import {groundPursuit} from '../physics/ground-pursuit.js';
import {moveBody} from '../physics/motion.js';

// 前摇锁点、受击中断、有限恢复；暂停不推进，水团只在自己的湖内接近目标。
export function updateBiomeDumpling(game,enemy,victim,dt){
  const p=BIOME_DUMPLING_BY_ID[enemy.dumplingVariant],a=enemy.assault;
  if(!p||dt<=0||enemy.hp<=0)return;
  if(enemy.knockTime>0){a.phase='recovery';a.elapsed=0;return;}
  dt*=Math.min(enemy.wet?.75:1,enemy.chill?(enemy.chillFactor||.6):1);
  enemy.ecoClock=(enemy.ecoClock||0)+dt;
  if(a.phase==='recovery'){a.elapsed+=dt;if(a.elapsed>=p.recovery){a.phase='chase';a.elapsed=0;}return;}
  const target=nearest(victim,enemy),distance=Math.hypot(target.x-enemy.x,target.y-enemy.y),view=game.arrivalView,screen=nearest(enemy,game.player);
  const visible=surfaceTargetVisible(game,enemy)&&(!view||(screen.x-game.player.x>view.left+12&&screen.x-game.player.x<view.right-12&&screen.y-game.player.y>view.top+55&&screen.y-game.player.y<view.bottom-36));
  if(a.phase==='windup'){
    if(!visible||victim.hp<=0){a.phase='recovery';a.elapsed=0;return;}
    a.elapsed+=dt;if(a.elapsed<p.windup)return;
    const angles=dumplingShotAngles(p,Math.atan2(a.dirY,a.dirX)),limit=game.boss?1:RANGED_LIMITS.bolts;
    const count=Math.min(angles.length,limit);
    if(game.rangedShotTimer>0||game.enemyBolts.length+count>limit)return;
    for(const angle of angles.slice(0,count))game.enemyBolts.push({species:'biome-dumpling',dumplingVariant:p.id,owner:enemy.id,x:enemy.x,y:enemy.y-15,dx:Math.cos(angle),dy:Math.sin(angle),radius:p.radius,speed:p.speed,remaining:p.splash?Math.hypot(a.endX-enemy.x,a.endY-(enemy.y-15)):p.range,splash:p.splash||0,endX:a.endX,endY:a.endY,damage:enemy.damage,age:0});
    game.rangedShotTimer=game.boss?RANGED_LIMITS.bossShotGap:RANGED_LIMITS.shotGap;a.phase='recovery';a.elapsed=0;return;
  }
  const pursuit=enemy.aquatic?{direct:true,goal:target}:groundPursuit(enemy,victim,dt,true,surfaceAttackRange(game,p.reach));
  if(distance<=surfaceAttackRange(game,p.reach)&&visible&&pursuit.direct){
    const angle=Math.atan2(target.y-(enemy.y-15),target.x-enemy.x);
    Object.assign(a,{phase:'windup',elapsed:0,originX:enemy.x,originY:enemy.y-15,endX:target.x,endY:target.y,dirX:Math.cos(angle),dirY:Math.sin(angle)});return;
  }
  const dx=pursuit.goal.x-enemy.x,dy=pursuit.goal.y-enemy.y,length=Math.hypot(dx,dy);
  if(length>1){const travel=Math.min(length,enemy.speed*dt);moveBody(enemy,dx/length*travel,dy/length*travel,WORLD,enemy.radius,game.trees);}
}
