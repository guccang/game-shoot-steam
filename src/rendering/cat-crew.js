import {CREW_ITEMS} from '../config/cat-crew-items.js';
// 邻里猫沿用真实猫身体图集，五种日常用品和手臂按近战状态单独绘制。
import {catSprites} from './cat-animation.js';
import {box,oval,poly,outline} from './primitives.js';
const SCARVES=['#b86650','#6c8395','#b99b55','#75966d'];
// 握把位于原点，用品通过开口、勺碗、叉齿和枝杈区分轮廓。
export function drawCrewWeapon(c,variant){
 const id=CREW_ITEMS[variant]?.id||CREW_ITEMS[0].id,metal='#c5d0c3';
 if(id==='wrench'){
  box(c,-4,-3,25,6,3,'#a1b6ad',outline,1.4);oval(c,-1,0,1.4,1.4,'#6f8979');
  poly(c,[[17,-3],[22,-10],[31,-10],[34,-5],[27,-5],[23,-2],[23,2],[27,5],[34,5],[31,10],[22,10],[17,3]],metal,outline,1.5);
 }else if(id==='spoon'){
  box(c,-4,-2,28,4,2,metal,outline,1.4);oval(c,27,0,9,6,metal,outline,1.5);oval(c,27,-.5,5.5,3.2,'#94aaa2');oval(c,25,-2,2,1,'#edf0d9');
 }else if(id==='fork'){
  box(c,-4,-2.5,27,5,2.5,metal,outline,1.4);box(c,19,-7,6,14,3,metal,outline,1.3);
  for(const y of [-6,0,6])box(c,23,y-1.4,12,2.8,1.4,metal,outline,1.1);
 }else if(id==='branch'){
  poly(c,[[-4,-2],[10,-4],[20,-1],[32,-5],[35,-2],[21,4],[10,1],[-4,3]],'#b99463',outline,1.5);
  poly(c,[[14,-2],[18,-12],[21,-13],[20,-8],[18,1]],'#b99463',outline,1.3);
  oval(c,24,-9,5,2.8,'#a0bb78',outline,1.1);box(c,5,-1,5,1,0,'#dfbc87');
 }else{
  box(c,-4,-3,12,6,2,'#8b6a48',outline,1.3);
  poly(c,[[6,-2],[17,-4],[29,-6],[33,-3],[33,3],[29,6],[17,4],[6,2]],'#cba375',outline,1.5);box(c,3,-3,3,6,1,'#e8d7ab',outline,.8);
 }
}
// 身体固定正面与脚底，只有挥击手臂和日常用品旋转，绝不整猫旋转代替迈腿。
export function drawCrewCat(c,node,weapon,reduced=false){
 if(!node.ready)return;c.save();c.translate(node.x,node.y);const dead=node.hp<=0;
 if(dead)c.globalAlpha*=Math.max(.1,Math.min(.6,(node.deadTime||0)/3));
 oval(c,1,1,13,5,'#29433338');c.scale(.65,.65);
 const state=node.bodyAnimation||{idleTime:0,moveTime:0,moveWeight:0};
 if(!catSprites.draw(c,[0,1,3,4][node.variant??node.index%4],state,{bodyX:0,bodyY:-13+(dead?4:0)},reduced))throw Error('邻里猫身体图集尚未就绪');
 const scarf=SCARVES[node.variant??node.index%4];poly(c,[[-12,-24],[11,-24],[7,-17],[-8,-18]],scarf,outline,1.3);poly(c,[[7,-22],[17,-16],[8,-13]],scarf,outline,1.2);
 if(!dead){const facing=node.angle||0,side=Math.cos(facing)<0?-1:1;
  const swing=Math.max(0,Math.min(1,(node.swing||0)/(weapon.swingTime||.24))),wind=Math.min(1,(node.windup||0)/(weapon.windupTime||.18));
  const turn=reduced?(swing>0?.25:0):swing>0?-.9+1.8*(1-swing):-wind*.75;
  c.save();c.translate(side*12,-18);c.rotate(facing+turn);box(c,-8,-3,11,6,3,'#dfc395',outline,1.3);drawCrewWeapon(c,node.itemVariant??node.index%CREW_ITEMS.length);oval(c,1,0,4,4,'#f1d6aa',outline,1.2);c.restore();
  if(node.flash>0){c.strokeStyle='#e9c08c';c.lineWidth=2;c.beginPath();c.arc(0,-22,20,-2.8,-.4);c.stroke();}
 }
 c.restore();
 if(node.hp>0&&node.hp<node.maxHp){box(c,node.x-13,node.y-42,26,3,1,'#637862');box(c,node.x-13,node.y-42,26*node.hp/node.maxHp,3,1,'#d3dca0');}
}
// 专属武器图标显示日常用品和编制牌，不用虚假的车顶枪炮代替召唤机制。
export function drawCrewModule(c){
 box(c,-29,-20,58,40,6,'#b8a477',outline,2);box(c,-25,-16,50,32,4,'#e8d9ad',outline,1.5);
 for(let i=0;i<CREW_ITEMS.length;i++){c.save();c.translate(-21+(i%3)*19,-8+Math.floor(i/3)*19);c.scale(.43,.43);drawCrewWeapon(c,i);c.restore();}
}

// 小队部件以日常用品、训练钟、补给箱和编制牌表达用途，工坊不再套用枪管图标。
export function drawCrewUpgradePart(c,key,level){
 const gold='#d5b36a',cream='#eee1b6',green='#718672';
 if(key==='damage'){c.save();c.translate(-10,2);c.scale(.7,.7);drawCrewWeapon(c,0);c.restore();}
 else if(key==='rate'){oval(c,0,0,9,9,cream,outline,1.5);box(c,-3,-13,6,4,1,green,outline,1);poly(c,[[0,-6],[0,0],[5,3]],null,outline,1.5);}
 else if(key==='range'){box(c,-8,-12,3,25,1,green,outline,1);poly(c,[[-5,-11],[11,-9],[7,-3],[11,3],[-5,2]],gold,outline,1.4);}
 else if(key==='coordination'){box(c,-14,-11,28,22,3,cream,outline,1.5);for(let i=0;i<Math.min(8,3+level);i++){const x=-9+i%4*6,y=-5+Math.floor(i/4)*10;oval(c,x,y,2,2,green);box(c,x-2,y+3,4,3,1,green);}}
 else {box(c,-13,-8,26,18,3,cream,outline,1.5);box(c,-15,-11,30,6,2,green,outline,1.5);box(c,-3,-5,6,10,1,gold,outline,1);if(key==='reload'){oval(c,9,6,6,6,green,outline,1);poly(c,[[9,2],[9,6],[12,7]],null,cream,1.4);}}
 // 等级只增加小范围绑带标记，不放大整个部件。
 for(let i=0;i<Math.min(4,Math.ceil(level/5));i++)box(c,-5+i*3,12,2,2,.5,gold,outline,.5);
}
