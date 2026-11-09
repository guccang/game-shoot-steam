// 改造预算与区域强度集中配置；旧存档均分时保持原厂能力。
export const REFIT_RULES={maxLevel:10,spacePerLevel:20,enginePerLevel:.1,minShare:5,maxShare:80};
export const VEHICLE_ZONES=[
 {id:'engine',name:'引擎区域',effect:'载重与牵引',color:'#b4cb91'},
 {id:'living',name:'空调生活区域',effect:'战车驻营休息效率',color:'#d8dfb0'},
 {id:'ammo',name:'弹仓区域',effect:'主炮装填效率',color:'#edd399'},
 {id:'secondary',name:'副武器区域',effect:'车载伙伴与外挂枪伤害',color:'#b7cebf'},
 {id:'storage',name:'储物区域',effect:'额定载重',color:'#d9c4a4'},
];
// 非法分区整体恢复均分，防止坏档产生额外空间。
export function validVehicleZones(z){return !!z&&VEHICLE_ZONES.every(({id})=>Number.isInteger(z[id])&&z[id]>=5&&z[id]<=80)&&VEHICLE_ZONES.reduce((n,{id})=>n+z[id],0)===100;}
// 等级上限与存档清洗共用，保留稳定区域标识。
export function normalizeVehicleRefit(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const level=n=>Number.isFinite(n)?Math.max(0,Math.min(10,Math.floor(n))):0;
 return {engineLevel:level(raw.engineLevel),chassisLevel:level(raw.chassisLevel),zones:Object.fromEntries(VEHICLE_ZONES.map(({id})=>[id,validVehicleZones(raw.zones)?raw.zones[id]:20]))};
}
// 区域空间决定功能强度，临时玩法不继承永久改造收益。
export function vehicleRefitStats(progress,index=progress.vehicleIndex){
 const r=normalizeVehicleRefit(progress.temporaryGrowth?{}:progress.logistics?.builds?.[index]?.refit),space=100+r.chassisLevel*20;
 const strength=Object.fromEntries(VEHICLE_ZONES.map(({id})=>[id,.5+space*r.zones[id]/4000]));
 return {...r,space,strength,power:(1+r.engineLevel*.1)*strength.engine};
}
// 增减某一区域时从其余区域轮流转移，始终保留100%且每区至少5%。
export function redistributeVehicleZones(zones,id,value){
 const next={...zones};if(!VEHICLE_ZONES.some(z=>z.id===id))return next;
 const target=Math.max(5,Math.min(80,Math.round(value))),delta=target-next[id],step=Math.sign(delta);
 let left=Math.abs(delta);
 while(left){let moved=false;for(const z of VEHICLE_ZONES){if(z.id===id||!left)continue;if(step>0?next[z.id]>5:next[z.id]<80){next[z.id]-=step;next[id]+=step;left--;moved=true;}}if(!moved)break;}
 return next;
}
