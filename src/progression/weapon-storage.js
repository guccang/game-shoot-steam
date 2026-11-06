// 武器所有权与携带位置分开；架上武器保留等级和改装，但不能随身装备或计重。
import {WEAPON_RACK_CAPACITY} from '../config/home-decor.js';
// 每把武器最多占一个收纳架槽位，家具实例号即存放地址。
export function storedWeaponRack(progress,index){return progress.homeDecor?.items.find(i=>i.type==='weapon-rack'&&i.weapons?.includes(index))||null;}
// 小屋仓库只记录位置，不复制武器等级、改装或弹匣。
export function storedWarehouseWeapon(progress,index){return progress.warehouse?.weapons?.includes(index)===true;}
// 战斗和背包共用随身判定，不从界面可见性推断物品位置。
export function carriedWeapon(progress,index){return !!progress.weapons[index]&&!storedWeaponRack(progress,index)&&!storedWarehouseWeapon(progress,index)&&!Object.values(progress.shopStock||{}).some(stock=>stock['weapon:'+index]);}
// 只接收真实所有权，清除重复引用；损坏布局里的架子保留物品，重新摆放后可取出。
export function normalizeWeaponStorage(progress){
 progress.warehouse.weapons=progress.warehouse.weapons.filter(i=>progress.weapons[i]&&i!==progress.weapon);
 const used=new Set(progress.warehouse.weapons);
 for(const item of progress.homeDecor.items){
  item.weapons=item.type==='weapon-rack'?(item.weapons||[]).filter(index=>{
   if(!Number.isInteger(index)||!progress.weapons[index]||index===progress.weapon||used.has(index))return false;
   used.add(index);return true;
  }).slice(0,WEAPON_RACK_CAPACITY):[];
 }
}
