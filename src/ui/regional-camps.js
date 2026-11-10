import {ammoSoldAt} from '../config/vehicle-special-ammo.js';
// 地区营地服务页沿用手机统一底板，现场事务失败时保留页面并显示具体原因。
import {REGIONAL_CAMPS,regionalParcel} from '../config/regional-camps.js';
import {regionalCampHere} from '../core/camp/regional-camp-access.js';
import {regionalCampAction} from '../core/camp/regional-camps.js';
import {configureVehicleSE} from '../core/vehicles/vehicle-se.js';
import {VEHICLE_SE,seBuild} from '../config/vehicle-se.js';
import {vehicleBuildReason,configureVehicleBuild} from '../core/vehicles/vehicle-build.js';
import {mountMainGun,supplyVehicleNearby} from '../core/vehicles/supplies.js';
import {vehicleRepairQuote} from '../core/vehicles/vehicle-repair.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {VEHICLE_ENGINES} from '../config/vehicle-load.js';
import {VEHICLE_ARMAMENTS,VEHICLE_WEAPONS} from '../config/vehicle-armaments.js';
import {AMMO_TYPES,GUN_MASSES,ammoKind} from '../config/supplies.js';
import {FARM_CROPS} from '../config/farm.js';
import {HEROES} from '../config/heroes.js';
import {vehicleModel} from '../config/vehicles.js';
import {campPurchasePrice} from '../progression/camp/camp-level.js';
import {createEventScope} from '../platform/events.js';
export function createRegionalCampPanel({game,root,dialogs,onChange}){
 const scope=createEventScope(),panel=root.createElement('dialog');let camp=null,tab='story',message='',hull=0;
 panel.id='regional-camps-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','regional-camps-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="regional-camps-title"></h2><p id="regional-camps-place"></p></div><button class="ui-close" aria-label="关闭营地服务">×</button></header><div class="ui-panel__body"><nav class="regional-camp-tabs" aria-label="营地服务"></nav><div id="regional-camps-body"></div></div><footer class="ui-panel__footer"><p id="regional-camps-message" role="status" aria-live="polite" aria-atomic="true"></p></footer>';
 root.body.append(panel);const body=panel.querySelector('#regional-camps-body');
 // 公共行组件只接收配置文字，按钮数据与中文名称分开。
 function row(title,note,actions=[]){const section=root.createElement('section');section.className='ui-section';const h=root.createElement('h3'),p=root.createElement('p');h.textContent=title;p.textContent=note;section.append(h,p);for(const a of actions){const b=root.createElement('button');b.className='ui-button';b.type='button';b.textContent=a.label;b.dataset.regionalAction=a.action;if(a.key!==undefined)b.dataset.key=a.key;if(a.target)b.dataset.target=a.target;b.disabled=!!a.disabled;section.append(b);}body.append(section);return section;}
 // 当地出售特色装置，各营地均能为所选车装卸它已拥有的装置。
 function renderCampDevices(){
  const build=seBuild(game.progress,hull);
  const reason=vehicleBuildReason(game,hull);
  const devices=new Set([camp.seDevice,...build.owned]);
  for(const key of devices){
   const device=VEHICLE_SE[key];
   const owned=build.owned.includes(key);
   const mounted=build.installed.includes(key);
   const title=(key===camp.seDevice?'当地特色 SE · ':'随车 SE · ')+device.name;
   const note=device.mass+' kg · '+device.description;
   const action=mounted?'remove':owned?'install':'buy';
   const label=mounted?'卸下装置':owned?'免费安装':'购买 · '+device.coins+'金币';
   row(title,note,[{action:'se-'+action,key,label,disabled:!!reason}]);
  }
 }
 // 已有主炮不受当地销售目录限制；调炮时提示来源车，实际事务再次校验位置和载重。
 function renderOwnedMainGuns(){
  const p=game.progress,near=supplyVehicleNearby(game,hull),guns=VEHICLE_ARMAMENTS.filter(w=>p.vehicleWeapons[w.weaponIndex]);
  row('已拥有主炮 · 免费切换','原厂炮与其他营地购入的主炮都可在这里换回。卸下炮弹退回原车库存；跨车调炮要求两车都在附近。');
  for(const w of guns){const id=w.weaponIndex,donor=p.vehicleLoadouts.indexOf(id),installed=donor===hull,key=ammoKind(w),remote=donor>=0&&donor!==hull&&!supplyVehicleNearby(game,donor);
   row(w.name,(installed?'当前已安装':donor>=0?'安装于'+vehicleModel(donor).name:'未安装，可换回')+' · '+(GUN_MASSES[id]||0)+'kg · '+(AMMO_TYPES[key]?.name||'独立供给'),[{action:'switch-gun',key:id,label:installed?'当前主炮':!near?'请将目标载具开到附近':remote?'请将来源车辆开到附近':'免费换装',disabled:installed||!near||remote}]);
  }
  if(!guns.length)row('还没有可换装的主炮','拥有主炮后会在这里列出。');
 }
 // 只在开页或一次操作完成后刷新，不在帧循环重建滚动内容。
 function render(){if(!panel.open||!camp)return;const p=game.progress,stage=p.regionalCamps[camp.id].stage,ready=stage===3;
 panel.querySelector('h2').textContent=camp.name;panel.querySelector('#regional-camps-place').textContent=camp.region+' · '+camp.npc+' · '+p.coins+'金币';panel.querySelector('#regional-camps-message').textContent=message;body.replaceChildren();
 const tabs=panel.querySelector('nav');tabs.replaceChildren();for(const [id,label]of [['story','故事与线索'],['supply','弹药补给'],['repair','车辆整备'],['seed','当地种子'],['cat','猫猫招募']]){const b=root.createElement('button');b.className='ui-button';b.type='button';b.textContent=label;b.dataset.regionalTab=id;b.setAttribute('aria-pressed',String(tab===id));tabs.append(b);}
 if(!regionalCampHere(game,camp.id)){row('已经离开服务点','请回到居民或服务屋前办理。');return;}
 if(['supply','repair'].includes(tab)){const section=row('选择附近载具','补给和整备要求车辆停在身边240单位内。'),select=root.createElement('select');select.setAttribute('aria-label','选择服务载具');select.style.minHeight='44px';select.dataset.regionalHull='';for(const v of game.vehicles.filter(v=>p.vehicleHulls[v.index])){const o=root.createElement('option');o.value=v.index;o.textContent=vehicleModel(v.index).name+(supplyVehicleNearby(game,v.index)?' · 附近':' · 远处或损坏');select.append(o);}select.value=hull;section.append(select);}
 if(tab==='story'){row(camp.story,stage===0?camp.intro:stage===1?'委托进行中：到营地东边寻找'+camp.parcel+'。':stage===2?'已经找到'+camp.parcel+'，交给'+camp.npc+'即可完成委托。':camp.ending,[{action:'story',label:stage===0?'接取委托':stage===2?'交付物品 · 获得300金币':'委托已'+(stage===3?'完成':'接取'),disabled:stage===1||ready},...(stage===1?[{action:'navigate',label:'标记任务箱路线'}]:[])]);row('居民的寻宝见闻','完成委托后分享线索；已听过的线索不会重复领取。',[{action:'clue',label:p.treasure.clues.includes(camp.clue)?'线索已记入手机':'听取寻宝线索',disabled:!ready||p.treasure.clues.includes(camp.clue)}]);}
 if(tab==='supply')for(const [key,r]of Object.entries(AMMO_TYPES).filter(([key])=>ammoSoldAt(key,camp.id)))row(r.name,(r.use?r.use+' · ':'')+r.pack+'发 / '+r.coins+'金币',r.targets.map(target=>({action:'ammo',key,target,label:target==='hand'?'购买到背包':'购买到载具',disabled:target==='vehicle'&&!supplyVehicleNearby(game,hull)})));
 if(tab==='repair'){renderCampDevices();row('现场检修','修复车体耐久、引擎与主炮故障，原位交车，不搬回晴叶营地。',[{action:'repair',label:'维修当前车 · '+vehicleRepairQuote(game,hull)+'金币'}]);const e=VEHICLE_ENGINES[camp.engine],w=VEHICLE_WEAPONS[camp.gun],owned=p.logistics.builds[hull]?.engines.includes(camp.engine);row(e.name,'载重×'+e.payload+' · 牵引×'+e.tow+' · 速度×'+e.speed+'。'+(!ready?'完成当地委托后开放。':''),[{action:'engine',label:owned?'已购入':'购入 · '+e.cost+'金币',disabled:!ready||owned},{action:'install-engine',label:'免费换装引擎',disabled:!owned}]);row(w.name,'伤害'+w.damage+' · 射程'+w.range+' · 重量'+w.mass+'kg · '+AMMO_TYPES[w.ammo].name,[{action:'gun',label:p.vehicleWeapons[camp.gun]?'已拥有':'购买 · '+w.cost+'金币',disabled:!ready||!!p.vehicleWeapons[camp.gun]},{action:'install-gun',label:'安装到当前车',disabled:!p.vehicleWeapons[camp.gun]}]);}
 if(tab==='repair')renderOwnedMainGuns();
 if(tab==='seed')for(const key of camp.seeds){const crop=FARM_CROPS[key];row(crop.name,'每粒'+crop.cost+'金币 · 随身库存'+p.farm.seeds[key]+'。购买即可解锁此种子。',[{action:'seed',key,label:'购买一粒'}]);}
 if(tab==='cat'){const hero=HEROES[camp.hero],price=campPurchasePrice(p,hero);row(hero.name,camp.ending+' 招募需'+price.coins+'金币、'+price.wood+'木头，并有一间空余住屋。',[{action:'recruit',label:p.heroes[camp.hero]?'已加入营地':'邀请加入营地',disabled:!ready||!!p.heroes[camp.hero]}]);}
 }
 dialogs.register(panel.id,{onOpen:render});scope.on(panel.querySelector('.ui-close'),'click',()=>dialogs.close(panel.id));
 scope.on(panel,'change',e=>{if(e.target.matches('[data-regional-hull]')){hull=Number(e.target.value);render();}});
 scope.on(panel,'click',e=>{const t=e.target.closest('[data-regional-tab]');if(t){tab=t.dataset.regionalTab;message='';render();return;}const b=e.target.closest('[data-regional-action]');if(!b||b.disabled)return;const action=b.dataset.regionalAction;if(action==='navigate'){requestWorldNavigation(game,regionalParcel(camp),'寻找'+camp.parcel,{direct:true,arrivalRadius:45});dialogs.close(panel.id);onChange();return;}
 if(action.startsWith('se-')){
  if(!regionalCampHere(game,camp.id)){render();return;}
  const result=configureVehicleSE(game,hull,b.dataset.key,action.slice(3));
  message=result.message;
  render();
  if(result.ok)onChange();
  return;
 }
 const result=action==='install-engine'?configureVehicleBuild(game,hull,'engine',camp.engine):action==='install-gun'?mountMainGun(game,hull,camp.gun):action==='switch-gun'?mountMainGun(game,hull,Number(b.dataset.key)):regionalCampAction(game,camp.id,action,{hull,key:action==='seed'?Number(b.dataset.key):b.dataset.key,target:b.dataset.target});message=result.message;render();onChange();});
 return {open(id,initialTab='story'){camp=REGIONAL_CAMPS.find(c=>c.id===id);if(!camp||!regionalCampHere(game,id))return;hull=game.vehicle.index;tab=initialTab;message='';dialogs.open(panel.id);},render,dispose(){scope.dispose();panel.remove();}};
}
