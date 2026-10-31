import {drawCrewCat} from './cat-crew.js';
import { effectiveWeapon } from '../config/weapon-mods.js';
import { createRecoil } from '../combat/recoil.js';
// 背部枪架绘制组合正式机械猫与正式枪械，避免身体模块依赖武器模块造成循环。
import { drawMechanicalCat } from './mechanical.js';
import { drawWeapon } from './characters.js';
import { mechanicalMuzzle, MECHANICAL_GUN_SCALE } from '../combat/mechanical-gun.js';
import { box, oval, outline } from './primitives.js';
// 主体按脚底排序，枪口和后坐使用与攻击相同的背部锚点。
export function drawArmedMechanicalCat(c,node,weapon,reduced=false) {
  if(weapon?.crew){drawCrewCat(c,node,weapon,reduced);return;}
  drawMechanicalCat(c,node,weapon,reduced);
  if(node.hp<=0||!node.gun)return;
  const gun=node.gun,w=gun.weapon;
  c.save();c.translate(node.x,node.y-22);
  box(c,-3,-15,6,15,2,'#718672',outline,1);c.translate(0,-15);
  box(c,-8,-4,16,8,3,'#718672',outline,1.5);oval(c,0,0,4,4,'#f4dca0',outline,1);
  c.rotate(gun.angle);c.translate(-(reduced?0:gun.recoil.kick)*MECHANICAL_GUN_SCALE,0);
  drawWeapon(c,w.weaponIndex,0,0,MECHANICAL_GUN_SCALE,0,reduced?0:gun.recoil.flash,0,w.modChoice,w.parts,reduced?0:gun.magazine?.rotor||0);
  c.restore();
  if(gun.recoil.flash>0&&!reduced){const p=mechanicalMuzzle(node);oval(c,p.x,p.y,3,2,'#f4dca0');}
}

// 配置卡仅调整展示镜头；猫体、枪架和部件沿用正式绘制。
export function drawMechanicalLoadout(c,progress,index) {
  c.save();c.translate(c.canvas.width/2,c.canvas.height*.7);c.scale(2,2);
  drawArmedMechanicalCat(c,{index:0,x:0,y:0,angle:0,walkPhase:.8,gun:index===null?null:{weapon:effectiveWeapon(progress,index),recoil:createRecoil(),angle:-.15}},effectiveWeapon({...progress,mechanicalLoadout:index},15),true);
  c.restore();
}
