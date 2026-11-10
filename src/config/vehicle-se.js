// SE 装置目录：重量参与正式载荷，每车同类限一套，不限制不同装置组合。
export const VEHICLE_SE={
 flare:{name:'空投照明器',mass:18,coins:500,description:'夜间自动发射库存照明弹，重型坦克原厂安装。'},
 autopilot:{name:'自动驾驶仪',mass:32,coins:1800,description:'沿任务或地图选定目标自动寻路；手动移动立即接管。'},
 combat:{name:'战术巡战仪',mass:48,coins:2600,description:'在指定圆圈内接敌、避弹和自动战斗，主炮沿用真实弹药与装填。'},
 rocket:{name:'蜂巢火箭架',mass:95,coins:3200,description:'发现射程内敌人自动发射双联火箭，消耗2枚重炮弹，冷却8秒。'},
 shield:{name:'脉冲防护罩',mass:75,coins:3000,description:'吸收180点伤害，受击后等待8秒，再以每秒18点恢复；卸装不重置能量。'},
};
// 缺失记录只赠送重型坦克原厂照明器；明确卸下的空数组永远保持为空。
export function seBuild(progress,hull){return progress.vehicleSE?.[hull]??{owned:hull===1?['flare']:[],installed:hull===1?['flare']:[],disabled:[],shield:0,shieldWait:0,rocketWait:0,radius:250};}
// 读取与校验共用白名单，存档不允许未知装置、重复叠加或非法计时。
export function normalizeVehicleSE(raw,count){return Array.from({length:count},(_,h)=>{const b=raw?.[h]??seBuild({},h),ids=a=>[...new Set(Array.isArray(a)?a:[])].filter(k=>Object.hasOwn(VEHICLE_SE,k)),owned=ids(b.owned),installed=ids(b.installed).filter(k=>owned.includes(k)),num=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;return {owned,installed,disabled:ids(b.disabled).filter(k=>installed.includes(k)),shield:num(b.shield,180),shieldWait:num(b.shieldWait,8),rocketWait:num(b.rocketWait,8),radius:[150,250,400].includes(b.radius)?b.radius:250};});}
// 装置关闭仍占重量；只有拆卸回工坊才减重。
export function seMass(p,h){return seBuild(p,h).installed.reduce((n,k)=>n+(VEHICLE_SE[k]?.mass||0),0);}
// 仅自有车辆装置参与战斗，活动借用配置不调用永久设备。
export function seActive(g,key){return !!g.vehicle?.active&&g.vehicle.hp>0&&!!g.progress.vehicleHulls?.[g.vehicle.index]&&!g.realm&&!g.story&&!g.fireActive&&!g.campDefense&&!g.workshopTrial&&!g.arrivalCinematic&&seBuild(g.progress,g.vehicle.index).installed.includes(key)&&!seBuild(g.progress,g.vehicle.index).disabled.includes(key);}
