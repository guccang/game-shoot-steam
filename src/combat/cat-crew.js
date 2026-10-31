import {CREW_ITEMS} from '../config/cat-crew-items.js';
// 金杯小队以车辆为出生点，逐只出门，近战沿用正式地面伙伴导航与命中。
import {createMechanicalState,updateMechanical} from './mechanical.js';
import {createCatMotion,updateCatMotion} from '../core/cat-motion.js';
import {consumeRound} from './magazine.js';
import {blocked} from '../physics/motion.js';
import {worldDistance} from '../world/coordinates.js';
export const CREW_CAPACITY=8;
// 固定槽位保留武器变体、生命与动作时钟，反复上下车不赠送新伙伴。
export function createCatCrewState(){
 const state=createMechanicalState(CREW_CAPACITY);state.crew=true;state.hatch=0;
 for(const node of state.nodes)Object.assign(node,{crew:true,variant:node.index%4,itemVariant:node.index%CREW_ITEMS.length,hp:180,maxHp:180,recallDelay:3,radius:10,bodyAnimation:createCatMotion()});
 return state;
}
// 侧门出口必须可站立，堵塞时等待，不能隔墙把猫送到敌人脚下。
function exitVan(game,node){
 node.arena=game.player.arena;node.mapId=game.player.mapId;node.worldBarriers=game.player.worldBarriers;
 for(const side of [1,-1]){const x=game.player.x+side*59,y=game.player.y+17;
  // 连同车门到落脚点的短路径检查，薄墙不能被出生位移越过。
  let clear=true;for(let i=1;i<=8;i++)if(blocked(game.player.x+(x-game.player.x)*i/8,game.player.y+(y-game.player.y)*i/8,node.radius,game.trees,node)){clear=false;break;}
  if(!clear)continue;
  Object.assign(node,{x,y,ready:true,spawned:true,active:true,hp:node.maxHp,deadTime:0,emerge:.45,egress:{x:x+side*35,y:y+22},mode:'emerge',targetId:null,cooldown:.3});return side;
 }
 return 0;
}
// 补召消耗车载补给；倒下、暂停、收起和换车都不会重置其他槽位。
export function updateCatCrew(game,dt){
 const state=game.mechanical,weapon=game.weapon();if(!state?.crew||!weapon.crew||dt<=0)return;
 state.hatch=Math.max(0,state.hatch-dt);state.spawnTimer=Math.max(0,state.spawnTimer-dt);
 const energy=game.magazines[weapon.weaponIndex],slot=state.nodes.slice(0,weapon.summonCount).find(n=>!n.spawned||n.hp<=0&&n.deadTime<=0);
 if(slot&&state.spawnTimer<=0&&energy.remaining<=0&&energy.ammo>=1){
  const side=exitVan(game,slot);if(side){consumeRound(energy,weapon,game.onEvent);state.spawnTimer=weapon.spawnInterval;state.hatch=.7;state.hatchSide=side;game.onEvent('weapon-sound',{kind:'cat-crew-deploy',source:'companion'});}
 }
 updateMechanical(game,dt);
 for(const node of state.nodes){if(!node.active||!node.ready||node.hp<=0)continue;
  node.bodyAnimation||=createCatMotion();const speed=worldDistance(node,node.previous||node)/dt;updateCatMotion(node.bodyAnimation,dt,speed,speed>8);
 }
}
