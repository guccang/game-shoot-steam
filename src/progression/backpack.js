import {FORAGE_ID} from '../config/pasture.js';
import {outdoorInventory} from './outdoors.js';
import {carriedWeapon} from './weapon-storage.js';
// 背包按真实持有数量聚合；载具货舱、工坊主炮和已入库建材不混入随身库存。
import {ITEM_TABLE,FARM_ITEMS} from '../config/items.js';
import {WEAPONS} from '../config/weapons.js';
import {AMMO_TYPES,ammoKind} from '../config/supplies.js';
import {KEEPSAKES} from '../config/keepsakes.js';
import {CAMP_CHARACTERS} from '../config/monster-camps.js';
import {FARM_CROPS} from '../config/farm.js';
import {ownsKeepsake} from './keepsakes.js';
import {finiteSupply} from '../combat/supply-ammo.js';
// 武器等级不是物品数量；已装填子弹和备用弹药各计一次，临时活动读永久弹匣快照。
export function backpackEntries(game){
 const p=game.progress,entries=[],loaded={},mags=(finiteSupply(game)?game.magazines:null)??p.supplies?.handMags;let magazineCount=0;
 // 空数量不占格，所有展示重量均由物品表得出。
 function add(id,count,note=''){const item=ITEM_TABLE[id];if(item&&count>0)entries.push({...item,count,weight:Math.round(item.mass*count*1e6)/1e6,note});}
 add('trade:cargo-tag',p.trade?.relic||0,'寻物委托');
 add('facility:sprinkler',p.production?.sprinklerInventory||0,'可重新放置');
 if(p.treasure?.detector)add('metal-detector',1,'永久工具');
 add(FORAGE_ID,p.farm?.forage||0);
 for(const [key,count] of Object.entries(p.mining?.bagOre||{}))add('ore:'+key,count,'待运至仓库');
 add('material:wood',p.logistics?.bagWood||0,'未入库');
 for(const key of Object.keys(p.supplies?.items||{}))add('supply:'+key,p.supplies.items[key]);
 WEAPONS.forEach((w,i)=>{if(!carriedWeapon(p,i))return;add('weapon:'+i,1,i===p.weapon?'当前装备':'随身携带');const key=ammoKind(w);if(key){magazineCount++;loaded[key]=(loaded[key]||0)+Math.max(0,mags?.[i]?.ammo||0);}});
 for(const key of Object.keys(AMMO_TYPES)){const reserve=p.supplies?.hand?.[key]||0,n=loaded[key]||0;add('ammo:'+key,reserve+n,`备用 ${reserve} 发 · 已装填 ${n} 发`);}
 add('magazine',magazineCount);
 FARM_CROPS.forEach((_,i)=>add('crop:'+i,p.farm?.inventory[i]||0));
 FARM_CROPS.forEach((_,i)=>add('seed:'+i,p.farm?.seeds[i]||0));
 for(const key of Object.keys(FARM_ITEMS))add('tool:'+key,1,'常备农具');
 for(const item of KEEPSAKES)if(ownsKeepsake(p,item.id))add(item.id,1);
 for(const item of CAMP_CHARACTERS)if(p.monsterCamps?.items.includes(item.id))add('camp-relic-'+item.id,1);
 entries.push(...outdoorInventory(p));
 return entries;
}
