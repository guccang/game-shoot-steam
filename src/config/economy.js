import {TREASURE_VEHICLES} from './treasure.js';
import {legendaryUpgradeCost,equipmentLevelCap} from './legendary-workshop.js';
import {campProgress} from '../progression/camp/camp-level.js';
import taskContent from './content/mainline.json' with {type:'json'};
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { i18nText } from "../i18n/index.js";
// 共享经济合同：正式游戏、网页候选方案和命令行模拟读取同一份纯数据与规则。
import { MATERIAL_DROP, WEAPON_RECIPES, VEHICLE_RECIPES } from './materials.js';

const coinPrices = [0,1200,2400,650,1800,900,3000,2100,4200,7200,3400,2800,14000,10000,120,12000,15000,9000,4200];
const woodPrices = [0,420,850,220,650,320,1050,750,1450,2600,1200,1000,5000,3600,40,4200,5200,3200,520];
const gates = [0,2,4,1,3,1,5,3,6,10,5,4,18,16,0,17,18,0,0];
// 原版快照不改变稳定装备编号，可用于候选配置与旧经济对照。
const original = {
  version: 4, id: 'original', name: i18nText("config.economy.485fec2aac"), legacy: true,
  tree: { coins: 4, wood: 8 }, enemy: { coinScale: 1, woodRatio: .45 },
  boss: { coins: 180, wood: 85, parts: 8, crystal: 6, core: 1, firstCore: 1 },
  drops: {parts:{...MATERIAL_DROP.parts,elite:3},crystal:{...MATERIAL_DROP.crystal,elite:2}},
  realms: { coinsBase: 25, coinsStage: 5, woodBase: 10, woodStage: 2,
    parts: { rogue: 1, tower: 1, guardian: 3 }, crystal: { rogue: 2, tower: 1, guardian: 0 }, core: 1, tierScale: 0 },
  upgrades: { exponent: 1, woodRatio: 15/35, catchup: 1,
    base: { heroes: 35, weapons: 35, turret: 35, vehicle: 120, part: 35 },
    stages: [1,1,1,1], woodCeilings:{heroes:1e7,weapons:1e7,turret:1e7,vehicle:1e7,part:1e7}, ceilings:{heroes:1e7,weapons:1e7,turret:1e7,vehicle:1e7,part:1e7} },
  growth: { weapon: 1.08, milestone: 1.25, heroAttack: 1.04, heroMilestone: 1.12, heroHealth: 1.08, armor: 1.08, survivalMilestone: 1.2 },
  challenges: { forest: [1,3,6,10,18], realm: [5,10,15,25,40], forestWavePerBoss: 0 },
  weapons: WEAPON_RECIPES.map((r,i)=>({coins:coinPrices[i],wood:woodPrices[i],parts:r.parts,crystal:r.crystal,core:r.core,gate:gates[i]})),
  vehicles: VEHICLE_RECIPES.map((r,i)=>({coins:[0,2400,4800,3600,8000,600,48000,18000,2400][i],wood:[0,900,1800,1300,3040,240,18000,6840,912][i],parts:r.parts,crystal:r.crystal,core:r.core,gate:[0,4,8,6,0,0,0,0,0][i]})),
};
// 清缴预算独立于怪物数量；任务奖励按稳定ID关联，候选方案可逐项编辑。
original.clearing={perKill:false,coins:[250,250,300,300,400],woodRatio:.45,attempts:[4,4,5,5,6],groupGrowth:.05,maxGrowth:1.5};
original.taskRewards=Object.fromEntries(taskContent.tasks.map(t=>[t.id,Object.fromEntries(['coins','wood','parts','crystal','core'].map(k=>[k,t.reward[k]||0]))]));
original.turrets=structuredClone(original.weapons.slice(0,17));
Object.assign(original.turrets[0],{coins:120,wood:45,parts:4});
Object.assign(original.turrets[14],{coins:1800,wood:600,parts:35,crystal:0,core:1});
// 探索车不可购买，但维修与装甲仍按明确的车体估值计费。
original.vehicles.push(...TREASURE_VEHICLES.map(v=>({coins:v.value,wood:0,parts:0,crystal:0,core:0,gate:0})));
const recommended = structuredClone(original);
Object.assign(recommended,{id:'recommended',name:i18nText("config.economy.1c5386d7c3"),legacy:false});
recommended.upgrades = {exponent:1.35,woodRatio:.25,catchup:.3,
  base:{heroes:35,weapons:35,turret:40,vehicle:80,part:50},stages:[1,1,1.1,1.2],
  // 币木分别封顶：首次强化仍为35金币，后期精修与附属部件分档，木材不随金币同比膨胀。
  woodCeilings:{heroes:80,weapons:100,turret:100,vehicle:140,part:80},
  ceilings:{heroes:1200,weapons:1800,turret:1800,vehicle:2400,part:1200}};
recommended.realms = {coinsBase:225,coinsStage:25,woodBase:100,woodStage:11,
  parts:{rogue:2,tower:3,guardian:12},crystal:{rogue:12,tower:3,guardian:2},core:1,tierScale:.3};
recommended.challenges.forestWavePerBoss = .75;
recommended.enemy.coinScale=1.4;
// 资源职责分离：采集只产木材，怪物及领主直接掉落不产木材；结算奖励独立配置。
recommended.tree.coins=0;recommended.enemy.woodRatio=0;recommended.boss.wood=0;
// 清缴保留扩容前每份28金币的预算基数；实际怪群分摊整波预算，材料次数不放大。
recommended.clearing={perKill:true,coins:[28,28,28,28,28],woodRatio:0,attempts:[4,4,5,5,6],groupGrowth:0,maxGrowth:1};
// 以八块田的净收入规划新玩法购买档位；木材独立定价，不随长周期作物金币同比抬高。
// 万元以上的高级武器金币价统一翻倍，维持脉冲、无人机、核心、浮游炮和蜘蛛的价格梯度。
const prices = [0,1800,4800,1200,3600,1500,6500,4200,8000,30000,5500,5200,48000,36000,120,44000,56000,20000,4200];
const farmWoodPrices=[0,240,600,160,440,200,800,520,960,1600,680,640,2400,1920,40,2240,2800,1200,520];
recommended.weapons.forEach((r,i)=>{
  r.coins=prices[i];r.wood=farmWoodPrices[i];
  if(i!==14){r.parts=Math.ceil(r.parts*1.8);r.crystal=Math.ceil(r.crystal*1.8);}
  r.core=i>=12&&i!==14?r.core*2:r.core;
});
recommended.vehicles.forEach((r,i)=>{
  // 直升机按飞行机动与持续火力提高首次购买币木成本，稀有材料沿用原档位。
  r.coins=[600,4800,20000,7800,8000,600,42000,15000,2400][i]??r.coins;r.wood=[160,720,2000,1120,960,240,3200,1440,320][i]??r.wood;
  if(i<4){r.parts=Math.ceil(r.parts*1.6);r.crystal=Math.ceil(r.crystal*1.6);}
});
recommended.turrets=structuredClone(recommended.weapons.slice(0,17));
Object.assign(recommended.turrets[0],{coins:120,wood:45,parts:4});
Object.assign(recommended.turrets[14],{coins:1800,wood:600,parts:35,crystal:0,core:1});
// 深冻结基线，任何编辑必须先创建候选副本。
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const ORIGINAL_ECONOMY = freeze(original);
export const RECOMMENDED_ECONOMY = freeze(recommended);
export const RESOURCE_KEYS = ['coins','wood','parts','crystal','core'];
export const ECONOMY_LABELS = {coins:i18nText("balance.app.bbece6f829"),wood:i18nText("balance.app.30a9333b4f"),parts:i18nText("balance.help.b6be82f97f"),crystal:i18nText("balance.help.c16229837e"),core:i18nText("balance.app.a8a88ddbea")};

// 候选配置通过不可枚举属性隔离；序列化游戏进度永远不会保存调参数据。
export function bindEconomy(progress, config) {
  Object.defineProperty(progress,'economyConfig',{value:config,configurable:true});
  return progress;
}
// 局内装备可通过原型继承方案，正式存档缺省使用已验收配置。
export function economyFor(progress){return progress?.economyConfig || RECOMMENDED_ECONOMY;}

// 严格检查导入形状、有限数值与边界，拒绝错位目录、负费用与非法倍率。
export function validateEconomy(raw){
  if(!raw||raw.version!==4)throw Error(i18nText("config.economy.dc423d1ca5"));
  const value=structuredClone(raw);
  // 按完整模板验证，缺项不能悄悄使用旧值。
  function visit(v,t,path){
    if(typeof t==='number'){if(!Number.isFinite(v)||v<0||v>1e7)throw Error(i18nText("config.economy.0884aa25bb", { p0: (path) }));return;}
    if(typeof t==='boolean'){if(typeof v!=='boolean')throw Error(i18nText("config.economy.bb18b3d377", { p0: (path) }));return;}
    if(typeof t==='string'){if(typeof v!=='string'||v.length>100)throw Error(i18nText("config.economy.c6a28207ac", { p0: (path) }));return;}
    if(!v||typeof v!=='object'||Array.isArray(v)!==Array.isArray(t))throw Error(i18nText("config.economy.27e88fe487", { p0: (path) }));
    if(Array.isArray(t)&&v.length!==t.length)throw Error(i18nText("config.economy.14a2b8e145", { p0: (path) }));
    for(const key of Object.keys(v))if(!Object.hasOwn(t,key))throw Error(i18nText("config.economy.3c5fc80faf", { p0: (path), p1: (key) }));
    for(const key of Object.keys(t))visit(v[key],t[key],path+'.'+key);
  }
  visit(value,RECOMMENDED_ECONOMY,i18nText("config.economy.148d195e21"));
  for(const r of Object.values(value.drops)){
    if(r.chance>1||r.favoredChance>1||!Number.isInteger(r.pity)||r.pity<1||r.pity>1000||
      r.favoredPity!==undefined&&(!Number.isInteger(r.favoredPity)||r.favoredPity<1||r.favoredPity>1000))throw Error(i18nText("config.economy.230d6177d1"));
  }
  for(const list of [value.weapons,value.vehicles,value.turrets])for(const row of list)
    for(const n of Object.values(row))if(!Number.isInteger(n))throw Error(i18nText("config.economy.93a221b05e"));
  for(const list of [value.challenges.forest,value.challenges.realm])
    if(list.some((n,i)=>!Number.isInteger(n)||n<1||(i>0&&n<=list[i-1])))throw Error(i18nText("config.economy.1cc14a02e2"));
  if(value.upgrades.catchup>1||value.upgrades.catchup<.05||value.upgrades.exponent<1||value.upgrades.exponent>3||
    Object.values(value.upgrades.base).some(n=>n<1)||Object.values(value.upgrades.woodCeilings).some(n=>!Number.isInteger(n)||n<1)||Object.values(value.upgrades.ceilings).some(n=>!Number.isInteger(n)||n<1)||value.upgrades.stages.some(n=>n<.1||n>10))throw Error(i18nText("config.economy.f79aa2f03b"));
  if(Object.values(value.growth).some(n=>n<1||n>1.5))throw Error(i18nText("config.economy.9eeb1d9490"));
  if(value.enemy.coinScale<.05||value.enemy.coinScale>10||value.challenges.forestWavePerBoss>5)throw Error(i18nText("config.economy.b815b2d67a"));
  for(const group of [value.tree,value.boss,value.realms.parts,value.realms.crystal])if(Object.values(group).some(n=>!Number.isInteger(n)))throw Error(i18nText("config.economy.78d6c00cb2"));
  for(const key of ['coinsBase','coinsStage','woodBase','woodStage','core'])if(!Number.isInteger(value.realms[key]))throw Error(i18nText("config.economy.0c2f08c2ed"));
  for(const r of Object.values(value.drops))if(!Number.isInteger(r.elite))throw Error(i18nText("config.economy.285139b22a"));
  for(const n of [...value.clearing.coins,...value.clearing.attempts,...Object.values(value.taskRewards).flatMap(Object.values)])if(!Number.isInteger(n))throw Error('清缴与任务奖励须为非负整数');
  if(value.clearing.groupGrowth>1||value.clearing.maxGrowth<1||value.clearing.maxGrowth>5||value.clearing.woodRatio>2)throw Error('清缴预算倍率超出范围');
  return freeze(value);
}

// 历史战绩分档仅供旧报告对照，不参与营地等级或购买。
export function challengeTier(progress,config=economyFor(progress)){
  const best=Math.max(0,...['rogue','tower','guardian'].map(k=>progress.realms?.records?.[k]?.best||0));
  let tier=0;
  config.challenges.forest.forEach((n,i)=>{if((progress.bosses||0)>=n||best>=config.challenges.realm[i])tier=i+1;});
  return tier;
}
// 保留旧展示入口名称，返回当前营地经验和折扣快照。
export function challengeProgress(progress,camp) {return campProgress(progress,camp);}
// 配方原门槛映射到五个阶级，保持原目录相对先后顺序。
export function requiredTier(gate,config=RECOMMENDED_ECONOMY){
  if(!gate)return 0;
  const i=config.challenges.forest.findIndex(n=>n>=gate);
  return i<0?config.challenges.forest.length:i+1;
}
// 兼容旧购买调用方，战绩不再限制购买。
export function hasChallenge(){return true;}
// 展示具体的两条获取路径，不将非消耗资格误标为库存。
export function challengeDescription(gate,config=RECOMMENDED_ECONOMY){
  if(!gate)return i18nText("config.economy.f738a02ffd");
  if(config.legacy)return i18nText("config.economy.8dbf8a3321", { p0: (gate) });
  const tier=requiredTier(gate,config);
  return i18nText("config.economy.e19b419da1", { p0: (tier), p1: (config.challenges.forest[tier-1]), p2: (config.challenges.realm[tier-1]) });
}

// 主等级与附属部件分别报价；折扣只作用于同类最高等级减二以内的主等级。
export function economyUpgradeQuote(progress,kind,index,level,part=null){
  const legendary=legendaryUpgradeCost(kind,level,part);if(legendary)return {cost:legendary,original:{...legendary},discount:1};
  const c=economyFor(progress),primary=!part||['damage','armor'].includes(part);
  const field={heroes:'heroes',weapons:'weapons',turret:'vehicleWeapons',vehicle:'vehicleHulls'}[kind];
  const highest=Math.max(1,...(progress?.[field]||[])),discount=!c.legacy&&primary&&level+1<=highest-GAMEPLAY_VALUES.growth.catchupGap?c.upgrades.catchup:1;
  const scale=kind==='vehicle'&&index>0?GAMEPLAY_VALUES.growth.advancedVehicleCostScale:1;
  if(c.legacy&&!primary){
    const cost={coins:GAMEPLAY_VALUES.growth.legacyPartCoins*level,wood:GAMEPLAY_VALUES.growth.legacyPartWood*level};
    return {cost,original:{...cost},discount:1};
  }
  const base=c.upgrades.base[primary?kind:'part']*(kind==='vehicle'?scale:1);
  const stage=c.upgrades.stages[Math.min(c.upgrades.stages.length-1,Math.floor(level/GAMEPLAY_VALUES.growth.milestoneLevels))];
  const amount=Math.min(base*Math.pow(Math.max(1,level),c.upgrades.exponent)*stage,c.upgrades.ceilings?.[primary?kind:'part']??1e7);
  const coins=Math.ceil(amount*discount);
  const woodCap=c.upgrades.woodCeilings[primary?kind:'part'];
  const wood=c.legacy?Math.round((kind==='vehicle'?GAMEPLAY_VALUES.growth.legacyVehicleWood*scale:GAMEPLAY_VALUES.growth.legacyPartWood)*level):Math.min(Math.ceil(coins*c.upgrades.woodRatio),Math.ceil(woodCap*discount));
  const originalCoins=Math.ceil(amount);
  return {cost:{coins,wood},original:{coins:originalCoins,wood:c.legacy?wood:Math.min(Math.ceil(originalCoins*c.upgrades.woodRatio),woodCap)},discount};
}
// 扣费沿用同一报价中的实际价格，展示原价不改变取整顺序或支出。
export function economyUpgradeCost(progress,kind,index,level,part=null){
  return economyUpgradeQuote(progress,kind,index,level,part).cost;
}
// 用于界面解释折扣，不从费用反推以免舍入产生误导。
export function upgradeHint(progress,kind,index,level,part=null){
  if(legendaryUpgradeCost(kind,level,part))return '传奇锻造 · 高阶资源投入';
  const c=economyFor(progress),{discount}=economyUpgradeQuote(progress,kind,index,level,part);
  const discounted=discount<1;
  const primary=!part||['damage','armor'].includes(part),category=primary?kind:'part';
  const cap=c.upgrades.ceilings?.[category];
  const capped=!c.legacy&&Number.isFinite(cap)&&c.upgrades.base[category]*(kind==='vehicle'&&index>0?GAMEPLAY_VALUES.growth.advancedVehicleCostScale:1)*Math.pow(level,c.upgrades.exponent)*c.upgrades.stages[Math.min(c.upgrades.stages.length-1,Math.floor(level/GAMEPLAY_VALUES.growth.milestoneLevels))]>=cap;
  return [discounted?`追赶${Number((discount*10).toFixed(2))}折`:'',capped?i18nText("config.economy.3ccffab9cb"):'',level<GAMEPLAY_VALUES.progress.maxEquipmentLevel&&(level+1)%GAMEPLAY_VALUES.growth.milestoneLevels===0?i18nText("config.economy.273b5df681"):''].filter(Boolean).join(' · ');
}
// 永久武器前三级保留原强反馈，之后常规8%、关键等级25%；远征无限等级保留线性公式。
export function weaponGrowth(level,progress){
  const c=economyFor(progress),l=Math.max(1,level||1);
  if(c.legacy||progress?.temporaryGrowth)return 1+(l-1)*GAMEPLAY_VALUES.growth.earlyWeaponPerLevel;
  if(l<=GAMEPLAY_VALUES.growth.linearThroughLevel)return 1+(l-1)*GAMEPLAY_VALUES.growth.earlyWeaponPerLevel;
  let value=1+(GAMEPLAY_VALUES.growth.linearThroughLevel-1)*GAMEPLAY_VALUES.growth.earlyWeaponPerLevel;
  for(let n=GAMEPLAY_VALUES.growth.linearThroughLevel+1;n<=Math.min(equipmentLevelCap(progress,'weapons'),l);n++)value*=n%GAMEPLAY_VALUES.growth.milestoneLevels===0?c.growth.milestone:c.growth.weapon;
  return value;
}
// 角色攻击是辅助成长，保持前期原倍率，关键等级再强化。
export function heroGrowth(level,progress){
  const c=economyFor(progress),l=Math.max(1,level||1);
  if(c.legacy)return 1+(l-1)*GAMEPLAY_VALUES.growth.earlyHeroPerLevel;
  let value=1+Math.min(GAMEPLAY_VALUES.growth.linearThroughLevel-1,l-1)*GAMEPLAY_VALUES.growth.earlyHeroPerLevel;
  for(let n=GAMEPLAY_VALUES.growth.linearThroughLevel+1;n<=Math.min(GAMEPLAY_VALUES.progress.maxEquipmentLevel,l);n++)value*=n%GAMEPLAY_VALUES.growth.milestoneLevels===0?c.growth.heroMilestone:c.growth.heroAttack;
  return value;
}
// 手持枪与独立车载主炮都只叠加一次装备等级和出战猫等级，不叠加车体等级。
export function equipmentAttackGrowth(equipmentLevel,heroLevel,progress){
 return weaponGrowth(equipmentLevel,progress)*heroGrowth(heroLevel,progress);
}
// 生命和装甲保留原有线性下限，关键等级额外提升保证不会越升越脆。
export function heroHealth(base,level,progress){
  const c=economyFor(progress),l=Math.max(1,level||1),old=base+(l-1)*GAMEPLAY_VALUES.growth.earlyHealthPerLevel;
  if(c.legacy)return old;
  let hp=base+Math.min(GAMEPLAY_VALUES.growth.linearThroughLevel-1,l-1)*GAMEPLAY_VALUES.growth.earlyHealthPerLevel;
  for(let n=GAMEPLAY_VALUES.growth.linearThroughLevel+1;n<=Math.min(GAMEPLAY_VALUES.progress.maxEquipmentLevel,l);n++)hp*=n%GAMEPLAY_VALUES.growth.milestoneLevels===0?c.growth.survivalMilestone:c.growth.heroHealth;
  return Math.round(Math.max(old,hp));
}
// 车体成长不改变角色生命、弹药或冷却；局内仍使用原始线性耐久。
export function armorHealth(base,growth,level,progress){
  const c=economyFor(progress),l=Math.max(1,level||1),old=base+(l-1)*growth;
  if(c.legacy||progress?.temporaryGrowth)return old;
  let hp=base+Math.min(GAMEPLAY_VALUES.growth.linearThroughLevel-1,l-1)*growth;
  for(let n=GAMEPLAY_VALUES.growth.linearThroughLevel+1;n<=Math.min(GAMEPLAY_VALUES.progress.maxEquipmentLevel,l);n++)hp*=n%GAMEPLAY_VALUES.growth.milestoneLevels===0?c.growth.survivalMilestone:c.growth.armor;
  return Math.round(Math.max(old,hp));
}
// 森林币木奖励与游戏击杀结算共用；不负责材料抽取与重复死亡保护。
export function forestReward(type,coins=15,progress){
  const c=economyFor(progress);
  if(type==='tree')return {...c.tree};
  if(type==='boss')return {coins:0,wood:c.boss.wood};
  const amount=Math.round(Math.max(0,coins)*c.enemy.coinScale);
  return {coins:0,wood:Math.ceil(amount*c.enemy.woodRatio)};
}

// 主线界面、正式交付和模拟统一读取当前候选的稳定任务奖励。
export function mainlineReward(task,progress){
 const config=economyFor(progress),reward={...config.taskRewards[task.id]};
 // 后期不再强制购装，尚未领取的奖励统一使用当前方案；不回收已领取资源。
 return reward;
}
