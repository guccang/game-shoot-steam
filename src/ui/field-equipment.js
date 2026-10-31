import {itemDefinition} from '../config/items.js';
// 主界面只查看当前装备，补给页与道具操作使用统一手机底板。
import {finiteSupply} from '../combat/supply-ammo.js';
import {createEventScope} from '../platform/events.js';
import {AMMO_TYPES,AMMO_SHOP,SUPPLY_ITEMS,ammoKind,vehicleFaults} from '../config/supplies.js';
import {WEAPONS} from '../config/weapons.js';
import {vehicleModel,vehicleWeapon} from '../config/vehicles.js';
import {vehicleLoad} from '../progression/load-weight.js';
import {drawWorkshopEquipment} from '../rendering/workshop.js';
import {tradeSupply,useSupplyItem,supplyVehicleNearby} from '../core/supplies.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import {WORKSHOP,VEHICLE_WORKSHOP} from '../world/workshop.js';
// 页面只在打开或用户操作后渲染，不中断滚动，不提供目录、升级或改装按钮。
export function createFieldEquipment({game,root,dialogs,onChange}){
 const scope=createEventScope(),panel=root.createElement('dialog');let mode='weapons',target='hand',message='';panel.id='field-equipment-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','field-equipment-title');panel.innerHTML='<header class="ui-panel__header"><div><h2 id="field-equipment-title"></h2><p id="field-equipment-subtitle"></p></div><button id="field-equipment-close" class="ui-close" aria-label="关闭当前装备">×</button></header><div class="ui-panel__body" id="field-equipment-body"></div><footer class="ui-panel__footer" style="display:block"><p id="field-equipment-message" role="status"></p><button class="ui-button" data-field-nav>前往工坊</button></footer>';root.body.append(panel);const get=id=>root.getElementById('field-equipment-'+id);
 // 道具数量与实际效果来自同一正式配置。
 function items(){return '<h3>随身道具</h3>'+Object.entries(SUPPLY_ITEMS).map(([id,r])=>`<section class="ui-section"><b>${r.name} ×${game.progress.supplies.items[id]}</b><p>${itemDefinition('supply:'+id).use} · ${r.mass} kg/个</p><button class="ui-button" data-use-supply="${id}" ${game.progress.supplies.items[id]?'':'disabled'}>使用${r.name}</button></section>`).join('');}
 // 当前装备页不创建其他装备按钮或购买控件。
 function renderEquipment(){if(mode==='vehicle'&&!(game.loadout||game.progress).vehicleHulls[game.vehicle.index]){get('body').innerHTML='<p>当前没有自有载具，请到载具工坊选购。</p>';return;}const p=game.loadout||game.progress,permanent=finiteSupply(game),car=mode==='vehicle',v=game.vehicle,index=car?v.index:p.weapon,w=car?vehicleWeapon(p,v.weaponIndex):game.weapon(),mag=car?v.module?.magazine:game.magazines[index],f=permanent?vehicleFaults(game.progress,v.index):{gun:0,engine:0},load=car?vehicleLoad(game,index,{driver:true}):null,key=ammoKind(w),stock=car?game.progress.supplies.vehicles[index]:game.progress.supplies.hand;
  get('body').innerHTML=`<canvas id="field-equipment-image" width="320" height="180" style="width:100%;height:160px;object-fit:contain" aria-label="当前装备"></canvas><h3>${car?vehicleModel(index).name:WEAPONS[index].name}</h3>${car?`<p>当前载荷 ${load.payload.toFixed(2)} / ${load.capacity} kg</p>`:''}`+(car?`<p>车体 HP ${Math.ceil(v.hp)} / ${v.maxHp}</p><p>主炮：${w?.name||'未安装'}</p><section class="ui-inset"><b>主炮损坏 ${f.gun}% · 发动机损坏 ${f.engine}%</b><p>${f.gun>=100?'主炮停用。':f.gun?'主炮故障使射速降低。':'主炮正常。'}${f.engine>=100?'发动机停驶。':f.engine?'发动机故障使移动减速。':'发动机正常。'}完全损坏请送维修中心。</p></section>`:`<p>伤害 ${game.damage()} · 射程 ${Math.round(w.range)} · 弹夹容量 ${w.magazineSize}</p>`)+(key?`<p>${AMMO_TYPES[key].name}：弹夹 ${Math.floor(mag?.ammo||0)} / ${w.magazineSize} · 备用 ${permanent?stock[key]+' 发 · '+AMMO_TYPES[key].mass+' kg/发':'活动独立供给，不消耗实物库存'}</p>`:'<p>该装备使用近战或独立能量，无需实物子弹。</p>')+'<p>升级、改装及换炮请前往对应工坊，与屋内售货员交谈。</p>';
  drawWorkshopEquipment(get('image').getContext('2d'),p,car?'vehicle':'weapons',index);
 }
 // 弹药购买和制作只在柜台受理，车载弹药需车辆实际停在店旁。
 function renderShop(){const p=game.progress,stock=target==='vehicle'?p.supplies.vehicles[game.vehicle.index]:p.supplies.hand;get('body').innerHTML=`<p>金币 ${p.coins} · 木头 ${p.wood} · 机械零件 ${p.materials.parts}</p><label>弹药放入<select id="field-supply-target" class="ui-button" style="display:block;width:100%"><option value="hand" ${target==='hand'?'selected':''}>猫猫背包</option><option value="vehicle" ${target==='vehicle'?'selected':''}>当前载具货舱</option></select></label><p>${target==='vehicle'&&!supplyVehicleNearby(game)?'请把当前载具停入本店车位或停在店旁再装弹。':'弹药和道具计入负重，买多后可超载，请按需要补给。'}</p><h3>弹药购买与制作</h3>`+Object.entries(AMMO_TYPES).map(([id,r])=>`<section class="ui-section"><b>${r.name} · 库存 ${stock[id]} 发</b><p>每包 ${r.pack} 发 · ${r.mass*r.pack} kg</p><div class="logistics-actions"><button class="ui-button" data-ammo-buy="${id}">购买一包 · ${r.coins} 金币</button><button class="ui-button" data-ammo-craft="${id}">制作一包 · ${r.wood} 木头${r.parts?' + '+r.parts+' 零件':''}</button></div></section>`).join('')+'<h3>道具购买</h3>'+Object.entries(SUPPLY_ITEMS).map(([id,r])=>`<section class="ui-section"><b>${r.name} · 已有 ${p.supplies.items[id]}</b><p>${itemDefinition('supply:'+id).use} · ${r.mass} kg</p><button class="ui-button" data-item-buy="${id}">购买 · ${r.coins} 金币</button></section>`).join('');}
 // 标题与导航始终对应当前模式，其他车和其他枪没有浏览入口。
 function render(){get('title').textContent=mode==='ammo'?'弹药补给铺':mode==='items'?'随身道具':mode==='vehicle'?'当前载具':'当前武器';get('subtitle').textContent=mode==='ammo'?'购买弹药、准备材料制作与补充道具':mode==='items'?'选择随身道具使用':'查看当前装备状态';mode==='ammo'?renderShop():mode==='items'?get('body').innerHTML=items():renderEquipment();get('message').textContent=message;panel.querySelector('[data-field-nav]').textContent=['ammo','items'].includes(mode)?'前往弹药补给铺':'前往'+(mode==='vehicle'?'载具':'武器')+'工坊';}
 dialogs.register(panel.id,{focusId:'field-equipment-close',onOpen:render});
 // 只有屋内售货员能打开交易页，外部入口只负责导航。
 function open(kind='weapons'){mode=kind;message='';if(kind==='ammo'&&game.cottage?.kind!=='ammo')return;dialogs.open(panel.id);}
 scope.on(get('close'),'click',()=>dialogs.close(panel.id));scope.on(panel,'change',e=>{if(e.target.id==='field-supply-target'){target=e.target.value;render();}});
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;let result;if(b.hasAttribute('data-field-nav')){const site=mode==='vehicle'?VEHICLE_WORKSHOP:mode==='weapons'?WORKSHOP:AMMO_SHOP;requestWorldNavigation(game,{...site,y:site.y+22},'前往'+(site.name||'工坊'),{direct:true});for(const id of [panel.id,'backpack-dialog'])if(root.getElementById(id)?.open)dialogs.close(id);onChange();return;}if(b.dataset.useSupply)result=useSupplyItem(game,b.dataset.useSupply);if(b.dataset.ammoBuy||b.dataset.ammoCraft)result=tradeSupply(game,{kind:'ammo',id:b.dataset.ammoBuy||b.dataset.ammoCraft,craft:!!b.dataset.ammoCraft,target});if(b.dataset.itemBuy)result=tradeSupply(game,{kind:'item',id:b.dataset.itemBuy});if(result){message=result.message;render();onChange();}});
 // 关闭应用时释放此实例事件与弹窗。
 function dispose(){scope.dispose();panel.remove();}return {open,dispose};
}
