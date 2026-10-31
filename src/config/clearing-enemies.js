// 清缴独立编成：每八个出生名额最多一个特殊怪，增加的团怪供范围火力清场。
import {flyingIdentity} from './enemies.js';
import {rangedIdentity,rangedSpecies,RANGED_ENEMIES,RANGED_LIMITS} from './ranged-enemies.js';
import {armoredIdentity,ARMORED} from './armored-enemies.js';

// 少量开局名额先教飞行、远程，再引入重装、车载与重炮；后续名额循环补齐编成。
const SPECIALS=[[],['flying','ranged'],['ranged','flying','vehicle','armored'],
 ['armored','vehicle','flying','ranged'],['vehicle','heavy','armored','flying','ranged']];

// 编号固定且不受随机数影响，任意出生前缀中的团子都不少于特殊怪总数的七倍。
export function clearingSpawnKind(wave,ordinal){
 const kinds=SPECIALS[(Math.max(1,Math.floor(wave))-1)%5];
 return ordinal>0&&ordinal%8===0&&kinds.length?kinds[(ordinal/8-1)%kinds.length]:'slime';
}

// 特殊名额达到同屏上限就退回团子，不挪用其他名额；基础属性由正式工厂提供。
export function clearingIdentity(ground,wave,ordinal,enemies,roll){
 const kind=clearingSpawnKind(wave,ordinal);
 if(kind==='flying')return flyingIdentity(ground);
 if(kind==='armored')return enemies.filter(e=>e.hp>0&&e.species===ARMORED.id).length<ARMORED.maxAlive?armoredIdentity(ground):ground;
 if(['ranged','vehicle','heavy'].includes(kind)&&enemies.filter(e=>e.hp>0&&RANGED_ENEMIES[e.species]).length<RANGED_LIMITS.alive){
  return rangedIdentity(ground,kind==='vehicle'?'bramble-buggy':kind==='heavy'?'stump-bombard':rangedSpecies(2,roll));
 }
 return ground;
}
