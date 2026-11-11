import {vehicleSEMarkup} from './vehicle-se.js';
import {configureVehicleSE} from '../core/vehicles/vehicle-se.js';
import {specialAmmoMarkup} from './vehicle-special-ammo.js';
import {configureSpecialAmmo} from '../core/vehicles/supplies.js';
import {buyDetector} from '../core/activities/treasure.js';
import {carriedWeapon} from '../progression/inventory/weapon-storage.js';
import {inventoryIcon,paintInventoryIcons} from './inventory-icons.js';
import {ammoIcon} from './ammo-icons.js';
import {equippedAmmo} from '../progression/workshop/ammo-fit.js';
import {ammoEquipmentMarkup,ammoOffersMarkup} from './ammo-shop-view.js';
import {createSupplyLoadConfirm} from './supply-load-confirm.js';
import {itemDefinition} from '../config/items.js';
// 主界面只查看当前装备，补给页与道具操作使用统一手机底板。
import {finiteSupply,catAmmoWarehouse} from '../combat/supply-ammo.js';
import {createEventScope} from '../platform/events.js';
import {AMMO_TYPES,AMMO_SHOP,SUPPLY_ITEMS,ammoKind,vehicleFaults} from '../config/supplies.js';
import {WEAPONS} from '../config/weapons.js';
import {vehicleModel,vehicleWeapon} from '../config/vehicles.js';
import {vehicleLoad} from '../progression/inventory/load-weight.js';
import {drawWorkshopEquipment} from '../rendering/workshop.js';
import {useSupplyItem,supplyVehicleNearby} from '../core/vehicles/supplies.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {VEHICLE_WORKSHOP} from '../world/workshop.js';
// 页面只在打开或用户操作后渲染，不中断滚动，不提供目录、升级或改装按钮。
export function createFieldEquipment({game,root,dialogs,onChange,mountCargo,onOutdoor}){
 const scope=createEventScope(),panel=root.createElement('dialog');let vehicleTab='cockpit',mode='weapons',target='hand',message='';panel.id='field-equipment-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','field-equipment-title');panel.innerHTML='<header class="ui-panel__header"><div><h2 id="field-equipment-title"></h2><p id="field-equipment-subtitle"></p></div><button id="field-equipment-close" class="ui-close" aria-label="关闭当前装备">×</button></header><div class="vehicle-page-tabs" role="group" aria-label="载具页面" hidden><button class="ui-button" data-vehicle-tab="cockpit">驾驶舱</button><button class="ui-button" data-vehicle-tab="se">SE</button><button class="ui-button" data-vehicle-tab="cargo">仓库</button></div><div class="ui-panel__body" id="field-equipment-body"></div><footer class="ui-panel__footer" style="display:block"><p id="field-equipment-message" role="status"></p><section data-field-weapons hidden><b>背包武器</b><div class="field-weapon-list" role="group" aria-label="背包武器"></div></section><div class="logistics-actions"><button class="ui-button" data-field-nav>前往工坊</button></div></footer>';root.body.append(panel);const get=id=>root.getElementById('field-equipment-'+id);
 const loadConfirm=createSupplyLoadConfirm({game,root,dialogs,onResult:result=>{message=result.message;render();onChange();}});
 // 道具数量与实际效果来自同一正式配置。
 function items(){return '<h3>随身道具</h3>'+Object.entries(SUPPLY_ITEMS).map(([id,r])=>`<section class="ui-section"><b>${r.name} ×${game.progress.supplies.items[id]}</b><p>${itemDefinition('supply:'+id).use} · ${r.mass} kg/个</p><button class="ui-button" data-use-supply="${id}" ${game.progress.supplies.items[id]?'':'disabled'}>使用${r.name}</button></section>`).join('');}
 // 底栏复用背包图标，只列出当前随身携带的手持武器。
 function renderWeaponList(){
  const section=panel.querySelector('[data-field-weapons]');
  section.hidden=mode!=='weapons';
  if(section.hidden)return;
  const list=section.querySelector('.field-weapon-list'),p=game.progress;
  const locked=game.arrivalCinematic||game.realm||game.story||game.fireActive||game.workshopTrial;
  list.innerHTML=WEAPONS.flatMap((weapon,index)=>{
   if(!carriedWeapon(p,index))return [];
   const selected=(game.loadout||p).weapon===index;
   return [`<button type="button" class="ui-button" data-field-weapon="${index}" aria-pressed="${selected}" ${locked?'disabled':''}>${inventoryIcon(itemDefinition('weapon:'+index))}<span>${weapon.name}</span></button>`];
  }).join('')||'<small>背包中还没有武器</small>';
  paintInventoryIcons(list,p);
  list.querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
  if(locked&&list.querySelector('button'))message='当前活动期间无法切换随身武器。';
 }
 // 详情按当前装备重新读取伤害、弹匣与备用弹量。
 function renderEquipment(){if(mode==='vehicle'&&!(game.loadout||game.progress).vehicleHulls[game.vehicle.index]){get('body').innerHTML='<p>当前没有自有载具，请到载具工坊选购。</p>';return;}const p=game.loadout||game.progress,permanent=finiteSupply(game),car=mode==='vehicle',v=game.vehicle,index=car?v.index:p.weapon,w=car?vehicleWeapon(p,v.weaponIndex):game.weapon(),mag=car?v.module?.magazine:game.magazines[index],f=permanent?vehicleFaults(game.progress,v.index):{gun:0,engine:0},load=car?vehicleLoad(game,index,{driver:true}):null,key=ammoKind(w),stock=car?game.progress.supplies.vehicles[index]:game.progress.supplies.hand;
  get('body').innerHTML=`<canvas id="field-equipment-image" width="320" height="180" style="width:100%;height:160px;object-fit:contain" aria-label="当前装备"></canvas><h3>${car?vehicleModel(index).name:WEAPONS[index].name}</h3>${car?`<p>当前载荷 ${load.payload.toFixed(2)} / ${load.capacity} kg</p>${load.overloaded?'<p role="status">载荷已满，无法移动，请清理货舱或随身背包。</p>':''}`:''}`+(car?`<p>车体 HP ${Math.ceil(v.hp)} / ${v.maxHp}</p><p>主炮：${w?.name||'未安装'}</p><section class="ui-inset"><b>主炮损坏 ${f.gun}% · 发动机损坏 ${f.engine}%</b><p>${f.gun>=100?'主炮停用。':f.gun?'主炮故障使射速降低。':'主炮正常。'}${f.engine>=100?'发动机停驶。':f.engine?'发动机故障使移动减速。':'发动机正常。'}完全损坏请送维修中心。</p></section>`:`<p>伤害 ${game.damage()} · 射程 ${Math.round(w.range)} · ${w.id==='water'?'水袋容量':'弹夹容量'} ${w.magazineSize}</p>`)+(w?.id==='water'?`<section class="ui-inset"><p class="equipment-ammo"><span class="ammo-symbol">${ammoIcon('waterbag')}</span><span>水袋 ${Math.floor(mag?.ammo||0)} / ${w.magazineSize} · ${Math.floor((mag?.ammo||0)/w.magazineSize*100)}%<br>可喷射 ${Math.floor(mag?.ammo||0)} 次</span></p><p>${permanent?'装备水枪靠近河流或湖泊自动补水，战斗和受击不会中断；离岸保留水量，空袋可消耗潮汐水罐装填。':'活动使用独立供给，不消耗随身库存。'}</p>${permanent?'<p>背包备用潮汐水罐 '+stock.water+' 份</p>':''}<p>从空袋补满约 ${Number(w.reloadTime.toFixed(2))} 秒；升级水袋增加容量，升级补水泵缩短补满时间。</p></section>`:key?`<p class="equipment-ammo"><span class="ammo-symbol">${ammoIcon(key)}</span><span>${AMMO_TYPES[key].name}：弹夹 ${Math.floor(mag?.ammo||0)} / ${w.magazineSize} · 备用 ${permanent?stock[key]+' 发 · '+AMMO_TYPES[key].mass+' kg/发':'活动独立供给，不消耗实物库存'}</span></p>`:'<p>该装备使用近战或独立能量，无需实物子弹。</p>')+(!car&&permanent&&key&&catAmmoWarehouse(game)?'<p>当前载具仓库 '+catAmmoWarehouse(game)[key]+' 发；背包备用耗尽后自动补给，取用量受背包余量限制。</p>':'')+(car?'<p>升级、改装及换炮请前往对应工坊，与屋内售货员交谈。</p>':'');
  if(car&&permanent)get('body').insertAdjacentHTML('beforeend',specialAmmoMarkup(game,w));
  drawWorkshopEquipment(get('image').getContext('2d'),p,car?'vehicle':'weapons',index);
 }
 // 猫猫优先背包并自动分流到当前自有载具，车用弹药仍受店旁装载规则约束。
 function renderShop(){
  const p=game.progress,car=target==='vehicle',stock=car?p.supplies.vehicles[game.vehicle.index]:p.supplies.hand,nearby=supplyVehicleNearby(game),warehouse=catAmmoWarehouse(game),fit=equippedAmmo(game,target);
  get('body').innerHTML=`<p>金币 ${p.coins} · 木头 ${p.wood} · 机械零件 ${p.materials.parts}</p><div class="logistics-actions" role="group" aria-label="弹药购买分类"><button class="ui-button ${car?'':'ui-button--primary'}" data-supply-target="hand" aria-pressed="${!car}">猫猫弹药</button><button class="ui-button ${car?'ui-button--primary':''}" data-supply-target="vehicle" aria-pressed="${car}">载具弹药</button></div>${ammoEquipmentMarkup(fit)}<p>点按或拖入购物车，补给优先送入店旁载具。</p><h3>${car?'载具':'猫猫'}弹药</h3>`+'<div class="shop-grid">'+ammoOffersMarkup(fit,stock,car&&!nearby,!car?warehouse:null)+'</div><h3>随身道具</h3><div class="shop-grid">'+Object.entries(SUPPLY_ITEMS).map(([id,r])=>`<section class="ui-section"><b>${r.name} · 已有 ${p.supplies.items[id]}</b><p>${itemDefinition('supply:'+id).use} · ${r.mass} kg</p><button class="ui-button" data-shop-good="supply:${id}" data-item-buy="${id}">加入购物车 · ${r.coins} 金币</button></section>`).join('')+'</div>';
  get('body').insertAdjacentHTML('beforeend','<section class="ui-section"><h3>野外装备</h3><p>帐篷、钓具与鱼获交易已迁至独立的户外用品店。</p><button class="ui-button" data-outdoor-shop>查看户外用品店</button></section>');
  get('body').insertAdjacentHTML('beforeend',`<section class="ui-section"><h3>探索工具</h3><span class="treasure-art">${inventoryIcon(itemDefinition('metal-detector'))}</span><b>金属探测器 · 1.2千克</b><p>反复使用，在手机寻宝页开启，循邻居线索找到埋藏装备。</p><button class="ui-button" data-shop-good="metal-detector" data-buy-detector ${p.treasure.detector?'disabled':''}>${p.treasure.detector?'已拥有':'加入购物车 · 180金币'}</button></section>`);
 }
 // 图标和文字都能点选，刷新详情后将键盘焦点留在该弹种上。
 scope.on(panel,'click',e=>{const button=e.target.closest('[data-special-ammo]');if(!button||button.disabled)return;const key=button.dataset.specialAmmo;const r=configureSpecialAmmo(game,{key});message=r.message;render();onChange();panel.querySelector('[data-special-ammo="'+key+'"]')?.focus({preventScroll:true});});
 // 标题与导航始终对应当前模式，其他车和其他枪没有浏览入口。
 function render(){renderWeaponList();const vehicle=mode==='vehicle',owned=game.progress.vehicleHulls[game.vehicle.index];
  const tabs=panel.querySelector('.vehicle-page-tabs');tabs.hidden=!vehicle;
  for(const tab of tabs.children){tab.setAttribute('aria-pressed',String(tab.dataset.vehicleTab===vehicleTab));tab.disabled=tab.dataset.vehicleTab!=='cockpit'&&!owned;}
  panel.querySelector('[data-field-nav]').parentElement.hidden=mode==='weapons'||vehicle&&vehicleTab!=='cockpit';
  get('title').textContent=mode==='ammo'?'弹药补给铺':mode==='items'?'随身道具':mode==='vehicle'?'当前载具':'当前武器';get('subtitle').textContent=mode==='ammo'?'购买弹药、准备材料制作与补充道具':mode==='items'?'选择随身道具使用':'查看当前装备状态';if(vehicle&&owned&&vehicleTab==='cargo')mountCargo(get('body'),game.vehicle.index);
  else if(vehicle&&owned&&vehicleTab==='se')get('body').innerHTML=finiteSupply(game)?vehicleSEMarkup(game,game.vehicle.index):'<p>当前活动使用独立装备。</p>';
  else if(mode==='ammo')renderShop();
  else if(mode==='items')get('body').innerHTML=items();
  else renderEquipment();
  get('message').textContent=message;panel.querySelector('[data-field-nav]').textContent=['ammo','items'].includes(mode)?'前往弹药补给铺':'前往载具工坊';}
 dialogs.register(panel.id,{focusId:'field-equipment-close',onOpen:render});
 // 只有屋内售货员能打开交易页，外部入口只负责导航。
 function open(kind='weapons',tab='cockpit'){vehicleTab=tab;mode=kind;get('body').scrollTop=0;message='';if(kind==='ammo'){if(game.cottage?.kind!=='ammo')return;target=supplyVehicleNearby(game)?'vehicle':'hand';}dialogs.open(panel.id);}
 // 从生命面板下方进入当前装置，焦点落在名称上，避免误触启停。
 scope.on(root.getElementById('vehicle-se-badges'),'click',e=>{
  const button=e.target.closest('[data-view-se]');if(!button)return;
  open('vehicle','se');
  const heading=panel.querySelector('[data-se-heading="'+button.dataset.viewSe+'"]');
  heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'});
 });
 scope.on(get('close'),'click',()=>dialogs.close(panel.id));
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.vehicleTab){vehicleTab=b.dataset.vehicleTab;message='';render();get('body').scrollTop=0;return;}if(b.dataset.seAction){const r=configureVehicleSE(game,game.vehicle.index,b.dataset.seKey,b.dataset.seAction,Number(b.dataset.seRadius));message=r.message;render();if(b.dataset.seRadius)panel.querySelector('[data-se-radius="'+b.dataset.seRadius+'"]')?.focus({preventScroll:true});onChange();return;}if(b.hasAttribute('data-field-weapon')){
  const index=Number(b.dataset.fieldWeapon);
  if(mode!=='weapons'||index===game.progress.weapon)return;
  if(!game.transact('weapons',index,'equip')){get('message').textContent='当前无法装备这把武器。';return;}
  for(const button of panel.querySelectorAll('[data-field-weapon]'))button.setAttribute('aria-pressed',String(button===b));
  renderEquipment();get('message').textContent='';onChange();return;
 }if(b.dataset.supplyTarget){target=b.dataset.supplyTarget;message='';render();panel.querySelector('[data-supply-target='+target+']').focus({preventScroll:true});return;}let result;if(b.hasAttribute('data-outdoor-shop')){onOutdoor();dialogs.transferResume(panel.id,'outdoor-dialog');dialogs.close(panel.id);return;}if(b.hasAttribute('data-buy-detector'))result=buyDetector(game);if(b.hasAttribute('data-field-nav')){const site=mode==='vehicle'?VEHICLE_WORKSHOP:AMMO_SHOP;requestWorldNavigation(game,{...site,y:site.y+22},'前往'+(site.name||'工坊'),{direct:true});for(const id of [panel.id,'current-cat-dialog'])if(root.getElementById(id)?.open)dialogs.close(id);onChange();return;}if(b.dataset.useSupply)result=useSupplyItem(game,b.dataset.useSupply);if(b.dataset.ammoBuy||b.dataset.ammoCraft||b.dataset.ammoBulk){loadConfirm.submit({batches:Number(b.dataset.batches||1),kind:'ammo',id:b.dataset.ammoBuy||b.dataset.ammoCraft||b.dataset.ammoBulk,craft:!!b.dataset.ammoCraft,target:b.dataset.ammoTarget});return;}if(b.dataset.itemBuy){loadConfirm.submit({kind:'item',id:b.dataset.itemBuy});return;}if(result){message=result.message;render();onChange();}});
 scope.on(panel,'close',()=>loadConfirm.cancel());
 scope.on(root,'close',e=>{if(['load-cleanup-quantity','inventory-transfer-dialog','load-cleanup-dialog','logistics-dialog'].includes(e.target.id)&&panel.open)render();},true);
 // 关闭应用时释放此实例事件与弹窗。
 function dispose(){loadConfirm.dispose();scope.dispose();panel.remove();}return {open,dispose};
}
