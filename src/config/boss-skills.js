// 每位领主保留原招式，并共享召唤与一种专属招式；数值不写入永久存档。
export const BOSS_SUMMON_SKILL = Object.freeze({id:'summon',name:'呼唤援兵',hint:'优先清理小团子，召唤后有反击空隙',windup:2,active:1.6,recovery:1.2,interval:1.8});
export const BOSS_SPECIAL_SKILLS = Object.freeze({
 boar:{id:'tusk-sweep',name:'獠牙横扫',hint:'离开正面扇区，绕向侧后方',windup:1.15,active:.35,recovery:1.35,interval:1.7,radius:210,halfAngle:1.05,damage:.9},
 mushroom:{id:'spore-wreath',name:'孢子花环',hint:'从花环缺口离开，别停在孢子里',windup:1.4,active:2.5,recovery:1.2,interval:1.8,radius:46,orbit:125,damage:.42},
 owl:{id:'cross-feathers',name:'交叉羽刃',hint:'羽刃交汇前横移，别停在旧位置',windup:1.15,active:1.9,recovery:1.25,interval:1.8,speed:260,length:420,radius:11,damage:.7},
 turtle:{id:'return-tide',name:'回潮环',hint:'潮环向内收缩，提前向外撤离',windup:1.4,active:1.5,recovery:1.4,interval:1.8,radius:270,speed:-140,width:18,damage:.85},
 moss:{id:'root-fork',name:'分叉树根',hint:'侧移到三条根刺之间的空隙',windup:1.25,active:.55,recovery:1.4,interval:1.6,length:340,radius:19,damage:.85},
 dumpling:{id:'triple-bounce',name:'团团连震',hint:'三个落点依次爆发，持续离开叶纹圈',windup:1.2,active:1.1,recovery:1.35,interval:1.8,radius:52,spacing:96,delay:.35,damage:.65},
});
// 三个技能固定轮换便于学习；首招始终沿用原机制，旧快照无序号时从零开始。
export function nextBossSkill(boss){
 const step=Number.isInteger(boss.skillCycle)&&boss.skillCycle>=0?boss.skillCycle%3:0;
 boss.skillCycle=(step+1)%3;
 return step===1?BOSS_SUMMON_SKILL:step===2?BOSS_SPECIAL_SKILLS[boss.kind]||BOSS_SPECIAL_SKILLS.moss:null;
}
