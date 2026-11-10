import {ammoSoldAt} from '../config/vehicle-special-ammo.js';
import {escapeHtml as escape} from './shared/html.js';
// 弹药货架的图标、适配和用途来自正式装备与物品目录，只负责可读展示。
import {AMMO_TYPES} from '../config/supplies.js';
import {itemDefinition} from '../config/items.js';
import {ammoIcon} from './ammo-icons.js';
// 配置名称先转义，避免商品文字被当成HTML。

// 选购页先显示当前装备与所用弹药，空炮位或近战明确不需实物弹药。
export function ammoEquipmentMarkup(fit){return `<section class="ui-inset ammo-equipped" data-equipped-ammo="${fit.key||'none'}"><span class="ammo-symbol" aria-hidden="true">${fit.key?ammoIcon(fit.key):'—'}</span><div><small>${fit.target==='vehicle'?'当前载具':'当前武器'}</small><b>${escape(fit.name)}</b>${fit.target==='vehicle'&&fit.weapon?`<p>主炮：${escape(fit.weapon)}</p>`:''}<p>${fit.key?'使用：'+escape(fit.ammo):escape(fit.reason)}</p></div></section>`;}
// 匹配商品排前；数量明确标为玩家背包或载具已拥有的弹药，避免误认为商店库存。
export function ammoOffersMarkup(fit,stock,disabled,warehouse=null){
 const car=fit.target==='vehicle',subject=car?'当前载具':'当前武器';
 return Object.entries(AMMO_TYPES).filter(([key,r])=>r.targets.includes(fit.target)&&ammoSoldAt(key)).sort(([a],[b])=>Number(b===fit.key)-Number(a===fit.key)).map(([id,r])=>`<section class="ui-section ammo-offer" data-ammo-offer="${id}" data-ammo-fit="${id===fit.key}"><div class="ammo-offer-heading"><span class="ammo-symbol">${ammoIcon(id)}</span><div><b>${r.name}</b><span class="ammo-fit-label">${id==='flare'?'载具通用':r.special?(['shell','heavy'].includes(fit.key)?'主炮增强适用':'需标准炮或重炮'):subject+(id===fit.key?'适用':'不适用')}</span></div></div><p class="ammo-use">${itemDefinition('ammo:'+id).use}</p><p>${car?'已拥有 ':'背包 '}${stock[id]} 发${warehouse?' · 载具仓库 '+warehouse[id]+' 发':' '} · 每包 ${r.pack} 发 / ${r.mass*r.pack} kg</p><div class="logistics-actions"><button class="ui-button" data-shop-good="ammo:${id}" data-ammo-buy="${id}" data-ammo-target="${fit.target}">加入购物车<small>${r.pack} 发</small><small>${r.coins} 金币</small></button><button class="ui-button" data-ammo-craft="${id}" data-ammo-target="${fit.target}" ${disabled||r.special?'disabled':''}>制作一包<small>${r.pack} 发</small><small>${r.wood||0} 木头${r.parts?' + '+r.parts+' 零件':''}</small></button></div></section>`).join('');
}
