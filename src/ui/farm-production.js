import {cartProductIcon} from './cart-product-icon.js';
import {HORSE_PRICE} from '../config/vehicle-eras.js';
// 农矿生产页面复用手机底板；世界选址、配方与实际补给均提交正式核心规则。
import {pastureOpen,PEN_GATE,PASTURE} from '../config/pasture.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {createEventScope} from '../platform/events.js';
import {PRODUCTION as P,PRODUCTION_BUILDINGS,PRODUCTION_RECIPES} from '../config/farm-production.js';
import {FARM_CROPS,FARM_WATER} from '../config/farm.js';
import {productionGoal,productionUnlocked,productionIngredients,productionCropStock} from '../progression/farming/farm-production.js';
import {tendPasture,upgradeWateringCan,productionAvailable,productionPlacement,placeProduction,setProductionKeep,craftProduction,useProduction,nearProductionBench,pickupSprinkler,carriedSprinkler,removeProduction,storeSprinkler} from '../core/farming/farm-production.js';
import {productionIcon} from '../rendering/farm-production.js';
import {worldDistance} from '../world/coordinates.js';
import {currentMineLayer} from '../core/mining/mine-layers.js';
// 初次进入默认展示当前目标，三个分区保持独立滚动和稳定控件。
export function createFarmProduction({game,root,renderer,input,dialogs,onNotice,onChange,onPlacementStart}){
 const scope=createEventScope(),menu=root.createElement('button'),dialog=root.createElement('dialog'),placement=root.createElement('div');let tab='build',selection=null,signature='',pending=null,removal=null;
 menu.id='production-menu';
 menu.type='button';
 menu.innerHTML=productionIcon('sprinkler')+'<span>农矿生产</span>';
 menu.setAttribute('aria-label','查看农矿生产与补给');
 menu.setAttribute('aria-haspopup','dialog');
 menu.setAttribute('aria-controls','production-dialog');
 root.getElementById('field-menu-items').append(menu);
 const mineMenu=root.createElement('button');mineMenu.id='mine-production';mineMenu.className='ui-button';mineMenu.textContent='补给';mineMenu.setAttribute('aria-label','地下补给与剩余效果');root.querySelector('#mine-controls .mine-actions').append(mineMenu);
 dialog.id='production-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','production-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="production-title" tabindex="-1">农矿生产</h2><p id="production-wallet"></p></div><button class="ui-close" data-production-close aria-label="关闭农矿生产">×</button></header><div class="ui-panel__body"><section class="ui-inset production-goal"><h3>当前目标</h3><p id="production-goal"></p></section><nav class="production-tabs" aria-label="生产分类"><button class="ui-button" data-production-tab="build">设施</button><button class="ui-button" data-production-tab="tools">农具</button><button class="ui-button" data-production-tab="keep">原料</button><button class="ui-button" data-production-tab="supply">补给</button></nav><div id="production-body"></div></div><footer class="ui-panel__footer"><p id="production-result" role="status"></p><button class="ui-button" data-production-close>回到场景</button></footer>';
 root.body.append(dialog);placement.id='production-placement';placement.hidden=true;placement.innerHTML='<p role="status"></p><button class="ui-button" data-production-cancel>取消</button><button class="ui-button ui-button--primary" data-production-place>确认位置</button><button class="ui-button" data-production-store-held hidden>收回背包</button>';root.getElementById('game-frame').append(placement);
 const body=dialog.querySelector('#production-body'),result=dialog.querySelector('#production-result');
 // 反馈在原页面显示，失败不关闭页面或偷偷重新提交。
 function report(r){result.textContent=r.message;onNotice?.(r.message);signature='';if(r.ok)onChange?.();render();}
 // 仅根据已解锁或有库存的作物生成候选，避免显示六十行无关空货。
 function keepMarkup(){const s=game.progress.production;if(!s.bench)return '<section class="ui-section"><p>建好农产加工台后，可以选择出售或保留收成。</p></section>';const advanced=s.mealDigs>=P.lessonDigs;return '<section class="ui-inset"><p>一块田的一茬收成算1份。保留数量由背包与在场载具共同分配，出售入口均会保护；加工可直接使用背包与已拥有载具仓库的原料，优先消耗背包。保留不发金币。</p><p>'+ (advanced?'可设置0至20份，0表示全部出售。':'入门可保留2份；便当加速开掘20次后可自定义上限。')+'</p></section>'+FARM_CROPS.map((c,i)=>game.progress.farm.unlocked[i]||productionCropStock(game.progress,i).total||s.keep[i]?`<section class="ui-section production-row"><h3>${c.name}</h3><p>背包 ${productionCropStock(game.progress,i).bag}份 · 载具仓库 ${productionCropStock(game.progress,i).vehicles}份 · 每份售价 ${c.value}金币</p><label>保留上限 <select data-production-keep="${i}" aria-label="${c.name}保留数量">${(advanced?Array.from({length:21},(_,n)=>n):[0,2]).map(n=>`<option value="${n}" ${s.keep[i]===n?'selected':''}>${n?n+'份':'全部出售'}</option>`).join('')}</select></label></section>`:'').join('');}
 // 设备清单同时提供真实位置与移动入口，已有设施无需重造。
 function buildMarkup(){const s=game.progress.production;return '<section class="ui-inset"><h3>背包设施</h3><p>简易洒水器 ×'+(s.sprinklerInventory||0)+' · 重新放置不消耗材料</p><button class="ui-button ui-button--primary" data-production-from-bag '+(!s.sprinklerInventory||game.cottage||game.vehicle.active?'disabled':'')+'>从背包放置</button></section>'+Object.entries(PRODUCTION_BUILDINGS).map(([kind,b])=>{const unlocked=productionUnlocked(game.progress,kind),capped=kind==='bench'?!!s.bench:s.sprinklers.length+(s.sprinklerInventory||0)>=P.maxSprinklers,afford=game.progress.mining.ore>=b.ore&&game.progress.wood>=b.wood&&(kind!=='sprinkler'||game.progress.materials.farmParts>=2);return `<section class="ui-section production-card">${productionIcon(kind)}<h3>${b.name}</h3><p>${kind==='sprinkler'?'覆盖周围两层24格（包含四角），喷头旋转扫过时，田块逐格变湿；每茬最多提前25%成熟，与手浇和雨水不叠加。在线时浇湿当前地面的空田和未成熟作物；在湿土播种可继承水分。':'矿石和木材足够即可建造；靠近台边加工背包和载具仓库收成；首次建造赠小麦、胡萝卜种子各2粒，并开放购买。'}</p><p>${b.ore}矿石＋${b.wood}仓库木材${kind==='sprinkler'?'＋2农具金属件（加工厂制作）':''}</p><button class="ui-button ui-button--primary" data-production-build="${kind}" ${!unlocked||capped||!afford||!!game.cottage||game.vehicle.active?'disabled':''}>${!unlocked?'累计开掘12矿石并回地面后解锁':capped?'已建成':!afford?'材料不足':'选择空地建造'}</button></section>`;}).join('')+[...s.sprinklers.map(p=>({...p,kind:'sprinkler'})),...(s.bench?[{...s.bench,kind:'bench',id:'bench'}]:[])].map(p=>`<section class="ui-inset"><p>${PRODUCTION_BUILDINGS[p.kind].name} · ${p.mapId==='forest'?'森林':'湖谷'}（${Math.round(p.x)}，${Math.round(p.y)}）</p><button class="ui-button" data-production-move="${p.id}" data-kind="${p.kind}" ${game.cottage||game.vehicle.active||game.mapId!==p.mapId||worldDistance(game.player,p)>130?'disabled':''}>${p.kind==='sprinkler'?'拿起洒水器':'免费调整位置'}</button>${p.kind==='sprinkler'?'<button class="ui-button" data-production-store="'+p.id+'" '+(game.cottage||game.vehicle.active||game.mapId!==p.mapId||worldDistance(game.player,p)>130?'disabled':'')+'>收回背包</button>':''}<button class="ui-button ui-button--danger" data-production-remove="${p.id}" data-kind="${p.kind}" ${game.cottage||game.vehicle.active||game.mapId!==p.mapId||worldDistance(game.player,p)>130?'disabled':''}>移除${PRODUCTION_BUILDINGS[p.kind].name}</button>${removal?.kind===p.kind&&removal.id===p.id?`<div class="ui-inset" role="alert"><p>确认移除${PRODUCTION_BUILDINGS[p.kind].name}？建造材料不返还，作物和已制作补给保留。</p><div class="production-actions"><button class="ui-button" data-production-remove-cancel>取消移除</button><button class="ui-button ui-button--danger" data-production-remove-confirm>确认移除</button></div></div>`:''}</section>`).join('');}
 // 卡片将名称、用途和价格分开，按钮保留正式购物车与业务操作参数。
 function productCard(name,description,price,action,place,state='',unavailable=false){
  return `<article class="production-product"><div class="production-product-art"></div><div><strong>${name}</strong><p>${description}</p></div>
   <div class="production-product-order"><b>${price}</b><button type="button" class="ui-button" ${action} data-shop-name="${name}" data-shop-price="${price}" data-shop-place="${place}" aria-label="${state?name+'，'+state:'将'+name+'加入购物车'}" ${state||unavailable?'disabled':''}>${state||'加入购物车'}</button></div></article>`;
 }
 // 栏外也能查看价格和用途，到北门下车后可领养并照料牛羊。
 function pastureMarkup(){
  if(!pastureOpen(game.progress))return '<p>向南扩建至河畔勤务区后，即可在牧栏领养和照料动物。</p>';
  const f=game.progress.farm,near=game.mapId==='forest'&&worldDistance(game.player,PEN_GATE)<=145&&!game.cottage&&!game.vehicle.active;
  const animals=[
   ['挽马','打造木马车时套车使用。',HORSE_PRICE,'adopt-horse',game.progress.materials.draftHorse?'已领养':''],
   ['耕牛',f.oxPlow?'牵着它逐行犁地，田边可召牛。':'牵牛逐行犁地，也可用甜穗草驯服野牛。',PASTURE.oxPrice,'adopt-ox',f.oxPlow?'已领养':''],
   ['绵羊','在牧栏饲养，可喂粮食、蔬菜或水果。',PASTURE.sheepPrice,'adopt',f.sheep?'已领养':'']
  ];
  const cards=animals.map(([name,description,coins,key,state])=>productCard(name,description,coins+' 金币',`data-tend="${key}"`,'营地牧栏',state,!near)).join('');
  const shop=`<section class="production-shelf"><h3>牛羊牧栏</h3>${near?'':'<p>到牧栏北门下车领养。</p><button class="ui-button" data-pen-route>前往营地牧栏</button>'}${cards}</section>`;
  if(!near||!f.oxPlow&&!f.sheep)return shop;
  const crops=FARM_CROPS.map((c,i)=>f.inventory[i]&&c.category!=='ornamental'?`<option value="${i}">${c.name} ×${f.inventory[i]}</option>`:'').join('');
  const owned=[['ox','耕牛',f.oxPlow,f.oxFeeds],['sheep','绵羊',f.sheep,f.sheepFeeds]].filter(e=>e[2]);
  return shop+`<section class="ui-inset"><h3>牧栏喂养</h3><p>${owned.map(([,name,,feeds])=>name+'已喂养 '+feeds+' 次').join(' · ')}</p>${f.oxPlow&&f.forage?`<button class="ui-button" data-tend="forage">喂牛甜穗草 · 现有 ${f.forage} 束</button>`:''}${crops?`<label>饲料 <select id="pasture-feed">${crops}</select></label>`:'<p>带一份粮食、蔬菜或水果来喂养。</p>'}<div class="production-actions">${owned.map(([key,name])=>`<button class="ui-button" data-tend="${key}" ${crops?'':'disabled'}>喂${name}</button>`).join('')}</div></section>`;
 }
 // 双格水壶按原矿石配方报价；加入清单后由结账确认才提交改造。
 function toolsMarkup(){
  const owned=game.progress.farm.doubleCan,cost=FARM_WATER.upgradeOre,offsite=game.cottage||game.vehicle.active;
  const state=owned?'已改造':offsite?'地面下车改造':game.progress.mining.ore<cost?'矿石不足':game.progress.materials.farmParts<1?'缺农具金属件':'';
  return `<section class="production-shelf"><h3>随身农具</h3>${productCard('双格水壶',owned?'同时浇灌选中的作物和右边一格。':'由单格水壶改造，一次浇灌左右两格。',cost+' 原石＋1农具金属件','data-can-upgrade data-shop-key="double-watering-can"','随身农具',state)}</section>`+pastureMarkup();
 }
 // 配方显示原料的出售机会成本，玩家能够比较加工与出售。
 function recipeMarkup(kind){const s=game.progress.production,r=PRODUCTION_RECIPES[kind],unlocked=productionUnlocked(game.progress,kind);if(!unlocked&&kind!=='meal')return '';const fruit=FARM_CROPS.findIndex((c,i)=>c.category==='fruit'&&game.progress.farm.unlocked[i]&&productionCropStock(game.progress,i).total>0),ingredients=productionIngredients(kind,fruit),cost=ingredients?.reduce((sum,[i,n])=>sum+FARM_CROPS[i].value*n,0)||0,cart=game.cottage?.kind==='mine'?currentMineLayer(game).carts.find(c=>game.cottage.ride?c.id===game.cottage.ride:worldDistance(c,game.player)<=40):null,remaining=kind==='oil'?cart?.lubrication||0:s.effects[kind];return `<section class="ui-section production-card">${productionIcon(kind)}<h3>${r.name} · 库存${s.stock[kind]}</h3><p>${r.description}。${remaining>0?'剩余 '+Math.ceil(remaining)+(kind==='meal'?' 次开掘':' 秒'):'效果未启用'}</p><p>${kind==='meal'?'小麦1份＋胡萝卜1份':kind==='oil'?'玉米1份':'任选已发现水果1份'} → ${r.count}${kind==='meal'?'份':'瓶'}。${cost&&kind!=='juice'?'原料可售 '+cost+' 金币。':''}</p>${ingredients&&kind!=='juice'?'<p>'+ingredients.map(([i,n])=>`${FARM_CROPS[i].name}：背包${productionCropStock(game.progress,i).bag}份＋载具仓库${productionCropStock(game.progress,i).vehicles}份／需要${n}份`).join('；')+'</p>':''}${kind==='juice'?`<label>选择水果 <select id="production-fruit" aria-label="果饮原料">${FARM_CROPS.map((c,i)=>c.category==='fruit'&&game.progress.farm.unlocked[i]?`<option value="${i}" ${i===fruit?'selected':''}>${c.name} · 背包${productionCropStock(game.progress,i).bag}份＋载具${productionCropStock(game.progress,i).vehicles}份 · ${c.value}金币</option>`:'').join('')}</select></label>`:''}<div class="production-actions"><button class="ui-button" data-production-craft="${kind}" ${!unlocked||!nearProductionBench(game)?'disabled':''}>制作一批</button><button class="ui-button ui-button--primary" data-production-use="${kind}" ${!s.stock[kind]||remaining>0||game.cottage?.kind!=='mine'||game.vehicle.active||kind==='oil'&&!cart?'disabled':''}>${kind==='oil'?'润滑身旁矿车':'立即使用'}</button></div></section>`;}
 // 分类重建只发生在用户操作或存档变化后，不逐帧替换触摸节点。
 function content(){
  const s=game.progress.production;
  dialog.querySelector('#production-wallet').textContent=tab==='tools'?`金币 ${game.progress.coins} · 矿石 ${game.progress.mining.ore}`:`矿石 ${game.progress.mining.ore} · 仓库木材 ${game.progress.wood}`;
  dialog.querySelector('.production-goal').hidden=tab==='tools';
  if(tab!=='tools')dialog.querySelector('#production-goal').textContent=productionGoal(game.progress);
  for(const b of dialog.querySelectorAll('[data-production-tab]'))b.setAttribute('aria-pressed',String(b.dataset.productionTab===tab));
  body.innerHTML=tab==='tools'?toolsMarkup():tab==='build'?buildMarkup():tab==='keep'?keepMarkup():`<section class="ui-inset production-help"><p>${nearProductionBench(game)?'已在加工台旁，可以制作。':'靠近加工台制作，进入地下使用。'}</p><details><summary>查看补给规则</summary><p>同种效果不叠加，暂停和离线不消耗。${!s.rodeCart?'乘坐矿车并发现玉米后开放植物油。':''}</p></details></section>`+Object.keys(PRODUCTION_RECIPES).map(recipeMarkup).join('');
  for(const card of body.querySelectorAll('.production-product')){
   card.querySelector('.production-product-art').append(cartProductIcon(card.querySelector('[data-shop-name]'),game.progress));
  }
 }
 // 所有退出路径清除预览，取消布置不消耗资源。
 function cancel(){selection=null;pending=null;game.productionCursor=null;game.productionCarry=null;placement.hidden=true;}
 // 目标必须由玩家点击，拿起时不自动挑选落点；覆盖预览沿用真实布置校验。
 function aim(point){
  const carrying=selection.kind==='sprinkler'&&selection.moving!==null;
  const check=point?productionPlacement(game,point,selection.kind,selection.moving):{point:null,reason:''};
  game.productionCursor=point?{...check,kind:selection.kind}:null;
  placement.querySelector('p').textContent=selection.error||check.reason||(carrying?(point?'目标已选，确认后放下；取消会放回原位。':'已拿起洒水器，可直接收回背包，或点击地面选择放下位置。'):'点击地面调整位置，再确认；洒水器覆盖两层24格的虚线区域');
  placement.querySelector('[data-production-place]').textContent=carrying?'放下':'确认位置';
  placement.querySelector('[data-production-cancel]').textContent=carrying?'取消搬移':'取消';
  placement.querySelector('[data-production-place]').disabled=!point||!!check.reason;
  // 收纳无需选落点，仅对实际拿起的洒水器显示，普通建造与背包放置不出现。
  placement.querySelector('[data-production-store-held]').hidden=!carrying;
 }
 // 菜单和场景点击共用拿起事务；开始时记录地图及玩家身份，重置或切图取消。
 function begin(){
  selection=pending;pending=null;const carrying=selection.kind==='sprinkler'&&selection.moving!==null;
  if(carrying){const r=pickupSprinkler(game,selection.moving);if(!r.ok){cancel();onNotice?.(r.message);return;}}
  selection.mapId=game.mapId;selection.player=game.player;onPlacementStart?.();input.reset();placement.hidden=false;
  aim(carrying?null:{x:game.player.x+60,y:game.player.y});
 }
 // 背包与设施页共享选址入口，预览不扣库存，关闭上层页面后才开始。
 function placeStored(){
  if(!productionAvailable(game)||game.cottage||game.vehicle.active||!game.progress.production.sprinklerInventory){onNotice?.('请在地面下车，并确认背包中有洒水器。');return false;}
  cancel();pending={kind:'sprinkler',moving:null,fromBag:true};if(dialog.open)dialogs.close(dialog.id);return true;
 }
 // 从浇灌分类优先放置背包设备；没有库存时进入原设施页，可建造或调整已有洒水器。
 function selectSprinkler(){
  if(!productionAvailable(game)){onNotice?.('请在自由巡游时使用洒水器。');return;}
  if(game.progress.production.sprinklerInventory>0){placeStored();return;}
  tab='build';open();
 }
 // 入口在地下优先打开补给，在地面显示最近选择的分类。
 function open(){if(!productionAvailable(game))return;cancel();removal=null;if(game.cottage?.kind==='mine')tab='supply';result.textContent='';dialogs.open(dialog.id);}
 dialogs.register(dialog.id,{focusId:'production-title',onOpen:()=>{signature='';content();}});
 scope.on(menu,'click',open);scope.on(mineMenu,'click',open);
 scope.on(dialog,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.tend==='forage'){report(tendPasture(game,'ox','forage'));return;}if(b.dataset.tend){report(tendPasture(game,b.dataset.tend,Number(root.getElementById('pasture-feed')?.value)));return;}
 if(b.hasAttribute('data-pen-route')){requestWorldNavigation(game,PEN_GATE,'前往营地牧栏',{direct:true});dialogs.close(dialog.id);return;}
 if(b.hasAttribute('data-can-upgrade')){report(upgradeWateringCan(game));return;}
 if(b.hasAttribute('data-production-close'))dialogs.close(dialog.id);else if(b.hasAttribute('data-production-remove-cancel')){removal=null;content();}else if(b.hasAttribute('data-production-remove-confirm')&&removal){const r=removeProduction(game,removal.kind,removal.id);if(r.ok)removal=null;report(r);}else if(b.dataset.productionRemove){removal={kind:b.dataset.kind,id:b.dataset.productionRemove==='bench'?'bench':Number(b.dataset.productionRemove)};content();dialog.querySelector('[data-production-remove-cancel]')?.focus();}else if(b.dataset.productionTab){removal=null;tab=b.dataset.productionTab;content();}else if(b.hasAttribute('data-production-from-bag'))placeStored();else if(b.dataset.productionStore){removal=null;report(storeSprinkler(game,Number(b.dataset.productionStore)));}else if(b.dataset.productionBuild||b.dataset.productionMove){pending={kind:b.dataset.productionBuild||b.dataset.kind,moving:b.dataset.productionMove?(b.dataset.productionMove==='bench'?'bench':Number(b.dataset.productionMove)):null};dialogs.close(dialog.id);}else if(b.dataset.productionCraft)report(craftProduction(game,b.dataset.productionCraft,Number(root.getElementById('production-fruit')?.value)));else if(b.dataset.productionUse)report(useProduction(game,b.dataset.productionUse));});
 scope.on(dialog,'change',e=>{if(e.target.dataset.productionKeep!==undefined)report(setProductionKeep(game,Number(e.target.dataset.productionKeep),Number(e.target.value)));});
 scope.on(placement,'click',e=>{if(e.target.closest('[data-production-cancel]'))cancel();else if(e.target.closest('[data-production-store-held]')&&selection?.kind==='sprinkler'&&selection.moving!==null){const r=storeSprinkler(game,selection.moving);onNotice?.(r.message);if(r.ok){cancel();onChange?.();}else{selection.error=r.message;placement.querySelector('p').textContent=r.message;}}else if(e.target.closest('[data-production-place]')&&selection&&game.productionCursor?.point){const r=placeProduction(game,selection.kind,game.productionCursor.point,selection.moving,selection.fromBag);onNotice?.(r.message);if(r.ok){cancel();onChange?.();}else{selection.error=r.message;placement.querySelector('p').textContent=r.message;}}});
 scope.on(root.defaultView,'keydown',e=>{if(e.key==='Escape')cancel();});
 // 在现有场景短按处理链最前面消费选址，不抢占普通摇杆拖动。
 function tapWorld(event){
  const v=renderer.view,r=renderer.canvas.getBoundingClientRect();if(!v)return false;
  const point={x:v.x+(event.clientX-r.left)/r.width*v.w,y:v.y+(event.clientY-r.top)/r.height*v.h};
  if(selection){selection.error=null;aim(point);return true;}
  if(game.state!=='playing'||!productionAvailable(game)||game.cottage||game.vehicle.active||game.farmWork?.tool)return false;
  const reach=Math.max(26,22*v.w/r.width),item=game.progress.production.sprinklers.filter(p=>p.mapId===game.mapId).map(p=>({p,d:worldDistance({x:p.x,y:p.y-14},point)})).filter(o=>o.d<=reach).sort((a,b)=>a.d-b.d)[0]?.p;
  if(!item)return false;pending={kind:'sprinkler',moving:item.id};begin();return true;
 }
 // 运行状态切换撤销失效选址；已打开页面只有真实数据变化时更新。
 function render(){menu.hidden=!productionAvailable(game)||!!game.cottage&&game.cottage.kind!=='mine';if(pending&&game.state==='playing')begin();if(selection&&(!productionAvailable(game)||game.cottage||game.vehicle.active||game.mapId!==selection.mapId||game.player!==selection.player||selection.kind==='sprinkler'&&selection.moving!==null&&!carriedSprinkler(game)))cancel();if(selection)aim(game.productionCursor?.point);if(dialog.open){const next=JSON.stringify([tab,game.progress.coins,game.progress.materials.draftHorse,game.progress.farm.sheep,game.progress.farm.oxFeeds,game.progress.farm.sheepFeeds,game.progress.farm.forage,game.progress.farm.oxPlow,game.progress.farm.doubleCan,game.progress.production,game.progress.farm.inventory,game.progress.farm.unlocked,game.progress.vehicleHulls,game.progress.logistics.builds.map(b=>b.cargo),game.progress.mining.ore,game.progress.wood]);if(next!==signature){signature=next;content();}}}
 // 卸载释放所有DOM和监听，不留下另一套暂停或输入状态。
 function dispose(){cancel();if(dialog.open)dialogs.close(dialog.id);scope.dispose();menu.remove();mineMenu.remove();dialog.remove();placement.remove();}
 return {render,open,openPasture(){tab='tools';open();},selectSprinkler,placeStored,tapWorld,dispose};
}
