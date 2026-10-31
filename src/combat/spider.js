import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { vehicleCapacity } from '../config/vehicle-capacity.js';
import { observeLostTarget,groundEscort } from './summons/recovery.js';
import { SPIDER_ARRIVAL, SPIDER_MOTHER_CLEARANCE } from './summons/spider-escort.js';
import { advanceMechanicalFormation } from './mechanical-formation.js';
import { createMountedWeaponState } from './summons/weapon-state.js';
import { deployNode, walkNode } from './summons/ground-motion.js';
import { summonTargetPool } from './summons/targets.js';
// 蜘蛛母巢使用独立单枪架、生命与定时出舱，所有伤害仍走正式战斗入口。
import { createMechanicalState, resetMechanicalFormation, updateMechanical } from './mechanical.js';
import { createRecoil } from './recoil.js';
import { updateMechanicalGun } from './mechanical-gun.js';
import { worldDistance, nearest } from '../world/coordinates.js';
import { blocked, moveBody } from '../physics/motion.js';
import { WORLD } from '../world/coordinates.js';
import { SPIDER_MAX_MINIONS, SPIDER_SPAWN_INTERVAL } from '../config/spider.js';
import { spiderGunWeapon, spiderGunDamage, validateSpiderLoadout } from '../config/spider-loadout.js';
import { realmWeapon } from '../config/realms.js';
export const SPIDER_INDEX=16, SPIDER_SPAWN_COST=GAMEPLAY_VALUES.spider.spawnCost, SPIDER_REPAIR_COST=GAMEPLAY_VALUES.spider.repairCost;

// 固定二十一实体预算；未出舱的小蛛不参与索敌、伤害或绘制。
export function createSpiderState() {
  const state=createMechanicalState(SPIDER_MAX_MINIONS);
  for(const node of state.nodes){node.spawned=false;node.hp=0;node.maxHp=GAMEPLAY_VALUES.spider.initialMinionHealth;node.spider=true;}
  state.mother={index:0,x:0,y:0,ready:false,active:false,hp:GAMEPLAY_VALUES.spider.motherHealth,maxHp:GAMEPLAY_VALUES.spider.motherHealth,radius:GAMEPLAY_VALUES.spider.motherRadius,angle:0,walkPhase:0,flash:0,deadTime:0,recallDelay:GAMEPLAY_VALUES.spider.motherRepairSeconds,spider:true,mother:true};
  state.spawnTimer=SPIDER_SPAWN_INTERVAL;state.hatch=0;state.guns={};
  state.gun={...createMountedWeaponState(null),recoil:createRecoil(),angle:0,scale:.8,mountY:-30,ownerIndex:SPIDER_INDEX};
  return state;
}
// 枪架每枪保留独立供给；首次接入空仓装填，切回不刷新蓄力或冷却。
export function syncSpiderGun(game,state,core) {
  const progress=game.loadout||game.progress,index=validateSpiderLoadout(progress,progress.spiderLoadout),key=index===null?'native':String(index);
  const weapon=vehicleCapacity(realmWeapon(spiderGunWeapon(progress,core),index===null?null:game.realm?.buffs),game.vehicleAmmoBonus||1);
  const gun=state.guns[key] ||= {...createMountedWeaponState({ammo:0,remaining:weapon.reloadTime}),recoil:createRecoil(),angle:0,scale:.8,mountY:-30,ownerIndex:SPIDER_INDEX};
  gun.weapon=weapon;gun.damage=spiderGunDamage(progress,game.damage(SPIDER_INDEX),game.realm?.buffs.power||0);
  state.gun=state.mother.gun=gun;return gun;
}
// 切换地图或武器只回收位置；生命、出舱进度、弹药与冷却保持。
export function resetSpiderFormation(state) {
  if(!state)return;resetMechanicalFormation(state);resetMechanicalFormation({nodes:[state.mother]});
}
// 小蛛与母体共用核心成长，但仅执行近战，不能继承机械猫的远程枪槽。
export function spiderMinionWeapon(weapon) {
  return {...weapon,controller:'mechanical',attackKind:'melee',chargeTime:undefined,cooldown:undefined,
    fixedMelee:true,manualSpawn:true,freeMelee:true,armored:false,companionHp:weapon.minionHp,
    interval:weapon.minionInterval,range:weapon.minionRange,meleeReach:GAMEPLAY_VALUES.spider.minionMeleeReach,moveSpeed:weapon.minionMoveSpeed,emergeSpeed:GAMEPLAY_VALUES.spider.minionEmergeSpeed,impulse:GAMEPLAY_VALUES.spider.minionImpulse,impactScale:GAMEPLAY_VALUES.spider.minionImpactScale,
    windupTime:GAMEPLAY_VALUES.spider.minionWindupSeconds,swingTime:GAMEPLAY_VALUES.spider.minionSwingSeconds,guardRadius:GAMEPLAY_VALUES.spider.minionGuardRadius,
    damage:weapon.damage*weapon.minionDamageRatio};
}
// 侧腹出口必须真实可站立，堵塞时尝试另一侧，不能隔树或隔水瞬移出舱。
function deploySpiderling(game,node,mother) {
  node.arena=mother.arena;node.mapId=mother.mapId;node.ready=false;
  for(const side of [node.index%2?1:-1,node.index%2?-1:1]) {
    const x=mother.x+side*29,y=mother.y+18;
    if(blocked(x,y,9,game.trees,node))continue;
    node.x=x;node.y=y;node.ready=true;node.emerge=GAMEPLAY_VALUES.spider.emergeSeconds;node.exitSide=side;
    node.egress={x:x+side*72,y:y+30};return true;
  }
  return false;
}
// 离开母体后的伙伴保持身体间距，分离仍使用正式碰撞，不能推入水或树干。
function clearMotherSpace(game,state,dt) {
  const mother=state.mother;if(!mother.ready||mother.hp<=0)return;
  for(const node of state.nodes.filter(n=>n.active&&n.ready&&n.hp>0&&!(n.emerge>0))) {
    const point=nearest(node,mother),dx=point.x-mother.x,dy=point.y-mother.y,d=Math.hypot(dx,dy);
    if(d>=SPIDER_MOTHER_CLEARANCE)continue;
    const a=d>.1?Math.atan2(dy,dx):node.index*2.4,push=Math.min(SPIDER_MOTHER_CLEARANCE-d,90*dt);
    moveBody(node,Math.cos(a)*push,Math.sin(a)*push,WORLD,node.radius,game.trees);
  }
}
// 先判断供给，再扣除整笔能量；失败不重置计时或创造实体。
function spendEnergy(magazine,cost) {
  if(magazine.remaining>0||magazine.ammo<cost)return false;
  magazine.ammo-=cost;return true;
}
// 母体和小蛛均绑定当前来源，车载和守护支架不会借用手持队伍的状态。
export function updateSpider(game,dt,combat=true) {
  const weapon=game.weapon(),state=game.spider;if(weapon.controller!=='spider'||!state||game.story?.flags.summonsStored)return;
  const gun=syncSpiderGun(game,state,weapon),follow=advanceMechanicalFormation(game,state,dt);
  const mother=state.mother,energy=game.magazines[SPIDER_INDEX];mother.active=true;mother.previous={x:mother.x,y:mother.y};
  mother.clock=(mother.clock||0)+dt;mother.flash=Math.max(0,mother.flash-dt);mother.moving=false;state.hatch=Math.max(0,state.hatch-dt);
  if(mother.hp<=0) {
    if(combat){mother.deadTime=Math.max(0,mother.deadTime-dt);if(!mother.deadTime&&spendEnergy(energy,SPIDER_REPAIR_COST)){mother.hp=mother.maxHp;mother.ready=false;state.spawnTimer=weapon.spawnInterval;}}
  }
  if(mother.hp>0) {
    if(!mother.ready||mother.mapId!==game.player.mapId||mother.arena!==game.player.arena||worldDistance(mother,game.player)>weapon.range*GAMEPLAY_VALUES.mechanical.redeployRangeRatio)deployNode(game,mother,1);
    if(mother.ready) {
      const owner=nearest(game.player,mother),home={x:owner.x-82,y:owner.y+68};
      const escort=groundEscort(game,mother,weapon,follow);
      const target=combat&&!escort.urgent?summonTargetPool(game,mother,gun.weapon.range,{targetTrees:gun.weapon.targetTrees})[0]:null;
      const observing=observeLostTarget(game,mother,target,dt,{urgent:escort.urgent,disabled:!combat});
      mother.targetId=target?.id??null;mother.mode=observing?'observe':escort.urgent?'return':'escort';
      if(!observing)walkNode(game,mother,home,escort.speed,dt,SPIDER_ARRIVAL);
      if(combat) {
        updateMechanicalGun(game,mother,target,dt);
        const slot=state.nodes.slice(0,weapon.summonCount).find(n=>!n.spawned||n.hp<=0&&n.deadTime<=0);
        if(!slot)state.spawnTimer=weapon.spawnInterval;
        else {
          state.spawnTimer=Math.max(0,state.spawnTimer-dt);
          if(!state.spawnTimer) {
            if(energy.remaining<=0&&energy.ammo>=SPIDER_SPAWN_COST&&deploySpiderling(game,slot,mother)&&spendEnergy(energy,SPIDER_SPAWN_COST)) {
              slot.spawned=true;slot.deathExploded=false;slot.hp=slot.maxHp=weapon.minionHp;slot.cooldown=Math.max(GAMEPLAY_VALUES.spider.hatchAttackDelay,slot.cooldown);slot.mode='return';slot.targetId=null;
              state.hatch=1.2;state.hatchSide=slot.exitSide;state.spawnTimer=weapon.spawnInterval;
              game.onEvent('weapon-sound',{kind:'spider-hatch',source:'companion'});
              game.fx.add('spark',mother.x,mother.y+8,.3,{color:'#d7ebad',size:4});
            }
          }
        }
      }
    }
  }
  // 攻击指令围绕主人分配，不让母体的后侧跟随点缩短前方索敌或收拢十只小蛛。
  const local=Object.create(game);local.mechanical=state;local.player=game.player;
  local.weapon=()=>spiderMinionWeapon(weapon);local.damage=()=>Math.round(game.damage(SPIDER_INDEX)*weapon.minionDamageRatio);
  local.hit=game.hit.bind(game);local.float=game.float.bind(game);updateMechanical(local,dt,combat,follow);
  clearMotherSpace(game,state,dt);
}
