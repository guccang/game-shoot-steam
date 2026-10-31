import {enemyLevelHealthScale} from './combat-levels.js';
// 清缴独立成长表：按永久胜场匹配装备成长，不读取当前装备，不影响守门和野外遭遇。
export const CLEARING_GROWTH = Object.freeze([
  Object.freeze({round:0,health:1,damage:1,bossHealth:650}),
  Object.freeze({round:1,health:1.6,damage:1.02,bossHealth:900}),
  Object.freeze({round:2,health:2.2,damage:1.04,bossHealth:1150}),
  // 前五轮按主线整备后的火力定标：三级手枪、角色与弹匣成长，再过渡到一级散弹枪。
  // 满弹匣持续命中、计入换弹且不计暴击与载具时，作为基础预算；最终生命叠加清缴领主独立增幅，固定预算不随换装变化。
  Object.freeze({round:3,health:3.2,damage:1.25,bossHealth:1250}),
  Object.freeze({round:4,health:4.8,damage:1.5,bossHealth:1350}),
  Object.freeze({round:7,health:12,damage:2.4,bossHealth:4200}),
  Object.freeze({round:12,health:24,damage:4,bossHealth:18000}),
  Object.freeze({round:20,health:48,damage:7,bossHealth:120000}),
  Object.freeze({round:30,health:64,damage:9,bossHealth:180000}),
]);
// 成组接敌让范围武器发挥作用；低帧率最多补一组，现场总量保持有界。
export const CLEARING_DENSITY = Object.freeze({maxAlive:24,openingAlive:8,alivePerSecond:2,spawnInterval:1.25,openingBatch:4,batch:6,spread:Math.PI/3});
// 仅清缴普通团怪变脆，特殊怪和领主保留压迫；不随玩家换装提高难度。
export const CLEARING_FODDER = Object.freeze({health:.55,damage:.65});

// 前两轮减少重复射击：重装额外减免生命，保留其体型、冲锋、伤害和奖励。
export const CLEARING_OPENING_PACING=Object.freeze([
 // 首轮在原有七折基础上再降低30%，重装继续保留原额外减免。
 Object.freeze({health:.49,armoredHealth:.65}),
 Object.freeze({health:.85,armoredHealth:.85}),
]);
const NORMAL_PACING=Object.freeze({health:1,armoredHealth:1});
// 展示等级对应当前清缴轮数，独立于一级基础属性，避免重复叠加等级强度。
export function clearingEnemyLevel(completedRounds=0){
 return Math.max(0,Math.floor(Number.isFinite(completedRounds)?completedRounds:0))+1;
}
// 只随已完成的清缴轮数退出新手减免，换装备、失败和重试不提高难度。
export function clearingOpeningPacing(completedRounds=0){
 const n=Math.max(0,Math.floor(Number.isFinite(completedRounds)?completedRounds:0));
 return CLEARING_OPENING_PACING[n]??NORMAL_PACING;
}

// 锚点间平滑增长，长期封顶；失败、刷新与轮内五批均不推进成长档位。
export function clearingDifficulty(completedRounds=0){
  const n=Math.min(CLEARING_GROWTH.at(-1).round,Math.max(0,Math.floor(Number.isFinite(completedRounds)?completedRounds:0)));
  const upper=CLEARING_GROWTH.findIndex(point=>point.round>=n);
  if(upper<=0)return {...CLEARING_GROWTH[upper===0?0:CLEARING_GROWTH.length-1]};
  const a=CLEARING_GROWTH[upper-1],b=CLEARING_GROWTH[upper],t=(n-a.round)/(b.round-a.round);
  // 领主生命按倍率插值；普通怪保留前期预算下限，中后期至少匹配展示等级的复合成长，伤害仍按原预算。
  return {health:Math.max(a.health+(b.health-a.health)*t,enemyLevelHealthScale(n+1)),damage:a.damage+(b.damage-a.damage)*t,bossHealth:Math.round(a.bossHealth*Math.pow(b.bossHealth/a.bossHealth,t))};
}
