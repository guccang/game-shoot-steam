// 特殊伤害真实穿过护盾与无敌帧后，才独立判定主炮及发动机损坏。
import {FAULT_RULES} from '../config/supplies.js';
import {finiteSupply} from './supply-ammo.js';
import {sendMail} from '../progression/mailbox.js';
// 普通碰撞不掷骰；两个部件独立判定，完全损坏产生一次重要通知。
export function applyVehicleFault(game,source){const rule=FAULT_RULES[source?.damageType];if(!rule||!finiteSupply(game)||!game.vehicle.active)return;const s=game.progress.supplies,v=game.vehicle;for(const [part,values,index] of [['gun',s.gunFaults,v.weaponIndex],['engine',s.engineFaults,v.index]]){if(index===null||values[index]>=100||game.random()>=rule.chance)continue;const before=values[index];values[index]=Math.min(100,before+rule[part]);if(values[index]===100)sendMail(game.progress,{sender:'载具状态监测',title:(part==='gun'?'主炮':'发动机')+'完全损坏',body:'该部件损坏达到100%，已经停止工作。维修道具无法处理，请前往维修中心或呼叫救援。'});game.onEvent('vehicle-fault',{text:(part==='gun'?'主炮':'发动机')+'损坏 '+values[index]+'%'});}}
