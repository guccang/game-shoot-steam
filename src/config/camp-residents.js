// 固定营地名额混编：重新载入沿用原槽位，不改变已经击败的名额或种子账本。
import {flyingIdentity} from './enemies.js';
import {ARMORED,armoredIdentity} from './armored-enemies.js';
import {RANGED_ENEMIES,rangedIdentity} from './ranged-enemies.js';

export const CAMP_ROSTERS=Object.freeze({
 'ember-pot':['slime','slime','acorn-slinger','spore-spitter','slime'],
 'snore-pine':['slime','leaf-bat','acorn-slinger','leaf-bat','slime'],
 'berry-rumor':['slime','spore-spitter','acorn-slinger','slime','reed-archer'],
 'moon-kettle':['leaf-bat','slime','reed-archer','spore-spitter','slime'],
 'leaky-roof':['ironwood-bulwark','slime','spore-spitter','reed-archer','slime'],
 'late-mail':['slime','leaf-bat','acorn-slinger','bramble-buggy','slime'],
 'last-supper':['ironwood-bulwark','slime','stump-bombard','reed-archer','leaf-bat'],
 'valley-bowl':['slime','spore-spitter','slime','reed-archer','slime'],
 'valley-echo':['leaf-bat','slime','acorn-slinger','leaf-bat','slime'],
 'valley-stamp':['slime','acorn-slinger','reed-archer','slime','leaf-bat'],
 'valley-star':['leaf-bat','slime','spore-spitter','reed-archer','slime'],
});

// 兵种属性直接复用正式怪物工厂；地区等级不变，不再为营地建立另一套强度。
export function campResidentIdentity(base,camp,slot){
 const species=CAMP_ROSTERS[camp.id][slot];
 const identity=species==='leaf-bat'?flyingIdentity(base):species===ARMORED.id?armoredIdentity(base):RANGED_ENEMIES[species]?rangedIdentity(base,species):{...base,species};
 return {...identity,kind:'dumpling',radius:species===ARMORED.id?ARMORED.radius:RANGED_ENEMIES[species]?.bodyRadius||18};
}

// 高个居民的名字、闲聊和警觉符号使用足够的头顶留白，不压住盾牌、叶翼或弓帽。
export function campResidentHead(actor){return actor.species===ARMORED.id?105:actor.species==='bramble-buggy'?88:actor.species==='stump-bombard'?85:actor.species==='reed-archer'?84:actor.species==='slime'||!actor.species?65:78;}

// 兵种日常融入原闲聊轮次，战斗规则和数值不写进居民对白。
export const CAMP_RESIDENT_CHAT=Object.freeze({
 'leaf-bat':'我在树上值夜班。别问我为什么倒着睡，正着容易看见欠条。',
 'spore-spitter':'这锅汤真不是我喷绿的。厨师还没来，你们怎么都看我？',
 'acorn-slinger':'袋子里一半是橡果，一半是晚饭。别让我分，分了我会饿。',
 'reed-archer':'我编了把新弩，头领却让我用剩下的苇叶给锅补盖子。',
 'ironwood-bulwark':'盾牌借出去挡过雨、压过菜，就是没借来当过盾牌。',
 'bramble-buggy':'说好让我当车手，结果每天拉柴。倒车请注意，后面那袋是土豆。',
 'stump-bombard':'不许往炮管里塞红薯！上回开饭，隔壁营地先吃上的。',
});
