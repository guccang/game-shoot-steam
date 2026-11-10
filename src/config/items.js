import {INDUSTRY_GOODS} from './industry.js';
import {ORE_KEYS,ORE_NAMES,ORE_MASS} from './mine-freight.js';
import {FORAGE_ID} from './pasture.js';
import {DETECTOR,TREASURE_PARTS} from './treasure.js';
import {WOOD_ITEM} from './wood-storage.js';
// 统一物品目录：身份、分类、图标、说明、用途和千克重量供背包与负重计算共用。
import {WEAPONS} from './weapons.js';
import {FARM_CROPS} from './farm.js';
import {KEEPSAKES} from './keepsakes.js';
import {CAMP_CHARACTERS,MONSTER_CAMPS} from './monster-camps.js';
import {AMMO_TYPES,SUPPLY_ITEMS} from './supplies.js';
import {WEAPON_MASSES,CROP_MASSES,LOAD_RULES} from './vehicle-load.js';
export const ITEM_CATEGORIES={facility:'设施',currency:'金币',outdoor:'野外装备与鱼获',supply:'道具',weapon:'武器',ammo:'弹药与弹匣',crop:'农作物',seed:'种子',tool:'农具',keepsake:'重要物品',relic:'奇物',material:'采集材料',equipment:'载具部件',exploration:'探索工具'};
export const FARM_ITEMS={hoe:{name:'锄头',mass:1.5,description:'结实的木柄锄头。',use:'打开种地工具，点击空地开垦。'},sickle:{name:'镰刀',mass:.6,description:'用于收割的弧刃镰刀。',use:'打开种地工具，长按拖过成熟作物收割。'},water:{name:'水壶',mass:1.2,description:'随身浇灌工具。',use:'打开种地工具，选择水壶并点击成长中的田块。'}};
const supplyUses={medkit:`使用后回复猫猫${SUPPLY_ITEMS.medkit.heal} HP。`,gunKit:`降低当前主炮${SUPPLY_ITEMS.gunKit.repair}%损坏；100%损坏必须回厂。`,engineKit:`降低当前发动机${SUPPLY_ITEMS.engineKit.repair}%损坏；100%损坏必须回厂。`};
const ammoUses={light:'供使用实物子弹的枪械及机枪装填。',shell:'供标准坦克主炮装填。',heavy:'供红狼重炮装填。',water:'供潮汐水枪与潮汐主炮补水装填。'};
// 每件可堆叠物品只定义单位重量，数量由实际存档读取。
const entries=[
 WOOD_ITEM,
 ...Object.entries(INDUSTRY_GOODS).filter(([key])=>key!=='wood').map(([key,r])=>({id:'industry:'+key,name:r.name,key,category:'material',mass:.5,icon:{kind:'resource',key},description:'工业生产实物。',use:'进入提炼厂或加工厂可直接使用小屋仓库原料，也可用停靠载具供料；产物自动存入小屋仓库，可直接供工坊和农具使用，也可按需取出或装车。'})),
 {id:'trade:cargo-tag',name:'遗失的货签',category:'keepsake',mass:0,icon:{kind:'keepsake',key:'elder-letter'},description:'商队托你找回的货物标签。',use:'集齐三张后，回营地订单板交还商队领取报酬。'},
 ...ORE_KEYS.map(key=>({id:'ore:'+key,name:ORE_NAMES[key],category:'material',mass:ORE_MASS,icon:{kind:'resource',key},description:'地下开采的原矿。',use:'可在库存矿石不足时铺轨或造矿车。到仓库升井卸下后，石矿用于施工或切制石块，金属原矿用于提炼。'})),
 {id:FORAGE_ID,name:'甜穗草',category:'material',mass:.1,icon:{kind:'forage'},description:'一束带着甜香的金穗牧草，常长在营地牧栏东南的草地上。',use:'走近野牛，喂它一束就能领回牧栏。也可以留给栏里的耕牛吃。'},
 // 收纳设施沿用生产库存，不新增负重规则；放置后从背包清单移除。
 {id:'facility:sprinkler',name:'简易洒水器',category:'facility',mass:0,icon:{kind:'production',key:'sprinkler'},description:'收回的洒水器，可带到新的地面位置重新布置。',use:'在地面下车后选择放置；无需再支付材料，取消选址仍留在背包。设施收纳暂不计重。'},
 {id:'currency:coins',name:'金币',category:'currency',mass:0,icon:{kind:'resource',key:'coins'},description:'小屋仓库保管的通用货币，与界面顶部的金币余额一致。',use:'购买装备、补给、修理和升级时直接支付，无需取出。'},
 {id:'metal-detector',name:'金属探测器',category:'exploration',mass:DETECTOR.mass,icon:{kind:'detector'},description:'可反复使用的金属探测器，感知附近埋藏装备。',use:'在手机寻宝页开启探测，到线索区域寻找增强的信号；近距离挖掘。'},
 ...TREASURE_PARTS.map(p=>({...p,category:'equipment',icon:{kind:p.kind==='gun'?'treasure-gun':'treasure-engine',key:p.id},use:'运输到载具工坊换装；货舱中的未安装部件也占用载荷。'})),
 ...Object.entries(SUPPLY_ITEMS).map(([key,r])=>({id:'supply:'+key,category:'supply',key,name:r.name,mass:r.mass,icon:{kind:'supply',key},description:key==='medkit'?'装有绷带和急救用品的便携医疗包。':'用于野外处理载具部件故障的工具包。',use:supplyUses[key]})),
 ...WEAPONS.map((w,index)=>({id:'weapon:'+index,category:'weapon',index,name:w.name,mass:WEAPON_MASSES[index]||4,icon:{kind:'weapon',index},description:w.desc||w.description||'猫猫使用的手持装备。',use:'在武器工坊装备或改装；可存入小屋仓库或巡林小屋武器架，取出后随身携带。'})),
 ...Object.entries(AMMO_TYPES).map(([key,r])=>({id:'ammo:'+key,category:'ammo',key,name:r.name,mass:r.mass,icon:{kind:'ammo',key},description:r.special?'营地专售的载具增强弹药。':'弹药铺可购买或制作的实体弹药。',use:r.use||ammoUses[key]})),
 {id:'magazine',category:'ammo',name:'弹匣',mass:LOAD_RULES.magazineMass,icon:{kind:'magazine'},description:'每把使用实物弹药的随身武器配有一个弹匣。',use:'自动换弹时装填背包中的对应弹药；弹药重量单独计算。'},
 ...FARM_CROPS.flatMap((crop,index)=>[{id:'crop:'+index,category:'crop',index,name:crop.name,mass:CROP_MASSES[crop.category]||1,icon:{kind:'crop',index},description:'已经收获的'+crop.name+'。',use:'收获优先进入附近载具，附近无车时放入背包；靠近小屋仓库自动兑换金币；也可手动出售、交付订单或装入载具货舱。'},{id:'seed:'+index,category:'seed',index,name:crop.name+'种子',mass:.002,icon:{kind:'seed',index},description:'用于种植'+crop.name+'的种子。',use:'选择空田播种；收获物优先放入附近载具，无车时进入背包。'}]),
 ...Object.entries(FARM_ITEMS).map(([key,r])=>({...r,id:'tool:'+key,key,category:'tool',icon:{kind:'tool',key}})),
 ...KEEPSAKES.map(r=>({id:r.id,name:r.name,category:'keepsake',mass:({'elder-letter':.02,'house-key':.05,'patrol-phone':.2})[r.id],icon:{kind:'keepsake',key:r.id},description:r.note,use:r.action+'；永久保留，不会消耗。'})),
 ...CAMP_CHARACTERS.map(r=>({id:'camp-relic-'+r.id,name:r.item,category:'relic',mass:.1,icon:{kind:'relic'},description:r.reply,use:'清空'+MONSTER_CAMPS.find(c=>c.id===r.camp).name+'时，已开放的'+FARM_CROPS[r.seed].name+'种子额外获得一粒。'})),
];
export const ITEM_TABLE=Object.freeze(Object.fromEntries(entries.map(r=>[r.id,Object.freeze(r)])));
// 未知身份不猜测类型，也不为未持有物品生成库存。
export function itemDefinition(id){return ITEM_TABLE[id]||null;}
