// 主线资源只读真实存量，跨容器合计不改变取货、入库、出售和消费规则。
import {woodInventory} from './resource-wallet.js';
import {FARM_CROPS} from '../../config/farm.js';

// 每件物品只属于一个存量；没有车体的货舱不算玩家拥有物品。
export function taskResourceStock(p,key){
 if(key==='wood')return woodInventory(p);
 let warehouse=0,bag=0,vehicles=0;
 if(key==='coins')warehouse=p.coins;
 else if(['parts','crystal','core'].includes(key))warehouse=p.materials[key];
 else if(key.startsWith('seed:')){const i=Number(key.slice(5));bag=p.farm.seeds[i]||0;warehouse=p.warehouse.seeds[i]||0;}
 else if(key.startsWith('crop:')){const i=Number(key.slice(5));bag=p.farm.inventory[i]||0;vehicles=p.logistics.builds.reduce((n,b,h)=>n+(p.vehicleHulls[h]?b.cargo[i]||0:0),0);}
 return {warehouse,bag,vehicles,total:warehouse+bag+vehicles};
}
// 作物价值仅用于判断还要不要收集，未出售前不能当作可消费金币。
export function taskCropStock(p){
 return FARM_CROPS.reduce((stock,crop,i)=>{const s=taskResourceStock(p,'crop:'+i);for(const key of ['bag','vehicles','total'])stock[key]+=s[key];stock.value+=s.total*crop.value;return stock;},{bag:0,vehicles:0,total:0,value:0});
}
// 只聚合资源路径，购买、装卸、升级和战斗等真实操作次数继续读取原字段。
export function taskResourcePath(p,path){
 const match=/^progress\.(?:(coins|wood)|materials\.(parts|crystal|core)|farm\.(seeds|inventory)\.(\d+))$/.exec(path||'');
 return match?taskResourceStock(p,match[1]||match[2]||(match[3]==='seeds'?'seed:':'crop:')+match[4]):null;
}
