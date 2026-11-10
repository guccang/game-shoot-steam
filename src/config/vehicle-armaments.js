import {REGIONAL_GUNS} from './regional-camps.js';
import {TREASURE_GUNS} from './treasure.js';
import { i18nText } from "../i18n/index.js";
// 车型专属主炮目录；固定编号独立于角色目录，旧 0–16 炮塔记录保留用于兼容。
import { WEAPONS } from './weapons.js';

export const VEHICLE_ARMAMENTS = [
  // 载具主炮恢复 adc572d 的冲量；连续命中正常叠加推力、腾空和受击打断。
  { id:'vehicle-machinegun', weaponIndex:17, hullIndex:0, name:i18nText("config.vehicle-armaments.b7fbf7f8e7"), description:i18nText("config.vehicle-armaments.2c946e341e"), damage:18, interval:.16, range:380, speed:900, pellets:1, spread:.055, magazineSize:60, reloadTime:2.4, impulse: 80, color:'#f4dca0', hitRadius:2, aimAssist:true, muzzle:43 },
  { id:'tank-125', weaponIndex:18, hullIndex:1, name:i18nText("config.vehicle-armaments.f02f73ddcf"), description:'125毫米主炮：230直击伤害，90范围45%溅射，1.8秒装填；可搭配营地增强弹。', damage:230, interval:1.8, range:560, speed:1050, pellets:1, spread:0, magazineSize:1, reloadTime:1.8, blastRadius:90, blastRatio:.45, impulse: 1150, impactScale:2.4, pierce:3, pierceDecay:.7, color:'#f9d38a', hitRadius:5, aimAssist:true, muzzle:78 },
  { id:'vehicle-vulcan', weaponIndex:19, hullIndex:2, name:i18nText("config.vehicle-armaments.160e4bed24"), description:i18nText("config.vehicle-armaments.88c46be7b6"), damage:12, interval:.065, range:420, speed:1000, pellets:1, spread:.09, magazineSize:120, reloadTime:3.1, impulse: 45, color:'#ffe7a7', hitRadius:2, aimAssist:true, muzzle:50 },
  { id:'hover-tide', weaponIndex:20, hullIndex:3, name:i18nText("config.vehicle-armaments.fba76ddf0d"), description:i18nText("config.vehicle-armaments.4b22010744"), damage:32, interval:.65, range:340, speed:680, pellets:2, spread:.18, magazineSize:18, reloadTime:2.4, impulse: 340, color:'#9ee2db', hitRadius:5, muzzle:46, water:true },
  // 重炮以更快的装填与宽范围高溅射承担清剿，保留单发重炮、慢车速与有限重弹的取舍。
  {id:'wolf-256',weaponIndex:21,hullIndex:6,name:'256毫米狼牙主炮',description:'红狼专属重炮：炮弹直击后引爆150米范围，周围敌人承受80%伤害；原厂装填2.2秒，适合压制密集敌群。',damage:700,interval:2.2,range:640,speed:1150,pellets:1,spread:0,magazineSize:1,reloadTime:2.2,impulse:1500,impactScale:3.4,hitRadius:8,aimAssist:true,muzzle:96,blastRadius:150,blastRatio:.8,color:'#f5bd83'},
  // 金杯专属召唤器沿用独立车载供给；伙伴只能近战，不能改挂远程枪。
  {id:'cat-crew',weaponIndex:22,hullIndex:7,name:'邻里猫小队',description:'邻里猫们带着扳手、勺子、叉子、树枝和棒球棍等日常用品逐只下车，齐心驱赶靠近的地面敌人，守护共同的营地；协同升级可增加队员。',controller:'mechanical',crew:true,fixedMelee:true,manualSpawn:true,freeMelee:true,armored:false,damage:38,interval:.85,range:340,meleeReach:28,moveSpeed:210,summonCount:4,companionHp:180,spawnInterval:1,windupTime:.18,swingTime:.24,emergeSpeed:150,guardRadius:100,magazineSize:12,reloadTime:4,resourceType:'energy',impulse:35,groundedPush:true,pushLimit:80,pellets:1,spread:0,color:'#d1b06e',muzzle:0},
 ...TREASURE_GUNS, ...REGIONAL_GUNS,
];
// 旧炮塔0–16及专属主炮17–22保持固定编号；新手持枪不能挤占既有主炮存档。
export const VEHICLE_WEAPONS = [...WEAPONS.slice(0,17), ...VEHICLE_ARMAMENTS];

// 每种车体都有独立专属主炮，非法车型仍返回空值。
export function nativeVehicleWeapon(index) { return Number.isInteger(index)&&index>=0?VEHICLE_ARMAMENTS.find(w=>w.hullIndex===index)||null:null; }

// 专属编号只从本目录识别，不能通过手持购买、套件或熟练度解锁。
export function isVehicleArmament(index) { return VEHICLE_ARMAMENTS.some(w=>w.weaponIndex===index); }

// 车体获得时免费补齐对应主炮一级，不覆盖已有炮塔成长或其他车体配置。
export function grantVehicleArmament(progress,index) {
  // 无原生主炮的车型不保留旧枪械挂载；消防水炮由消防任务独立控制。
  const w=nativeVehicleWeapon(index);
  if(w && progress.vehicleHulls[index])progress.vehicleWeapons[w.weaponIndex] ||= 1;
  progress.vehicleLoadouts[index]=progress.vehicleHulls[index]?(w?.weaponIndex??null):null;
}
