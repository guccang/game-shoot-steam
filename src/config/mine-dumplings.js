// 地下沿用三类稳定生态身份，外观按原生栖地键确定，不重抽存档或改变战斗属性。
import {mineHash,MINE_ANIMALS} from './mine-ecology.js';
import {RANGED_ENEMIES} from './ranged-enemies.js';
import {ARMORED} from './armored-enemies.js';

export const MINE_DUMPLINGS=Object.freeze([
 {id:'small',kind:'beetle',species:'slime',rank:0,scale:.85,height:38,name:'金属灰小团子'},
 {id:'medium',kind:'beetle',species:'slime',rank:1,scale:1,height:48,name:'金属灰中团子'},
 {id:'large',kind:'beetle',species:'slime',rank:2,scale:1.1,height:48,name:'金属灰大团子'},
 {id:'shield',kind:'beetle',species:'ironwood-bulwark',rank:0,scale:.55,height:100,name:'金属灰盾卫团子'},
 {id:'wing',kind:'bat',species:'leaf-bat',rank:0,scale:.7,height:48,name:'金属灰叶翼飞团'},
 {id:'spitter',kind:'spore',species:'spore-spitter',rank:0,scale:.8,height:58,name:'金属灰喷团'},
 {id:'slinger',kind:'spore',species:'acorn-slinger',rank:0,scale:.8,height:60,name:'金属灰投团'},
 {id:'archer',kind:'spore',species:'reed-archer',rank:0,scale:.75,height:65,name:'金属灰弩团'},
 {id:'buggy',kind:'spore',species:'bramble-buggy',rank:0,scale:.65,height:66,name:'金属灰装甲车团'},
 {id:'cannon',kind:'spore',species:'stump-bombard',rank:0,scale:.65,height:68,name:'金属灰重炮团'},
]);
// 图鉴没有栖地时显示该行为组的代表；正式实体由稳定格子生成相同外观。
export function mineDumplingForm(animal){
 const forms=MINE_DUMPLINGS.filter(f=>f.kind===animal.kind);
 if(!forms.length)throw new Error('未知地下怪物类型：'+animal.kind);
 if(!animal.key)return forms[0];
 const [x,y]=animal.key.split(',').map(Number);
 return forms[mineHash(x||0,y||0,6241)%forms.length];
}
// 将地下真实攻击/受击/死亡时钟映射给地表部件，绘制快照不会反写存档。
export function mineDumplingSnapshot(animal){
 const form=mineDumplingForm(animal),base=MINE_ANIMALS[animal.kind],ranged=RANGED_ENEMIES[form.species];
 const phase=animal.phase==='windup'?'windup':animal.phase==='recover'?(ranged?'recovery':'returning'):'chase';
 const elapsed=phase==='windup'?Math.max(0,1-(animal.timer||0)/base.windup)*(ranged?.windup||ARMORED.attack.windup):animal.phase==='recover'?Math.max(0,base.recover-(animal.timer||0)):0;
 const dx=(animal.aimX??animal.x+1)-animal.x,dy=(animal.aimY??animal.y)-animal.y,n=Math.max(1,Math.hypot(dx,dy));
 return {...animal,type:'enemy',species:form.species,rank:form.rank,phase:0,flying:animal.kind==='bat',biome:'meadow',
  flash:0,speed:base.speed,burst:animal.hp<=0,duration:.6,life:animal.hp<=0?animal.death:undefined,
  rangedWalk:animal.walk||0,armoredWalk:animal.walk||0,
  assault:{phase,elapsed,dirX:dx/n,dirY:dy/n}};
}
