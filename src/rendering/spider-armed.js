// 母蛛与正式挂枪组合，炮口和后坐直接读取战斗炮座状态。
import { drawSpiderBody } from './spider.js';
import { drawWeapon } from './characters.js';
import { drawPulseCharge } from './pulse.js';
import { mechanicalMuzzle } from '../combat/mechanical-gun.js';
import { createRecoil } from '../combat/recoil.js';
import { box, oval, outline } from './primitives.js';
import { spiderGunWeapon } from '../config/spider-loadout.js';

// 配置卡只绘制母体与选定单枪架，临时后坐状态不进入正式会话。
export function drawSpiderLoadout(c,progress,core,index) {
  const gun={weapon:spiderGunWeapon({...progress,spiderLoadout:index},core),recoil:createRecoil(),angle:-.15,scale:.8,mountY:-30};
  c.save();c.translate(120,88);c.scale(1.2,1.2);drawArmedSpider(c,{index:0,x:0,y:0,mother:true,hp:480,gun,walkPhase:.7},core,true);c.restore();
}

// 八足身体与旋转炮座分别绘制，移动不会拉伸主炮或改变枪口。
export function drawArmedSpider(c,node,weapon,reduced=false) {
  drawSpiderBody(c,node,weapon,reduced);if(!node.mother||node.hp<=0)return;
  const gun=node.gun;if(!gun)return;
  c.save();c.translate(node.x,node.y-30);box(c,-10,-7,20,14,5,'#718672',outline,2);oval(c,0,0,6,6,'#f4dca0',outline,1.5);
  c.rotate(gun.angle);c.translate(-(reduced?0:gun.recoil.kick)*gun.scale,0);
  drawWeapon(c,gun.weapon.weaponIndex,0,0,gun.scale,0,reduced?0:gun.recoil.flash,0,gun.weapon.modChoice,gun.weapon.parts,reduced?0:gun.magazine?.rotor||0);c.restore();
  if(gun.pulse?.charge>0)drawPulseCharge(c,{kind:'pulse',angle:gun.angle,charge:gun.pulse.charge/gun.weapon.chargeTime,muzzle:mechanicalMuzzle(node,reduced)},1,node.clock||0,reduced);
}
// 工作台使用同一母体和小蛛，数量、甲壳及主炮直接读取正式快照。
export function drawSpiderPreview(c,weapon,time=0,reduced=false,progress=null) {
  const gun={weapon:progress?spiderGunWeapon(progress,weapon):{...weapon,weaponIndex:9},recoil:createRecoil(),pulse:{charge:0},angle:0,scale:.8,mountY:-30};
  for(let i=0;i<weapon.summonCount;i++){const ring=weapon.summonCount>10?Math.floor(i/10):0,slots=weapon.summonCount>10?Math.min(10,weapon.summonCount-ring*10):weapon.summonCount,a=(i%10)/slots*Math.PI*2+ring*.31;drawArmedSpider(c,{index:i,x:Math.cos(a)*(69+ring*29),y:Math.sin(a)*(47+ring*23)-8,walkPhase:time*5+i,mode:'idle'},weapon,reduced);}
  drawArmedSpider(c,{index:0,x:0,y:0,mother:true,gun,walkPhase:time*3,hatch:0,mode:'idle'},weapon,reduced);
}
// 试射按脚底排序，使用独立会话中真实生命、步态、主炮与舱门状态。
export function drawSpiderPack(c,state,weapon,reduced=false) {
  for(const node of [state.mother,...state.nodes].filter(n=>n.active&&n.ready).sort((a,b)=>a.y-b.y))drawArmedSpider(c,node.mother?{...node,hatch:state.hatch,hatchSide:state.hatchSide}:node,weapon,reduced);
}
