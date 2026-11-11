import {smokeConceals} from './vehicle-field-devices.js';
import {segmentCircle} from './collision.js';
import {terrainLineClear} from '../physics/terrain-navigation.js';
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
  if(!p||dt<=0||enemy.hp<=0||game.state&&game.state!=='playing')return;
  if(enemy.knockTime>0){a.phase='recovery';a.elapsed=0;a.burstLeft=0;return;}
  if(p.pattern!=='sweep'&&smokeConceals(game,victim)){a.phase='chase';a.elapsed=0;a.burstLeft=0;return;}
  dt*=Math.min(enemy.wet?.75:1,enemy.chill?(enemy.chillFactor||.6):1);
  enemy.ecoClock=(enemy.ecoClock||0)+dt;
  if(a.phase==='recovery'){
    a.elapsed+=dt;
    // 后续齐射仍使用首轮锁点，受击、目标死亡或离开屏幕立即取消；满预算时最多等待1.4秒。
    if(a.burstLeft>0){const q=nearest(enemy,game.player),v=game.arrivalView;
      if(victim.hp<=0||!surfaceTargetVisible(game,enemy)||v&&(q.x-game.player.x<=v.left+12||q.x-game.player.x>=v.right-12||q.y-game.player.y<=v.top+55||q.y-game.player.y>=v.bottom-36)||a.elapsed>1.4)a.burstLeft=0;
      else if(a.elapsed>=p.volleyGap&&releaseDumplingVolley(game,enemy,p,(p.volleys||1)-a.burstLeft))a.burstLeft--;
    }
    if(a.elapsed>=p.recovery){a.phase='chase';a.elapsed=0;a.burstLeft=0;}return;
  }
  const target=nearest(victim,enemy),distance=Math.hypot(target.x-enemy.x,target.y-enemy.y),view=game.arrivalView,screen=nearest(enemy,game.player);
  const visible=surfaceTargetVisible(game,enemy)&&(!view||(screen.x-game.player.x>view.left+12&&screen.x-game.player.x<view.right-12&&screen.y-game.player.y>view.top+55&&screen.y-game.player.y<view.bottom-36));
  if(a.phase==='windup'){
    if(!visible||victim.hp<=0){a.phase='recovery';a.elapsed=0;return;}
    a.elapsed+=dt;if(a.elapsed<p.windup)return;
    if(p.pattern==='sweep'){
      a.phase='recovery';a.elapsed=0;a.burstLeft=0;const dx=target.x-enemy.x,dy=target.y-(enemy.y-15),d=Math.hypot(dx,dy),dot=d?(dx*a.dirX+dy*a.dirY)/d:1;
      const from={x:enemy.x,y:enemy.y-15};
      return d<=p.range+(victim.radius||12)&&dot>=Math.cos(.7)&&((enemy.arena&&enemy.arena.terrain!=='forest')||terrainLineClear(from,target,0))&&!game.trees.some(t=>t.hp>0&&segmentCircle(from,target,nearest(t,from),t.radius)!==null)?enemy.damage:0;
    }
    if(!releaseDumplingVolley(game,enemy,p,0))return;
    a.phase='recovery';a.elapsed=0;a.burstLeft=(p.volleys||1)-1;return;
  }
  const pursuit=enemy.aquatic||enemy.arena?{direct:true,goal:target}:groundPursuit(enemy,victim,dt,true,surfaceAttackRange(game,p.reach));
  if(distance<=surfaceAttackRange(game,p.reach)&&visible&&pursuit.direct){
    const angle=Math.atan2(target.y-(enemy.y-15),target.x-enemy.x);
    Object.assign(a,{phase:'windup',elapsed:0,originX:enemy.x,originY:enemy.y-15,endX:target.x,endY:target.y,dirX:Math.cos(angle),dirY:Math.sin(angle)});return;
  }
  const dx=pursuit.goal.x-enemy.x,dy=pursuit.goal.y-enemy.y,length=Math.hypot(dx,dy);
  if(length>1){const travel=Math.min(length,enemy.speed*dt);moveBody(enemy,dx/length*travel,dy/length*travel,WORLD,enemy.radius,game.trees);}
}

// 单次齐射占用共享弹量，叶刃反向弯曲，环弹下一轮错开45度。
function releaseDumplingVolley(game,enemy,p,volley){
 const a=enemy.assault,angles=dumplingShotAngles(p,Math.atan2(a.dirY,a.dirX),volley),limit=game.boss?1:RANGED_LIMITS.bolts,count=Math.min(angles.length,limit);
 if(game.rangedShotTimer>0||game.enemyBolts.length+count>limit)return false;
 for(const [i,angle] of angles.slice(0,count).entries()){const distance=p.splash?Math.hypot(a.endX-enemy.x,a.endY-(enemy.y-15)):p.range;game.enemyBolts.push({species:'biome-dumpling',campBarrier:!!enemy.campDefense&&!enemy.campRaider,dumplingVariant:p.id,owner:enemy.id,x:enemy.x,y:enemy.y-15,dx:Math.cos(angle),dy:Math.sin(angle),curve:p.curve?(p.id==='fern'?(i===0?1:-1):1)*p.curve:0,radius:p.radius,speed:p.speed,launchSpeed:p.speed,flightDistance:distance,remaining:distance,splash:p.splash||0,endX:a.endX,endY:a.endY,damage:enemy.damage,age:0});}
 game.rangedShotTimer=game.boss?RANGED_LIMITS.bossShotGap:RANGED_LIMITS.shotGap;return true;
}
