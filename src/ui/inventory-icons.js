import {productionIcon} from '../rendering/farm-production.js';
import {ammoIcon} from './ammo-icons.js';
import {resourceIcon} from '../rendering/resource-icons.js';
// 背包图标复用正式武器、农具与作物主体，补给品使用森林绿描边的固定矢量图案。
import {keepsakeIcon} from './keepsake-icons.js';
import {farmCropMarkup} from '../rendering/farm.js';
import {paintFarmToolIcon} from '../rendering/farm-tools.js';
import {drawWorkshopEquipment} from '../rendering/workshop.js';
import {itemDefinition} from '../config/items.js';
const drawings={
 tent:'<path fill="#c8d39b" d="M4 53 30 10 59 53Z"/><path fill="#f6e6b6" d="m18 53 12-27 14 27Z"/>',
 rod:'<path d="M10 55 42 8q15 19 12 35"/><circle cx="22" cy="42" r="6" fill="#c6aa76"/><path stroke="#d58d68" d="M54 40v12"/>',
 bait:'<rect x="11" y="24" width="42" height="32" rx="8" fill="#e1ca91"/><path d="M16 24v-7h32v7m-27 16q7-13 13 0t10 0"/>',
 fish:'<ellipse cx="29" cy="32" rx="20" ry="11" fill="#c0cbb3"/><path fill="#c0cbb3" d="m47 32 12-12v24Z"/><circle cx="18" cy="30" r="2" fill="#315c43"/><path d="m29 22 8-9 5 13"/>',
 detector:'<ellipse cx="40" cy="50" rx="17" ry="7" fill="#b9ceb1"/><ellipse cx="40" cy="50" rx="11" ry="3"/><path d="m39 47-17-28 4-11"/><path stroke-width="6" d="m22 20 8-7"/><rect x="15" y="20" width="20" height="15" rx="3" fill="#e5cf92"/><path stroke="#76a181" d="m20 28 4-4 4 6 3-3"/>',
 'gun:23':'<path fill="#86a491" d="M8 39h25v15H8z"/><path fill="#c9d5b2" d="m23 45 25-34 8 5-25 35Z"/><path d="m18 41 21-27m-4 36 19-25"/>',
 'gun:24':'<path fill="#bda571" d="M7 37h29v17H7z"/><path fill="#dcc18b" d="m21 38 17-23 18 12-18 23Z"/><path fill="#8a9371" d="m35 16 7-6 17 13-3 7Z"/><path d="m42 17 2 2m4 2 2 2m3 2 2 2"/>',
 'engine:3':'<rect x="11" y="16" width="38" height="35" rx="5" fill="#86a491"/><path d="M18 23h23m-23 7h23m-23 7h23m-23 7h23"/><path fill="#dfc78a" d="M16 9h29v9H16z"/><path d="M49 28h8v14h-8"/>',
 'engine:4':'<rect x="9" y="25" width="46" height="26" rx="5" fill="#bda571"/><circle cx="22" cy="24" r="11" fill="#a6bcaa"/><circle cx="44" cy="24" r="11" fill="#a6bcaa"/><circle cx="22" cy="24" r="4"/><circle cx="44" cy="24" r="4"/><path d="M19 42h26M14 51v6h9m19-6v6h9"/>',

 magazine:'<path fill="#aebfb6" d="M17 9h29v40l-6 8H17Z"/><path d="M24 18h15m-15 9h15m-15 9h15m-15 9h15"/>',
 medkit:'<rect x="9" y="20" width="46" height="35" rx="7" fill="#e8edcf"/><path d="M23 20v-9h18v9"/><path fill="#c98670" d="M28 27h8v7h7v8h-7v7h-8v-7h-7v-8h7Z"/>',
 gunKit:'<rect x="6" y="23" width="52" height="31" rx="6" fill="#d3b776"/><path d="M22 23v-9h20v9M6 34h52"/><path fill="#aebfb6" d="m20 45 21-22 7 7-22 22Z"/>',
 engineKit:'<rect x="6" y="23" width="52" height="31" rx="6" fill="#aebfb6"/><path d="M22 23v-9h20v9M6 34h52"/><path fill="#edbd63" d="m34 27-12 15h9l-2 11 14-17h-10Z"/>',
 relic:'<path fill="#edbd63" d="m32 7 8 17 18 8-18 8-8 17-8-17-18-8 18-8Z"/><circle cx="32" cy="32" r="6" fill="#fff6dc"/>',
};
// 图标只接受目录中的稳定字段，数量和文字由外部可访问按钮提供。
export function inventoryIcon(item){const icon=item.icon;
 if(icon.kind==='production')return productionIcon(icon.key);
 if(icon.kind==='ammo')return ammoIcon(icon.key);
 if(icon.kind==='resource')return resourceIcon(icon.key);
 if(icon.kind==='keepsake')return keepsakeIcon(icon.key);
 if(['crop','seed'].includes(icon.kind))return '<span class="inventory-crop">'+farmCropMarkup(icon.index)+(icon.kind==='seed'?'<small>种</small>':'')+'</span>';
 if(['weapon','tool'].includes(icon.kind))return `<canvas width="96" height="96" data-inventory-art="${item.id}" aria-hidden="true"></canvas>`;
 return `<svg viewBox="0 0 64 64" fill="none" stroke="#315c43" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${drawings[icon.key]||drawings[icon.kind]}</svg>`;
}
// 弹窗内容变化后才绘制小图，不创建独立动画计时器。
export function paintInventoryIcons(node,progress){for(const canvas of node.querySelectorAll('[data-inventory-art]')){const item=itemDefinition(canvas.dataset.inventoryArt);if(item.icon.kind==='tool')paintFarmToolIcon(canvas,item.icon.key);else drawWorkshopEquipment(canvas.getContext('2d'),progress,'weapons',item.index);}}
