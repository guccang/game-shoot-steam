// 邻里照料只在正式近距离交互期间使用借来的工具，弹道、枪口和后坐复用战斗实现。
import {storyNode,storyPosition} from './story-definition.js';
import {worldDistance} from '../world/coordinates.js';
import {shotSolution} from '../combat/aim.js';
import {emitWeaponAttack} from '../combat/weapon-fire.js';
import {triggerRecoil} from '../combat/recoil.js';
import {consumeRound} from '../combat/magazine.js';
import {absorbEnergyShield} from '../combat/energy-shield.js';

// 任务对象不是敌人；零伤害弹道在对象处结束，照料不会破坏附近树木或给予战利品。
export function updateEquipmentCare(game,dt){
 const node=storyNode(game);if(!node?.care)return true;
 const r=game.story,weapon=game.weapon(),index=game.loadout.weapon,magazine=game.magazines[index];
 // 检测器施加可控脉冲，通过正式护盾吸收入口扣除容量并绘制局部涟漪；不扣角色或车体生命。
 if(node.care==='shield'){
  if(weapon.id!=='energy-shield')return false;
  r.careCooldown=Math.max(0,(r.careCooldown||0)-dt);if(r.careCooldown)return true;
  if(magazine.ammo<80)return false;
  const target=storyPosition({site:node.objective.site},game);absorbEnergyShield(game,80,target);
  game.fx.add('ring',target.x,target.y,.4,{size:18,color:'#a8e4d5'});r.careCooldown=.7;return true;
 }
 if(weapon.id!==(node.care==='water'?'water':'frost'))return false;
 const target={...storyPosition({site:node.objective.site},game),radius:12},shot=shotSolution(game.player,target,index);
 game.player.angle=shot.angle;game.player.aimHold=.5;
 r.careCooldown=Math.max(0,(r.careCooldown||0)-dt);
 if(r.careCooldown)return true;
 if(magazine.remaining>0||magazine.ammo<=0)return false;
 const distance=Math.hypot(target.x-shot.muzzle.x,target.y-shot.muzzle.y);
 triggerRecoil(game.player.recoil,index);consumeRound(magazine,weapon);
 emitWeaponAttack(game,{...weapon,range:Math.max(12,distance),targetTrees:false},shot.muzzle,shot.direction,0,false,false,magazine);
 game.fx.add('ring',target.x,target.y,.4,{size:node.care==='water'?18:12,color:node.care==='water'?'#9edbd2':'#d2e9e4'});
 game.onEvent('shot',{kind:weapon.id});r.careCooldown=weapon.interval;
 return true;
}

// 归队动作在交互完成后关闭本次借装的召唤，暂离或刷新继续读取该章节旗标。
export function finishEquipmentInteraction(game){
 if(!storyNode(game)?.recall)return;
 game.story.flags.summonsStored=true;
 if(game.spider){game.spider.mother.ready=game.spider.mother.active=false;for(const node of game.spider.nodes)node.ready=node.active=false;}
}

// 第一次抵达才放置任务树，刷新按阶段重新构建，已完成的阶段不再重建。
export function updateEquipmentTimber(game,task){
 const r=game.story,center=storyPosition(task,game);
 if(!r.timberTrees){
  if(worldDistance(game.player,center)>180)return false;
  r.timberTrees=[];
  for(const [dx,dy] of [[-100,-100],[0,-100],[100,-100]]){const count=game.trees.length;game.addTree(center.x+dx,center.y+dy,{variant:'round',size:.65});if(game.trees.length===count)throw Error('运输支路障碍树无法放置，请检查任务坐标');const tree=game.trees.at(-1);tree.equipmentObstacle=true;r.timberTrees.push(tree);}
 }
 return game.vehicle.active&&game.vehicle.index===6&&r.timberTrees.every(t=>t.hp<=0);
}
