import {vehicleModel} from '../../config/vehicles.js';
// 独立演练使用正式战斗实例；所有奖励、弹药和试装变化只留在副本。
import {Game} from '../game.js';
import {leaveEnemyRemnant} from '../battle/enemy-manager.js';
import {validateProgress} from '../../progression/progress.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {TOWN_RESTORATIONS} from '../../config/town-restoration.js';
import {TRIAL_ORIGIN,TRIAL_RADIUS,weaponTrialScene} from '../../config/weapon-trial-scenes.js';
import {vehicleWeapon} from '../../config/vehicles.js';
// 保留玩家试装参数，移除所有持久玩法运行状态，避免主线或修复抢走演练时钟。
export function createWeaponTrialScene(progress,kind,index,reduced=false){
 const p=validateProgress(bindEconomy(structuredClone(progress),economyFor(progress)));
 // 创建 Game 前清除活动检查点，避免恢复剧情借装或消防转场后覆盖试驾车辆并截走战斗更新。
 p.arrival=null;p.patrol=null;p.realms.run=null;p.story.run=null;p.campDefense.run=null;p.fireDispatch.run=null;p.mapId='forest';p.campParking.owned=[];p.restoration.build=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 if(kind==='weapons'){p.weapon=index;p.weapons[index]=Math.max(1,p.weapons[index]);}else{p.vehicleIndex=index;p.vehicleHulls[index]=Math.max(1,p.vehicleHulls[index]);}
 const defense=kind==='weapons'&&index===18;
 if(defense){p.vehicleHulls[0]=Math.max(1,p.vehicleHulls[0]);p.vehicleIndex=0;}
 let seed=71;
 // 每次重来使用相同随机序列和目标，便于比较试装前后。
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const g=new Game(p,random);g.workshopTrial=true;g.reducedMotion=reduced;g.state='playing';
 g.trees=[];g.stumps=[];g.enemies=[];g.hazards=[];g.boss=null;g.bossReady=false;g.fireClock=1e9;
 g.updateWaves=()=>{};
 const realHurt=g.hurt.bind(g);let absorbed=0;
 // 防御演练使用真实格挡，借车耐久只在演练内保底，避免试玩死亡中断比较。
 g.hurt=defense?(amount,source)=>{const m=g.magazines[index],before=m.ammo;g.vehicle.hp=g.vehicle.maxHp;realHurt(amount,source);absorbed+=Math.max(0,before-m.ammo);}:()=>{};
 if(defense)g.vehicle.active=true;
 const rider=kind==='vehicle'&&vehicleModel(index).unarmed;
 if(kind==='vehicle'){g.vehicle.active=true;if(!rider){g.attack=()=>{};g.updateWeaponAbility=()=>{};}}
 // Game 初始化会补齐车体自带主炮，场景配置须读取实际试驾装备。
 const w=kind==='vehicle'&&!rider?vehicleWeapon(g.loadout,g.vehicle.weaponIndex):g.weapon();
 const spec=weaponTrialScene(w,kind),spawn={x:TRIAL_ORIGIN.x,y:TRIAL_ORIGIN.y+(spec.long?330:150)};
 Object.assign(g.player,spawn,{angle:-Math.PI/2,arena:{...TRIAL_ORIGIN,radius:TRIAL_RADIUS,terrain:'trial'}});
 let elapsed=0,batch=0,destroyed=0,damage=0,treesCut=0,targets=[],refillAt=null;
 const hit=g.hit.bind(g);
 // 统计真实扣血与击毁，不用预设 DPS 或假命中替代弹道结算。
 g.hit=(target,amount,critical,impact)=>{
  const before=Math.max(0,target.hp),result=hit(target,amount,critical,impact);
  damage+=Math.max(0,before-Math.max(0,target.hp));
  if(before>0&&target.hp<=0){
   if(target.type==='tree')treesCut++;
   else{destroyed++;leaveEnemyRemnant(g,target,impact);}
  }
  return result;
 };
 // 每批目标来自正式敌人生成器，保留受击、牵引、减速与死亡动画。
 function refill(){
  batch++;targets=[];refillAt=null;
  for(const [x,y] of spec.points){
   const e=g.spawnEnemy(0,0,{x:spawn.x+x,y:spawn.y+y});
   Object.assign(e,{hp:spec.hp,maxHp:spec.hp,speed:spec.speed||0,damage:spec.damage||0,level:0,workshopTarget:true,arena:{...g.player.arena}});
   targets.push(e);
  }
  if(spec.trees&&!g.trees.some(t=>t.hp>0))for(const [x,y] of [[-80,-60],[-135,-130],[-155,-215]])g.addTree(spawn.x+x,spawn.y+y,{variant:'round',size:.8});
 }
 refill();
 // 有效游玩时推进原移动、索敌、弹道、召唤和装填；UI负责暂停，不追赶后台时间。
 function advance(dt,input={x:0,y:0}){
  const step=Math.min(1/30,Math.max(0,dt));if(!step)return true;
  g.update(step,input);elapsed+=step;
  // 给死亡动作与伤害飘字留出完整时间，避免新满血靶覆盖同一帧的击毁反馈。
  if(!g.enemies.length){if(refillAt===null)refillAt=elapsed+1.2;if(elapsed>=refillAt)refill();}
  return true;
 }
 return {game:g,spec,spawn,kind,index,name:kind==='weapons'?g.weapon().name:'载具演练',advance,
  get absorbed(){return Math.round(absorbed);},get elapsed(){return elapsed;},get refillRemaining(){return refillAt===null?0:Math.max(0,refillAt-elapsed);},get batch(){return batch;},get destroyed(){return destroyed;},get damage(){return Math.round(damage);},get treesCut(){return treesCut;},get targets(){return targets;},get total(){return spec.points.length;}};
}
