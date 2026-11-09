// 地下复用正式武器和伙伴表现，光束、枪烟与受击效果随当前层独立消退。
import {drawBallistics,drawArcLink} from './projectiles.js';
import {drawPulseBeam,pulseChargePose} from './pulse.js';
import {drawCombatFX} from './particles.js';
import {drawGravityFields} from './gravity-gun.js';
import {drawTrialCompanions} from './workshop.js';
import {drawCat} from './characters.js';
import {PLAYER_SCALE} from '../combat/recoil.js';
import {gatlingHeat} from '../combat/weapon-heat.js';
// 保留真实连续身体帧、固定脚底和独立手枪；矿车座位只调整身体锚点。
export function drawMineArmedCat(c,g,x=g.player.x,y=g.player.y,lighting=null){
 const w=g.weapon(),b=g.cottage.combat,mag=g.magazines[g.loadout.weapon];
 const charge=w.chargeTime?(b?.pulse.charge||0)/w.chargeTime:0;
 drawCat(c,x,y,g.progress.hero,g.player.angle,PLAYER_SCALE,0,g.loadout.weapon,g.player.recoil,g.reducedMotion?.35:1,pulseChargePose(charge,g.time,g.reducedMotion),gatlingHeat(w,mag),false,false,g.player.bodyAnimation,w.modChoice,w.parts,g.reducedMotion?0:mag.rotor||0,false,0,false,lighting);
}
// 共用正式弹道和伙伴，不创建新位图或第二份动画时钟。
export function drawMineCombat(c,g,reduced){
 const b=g.cottage.combat;if(!b)return;
 drawGravityFields(c,b,reduced);
 if(g.cottage.weaponReady)drawTrialCompanions(c,b,reduced);
 else{drawBallistics(c,b.projectiles,reduced);drawCombatFX(c,b.fx.items,reduced);}
 for(const shot of b.shots){
  if(shot.kind==='arc-link'){drawArcLink(c,shot,reduced);continue;}
  if(shot.kind==='pulse-beam'){drawPulseBeam(c,shot,reduced);continue;}
  const power=Math.max(0,shot.life/shot.lifetime);c.save();c.globalAlpha=power;c.lineCap='round';c.beginPath();c.moveTo(shot.x,shot.y);c.lineTo(shot.ex,shot.ey);
  for(const [color,width] of [['#bafa9630',14*power],['#bafa9690',6*power],['#f0ffdb',2]]){c.strokeStyle=color;c.lineWidth=width;c.stroke();}c.restore();
 }
}
