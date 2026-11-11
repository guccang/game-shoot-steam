// SE 装置目录：重量参与正式载荷，每车同类限一套。
export const VEHICLE_SE={
 flare:{name:'空投照明器',mass:90,coins:500,description:'安装于车尾，夜间自动发射库存照明弹，重型坦克原厂安装。'},
 autopilot:{name:'自动驾驶仪',mass:160,coins:1800,description:'沿任务或地图选定目标自动寻路；手动移动立即接管。'},
 combat:{name:'战术巡战仪',mass:240,coins:2600,description:'在指定圆圈内接敌、避弹，手动走位时持续战斗，主炮沿用真实弹药与装填。营门兽潮期间暂停巡战。'},
 rocket:{name:'蜂巢火箭架',mass:475,coins:3200,description:'发现射程内敌人自动发射双联火箭，每枚直击伤害为当前主炮伤害的3倍，消耗2枚重炮弹，冷却8秒。'},
 smoke:{name:'烟雾弹',mass:120,coins:1800,description:'开启后持续释放随车烟幕，使敌方远程攻击无法锁定车体及烟幕内的伙伴。已发射的弹丸仍可命中。'},
 mine:{name:'布雷器',mass:260,coins:2400,description:'发现附近敌人时，每4秒在车边布设一枚地雷。地雷留存25秒，同时最多3枚，敌人靠近即引爆，造成240点范围伤害。'},
 protection:{name:'主动防护系统',mass:280,coins:2800,description:'自动拦截飞向载具的敌方弹丸，基础冷却2秒，每次拦截一枚，无需弹药。'},
 shield:{name:'脉冲防护罩',mass:375,coins:3000,description:'基础容量500点，吸收来袭伤害，受击后等待8秒，再以每秒18点恢复；卸装不重置能量。'},
};
// 每辆车独立保存装置改装次数，基础型为零级，最高三级。
export const SE_MAX_UPGRADE=3;
export const SE_UPGRADE_EFFECTS={smoke:'烟幕覆盖半径 +10',mine:'地雷爆炸伤害 +60',protection:'拦截冷却 −0.4 秒',shield:'护盾容量 +150 HP',autopilot:'自动巡航速度 +10%',combat:'来弹预判时间 +0.15 秒',rocket:'齐射冷却 −1 秒',flare:'最大光照半径 +15%'};
// 费用随装置原价和目标改装等级递增。
export function seUpgradeCost(key,level){return Math.ceil(VEHICLE_SE[key].coins*(level+1)/2);}
// 旧档或尚未改装的装置采用基础性能。
export function seLevel(build,key){return build?.levels?.[key]||0;}
// 统一提供护盾容量给战斗、装置面板和读档校验。
export function seShieldMax(build){return 500+150*seLevel(build,'shield');}
// 缺失记录只赠送重型坦克原厂照明器；明确卸下的空数组永远保持为空。
export function seBuild(progress,hull){return progress.vehicleSE?.[hull]??{owned:hull===1?['flare']:[],installed:hull===1?['flare']:[],disabled:[],shield:0,shieldWait:0,rocketWait:0,radius:250};}
// 读取与校验共用白名单，存档不允许未知装置、重复叠加或非法计时。
export function normalizeVehicleSE(raw,count){
 return Array.from({length:count},(_,h)=>{
  const build=raw?.[h]??seBuild({},h);
  const ids=list=>[...new Set(Array.isArray(list)?list:[])].filter(key=>Object.hasOwn(VEHICLE_SE,key));
  const clamp=(value,max)=>Number.isFinite(value)?Math.max(0,Math.min(max,value)):0;
  const owned=ids(build.owned),installed=ids(build.installed).filter(key=>owned.includes(key));
  const levels=Object.fromEntries(owned.map(key=>[key,Math.floor(clamp(build.levels?.[key],SE_MAX_UPGRADE))]));
  // 引入改装等级前的护盾上限为180，迁移时保留剩余能量比例。
  const shield=build.levels?clamp(build.shield,seShieldMax({levels})):Math.round(clamp(build.shield,180)*500/180);
  return {owned,installed,levels,disabled:ids(build.disabled).filter(key=>installed.includes(key)),shield,
   protectionWait:clamp(build.protectionWait,2),shieldWait:clamp(build.shieldWait,8),rocketWait:clamp(build.rocketWait,8),radius:[150,250,400].includes(build.radius)?build.radius:250};
 });
}
// 装置关闭仍占重量；只有拆卸回工坊才减重。
export function seMass(p,h){return seBuild(p,h).installed.reduce((n,k)=>n+(VEHICLE_SE[k]?.mass||0),0);}
// 巡林和营门兽潮使用自有车辆的 SE，借用装备的其他活动隔离永久装置。
export function usesPersonalSE(g){return !g.realm&&!g.story&&!g.fireActive&&!g.workshopTrial&&!g.arrivalCinematic;}
// 当前车体可用且装置已安装、已开启时才产生战斗效果。
export function seActive(g,key){
 // 兽潮仅暂停战术巡战仪的接管，离场后继续沿用玩家保存的开关。
 if(g.campDefense&&key==='combat')return false;
 if(!g.vehicle?.active||!(g.vehicle.hp>0)||!g.progress.vehicleHulls?.[g.vehicle.index]||!usesPersonalSE(g))return false;
 const build=seBuild(g.progress,g.vehicle.index);
 return build.installed.includes(key)&&!build.disabled.includes(key);
}
