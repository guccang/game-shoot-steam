// 死亡采用亮芯、扩散烟团和材质碎屑分层，不改变活体动画或创建游戏粒子。
import {monsterDeathPose,monsterDeathFragments} from '../config/monster-death.js';
import {ARMORED} from '../config/armored-enemies.js';
import {BIOMES} from '../world/biomes.js';
import {oval,poly} from './primitives.js';
// 输入为脚底局部坐标；与正式残影共用时间、高度和昼夜转换。
export function drawMonsterDeath(c,e,reduced=false){
 if(!e.burst)return false;
 const pose=monsterDeathPose(e,reduced);if(!pose.active)return false;
 const {t,spread,alpha}=pose,armored=e.species===ARMORED.id,zone=BIOMES.find(b=>b.id===e.biome)||BIOMES[0];
 const color=e.ember?'#d18a61':armored?'#8d9f85':e.color||zone.monster,accent=e.ember?'#f2c67f':zone.accent;
 c.save();c.translate(0,-(reduced?0:e.z||0)-(armored?38:18));if(armored)c.scale(1.25,1.25);
 const opacity=c.globalAlpha;
 // 烟团沿弹道前向推出，横向错开，保留命中点与飞散前沿之间的空隙。
 for(let i=0;i<pose.puffs;i++){
  const forward=reduced?0:spread*(.35+i*.27)*pose.strength,side=Math.sin(i*2.399)*spread*.42,r=(8+(i%3)*2)*(1-t*.65);
  c.globalAlpha=opacity*pose.smoke*.72;
  oval(c,Math.cos(pose.angle)*forward-Math.sin(pose.angle)*side,Math.sin(pose.angle)*forward+Math.cos(pose.angle)*side-t*5,r,r*.8,i%2?'#e5dfba':'#aebd94');
 }
 // 冲击弧只朝来弹前方推出，短促尖芯指出命中轴线，不绘制完整护盾圆环。
 if(!reduced&&t<.38){
  c.save();c.rotate(pose.angle);c.globalAlpha=opacity*(1-t/.38)*.9;c.strokeStyle='#f4e4b1';c.lineWidth=3*(1-t)+.5;
  for(let i=0;i<pose.arcs;i++){c.beginPath();c.ellipse(spread*.25,0,spread*(1+i*.25)*pose.strength,spread*(.5+i*.2),0,-.75,.75);c.stroke();}
  if(pose.flash){c.globalAlpha=opacity*pose.flash;poly(c,[[-8,0],[1,-7],[28*pose.strength,0],[1,7]],'#fff1c8',null);}
  c.restore();
 }
 if(pose.flash){c.globalAlpha=opacity*pose.flash;oval(c,0,0,7+9*pose.flash,6+7*pose.flash,'#fff1c8');}
 // 叶片/碎甲带抛物线下落和独立翻转，数量固定，不使用随机数扰动战斗。
 for(const [i,chip] of monsterDeathFragments(e,reduced).entries()){
  c.save();c.globalAlpha=opacity*alpha;
  if(t<.4){c.globalAlpha*=.75*(1-t/.4);c.strokeStyle=i%2?color:'#f5dfa0';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(chip.tailX,chip.tailY);c.lineTo(chip.x,chip.y);c.stroke();}
  c.globalAlpha=opacity*alpha;c.translate(chip.x,chip.y);c.rotate(chip.angle);c.scale(chip.size,chip.size);
  if(armored)poly(c,[[-4,-3],[2,-4],[5,1],[0,4]],i%2?color:accent,'#65745b',1);
  else {c.beginPath();c.moveTo(-5,0);c.quadraticCurveTo(0,-5,5,0);c.quadraticCurveTo(1,4,-5,0);c.fillStyle=i%2?color:accent;c.fill();c.strokeStyle='#72815b';c.lineWidth=.8;c.stroke();}
  c.restore();
 }
 c.restore();return true;
}
