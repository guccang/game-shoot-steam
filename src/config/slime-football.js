import { GAMEPLAY_VALUES } from './gameplay-values.js';
// 滚滚史莱姆的比赛、场地与租借枪配置，正式规则和界面共用。
import { WEAPONS } from './weapons.js';
export const FOOTBALL = Object.freeze({ duration:60, capacity:10, interval:1.8, ballRadius:255, arena:{x:900,y:700,radius:300,terrain:'football'}, field:{x:-140,y:-225,width:280,height:160}, loans:[0,2,3,9] });
// 租借枪保证新手可玩，其余已拥有的直接射击枪也可入场。
export function footballGuns(p){return WEAPONS.map((w,i)=>i).filter(i=>!WEAPONS[i].controller&&!['melee','defense'].includes(WEAPONS[i].attackKind)&&(p.weapons[i]>0||FOOTBALL.loans.includes(i)));}
// 每球线性增加基础资源，五球一零件；零分没有奖励。
export function footballReward(score){const n=Math.max(0,Math.floor(score));return {coins:n*GAMEPLAY_VALUES.football.coinsPerGoal,wood:n*GAMEPLAY_VALUES.football.woodPerGoal,parts:Math.floor(n/GAMEPLAY_VALUES.football.goalsPerPart),crystal:0,core:0};}
// 武器成长沿用已购配置，免费租借仅一级；不会写入永久所有权。
export function footballEquipment(p,index){return {...p,weapon:index,weapons:p.weapons.map((n,i)=>i===index?Math.max(1,n):n),mechanicalLoadout:null,spiderLoadout:null};}
// 整个脚底圆进入球场才计分；不以碰线或高伤害代替进球。
export function insideFootballField(e,arena){const f=FOOTBALL.field,r=e.radius||GAMEPLAY_VALUES.football.radius,x=e.x-arena.x,y=e.y-arena.y;return x-r>=f.x&&x+r<=f.x+f.width&&y-r>=f.y&&y+r<=f.y+f.height;}
