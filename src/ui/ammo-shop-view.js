// 弹药货架的图标、适配和用途来自正式装备与物品目录，只负责可读展示。
import {AMMO_TYPES} from '../config/supplies.js';
import {itemDefinition} from '../config/items.js';
import {ammoIcon} from './ammo-icons.js';
// 配置名称先转义，避免商品文字被当成HTML。
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 选购页先显示当前装备与所用弹药，空炮位或近战明确不需实物弹药。
export function ammoEquipmentMarkup(fit){return `<section class="ui-inset ammo-equipped" data-equipped-ammo="${fit.key||'none'}"><span class="ammo-symbol" aria-hidden="true">${fit.key?ammoIcon(fit.key):'—'}</span><div><small>${fit.target==='vehicle'?'当前载具':'当前武器'}</small><b>${escape(fit.name)}</b>${fit.target==='vehicle'&&fit.weapon?`<p>主炮：${escape(fit.weapon)}</p>`:''}<p>${fit.key?'使用：'+escape(fit.ammo):escape(fit.reason)}</p></div></section>`;}
// 匹配商品排前，其他弹药可继续储备，但不会标成当前装备可用。
export function ammoOffersMarkup(fit,stock,disabled,warehouse=null){
 const car=fit.target==='vehicle',subject=car?'当前载具':'当前武器';
 return Object.entries(AMMO_TYPES).filter(([,r])=>r.targets.includes(fit.target)).sort(([a],[b])=>Number(b===fit.key)-Number(a===fit.key)).map(([id,r])=>`<section class="ui-section ammo-offer" data-ammo-offer="${id}" data-ammo-fit="${id===fit.key}"><div class="ammo-offer-heading"><span class="ammo-symbol">${ammoIcon(id)}</span><div><b>${r.name}</b><span class="ammo-fit-label">${subject}${id===fit.key?'适用':'不适用'}</span></div></div><p class="ammo-use">${itemDefinition('ammo:'+id).use}</p><p>${warehouse?'背包 ':'库存 '}${stock[id]} 发${warehouse?' · 载具仓库 '+warehouse[id]+' 发':' '} · 每包 ${r.pack} 发 / ${r.mass*r.pack} kg</p><div class="logistics-actions"><button class="ui-button" data-ammo-buy="${id}" data-ammo-target="${fit.target}" ${disabled?'disabled':''}>购买一包<small>${r.pack} 发</small><small>${r.coins} 金币</small></button>${[5,20].map(batches=>`<button class="ui-button" data-ammo-bulk="${id}" data-ammo-target="${fit.target}" data-batches="${batches}" ${disabled?'disabled':''}>购买 ${batches} 包<small>${r.pack*batches} 发</small><small>${r.coins*batches} 金币</small></button>`).join('')}<button class="ui-button" data-ammo-craft="${id}" data-ammo-target="${fit.target}" ${disabled?'disabled':''}>制作一包<small>${r.pack} 发</small><small>${r.wood} 木头${r.parts?' + '+r.parts+' 零件':''}</small></button></div></section>`).join('');
}
