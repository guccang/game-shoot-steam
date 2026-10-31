// 特殊伤害真实穿过护盾与无敌帧后，才独立判定主炮及发动机损坏。
import {FAULT_RULES} from '../config/supplies.js';
import {finiteSupply} from './supply-ammo.js';
// 普通碰撞不掷骰；两个部件独立判定，损坏变化通过原有事件提示。
export function applyVehicleFault(game,source){const rule=FAULT_RULES[source?.damageType];if(!rule||!finiteSupply(game)||!game.vehicle.active)return;const s=game.progress.supplies,v=game.vehicle;for(const [part,values,index] of [['gun',s.gunFaults,v.weaponIndex],['engine',s.engineFaults,v.index]]){if(index===null||values[index]>=100||game.random()>=rule.chance)continue;values[index]=Math.min(100,values[index]+rule[part]);game.onEvent('vehicle-fault',{text:(part==='gun'?'主炮':'发动机')+'损坏 '+values[index]+'%'});}}
