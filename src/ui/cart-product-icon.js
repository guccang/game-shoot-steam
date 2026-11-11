import {REGIONAL_CAMPS} from '../config/regional-camps.js';
import {seDeviceIcon} from './se-device-icon.js';
import {drawCat} from '../rendering/characters.js';
// 购物车逐行保留所购型号的缩略图，切换货架或调整数量时复用同一节点。
import {inventoryIcon,paintInventoryIcons} from './inventory-icons.js';
import {drawWorkshopEquipment} from '../rendering/workshop.js';
import {drawLivestock} from '../rendering/livestock-atlas.js';
import {drawHomeDecor} from '../rendering/home-decor.js';
import {itemDefinition} from '../config/items.js';
import {OUTDOOR_GEAR} from '../config/outdoors.js';
import {outdoorGearIcon} from './outdoor-gear-icon.js';

const wing='<path fill="#b6cc93" d="M3 39 32 9 61 39 35 29 32 46 28 29Z"/><path d="m13 36 17 17h5l16-17M32 11v34"/>';
const plate='<path fill="#96ad9b" d="m6 27 28-13 24 10-28 16Z"/><path fill="#748d7d" d="m6 27 24 13 28-16v8L30 48 6 34Z"/><path d="m16 28 3 1m22-6 3 1"/>';

// 图案使用稳定购买参数选取，图片只作装饰，由旁边的商品名负责朗读。
export function cartProductIcon(button,progress){
 const root=button.ownerDocument,d=button.dataset,icon=root.createElement('span');
 icon.className='cart-product-icon';icon.setAttribute('aria-hidden','true');
 const gear=OUTDOOR_GEAR[d.outdoorBuy];
 let symbol=itemDefinition(d.shopGood);
 if(d.regionalStore){
  const camp=REGIONAL_CAMPS.find(c=>c.id===d.regionalStore);
  if(['ammo','seed'].includes(d.regionalAction))symbol=itemDefinition(d.regionalAction+':'+d.key);
  if(d.regionalAction==='engine')symbol=itemDefinition('engine:'+camp.engine)||itemDefinition('engine:3');
  if(d.regionalAction==='se-buy'){icon.innerHTML=seDeviceIcon(d.key);return icon;}
  if(d.regionalAction==='gun'||d.regionalAction==='recruit'){
   const canvas=root.createElement('canvas');canvas.width=canvas.height=96;icon.append(canvas);
   if(d.regionalAction==='gun')drawWorkshopEquipment(canvas.getContext('2d'),progress,'turret',camp.gun,0,true);
   else drawCat(canvas.getContext('2d'),48,74,camp.hero,0,1.4,0,0);
   return icon;
  }
 }
 if(d.canUpgrade!==undefined)symbol=itemDefinition('tool:water');
 if(gear){icon.innerHTML=outdoorGearIcon(gear);return icon;}
 if(d.fitEngine!==undefined)symbol=itemDefinition('engine:'+d.fitEngine)||itemDefinition('engine:3');
 if(d.tend==='adopt-horse')symbol={icon:{kind:'resource',key:'draftHorse'}};
 if(symbol){
  icon.innerHTML=inventoryIcon(symbol);paintInventoryIcons(icon,progress);return icon;
 }
 if(d.gliderModel||d.fitArmor){
  icon.innerHTML='<svg viewBox="0 0 64 64" fill="none" stroke="#435d48" stroke-width="2.4" stroke-linejoin="round">'+(d.gliderModel?wing:plate)+'</svg>';return icon;
 }
 const canvas=root.createElement('canvas');canvas.width=canvas.height=96;icon.append(canvas);
 const c=canvas.getContext('2d');
 if(d.shopKind)drawWorkshopEquipment(c,progress,d.shopKind,Number(d.shopIndex),0,true);
 else if(d.sow){c.translate(48,72);c.scale(1.4,1.4);drawHomeDecor(c,{type:'pot',x:0,y:0,plant:{id:d.sow,started:0}},false,{day:50,elapsed:0},progress);}
 else if(d.tend){const ox=d.tend==='adopt-ox';c.translate(48,90);const scale=ox ? .55 : .9;c.scale(scale,scale);drawLivestock(c,ox?'ox':'sheep',0,0,false,0);}
 else{
  const preview=button.closest('.home-product,.item-card')?.querySelector('canvas[data-icon],canvas[data-cat-portrait]');
  if(!preview)throw Error('购物车缺少商品图标：'+d.shopName);
  const scale=96/Math.max(preview.width,preview.height),w=preview.width*scale,h=preview.height*scale;
  c.drawImage(preview,(96-w)/2,(96-h)/2,w,h);
 }
 return icon;
}
