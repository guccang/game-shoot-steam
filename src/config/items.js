import {DETECTOR,TREASURE_PARTS} from './treasure.js';
import {WOOD_ITEM} from './wood-storage.js';
// 统一物品目录：身份、分类、图标、说明、用途和千克重量供背包与负重计算共用。
import {WEAPONS} from './weapons.js';
import {FARM_CROPS} from './farm.js';
import {KEEPSAKES} from './keepsakes.js';
import {CAMP_CHARACTERS,MONSTER_CAMPS} from './monster-camps.js';
import {AMMO_TYPES,SUPPLY_ITEMS} from './supplies.js';
import {WEAPON_MASSES,CROP_MASSES,LOAD_RULES} from './vehicle-load.js';
export const ITEM_CATEGORIES={outdoor:'野外装备与鱼获',supply:'道具',weapon:'武器',ammo:'弹药与弹匣',crop:'农作物',seed:'种子',tool:'农具',keepsake:'重要物品',relic:'奇物',material:'采集材料',equipment:'载具部件',exploration:'探索工具'};
export const FARM_ITEMS={hoe:{name:'锄头',mass:1.5,description:'结实的木柄锄头。',use:'打开种地工具，点击空地开垦。'},sickle:{name:'镰刀',mass:.6,description:'用于收割的弧刃镰刀。',use:'打开种地工具，长按拖过成熟作物收割。'},water:{name:'水壶',mass:1.2,description:'随身浇灌工具。',use:'打开种地工具，选择水壶并点击成长中的田块。'}};
const supplyUses={medkit:`使用后回复猫猫${SUPPLY_ITEMS.medkit.heal} HP。`,gunKit:`降低当前主炮${SUPPLY_ITEMS.gunKit.repair}%损坏；100%损坏必须回厂。`,engineKit:`降低当前发动机${SUPPLY_ITEMS.engineKit.repair}%损坏；100%损坏必须回厂。`};
const ammoUses={light:'供使用实物子弹的枪械及机枪装填。',shell:'供标准坦克主炮装填。',heavy:'供红狼重炮装填。',water:'供潮汐主炮装填。'};
// 每件可堆叠物品只定义单位重量，数量由实际存档读取。
const entries=[
 WOOD_ITEM,
 {id:'metal-detector',name:'金属探测器',category:'exploration',mass:DETECTOR.mass,icon:{kind:'detector'},description:'可反复使用的金属探测器，感知附近埋藏装备。',use:'在手机寻宝页开启探测，到线索区域寻找增强的信号；近距离挖掘。'},
 ...TREASURE_PARTS.map(p=>({...p,category:'equipment',icon:{kind:p.kind==='gun'?'treasure-gun':'treasure-engine',key:p.id},use:'运输到载具工坊换装；货舱中的未安装部件也占用载荷。'})),
 ...Object.entries(SUPPLY_ITEMS).map(([key,r])=>({id:'supply:'+key,category:'supply',key,name:r.name,mass:r.mass,icon:{kind:'supply',key},description:key==='medkit'?'装有绷带和急救用品的便携医疗包。':'用于野外处理载具部件故障的工具包。',use:supplyUses[key]})),
 ...WEAPONS.map((w,index)=>({id:'weapon:'+index,category:'weapon',index,name:w.name,mass:WEAPON_MASSES[index]||4,icon:{kind:'weapon',index},description:w.desc||w.description||'猫猫使用的手持装备。',use:'在武器工坊装备或改装；可存入巡林小屋武器架，取出后随身携带。'})),
 ...Object.entries(AMMO_TYPES).map(([key,r])=>({id:'ammo:'+key,category:'ammo',key,name:r.name,mass:r.mass,icon:{kind:'ammo',key},description:'弹药铺可购买或制作的实体弹药。',use:ammoUses[key]})),
 {id:'magazine',category:'ammo',name:'弹匣',mass:LOAD_RULES.magazineMass,icon:{kind:'magazine'},description:'每把使用实物弹药的随身武器配有一个弹匣。',use:'自动换弹时装填背包中的对应弹药；弹药重量单独计算。'},
 ...FARM_CROPS.flatMap((crop,index)=>[{id:'crop:'+index,category:'crop',index,name:crop.name,mass:CROP_MASSES[crop.category]||1,icon:{kind:'crop',index},description:'已经收获的'+crop.name+'。',use:'可出售、交付订单，或装入载具货舱。'},{id:'seed:'+index,category:'seed',index,name:crop.name+'种子',mass:.02,icon:{kind:'seed',index},description:'用于种植'+crop.name+'的种子。',use:'选择空田播种；收获物进入背包。'}]),
 ...Object.entries(FARM_ITEMS).map(([key,r])=>({...r,id:'tool:'+key,key,category:'tool',icon:{kind:'tool',key}})),
 ...KEEPSAKES.map(r=>({id:r.id,name:r.name,category:'keepsake',mass:({'elder-letter':.02,'house-key':.05,'patrol-phone':.2})[r.id],icon:{kind:'keepsake',key:r.id},description:r.note,use:r.action+'；永久保留，不会消耗。'})),
 ...CAMP_CHARACTERS.map(r=>({id:'camp-relic-'+r.id,name:r.item,category:'relic',mass:.1,icon:{kind:'relic'},description:r.reply,use:'清空'+MONSTER_CAMPS.find(c=>c.id===r.camp).name+'时，已开放的'+FARM_CROPS[r.seed].name+'种子额外获得一粒。'})),
];
export const ITEM_TABLE=Object.freeze(Object.fromEntries(entries.map(r=>[r.id,Object.freeze(r)])));
// 未知身份不猜测类型，也不为未持有物品生成库存。
export function itemDefinition(id){return ITEM_TABLE[id]||null;}
