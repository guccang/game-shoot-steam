// 地下软体复用地表真实位移与受击回弹，旧生态kind仍负责AI和存档。
import {advanceDumplingMotion,markDumplingHit} from './dumpling-motion.js';
import {mineDumplingSnapshot} from '../config/mine-dumplings.js';

// 记录上一帧脚底，换层或读档后从当前位置衔接，不制造额外移动。
export function advanceMineDumplingMotion(animal,dt){
 const actor=mineDumplingSnapshot(animal),from={x:animal.dumplingX??animal.x,y:animal.dumplingY??animal.y};
 advanceDumplingMotion(actor,from,dt);
 for(const key of ['gelMove','gelStep','gelHitAge'])if(Number.isFinite(actor[key]))animal[key]=actor[key];
 animal.dumplingX=animal.x;animal.dumplingY=animal.y;
}
// 连射保留完整的压缩回弹，受击不靠把整个怪物刷成白色表达。
export function hitMineDumpling(animal,impact={}){
 const actor=mineDumplingSnapshot(animal);markDumplingHit(actor);animal.gelHitAge=actor.gelHitAge;
 animal.hitX=impact.direction?.x??1;animal.hitY=impact.direction?.y??0;
}
