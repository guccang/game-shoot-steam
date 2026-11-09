// 地下九类景观使用同一森林描边与低饱和块面，独立绘制地面、水流、植株和生物动作。
import {minePoint} from '../config/mining.js';
import {MINE_ANIMALS} from '../config/mine-ecology.js';
import {mineDumplingForm,mineDumplingSnapshot} from '../config/mine-dumplings.js';
import {drawSlime} from './enemies.js';
import {mineMetalContext} from './mine-metal-palette.js';
import {box,oval} from './primitives.js';
const ink='#365a47';
// 连续地形由共享地貌绘制器负责，设施仍按原施工格保留真实木桥范围。
export function drawMineTerrain(c,cell,layer,night,time){
 if(!layer.bridges?.[`${cell.x},${cell.y}`])return;
 const {x,y}=minePoint(cell);box(c,x-31,y-31,62,62,2,night?'#9f946e':'#c4aa79',ink,2);
 for(let j=-24;j<32;j+=12){box(c,x-30,y+j,60,2,0,'#8c805c');oval(c,x-26,y+j+5,1,1,ink);oval(c,x+26,y+j+5,1,1,ink);}
}
// 原入口继续绑定正式九景实体绘制，怪物和投射物保持独立。
export {drawMineFlora as drawMineLandscape} from './mine-flora.js';
// 地下复用地表团子的独立身体、翼根、脚步、轮组和武器，仅局部调色与等比适配矿道。
export function drawMineAnimal(c,a,time,reduced=false){
 if(a.hp<=0&&!a.death)return;
 const form=mineDumplingForm(a),actor=mineDumplingSnapshot(a),metal=mineMetalContext(c);
 c.save();c.translate(a.x,a.y);
 if(a.phase==='windup'&&a.hp>0){c.strokeStyle='#ce9568';c.lineWidth=2;c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.stroke();}
 c.save();c.scale(form.scale,form.scale);drawSlime(metal,{...actor,x:0,y:0},a.clock??time,reduced,null,true);c.restore();
 if(a.hp>0&&a.hp<(a.maxHp||MINE_ANIMALS[a.kind].hp)){const top=-form.height*form.scale-9;box(c,-17,top,34,4,2,ink);box(c,-16,top+1,32*Math.min(1,a.hp/(a.maxHp||MINE_ANIMALS[a.kind].hp)),2,1,'#e3c88c');}
 c.restore();
}
// 孢子和车炮使用独立运动实体，弹道不依附于角色位图。
export function drawMineBolts(c,bolts){for(const b of bolts||[]){oval(c,b.x,b.y,b.enemy?5:4,b.enemy?5:4,b.enemy?'#baac84':'#f2d89b',ink,1.5);if(!b.enemy){c.strokeStyle='#ead491';c.lineWidth=2;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.025,b.y-b.vy*.025);c.stroke();}}}
