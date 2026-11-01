import {TREASURE_PARTS} from '../config/treasure.js';
import {treasurePartReason,transferTreasurePart,treasureWorkshopCargo} from '../core/treasure.js';
import {inventoryIcon} from './inventory-icons.js';
import {itemDefinition} from '../config/items.js';
import {CAMP_WAREHOUSE,WOOD_ITEM} from '../config/wood-storage.js';
import {canStoreWood,storeWood,transferWood,availableWood} from '../core/wood-storage.js';
// 背包货物与载具装配共用手机底板，显示正式重量、费用和保存失败原因。
import {mountMainGun,transferSupplyAmmo} from '../core/supplies.js';
import {VEHICLE_ARMAMENTS} from '../config/vehicle-armaments.js';
import {GUN_MASSES,AMMO_TYPES} from '../config/supplies.js';
import {createEventScope} from '../platform/events.js';
import {catLoad,vehicleLoad,cropMass} from '../progression/load-weight.js';
import {vehicleBuild,VEHICLE_ENGINES,LOAD_RULES,armorPlateMass} from '../config/vehicle-load.js';
import {vehicleModel,vehicleMaxHp} from '../config/vehicles.js';
import {FARM_CROPS,FARM_SEED_DOOR} from '../config/farm.js';
import {transferCargo,cargoAccessible,sellCrops,canSellCrops} from '../core/cargo.js';
import {configureVehicleBuild,vehicleBuildReason,vehicleBuildPrice} from '../core/vehicle-build.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
// 按一位小数展示千克，运算仍使用原始重量。
export function kg(n){return Number(n.toFixed(1))+' kg';}
// 背包、货舱和装配使用独立状态；打开不会自动装卸或收费。
export function createLogistics({game,root,dialogs,onChange,onCleanup}){
 const scope=createEventScope(),panel=root.createElement('dialog');panel.id='logistics-dialog';panel.className='ui-panel ui-page logistics';panel.setAttribute('aria-labelledby','logistics-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="logistics-title">载具仓库</h2><p id="logistics-subtitle"></p></div><button id="logistics-close" class="ui-close" aria-label="关闭货物与装配">×</button></header><div class="ui-panel__body" id="logistics-content"></div><footer class="ui-panel__footer"><p id="logistics-message" role="status"></p><button class="ui-button" data-load-action="close">返回</button></footer>';root.body.append(panel);
 let mode='cargo',hull=null,message='';const get=id=>panel.querySelector('#logistics-'+id);
 // 负重进度条以文字解释过载，避免只依赖颜色判断状态。
 function meter(label,weight,capacity){return `<div class="ui-inset"><b>${label} ${kg(weight)} / ${kg(capacity)}</b><progress max="${capacity}" value="${Math.min(weight,capacity)}"></progress><small>${weight>=capacity?'载荷已满，超出 '+kg(weight-capacity):'剩余 '+kg(capacity-weight)}</small></div>`;}
 // 从实际背包和选中车型生成货物列表，切换车辆不会合并不同货舱。
 function renderCargo(){
  const cat=catLoad(game),owned=game.progress.vehicleHulls.map((n,i)=>n?i:null).filter(i=>i!==null);if(!owned.includes(hull))hull=owned.includes(game.vehicle.index)?game.vehicle.index:owned[0]??null;
  const b=hull===null?null:vehicleBuild(game.progress,hull),v=hull===null?null:vehicleLoad(game,hull,{driver:true}),accessible=hull!==null&&cargoAccessible(game,hull);
  get('content').innerHTML=(b?`<h3>${vehicleModel(hull).name} · 仓库</h3>${meter('载荷（含驾驶员）',v.payload,v.capacity)}<p>${accessible?'可以装卸。':'请到这辆车旁装卸。'}车辆超载时无法移动。</p><div class="logistics-actions"><button class="ui-button" data-load-action="cleanup-vehicle" ${accessible?'':'disabled'}>整理载具仓库</button></div>`:'<p>尚未拥有载具。</p>')+woodStorageMarkup()+meter('随身背包',cat.weight,cat.capacity)+`<p>空车含货物总重 ${v?kg(vehicleLoad(game,hull,{driver:false}).mass):'0 kg'} · 剩余牵引能力 ${v?kg(v.towCapacity):'0 kg'}。随身物品的查看与整理请打开当前猫猫。</p><div class="logistics-actions"><button class="ui-button" data-load-action="sell" ${canSellCrops(game)?'':'disabled'}>出售在场全部作物</button><button class="ui-button" data-load-action="market">前往收购点</button></div>`+
   FARM_CROPS.map((crop,i)=>({crop,i,bag:game.progress.farm.inventory[i],car:b?.cargo[i]||0})).filter(r=>r.bag||r.car).map(r=>`<section class="ui-section"><h3>${r.crop.name} · 每份 ${kg(cropMass(r.i))}</h3><p>背包 ${r.bag} · 货舱 ${r.car} · 收购价 ${r.crop.value} 金币/份</p><div class="logistics-actions">${[['load',r.bag,'装入'],['unload',r.car,'取出']].flatMap(([action,n,label])=>[1,10,n].filter((count,i,all)=>count>0&&all.indexOf(count)===i).map(count=>`<button class="ui-button" data-cargo="${action}" data-crop="${r.i}" data-count="${count}" ${accessible&&n>=count?'':'disabled'}>${label} ${count}</button>`)).join('')}</div></section>`).join('');
  get('content').insertAdjacentHTML('beforeend','<h3>实物弹药装卸</h3>'+Object.entries(AMMO_TYPES).map(([key,r])=>{const bag=game.progress.supplies.hand[key],car=hull===null?0:game.progress.supplies.vehicles[hull][key];return `<section class="ui-section"><b>${r.name} · ${r.mass} kg/发</b><p>背包 ${bag} 发 · 货舱 ${car} 发</p><div class="logistics-actions">${[['load',bag,'装入'],['unload',car,'取出']].flatMap(([direction,n,label])=>[1,r.pack,n].filter((count,i,a)=>count>0&&a.indexOf(count)===i).map(count=>`<button class="ui-button" data-ammo-transfer="${direction}" data-ammo-key="${key}" data-count="${count}" ${accessible&&n>=count?'':'disabled'}>${label} ${count} 发</button>`)).join('')}</div></section>`;}).join(''));

 }
 // 运输与工坊保管共享实物位置，贵重唯一件不放入一键丢弃列表。
 function treasureCargoMarkup(){const p=game.progress;return '<h3>探索部件</h3><p>未安装部件也占载荷；在载具工坊附近可存入工坊减负，之后再换装。唯一部件不会被一键清理丢弃。</p>'+TREASURE_PARTS.filter(part=>{const r=p.treasure.parts[part.id];return r&&(r.place==='workshop'||r.place==='cargo'&&r.hull===hull);}).map(part=>{const r=p.treasure.parts[part.id],stored=r.place==='workshop';return `<section class="ui-section"><div class="treasure-found"><span class="treasure-art">${inventoryIcon(itemDefinition(part.id))}</span><div><b>${part.name} ×1 · ${part.mass}千克</b><p>${part.description}</p><small>${stored?'工坊保管，不占载荷':'当前货舱，计入载荷'}</small></div></div><button class="ui-button" data-treasure-transfer="${part.id}" data-store="${stored?'load':'store'}" ${hull!==null&&treasureWorkshopCargo(game,hull)?'':'disabled'}>${stored?'装入所选载具':'存入工坊，卸下重量'}</button></section>`;}).join('');}
 // 仓库存量与待入库木材分开呈现，远离营地时只有导航可用。
 function woodStorageMarkup(){const p=game.progress,here=canStoreWood(game),bag=p.logistics.bagWood||0,car=hull===null?0:p.logistics.builds[hull].wood||0,accessible=hull!==null&&cargoAccessible(game,hull);return `<section class="ui-section"><h3>营地仓库</h3><p>已入库木头 ${p.wood} 份 · 仅仓库存量可用于建设和制作</p><p>待入库：背包 ${bag} 份 · 当前货舱 ${car} 份</p><p>木头每份 ${WOOD_ITEM.mass} kg。${here?'靠近小屋仓库，背包和附近载具的木材会自动入库。':'请带上木头靠近小屋仓库，自动存入。'}</p><div class="logistics-actions"><button class="ui-button ui-button--primary" data-load-action="store-wood" ${here&&availableWood(game)>0?'':'disabled'}>存入全部在场木材</button><button class="ui-button" data-load-action="warehouse">返回营地仓库</button></div></section>`+(hull===null?'':`<section class="ui-section"><h3>木材装卸</h3><p>背包 ${bag} 份 · ${vehicleModel(hull).name} ${car} 份</p><div class="logistics-actions">`+[['load',bag,'装入货舱'],['unload',car,'取回背包']].flatMap(([direction,n,label])=>[1,10,n].filter((count,i,all)=>count>0&&all.indexOf(count)===i).map(count=>`<button class="ui-button" data-wood-transfer="${direction}" data-count="${count}" ${accessible&&n>=count?'':'disabled'}>${label} ${count} 份</button>`)).join('')+'</div></section>');}
 // 发动机、装甲、耐久、载重与价格都来自同一正式配置。
 function renderFit(){
  const p=game.progress,b=vehicleBuild(p,hull),load=vehicleLoad(game,hull,{driver:true}),reason=vehicleBuildReason(game,hull),hp=vehicleMaxHp({...p,vehicleIndex:hull});
  get('content').innerHTML=`<h3>${vehicleModel(hull).name}</h3>${meter('当前载荷（含驾驶员）',load.payload,load.capacity)}<p>HP ${hp} · 剩余牵引能力 ${kg(load.towCapacity)} · 持有金币 ${p.coins}</p><p>${reason||'装配保留当前耐久损耗比例。已买发动机可免费切换，拆下装甲存入工坊。'}</p><h3>发动机换装</h3>`+VEHICLE_ENGINES.map((engine,i)=>{const cost=vehicleBuildPrice(p,hull,'engine',i),missing=engine.treasure?treasurePartReason(game,'engine:'+i,hull):'';return `<section class="ui-section"><b>${engine.name}${engine.treasure?' · 探索限定':''}</b><p>${engine.fixedMass?'机体重量 '+engine.fixedMass+'千克 · ':''}载重 ×${engine.payload} · 牵引 ×${engine.tow} · 速度 ×${engine.speed}</p><button class="ui-button" data-fit-engine="${i}" ${reason||missing||b.engine===i||p.coins<cost?'disabled':''}>${b.engine===i?'已安装':missing?missing:engine.treasure?'安装探索发动机':b.engines.includes(i)?'免费换装':`购买并安装 · ${cost} 金币`}</button></section>`;}).join('')+
   `<section class="ui-section"><h3>叠加装甲 · ${b.plates} 层</h3><p>每层 +${vehicleModel(hull).hpGrowth} HP / +${kg(armorPlateMass(hull))}；工坊备用 ${b.spares} 层。装甲也占载重和牵引余量。</p><div class="logistics-actions"><button class="ui-button" data-fit-armor="add-armor" ${reason||b.plates>=LOAD_RULES.maxPlates||p.coins<vehicleBuildPrice(p,hull,'add-armor')?'disabled':''}>加装一层 · ${vehicleBuildPrice(p,hull,'add-armor')} 金币</button><button class="ui-button" data-fit-armor="remove-armor" ${reason||!b.plates?'disabled':''}>拆下一层</button></div></section>`;
  get('content').insertAdjacentHTML('beforeend','<h3>主炮换装 · 只受载重限制</h3><p>原车弹药退回原车，主炮损坏随炮保留。未装主炮存于工坊。</p>'+VEHICLE_ARMAMENTS.filter(w=>p.vehicleWeapons[w.weaponIndex]).map(w=>{const source=p.vehicleLoadouts.indexOf(w.weaponIndex),location=p.treasure.parts['gun:'+w.weaponIndex],missing=w.treasure?treasurePartReason(game,'gun:'+w.weaponIndex,hull):'';return `<section class="ui-section"><b>${w.name} · ${GUN_MASSES[w.weaponIndex]} kg</b><p>${location?.place==='cargo'?'货舱：'+vehicleModel(location.hull).name:source<0?'工坊库存':'安装于 '+vehicleModel(source).name} · 损坏 ${p.supplies.gunFaults[w.weaponIndex]}%</p><button class="ui-button" data-fit-gun="${w.weaponIndex}" ${source===hull||reason||missing?'disabled':''}>${source===hull?'已安装':missing||'拆取并安装'}</button></section>`;}).join('')+`<button class="ui-button" data-fit-gun="none" ${p.vehicleLoadouts[hull]===null||reason?'disabled':''}>拆下当前主炮</button>`);
 }
 // 仅操作后刷新，长列表不会被每帧重绘打断滚动。
 function render(){get('title').textContent=mode==='fit'?'载具装配':'载具仓库';get('subtitle').textContent=mode==='fit'?'发动机决定运力，装甲增加耐久和重量':'木材运回营地入库，作物携带到收购点出售';get('message').textContent=message;mode==='fit'?renderFit():renderCargo();if(mode!=='fit')get('content').insertAdjacentHTML('beforeend',treasureCargoMarkup());}
 dialogs.register(panel.id,{focusId:'logistics-close',onOpen:render});
 // 从载具页面进入时将货舱放到文档末尾，使嵌套弹窗的触控层级与打开顺序一致。
 function open(nextMode='cargo',index=null){mode=nextMode;hull=index;message='';if(!panel.open)root.body.append(panel);dialogs.open(panel.id);}
 scope.on(get('close'),'click',()=>dialogs.close(panel.id));

 scope.on(panel,'click',event=>{
  const node=event.target.closest('button');if(!node||node.disabled)return;let result;

  if(node.dataset.loadAction==='cleanup-vehicle'){onCleanup(hull);return;}
  if(node.dataset.loadAction==='close'){dialogs.close(panel.id);return;}
  if(node.dataset.loadAction==='market'){requestWorldNavigation(game,FARM_SEED_DOOR,'前往作物收购点',{direct:true});for(const id of ['logistics-dialog','field-equipment-dialog','current-cat-dialog','phone-dialog'])if(root.getElementById(id)?.open)dialogs.close(id);onChange();return;}
  if(node.dataset.loadAction==='warehouse'){requestWorldNavigation(game,CAMP_WAREHOUSE,'返回营地仓库',{direct:true});for(const id of ['logistics-dialog','field-equipment-dialog','current-cat-dialog'])if(root.getElementById(id)?.open)dialogs.close(id);onChange();return;}
  if(node.dataset.loadAction==='store-wood')result=storeWood(game);
  if(node.dataset.woodTransfer)result=transferWood(game,hull,Number(node.dataset.count),node.dataset.woodTransfer);
  if(node.dataset.loadAction==='sell')result=sellCrops(game);
  if(node.dataset.ammoTransfer)result=transferSupplyAmmo(game,hull,node.dataset.ammoKey,Number(node.dataset.count),node.dataset.ammoTransfer);
  if(node.dataset.cargo)result=transferCargo(game,hull,Number(node.dataset.crop),Number(node.dataset.count),node.dataset.cargo);
  if(node.dataset.treasureTransfer)result=transferTreasurePart(game,node.dataset.treasureTransfer,hull,node.dataset.store==='store');
  if(node.dataset.fitEngine!==undefined)result=configureVehicleBuild(game,hull,'engine',Number(node.dataset.fitEngine));
  if(node.dataset.fitGun!==undefined)result=mountMainGun(game,hull,node.dataset.fitGun==='none'?null:Number(node.dataset.fitGun));
  if(node.dataset.fitArmor)result=configureVehicleBuild(game,hull,node.dataset.fitArmor);
  if(result){message=result.message;render();onChange();}
 });
 scope.on(root,'close',e=>{if(e.target.id==='load-cleanup-dialog'&&panel.open)render();},true);
 // 销毁时释放本页面事件和DOM。
 function dispose(){scope.dispose();panel.remove();}
 return {open,dispose};
}
