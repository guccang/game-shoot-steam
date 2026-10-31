// 背包图标复用正式武器、农具与作物主体，补给品使用森林绿描边的固定矢量图案。
import {keepsakeIcon} from './keepsake-icons.js';
import {farmCropMarkup} from '../rendering/farm.js';
import {paintFarmToolIcon} from '../rendering/farm-tools.js';
import {drawWorkshopEquipment} from '../rendering/workshop.js';
import {itemDefinition} from '../config/items.js';
const drawings={
 ammo:'<path fill="#d3b776" d="M12 24 19 9l7 15v31H12Zm25 0 7-15 7 15v31H37Z"/><path d="M12 44h14m11 0h14"/>',
 magazine:'<path fill="#aebfb6" d="M17 9h29v40l-6 8H17Z"/><path d="M24 18h15m-15 9h15m-15 9h15m-15 9h15"/>',
 medkit:'<rect x="9" y="20" width="46" height="35" rx="7" fill="#e8edcf"/><path d="M23 20v-9h18v9"/><path fill="#c98670" d="M28 27h8v7h7v8h-7v7h-8v-7h-7v-8h7Z"/>',
 gunKit:'<rect x="6" y="23" width="52" height="31" rx="6" fill="#d3b776"/><path d="M22 23v-9h20v9M6 34h52"/><path fill="#aebfb6" d="m20 45 21-22 7 7-22 22Z"/>',
 engineKit:'<rect x="6" y="23" width="52" height="31" rx="6" fill="#aebfb6"/><path d="M22 23v-9h20v9M6 34h52"/><path fill="#edbd63" d="m34 27-12 15h9l-2 11 14-17h-10Z"/>',
 relic:'<path fill="#edbd63" d="m32 7 8 17 18 8-18 8-8 17-8-17-18-8 18-8Z"/><circle cx="32" cy="32" r="6" fill="#fff6dc"/>',
};
// 图标只接受目录中的稳定字段，数量和文字由外部可访问按钮提供。
export function inventoryIcon(item){const icon=item.icon;
 if(icon.kind==='keepsake')return keepsakeIcon(icon.key);
 if(['crop','seed'].includes(icon.kind))return '<span class="inventory-crop">'+farmCropMarkup(icon.index)+(icon.kind==='seed'?'<small>种</small>':'')+'</span>';
 if(['weapon','tool'].includes(icon.kind))return `<canvas width="96" height="96" data-inventory-art="${item.id}" aria-hidden="true"></canvas>`;
 return `<svg viewBox="0 0 64 64" fill="none" stroke="#315c43" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${drawings[icon.key]||drawings[icon.kind]}</svg>`;
}
// 弹窗内容变化后才绘制小图，不创建独立动画计时器。
export function paintInventoryIcons(node,progress){for(const canvas of node.querySelectorAll('[data-inventory-art]')){const item=itemDefinition(canvas.dataset.inventoryArt);if(item.icon.kind==='tool')paintFarmToolIcon(canvas,item.icon.key);else drawWorkshopEquipment(canvas.getContext('2d'),progress,'weapons',item.index);}}
