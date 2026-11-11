import {seDeviceIcon} from './se-device-icon.js';
import {VEHICLE_SE,SE_MAX_UPGRADE,SE_UPGRADE_EFFECTS,seBuild,seLevel,seUpgradeCost} from '../config/vehicle-se.js';
import {vehicleSEMarkup} from './vehicle-se.js';
import {configureVehicleSE} from '../core/vehicles/vehicle-se.js';
import {REGIONAL_CAMPS} from '../config/regional-camps.js';
import {refitMarkup,refitPreview} from './vehicle-refit.js';
import {vehicleRefitStats,redistributeVehicleZones,VEHICLE_ZONES} from '../config/vehicle-refit.js';
import {cleanupEntries} from '../core/inventory/load-cleanup.js';
import {vehicleCargoEntries} from '../core/inventory/inventory-transfer.js';
import {eraVehicle} from '../config/vehicle-eras.js';
import {inspectLogisticsLesson} from '../progression/story/mainline-logistics.js';
import {TREASURE_PARTS} from '../config/treasure.js';
import {treasurePartReason,transferTreasurePart,treasureWorkshopCargo} from '../core/activities/treasure.js';
import {inventoryIcon,paintInventoryIcons} from './inventory-icons.js';
import {itemDefinition} from '../config/items.js';
import {CAMP_WAREHOUSE,WOOD_ITEM} from '../config/wood-storage.js';
import {canStoreWood,storeWood,availableWood} from '../core/inventory/wood-storage.js';
// 背包货物与载具装配共用手机底板，显示正式重量、费用和保存失败原因。
import {mountMainGun} from '../core/vehicles/supplies.js';
import {VEHICLE_ARMAMENTS} from '../config/vehicle-armaments.js';
import {GUN_MASSES} from '../config/supplies.js';
import {createEventScope} from '../platform/events.js';
import {catLoad,vehicleLoad} from '../progression/inventory/load-weight.js';
import {vehicleBuild,VEHICLE_ENGINES,LOAD_RULES,armorPlateMass} from '../config/vehicle-load.js';
import {vehicleModel,vehicleMaxHp} from '../config/vehicles.js';
import {FARM_SEED_DOOR} from '../config/farm.js';
import {cargoAccessible,sellCrops,canSellCrops} from '../core/inventory/cargo.js';
import {configureVehicleBuild,vehicleBuildReason,vehicleBuildPrice} from '../core/vehicles/vehicle-build.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
// 按一位小数展示千克，运算仍使用原始重量。
export function kg(n){return Number(n.toFixed(1))+' kg';}
// 背包、货舱和装配使用独立状态；打开不会自动装卸或收费。
export function createLogistics({game,root,dialogs,onChange,mountCleanup,onTransfer}){
 const scope=createEventScope(),panel=root.createElement('dialog');panel.id='logistics-dialog';panel.className='ui-panel ui-page logistics';panel.setAttribute('aria-labelledby','logistics-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="logistics-title">载具仓库</h2><p id="logistics-subtitle"></p></div><button id="logistics-close" class="ui-close" aria-label="关闭货物与装配">×</button></header><div class="ui-panel__body" id="logistics-content"></div><footer class="ui-panel__footer"><p id="logistics-message" role="status"></p><button class="ui-button" data-load-action="close">返回</button></footer>';root.body.append(panel);
 let mode='cargo',hull=null,message='',refitTab='vehicle',draftZones=null;const get=id=>panel.querySelector('#logistics-'+id);
 // 负重进度条以文字解释过载，避免只依赖颜色判断状态。
 function meter(label,weight,capacity){return `<div class="ui-inset"><b>${label} ${kg(weight)} / ${kg(capacity)}</b><progress max="${capacity}" value="${Math.min(weight,capacity)}"></progress><small>${weight>=capacity?'载荷已满，超出 '+kg(weight-capacity):'剩余 '+kg(capacity-weight)}</small></div>`;}
 // 从实际背包和选中车型生成货物列表，切换车辆不会合并不同货舱。
 const cargo=root.createElement('section');
 // 将同一套货舱操作挂到载具页或独立仓库页，载具页固定查看当前车辆。
 function mountCargo(host,index,fixed=true){
  hull=index;
  host.replaceChildren(cargo);
  renderCargo(fixed);
  if(fixed&&inspectLogisticsLesson(game,'vehicleLoadViewed'))onChange();
 }
 // 总览先列出整车负重和实物货重，再展示装卸与清理操作。
 function renderCargo(fixed=false){
  const cat=catLoad(game),owned=game.progress.vehicleHulls.map((n,i)=>n?i:null).filter(i=>i!==null);if(!owned.includes(hull))hull=owned.includes(game.vehicle.index)?game.vehicle.index:owned[0]??null;
  const b=hull===null?null:vehicleBuild(game.progress,hull),v=hull===null?null:vehicleLoad(game,hull,{driver:true}),accessible=hull!==null&&cargoAccessible(game,hull);
  // 仓库按物品合并库存与可清理数量，弹药总数包含已装填部分。
  const stock=new Map(vehicleCargoEntries(game,hull).map(item=>[item.id,item]));
  if(hull!==null)for(const item of cleanupEntries(game,hull))stock.set(item.id,item);
  const rows=[...stock.values()];
  const picker=b&&!fixed?`<label class="inventory-transfer-field">当前载具<select data-cargo-hull aria-label="当前载具">${owned.map(i=>`<option value="${i}" ${i===hull?'selected':''}>${vehicleModel(i).name}</option>`).join('')}</select></label>`:'';
  const goodsWeight=rows.reduce((total,item)=>total+item.weight,0);
  cargo.innerHTML=(b?`${picker}<h3>${vehicleModel(hull).name} · 仓库总览</h3>${meter('载具载荷',v.payload,v.capacity)}<p>货物 ${rows.length} 类 · 共 ${kg(goodsWeight)}</p>${meter('随身背包',cat.weight,cat.capacity)}<div data-inline-cleanup></div>`:'<p>尚未拥有载具。</p>'+meter('随身背包',cat.weight,cat.capacity))+woodStorageMarkup()+`<div class="logistics-actions"><button class="ui-button" data-load-action="sell" ${canSellCrops(game)?'':'disabled'}>出售在场全部作物</button><button class="ui-button" data-load-action="market">前往收购点</button></div>`;
  cargo.insertAdjacentHTML('beforeend',treasureCargoMarkup()+'<p data-cargo-status role="status"></p>');
  paintInventoryIcons(cargo,game.progress);
  if(b)mountCleanup(cargo.querySelector('[data-inline-cleanup]'),hull,rows,accessible);

 }
 // 运输与工坊保管共享实物位置，贵重唯一件不放入一键丢弃列表。
 function treasureCargoMarkup(){const p=game.progress;return '<h3>探索部件</h3><p>未安装部件也占载荷；在载具工坊附近可存入工坊减负，之后再换装。唯一部件不会被一键清理丢弃。</p>'+TREASURE_PARTS.filter(part=>{const r=p.treasure.parts[part.id];return r&&(r.place==='workshop'||r.place==='cargo'&&r.hull===hull);}).map(part=>{const r=p.treasure.parts[part.id],stored=r.place==='workshop';return `<section class="ui-section"><div class="treasure-found"><span class="treasure-art">${inventoryIcon(itemDefinition(part.id))}</span><div><b>${part.name} ×1 · ${part.mass}千克</b><p>${part.description}</p><small>${stored?'工坊保管，不占载荷':'当前货舱，计入载荷'}</small></div></div><button class="ui-button" data-treasure-transfer="${part.id}" data-store="${stored?'load':'store'}" ${hull!==null&&treasureWorkshopCargo(game,hull)?'':'disabled'}>${stored?'装入所选载具':'存入工坊，卸下重量'}</button></section>`;}).join('');}
 // 仓库存量与待入库木材分开呈现，远离营地时只有导航可用。
 function woodStorageMarkup(){const p=game.progress,here=canStoreWood(game),bag=p.logistics.bagWood||0,car=hull===null?0:p.logistics.builds[hull].wood||0;return `<section class="ui-section"><h3>营地仓库</h3><p>已入库木头 ${p.wood} 份 · 仅仓库存量可用于建设和制作</p><p>待入库：背包 ${bag} 份 · 当前货舱 ${car} 份</p><p>木头每份 ${WOOD_ITEM.mass} kg。${here?'靠近小屋仓库，背包和附近载具的木材会自动入库。':'请带上木头靠近小屋仓库，自动存入。'}</p><div class="logistics-actions"><button class="ui-button ui-button--primary" data-load-action="store-wood" ${here&&availableWood(game)>0?'':'disabled'}>存入全部在场木材</button><button class="ui-button" data-load-action="warehouse">返回营地仓库</button></div></section>`;}

 // 发动机、装甲、耐久、载重与价格都来自同一正式配置。
 function renderLegacyFit(){
  const p=game.progress,b=vehicleBuild(p,hull),load=vehicleLoad(game,hull,{driver:true}),reason=vehicleBuildReason(game,hull),hp=vehicleMaxHp({...p,vehicleIndex:hull});
  get('content').innerHTML=`<h3>${vehicleModel(hull).name}</h3>${meter('当前载荷（货物与装配）',load.payload,load.capacity)}<p>HP ${hp} · 剩余牵引能力 ${kg(load.towCapacity)} · 持有金币 ${p.coins}</p><p>${reason||(eraVehicle(hull)?'动力和货载随车型升阶，改造原车可继承货物。':'装配保留当前耐久损耗比例。已买发动机可免费切换，拆下装甲存入工坊。')}</p>${eraVehicle(hull)?'':'<h3>发动机换装</h3>'}<div class="shop-grid">`+(eraVehicle(hull)?[]:VEHICLE_ENGINES).map((engine,i)=>{const cost=vehicleBuildPrice(p,hull,'engine',i),missing=engine.regional&&!b.engines.includes(i)?'请到'+REGIONAL_CAMPS.find(c=>c.id===engine.regional).name+'购买':engine.treasure?treasurePartReason(game,'engine:'+i,hull):'';return `<section class="ui-section"><b>${engine.name}${engine.treasure?' · 探索限定':''}</b><p>${engine.fixedMass?'机体重量 '+engine.fixedMass+'千克 · ':''}载重 ×${engine.payload} · 牵引 ×${engine.tow} · 速度 ×${engine.speed}</p><button class="ui-button" data-fit-engine="${i}" ${cost?'data-shop-name="'+engine.name+'" data-shop-price="'+cost+' 金币" data-shop-place="'+vehicleModel(hull).name+'发动机位"':''} ${reason||missing||b.engine===i||p.coins<cost?'disabled':''}>${b.engine===i?'已安装':missing?missing:engine.treasure?'安装探索发动机':b.engines.includes(i)?'免费换装':`加入购物车 · ${cost} 金币`}</button></section>`;}).join('')+
   `</div><section class="ui-section"><h3>叠加装甲 · ${b.plates} 层</h3><p>每层 +${vehicleModel(hull).hpGrowth} HP / +${kg(armorPlateMass(hull))}；工坊备用 ${b.spares} 层。装甲也占载重和牵引余量。</p><div class="logistics-actions"><button class="ui-button" data-fit-armor="add-armor" ${vehicleBuildPrice(p,hull,'add-armor')?'data-shop-name="装甲板" data-shop-price="'+vehicleBuildPrice(p,hull,'add-armor')+' 金币" data-shop-place="'+vehicleModel(hull).name+'车体"':''} ${reason||b.plates>=LOAD_RULES.maxPlates||p.coins<vehicleBuildPrice(p,hull,'add-armor')?'disabled':''}>加入购物车 · ${vehicleBuildPrice(p,hull,'add-armor')} 金币</button><button class="ui-button" data-fit-armor="remove-armor" ${reason||!b.plates?'disabled':''}>拆下一层</button></div></section>`;
  if(eraVehicle(hull))return;
  get('content').insertAdjacentHTML('beforeend','<h3>主炮换装 · 只受载重限制</h3><p>原车弹药退回原车，主炮损坏随炮保留。未装主炮存于工坊。</p>'+VEHICLE_ARMAMENTS.filter(w=>p.vehicleWeapons[w.weaponIndex]).map(w=>{const source=p.vehicleLoadouts.indexOf(w.weaponIndex),location=p.treasure.parts['gun:'+w.weaponIndex],missing=w.treasure?treasurePartReason(game,'gun:'+w.weaponIndex,hull):'';return `<section class="ui-section"><b>${w.name} · ${GUN_MASSES[w.weaponIndex]} kg</b><p>${location?.place==='cargo'?'货舱：'+vehicleModel(location.hull).name:source<0?'工坊库存':'安装于 '+vehicleModel(source).name} · 损坏 ${p.supplies.gunFaults[w.weaponIndex]}%</p><button class="ui-button" data-fit-gun="${w.weaponIndex}" ${source===hull||reason||missing?'disabled':''}>${source===hull?'已安装':missing||'拆取并安装'}</button></section>`;}).join('')+`<button class="ui-button" data-fit-gun="none" ${p.vehicleLoadouts[hull]===null||reason?'disabled':''}>拆下当前主炮</button>`);
 }
 // 装配旧事务保留，只把对应部件移入当前可视化视图。
 function renderFit(){
  renderLegacyFit();const content=get('content'),selector=refitTab==='engine'?'[data-fit-engine]':refitTab==='armor'?'[data-fit-armor]':refitTab==='vehicle'?'[data-fit-gun]':null;
  const cards=selector?[...new Set([...content.querySelectorAll(selector)].map(n=>n.closest('.ui-section')||n))]:[];
  draftZones??={...vehicleRefitStats(game.progress,hull).zones};
  content.innerHTML=refitMarkup(game,hull,refitTab,draftZones,vehicleBuildReason(game,hull));cards.forEach(n=>content.append(n));
 }
 // 改装台按车列出已购装置，库存中的装置同样保留强化等级。
 function renderSEWorkshop(){
  const owned=game.progress.vehicleHulls.flatMap((v,i)=>v?[i]:[]);
  if(!owned.includes(hull))hull=owned[0]??null;
  get('title').textContent='SE 改装工坊';
  get('subtitle').textContent='持有金币 · '+game.progress.coins;
  if(hull===null){get('content').textContent='尚未拥有载具。';return;}
  const build=seBuild(game.progress,hull);
  const selector='<label>选择载具 <select data-cargo-hull>'+owned.map(i=>'<option value="'+i+'" '+(hull===i?'selected':'')+'>'+vehicleModel(i).name+'</option>').join('')+'</select></label>';
  const rows=build.owned.map(key=>{
   const level=seLevel(build,key),price=seUpgradeCost(key,level);
   const button=level===SE_MAX_UPGRADE?'已达最高级':'改装至 +'+(level+1)+' · '+price+' 金币';
   return '<section class="ui-inset"><h3 class="se-device-title">'+seDeviceIcon(key)+VEHICLE_SE[key].name+' · +'+level+'</h3><p>每级'+SE_UPGRADE_EFFECTS[key]+'</p><button class="ui-button" data-se-key="'+key+'" data-se-action="upgrade" '+(level===SE_MAX_UPGRADE||price>game.progress.coins?'disabled':'')+'>'+button+'</button></section>';
  });
  get('content').innerHTML=selector+(rows.join('')||'<p>这辆车还没有 SE 装置。</p>');
 }
 // 仅操作后刷新，长列表不会被每帧重绘打断滚动。
 function render(){if(mode==='seUpgrade'){get('message').textContent=message;renderSEWorkshop();return;}get('title').textContent=mode==='fit'?'载具改造':'载具仓库';get('subtitle').textContent=mode==='fit'?'引擎 · 装甲 · 底盘区域，共同决定能力上限':'点击货物移到背包，装卸需靠近车辆';get('message').textContent=message;mode==='fit'?renderFit():mountCargo(get('content'),hull,false);if(mode==='fit'&&hull!==null)get('content').insertAdjacentHTML('beforeend',vehicleSEMarkup(game,hull,{fit:true}));}
 dialogs.register(panel.id,{focusId:'logistics-close',onOpen:render});
 // 从载具页面进入时将货舱放到文档末尾，使嵌套弹窗的触控层级与打开顺序一致。
 function open(nextMode='cargo',index=null){mode=nextMode;hull=index;message='';refitTab='vehicle';draftZones=null;if(!panel.open)root.body.append(panel);dialogs.open(panel.id);if(mode==='cargo'&&hull!==null&&inspectLogisticsLesson(game,'vehicleLoadViewed'))onChange();}
 // 两个仓库入口共用装卸、导航和入库事务。
 scope.on(cargo,'click',event=>{
  const node=event.target.closest('button');if(!node||node.disabled)return;let result;
  if(node.dataset.cargoItem){onTransfer(node.dataset.cargoItem,'unload',hull);return;}
  if(node.dataset.loadAction==='market'){requestWorldNavigation(game,FARM_SEED_DOOR,'前往作物收购点',{direct:true});for(const id of ['logistics-dialog','field-equipment-dialog','current-cat-dialog','phone-dialog'])if(root.getElementById(id)?.open)dialogs.close(id);onChange();return;}
  if(node.dataset.loadAction==='warehouse'){requestWorldNavigation(game,CAMP_WAREHOUSE,'返回营地仓库',{direct:true});for(const id of ['logistics-dialog','field-equipment-dialog','current-cat-dialog'])if(root.getElementById(id)?.open)dialogs.close(id);onChange();return;}
  if(node.dataset.loadAction==='store-wood')result=storeWood(game);
  if(node.dataset.loadAction==='sell')result=sellCrops(game);
  if(node.dataset.treasureTransfer)result=transferTreasurePart(game,node.dataset.treasureTransfer,hull,node.dataset.store==='store');
  if(result){renderCargo(!panel.contains(cargo));cargo.querySelector('[data-cargo-status]').textContent=result.message;onChange();}
 });
 scope.on(get('close'),'click',()=>dialogs.close(panel.id));

 scope.on(panel,'click',event=>{
  const node=event.target.closest('button');if(!node||node.disabled)return;let result;

  if(node.dataset.seAction){result=configureVehicleSE(game,hull,node.dataset.seKey,node.dataset.seAction);message=result.message;render();onChange();return;}
  if(node.dataset.refitTab){refitTab=node.dataset.refitTab;render();return;}
  if(node.hasAttribute('data-refit-reset')){draftZones=null;render();return;}
  if(node.dataset.refitAction)result=configureVehicleBuild(game,hull,node.dataset.refitAction,draftZones);
  if(node.dataset.loadAction==='close'){dialogs.close(panel.id);return;}
  if(node.dataset.fitEngine!==undefined)result=configureVehicleBuild(game,hull,'engine',Number(node.dataset.fitEngine));
  if(node.dataset.fitGun!==undefined)result=mountMainGun(game,hull,node.dataset.fitGun==='none'?null:Number(node.dataset.fitGun));
  if(node.dataset.fitArmor)result=configureVehicleBuild(game,hull,node.dataset.fitArmor);
  if(result){message=result.message;if(result.ok)draftZones=null;render();onChange();}
 });
 // 原生滑动期间仅更新预览和数值，避免重建控件打断触摸。
 scope.on(panel,'input',e=>{const id=e.target.dataset.refitZone;if(!id)return;draftZones=redistributeVehicleZones(draftZones,id,Number(e.target.value));const r=vehicleRefitStats(game.progress,hull);panel.querySelector('[data-refit-preview]').innerHTML=refitPreview(game,hull,draftZones);for(const z of VEHICLE_ZONES){panel.querySelector('[data-refit-zone="'+z.id+'"]').value=draftZones[z.id];panel.querySelector('[data-zone-value="'+z.id+'"]').textContent=draftZones[z.id]+'%';panel.querySelector('[data-zone-strength="'+z.id+'"]').textContent=Math.round((.5+r.space*draftZones[z.id]/4000)*100)+'%';}});
 scope.on(panel,'change',e=>{if(e.target.matches('[data-cargo-hull]')){hull=Number(e.target.value);render();}});
 scope.on(root,'close',e=>{if(['load-cleanup-quantity','load-cleanup-dialog','inventory-transfer-dialog'].includes(e.target.id)&&panel.open)render();},true);
 // 销毁时释放本页面事件和DOM。
 function dispose(){scope.dispose();panel.remove();}
 return {open,mountCargo,dispose};
}
