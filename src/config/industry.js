import {TOWN_LAYOUT} from './town-layout.js';
// 厂址与建筑布局共用可迁移锚点，生产与靠厂装卸读取同一位置。
export const INDUSTRY_SITES={refinery:{...TOWN_LAYOUT.refinery,id:'refinery',name:'矿产提炼厂',mapId:'forest'},factory:{...TOWN_LAYOUT.factory,id:'factory',name:'金属加工厂',mapId:'forest'}};
// 工业配方只使用一种主金属；原矿、精炼块与用途部件保持独立身份。
export const INDUSTRY_MATERIALS={
 copper:{name:'铜块'},iron:{name:'铁块'},rareMetal:{name:'稀有金属块'},stone:{name:'石块'},
 copperGun:{name:'铜制枪械部件'},ironGun:{name:'铁制枪械部件'},rareGun:{name:'稀有金属枪械部件'},
 copperVehicle:{name:'铜制载具部件'},ironVehicle:{name:'铁制载具部件'},rareVehicle:{name:'稀有金属载具部件'},
 farmParts:{name:'农具金属件'},seederKit:{name:'条播机'},reaperKit:{name:'单行推镰'},
};
export const RAW_INDUSTRY={rawCopper:{name:'铜原矿',ore:'copper'},rawIron:{name:'铁原矿',ore:'iron'},rawRare:{name:'稀有原矿',ore:'rareMetal'},rawStone:{name:'原石',ore:'stone'}};
export const INDUSTRY_GOODS={...RAW_INDUSTRY,...INDUSTRY_MATERIALS,wood:{name:'木材'}};
// 加工厂木材消耗统一为基础配方的500倍，报价、备料和开工扣料共用最终配方。
export const FACTORY_WOOD_MULTIPLIER=500;
export const INDUSTRY_RECIPES=[
 ...Object.entries(RAW_INDUSTRY).map(([raw,r])=>({id:'refine-'+r.ore,site:'refinery',name:r.ore==='stone'?'切制石块':'提炼'+INDUSTRY_MATERIALS[r.ore].name,input:{[raw]:2,...(r.ore==='stone'?{}:{wood:1})},output:r.ore,count:1,seconds:3})),
 ...[['copperGun','copper',2,1],['ironGun','iron',3,1],['rareGun','rareMetal',4,2],['copperVehicle','copper',4,2],['ironVehicle','iron',4,2],['rareVehicle','rareMetal',6,3],['farmParts','copper',2,1]].map(([output,metal,n,wood])=>({id:'make-'+output,site:'factory',name:INDUSTRY_MATERIALS[output].name,input:{[metal]:n,wood},output,count:1,seconds:4})),
 {id:'make-seeder',site:'factory',name:'条播机',input:{farmParts:2,wood:8},output:'seederKit',count:1,seconds:8},
 {id:'make-reaper',site:'factory',name:'单行推镰',input:{farmParts:2,wood:8},output:'reaperKit',count:1,seconds:8},
].map(recipe=>recipe.site==='factory'&&recipe.input.wood?{...recipe,input:{...recipe.input,wood:recipe.input.wood*FACTORY_WOOD_MULTIPLIER}}:recipe);
// 新手手枪与木制自行车提供起步能力，其余制造接入对应的一条矿产线。
export function industrialEquipmentCost(kind,index){
 if(kind==='vehicle'){
  return [{ironVehicle:6,stone:6},{ironVehicle:12,stone:10},{rareVehicle:12},{copperVehicle:8},{ironVehicle:10},{copperVehicle:2},{rareVehicle:24,stone:16},{ironVehicle:8},{ironVehicle:4}][index]||{};
 }
 if(index===0||index===14)return {};
 return index>=12?{rareGun:4}:index>=6?{ironGun:3}:{copperGun:2};
}
// 加工件必须出自加工厂，旧装备的使用权独立于新制造成本。
export function industrialToolKey(tool){return {seeder:'seederKit',reaper:'reaperKit'}[tool];}
export const INDUSTRY_CAP=9999999;
