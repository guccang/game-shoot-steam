// 同一重量计算供背包、工坊、行驶与牵引使用，不根据界面缓存判断能否移动。
import {ammunitionMass,SUPPLY_ITEMS,AMMO_TYPES,GUN_MASSES,vehicleFaults} from '../config/supplies.js';
import {VEHICLE_WEAPONS} from '../config/vehicle-armaments.js';
import {ammoKind} from '../config/supplies.js';
import {VEHICLE_LOADS,LOAD_RULES,WEAPON_MASSES,CROP_MASSES,armorPlateMass,vehicleBuild,installedEngine} from '../config/vehicle-load.js';
import {FARM_CROPS} from '../config/farm.js';
// 作物库存保留真实数量；不同类别按配置计重，未知类别使用一千克。
export function cropMass(index){return CROP_MASSES[FARM_CROPS[index]?.category]||1;}
// 汇总一份背包或车厢内作物，不把种子与金币当作收获作物重复计重。
export function cropInventoryMass(inventory){return FARM_CROPS.reduce((sum,_,i)=>sum+Math.max(0,inventory?.[i]||0)*cropMass(i),0);}
// 只随身携带当前枪与实际装填弹夹；其余已拥有枪留在工坊库存。
export function catLoad(game){
 const p=game.progress,index=p.weapon,weapon=p.weapons[index]?WEAPON_MASSES[index]||4:0,mag=game.magazines?.[index],ammo=weapon?LOAD_RULES.magazineMass+Math.max(0,mag?.ammo||0)*LOAD_RULES.roundMass:0,crops=cropInventoryMass(p.farm.inventory),reserve=ammunitionMass(p.supplies?.hand),items=Object.entries(SUPPLY_ITEMS).reduce((n,[k,r])=>n+(p.supplies?.items[k]||0)*r.mass,0),weight=weapon+ammo+crops+reserve+items;
 return {body:LOAD_RULES.catMass[p.hero]||40,weapon,ammo,crops,reserve,items,weight,capacity:LOAD_RULES.catCapacity,overloaded:weight>LOAD_RULES.catCapacity};
}
// 车辆自重包含底盘、发动机增重、附加装甲和车内货物；载荷含驾驶员及背包。
export function vehicleLoad(game,index=game.vehicle.index,{driver=index===game.vehicle.index&&game.vehicle.active,progress=game.progress}={}){
 const spec=VEHICLE_LOADS[index],b=vehicleBuild(progress,index),engine=installedEngine(progress,index),cat=catLoad(game),cargo=cropInventoryMass(b.cargo),armor=b.plates*armorPlateMass(index),engineMass=spec.mass*engine.mass;
 const gun=progress.vehicleLoadouts[index],key=ammoKind(VEHICLE_WEAPONS[gun]),loaded=progress===game.progress?game.vehicles?.[index]?.module?.magazine?.ammo:0;
 const ammo=ammunitionMass(progress.supplies?.vehicles[index])+Math.max(0,loaded||0)*(AMMO_TYPES[key]?.mass||0),gunMass=GUN_MASSES[gun]||0;
 const payload=cargo+armor+engineMass+ammo+gunMass+(driver?cat.body+cat.weight:0),capacity=spec.payload*engine.payload;
 const towCapacity=Math.max(0,spec.tow*engine.tow-payload*LOAD_RULES.towPayloadPenalty),mass=spec.mass+payload;
 return {mass,payload,capacity,towCapacity,cargo,armor,engineMass,ammo,gunMass,driver:driver?cat.body+cat.weight:0,overloaded:payload>capacity};
}
// 临时玩法不把永久货舱搬进借用车；普通探索超载停驶，牵引按实际重量减速。
export function movementLoadFactor(game){
 if(game.realm||game.story||game.fireActive||game.campDefense||game.workshopTrial||game.arrivalCinematic)return 1;
 if(!game.vehicle.active)return catLoad(game).overloaded?LOAD_RULES.catOverloadSpeed:1;
 const fault=vehicleFaults(game.progress,game.vehicle.index);if(fault.engine>=100)return 0;const engineSpeed=1-fault.engine*.006;
 const load=vehicleLoad(game);if(load.overloaded)return 0;
 const tow=game.progress.logistics?.tow;if(!tow)return engineSpeed;
 const mass=vehicleLoad(game,tow.target,{driver:false}).mass;
 if(tow.tractor!==game.vehicle.index||mass>load.towCapacity)return 0;
 return engineSpeed*Math.max(.25,1-mass/Math.max(1,load.towCapacity)*.6);
}
