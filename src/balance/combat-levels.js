// 等级平衡采样共用正式属性和靶场，不用面板DPS冒充带装填、弹道的战斗时间。
import {freshProgress} from '../progression/progress.js';
import {weaponGrowth,heroGrowth,heroHealth} from '../config/economy.js';
import {weaponDamage} from '../config/weapon-mods.js';
import {HEROES} from '../config/heroes.js';
import {WEAPONS} from '../config/weapons.js';
import {vehicleDamage,vehicleMaxHp,COLLECTED_VEHICLES} from '../config/vehicles.js';
import {grantVehicleArmament,nativeVehicleWeapon,VEHICLE_WEAPONS} from '../config/vehicle-armaments.js';
import {enemyLevelHealth} from '../config/combat-levels.js';
import {createWorkshopTrial} from '../core/workshop-trial.js';

// 基准使用栗子、无熟练度和改装、一级附属部件；车体与主炮分开设置。
export function levelLoadout({hero=0,heroLevel=1,weapon=0,weaponLevel=1,vehicle=0,turretLevel=1,hullLevel=1}={}){
 const p=freshProgress();p.hero=hero;p.heroes[hero]=heroLevel;p.weapon=weapon;p.weapons[weapon]=weaponLevel;
 p.vehicleIndex=vehicle;p.vehicleHulls[vehicle]=hullLevel;grantVehicleArmament(p,vehicle);
 const turret=p.vehicleLoadouts[vehicle];if(turret!==null)p.vehicleWeapons[turret]=turretLevel;
 return p;
}

// 同级数表保留HP、单发伤害、纯等级倍率及装甲，便于分清升级的实际收益。
export function combatLevelTable(){
 return Array.from({length:20},(_,i)=>{
  const level=i+1,p=levelLoadout({heroLevel:level,weaponLevel:level,turretLevel:level,hullLevel:level});p.weapons[2]=level;
  const hp=enemyLevelHealth(level),pistol=weaponDamage(p,0),gatling=weaponDamage(p,2),heroHp=heroHealth(HEROES[0].hp,level,p);
  return {level,hp,eliteHp:enemyLevelHealth(level,2.25),weaponScale:weaponGrowth(level,p),heroScale:heroGrowth(level,p),
   pistol,gatling,machinegun:vehicleDamage(p,17),heroHp,hullHp:vehicleMaxHp(p,heroHp),pistolHits:Math.ceil(hp/pistol),gatlingHits:Math.ceil(hp/gatling)};
 });
}

// 每种枪和车的全等级面板采样；无主炮载具明确记空，不能用车体等级冒充火力。
export function equipmentLevelTable(){
 const levels=Array.from({length:20},(_,i)=>i+1);
 return {weapons:WEAPONS.map((w,index)=>({id:w.id,name:w.name,damage:levels.map(level=>weaponDamage(levelLoadout({weapon:index,weaponLevel:level,heroLevel:5}),index))})),
  vehicles:COLLECTED_VEHICLES.map((v,index)=>({id:v.id,name:v.name,turret:nativeVehicleWeapon(index)?.id|| (index===4?'pistol':null),
   damage:levels.map(level=>{const p=levelLoadout({vehicle:index,turretLevel:level,hullLevel:level,heroLevel:5});return p.vehicleLoadouts[index]===null?null:vehicleDamage(p,p.vehicleLoadouts[index]);})})),
  heroes:HEROES.map((h,index)=>({id:h.id,name:h.name,pistol:levels.map(level=>weaponDamage(levelLoadout({hero:index,heroLevel:level,weaponLevel:5}),0))}))};
}

// 固定普通目标的HP和站位，保留真实射速、加特林起转、装填、飞行、命中和死亡结算。
export function measureLevelFight(options){
 const {kind='weapons',weapon=0,vehicle=0,enemyLevel=20,health=enemyLevelHealth(enemyLevel),seconds=120,critical=false}=options;
 const p=levelLoadout(options),trial=createWorkshopTrial(p,kind,kind==='vehicle'?vehicle:weapon,false,{count:1,hp:health});
 if(!critical)trial.game.random=()=>.5;
 let hits=0,shots=0,firstKillSeconds=null;const target=trial.game.enemies[0],hit=trial.game.hit.bind(trial.game);
 trial.game.onEvent=type=>{if(type==='shot')shots++;};
 // 只记录目标第一次死亡，后续靶场补靶不会污染击杀发数。
 trial.game.hit=(body,amount,...rest)=>{const before=body.hp;hit(body,amount,...rest);if(body===target&&before>body.hp&&before>0){hits++;if(body.hp<=0&&firstKillSeconds===null)firstKillSeconds=trial.elapsed+1/60;}};
 for(let i=0;i<seconds*60&&firstKillSeconds===null;i++)trial.advance(1/60);
 const index=p.vehicleLoadouts[vehicle];
 return {kind,weapon:kind==='vehicle'?VEHICLE_WEAPONS[index]?.id:WEAPONS[weapon].id,weaponLevel:options.weaponLevel??1,
  turretLevel:options.turretLevel??1,heroLevel:options.heroLevel??1,enemyLevel,hp:health,critical,hits,shots,
  damage:kind==='vehicle'?vehicleDamage(p,index):weaponDamage(p,weapon),seconds:firstKillSeconds===null?null:Number(firstKillSeconds.toFixed(3))};
}
