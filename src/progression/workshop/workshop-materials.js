// 工坊按真实库存合计材料；背包、已拥有载具和小屋共用同一套查询与扣料规则。
import {INDUSTRY_MATERIALS} from '../../config/industry.js';

// 随身与车载货物优先使用以释放负重，未拥有车辆的残留库存不参与结算。
function materialSlots(p,key){
 const hulls=(p.vehicleHulls||[]).flatMap((owned,index)=>owned?[index]:[]);
 if(key==='wood')return [[p.logistics,'bagWood'],...hulls.map(i=>[p.logistics?.builds?.[i],'wood']),[p,'wood']];
 if(Object.hasOwn(INDUSTRY_MATERIALS,key))return [[p.industry?.bag,key],...hulls.map(i=>[p.industry?.vehicles?.[i],key]),[p.materials,key]];
 return [[key==='coins'||key==='bosses'?p:p.materials,key]];
}

// 报价、追踪和扣费均读取这些库存槽，不把原矿或工厂待领取产物算作成品。
export function workshopMaterialCount(p,key){
 return materialSlots(p,key).reduce((sum,[store,id])=>sum+(store?.[id]||0),0);
}

// 整份配方先校验后扣除，任一材料不足时所有来源均保持原状。
export function spendWorkshopMaterials(p,cost){
 const rows=Object.entries(cost).filter(([key])=>key!=='bosses');
 if(rows.some(([key,n])=>!Number.isSafeInteger(n)||n<0||workshopMaterialCount(p,key)<n))return false;
 for(const [key,n] of rows){
  let remaining=n;
  for(const [store,id] of materialSlots(p,key)){
   const used=Math.min(store?.[id]||0,remaining);
   if(used){store[id]-=used;remaining-=used;}
   if(!remaining)break;
  }
 }
 return true;
}
