import {PARKING_SPOTS} from '../config/parking.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {assignParkingSpot,canAssignParkingSpot} from '../core/vehicles/camp-parking.js';
import {setHidden} from './shared/dom-state.js';
// 购地页复用手机底板；木牌短按、导航与保存共用正式地契事务。
import {CAMP_PLOTS,availableCampPlots,ownsCampPlot,campPlotAt} from '../config/camp-land.js';
import {campLandStatus,purchaseCampLand} from '../core/camp/camp-land.js';
import {canInspectBuilding} from '../core/camp/building-entry.js';
import {TOWN_RESTORATIONS,facilityOpen} from '../config/town-restoration.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {nearest} from '../world/coordinates.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {createEventScope} from '../platform/events.js';
export function createCampLandPanel({game,root,renderer,dialogs,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),layer=root.createElement('div'),frame=root.getElementById('game-frame');let parkingHull=0,selected='workyard',message='',lastPanel='';
 dialog.id='camp-land-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','camp-land-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><small>营地 · 土地与建设</small><h2 id="camp-land-title">扩建营地</h2></div><button class="ui-close" aria-label="关闭营地扩建">×</button></header><div class="ui-panel__body"><button class="ui-button" data-land-management>营地管理与装饰</button><button class="ui-button" data-land-layout>营地布局规划</button><details><summary>停车场 · 设置车位</summary><p>可为每辆车指定归场车位。选择另一辆场内车的位置可互换车位。每次面积扩建增加三个车位。</p><div data-parking-settings></div></details><p>买下相邻土地，再投入木材建造设施。地图、背包和仓储始终可用。</p><section class="ui-section" data-land-list></section><section class="ui-section" data-land-detail></section><p role="status" data-land-message></p></div><footer class="ui-panel__footer"><button class="ui-button" data-land-go>前往地界</button><button class="ui-button ui-button--primary" data-land-buy>购买土地</button></footer>';
 root.body.append(dialog);layer.className='world-building-entrances';layer.style.pointerEvents='none';renderer.canvas.after(layer);
 const buttons=[{id:'core',name:'营地建设',sign:{x:440,y:720}},...CAMP_PLOTS.filter(p=>p.sign)].map(plot=>{const b=root.createElement('button');sceneHit(b,'扩建营地：'+plot.name);b.dataset.campPlot=plot.id;b.style.pointerEvents='auto';scope.on(b,'click',e=>{if(e.detail===0)open(plot.id);});layer.append(b);return b;});
 const find=s=>dialog.querySelector(s);
 // 当前页面只读存档状态，价格、相邻条件和余额由核心层复核。
 function renderPanel(){
  if(!dialog.open){lastPanel='';return;}const key=JSON.stringify([selected,parkingHull,message,game.progress.coins,game.progress.campLand,game.progress.restoration,game.progress.campParking,game.progress.vehicleHulls,game.player.x,game.player.y]);if(key===lastPanel)return;lastPanel=key;const s=campLandStatus(game,selected);if(!s)return;
  const settings=find('[data-parking-settings]'),parking=game.progress.campParking;
  settings.replaceChildren();
  const chooser=root.createElement('select');chooser.dataset.parkingVehicle='';chooser.setAttribute('aria-label','选择载具');
  for(const [h,vehicle] of COLLECTED_VEHICLES.entries()){
   if(!game.progress.vehicleHulls[h])continue;
   const option=root.createElement('option');option.value=h;option.textContent=vehicle.name;chooser.append(option);
  }
  if(!game.progress.vehicleHulls[parkingHull])parkingHull=Number(chooser.options[0]?.value??0);
  chooser.value=parkingHull;settings.append(chooser);
  for(const [h,vehicle] of COLLECTED_VEHICLES.entries()){
   if(h!==parkingHull)continue;
   if(!game.progress.vehicleHulls[h])continue;
   const label=root.createElement('label'),select=root.createElement('select');
   label.style.display='block';label.textContent='归场车位 ';
   select.dataset.parkingHull=h;
   for(const spot of [null,...PARKING_SPOTS.filter(s=>s.number)]){
    const option=root.createElement('option');option.value=spot?.id||'';option.textContent=spot?.name||'自动分配';
    const resident=spot&&parking.owned.find(r=>r.spot===spot.id);
    if(resident)option.textContent+=' · '+COLLECTED_VEHICLES[resident.hull].shortName;
    option.disabled=!!spot&&!canAssignParkingSpot(game,h,spot);
    select.append(option);
   }
   select.value=parking.preferred?.[h]||'';label.append(select);settings.append(label);
  }
  const list=find('[data-land-list]');list.replaceChildren();
  for(const plot of CAMP_PLOTS){const b=root.createElement('button');b.className='ui-choice';b.style.cssText='display:block;width:100%;min-height:44px;margin-bottom:8px';b.dataset.landSelect=plot.id;b.setAttribute('aria-pressed',String(plot.id===selected));b.textContent=plot.name+' · '+(ownsCampPlot(game.progress,plot.id)?'已拥有':plot.coins+' 金币');list.append(b);}
  const detail=find('[data-land-detail]');detail.replaceChildren();const title=root.createElement('h3');title.textContent=s.plot.name;detail.append(title);
  const hint=root.createElement('p');hint.textContent=s.owned?'土地已归营地。点击下方设施，查看材料并前往建设。':!s.adjacent?'先扩建相邻地块，再购买这里。':'购买仅开放土地；建筑需要另外投入木材建造。';detail.append(hint);
  for(const f of TOWN_RESTORATIONS.filter(f=>campPlotAt(f)?.id===selected)){const b=root.createElement('button');b.className='ui-choice';b.style.cssText='display:block;width:100%;min-height:44px;margin-bottom:8px';b.dataset.landBuild=f.id;b.disabled=!s.owned;b.textContent=f.name+' · '+(facilityOpen(game.progress,f.id)?'已建成':f.wood+' 木材建设');detail.append(b);}
  find('[data-land-message]').textContent=message||'当前金币：'+game.progress.coins;
  const buy=find('[data-land-buy]');buy.disabled=!s.canBuy;buy.textContent=s.owned?'土地已拥有':!s.adjacent?'先买相邻土地':!s.near?'请先到地界旁':!s.enough?'金币不足':'购买 · '+s.plot.coins+' 金币';find('[data-land-go]').disabled=!s.plot.sign||s.owned;
 }
 function open(id,showParking=false){if(!campLandStatus(game,id)||!canInspectBuilding(game))return false;selected=id;message='';find('details').open=showParking;const previous=[...root.querySelectorAll('dialog[open]')].filter(d=>d!==dialog);lastPanel='';dialogs.open(dialog.id);for(const d of previous){dialogs.transferResume(d.id,dialog.id);dialogs.close(d.id);}renderPanel();return true;}
 dialogs.register(dialog.id,{onOpen:renderPanel});
 scope.on(dialog,'change',event=>{
  if(event.target.matches('[data-parking-vehicle]')){parkingHull=Number(event.target.value);renderPanel();return;}
  const select=event.target.closest('[data-parking-hull]');if(!select)return;
  message=assignParkingSpot(game,Number(select.dataset.parkingHull),select.value)?'停车位设置已保存。':'车位已占用或保存失败。';
  lastPanel='';renderPanel();onChange();
 });
 scope.on(find('[data-land-management]'),'click',()=>game.openCampManagement?.());
 scope.on(find('[data-land-layout]'),'click',()=>{if(!game.openCampLayout?.()){message='请先结束施工、牵引、停车或入营引导。';lastPanel='';renderPanel();}});
 scope.on(find('.ui-close'),'click',()=>dialogs.close(dialog.id));
 scope.on(dialog,'click',e=>{const select=e.target.closest('[data-land-select]'),build=e.target.closest('[data-land-build]');if(select){selected=select.dataset.landSelect;message='';renderPanel();}if(build&&!build.disabled)game.requestFacility?.(build.dataset.landBuild);});
 scope.on(find('[data-land-buy]'),'click',()=>{const result=purchaseCampLand(game,selected);message=result.message;renderPanel();onChange();});
 scope.on(find('[data-land-go]'),'click',()=>{const s=campLandStatus(game,selected);if(s?.plot.sign){dialogs.close(dialog.id);requestWorldNavigation(game,{...s.plot.sign,mapId:'forest'},'前往'+s.plot.name+'地界',{direct:true});onChange();}});
 // 地界热点只随当前相邻地块出现，购地后原木牌立即移除。
 function render(){const plots=canInspectBuilding(game)&&game.state==='playing'&&!root.querySelector('dialog[open]')?[{id:'core',sign:{x:440,y:720}},...availableCampPlots(game.progress)]:[];setHidden(layer,!plots.length);for(const b of buttons){const plot=plots.find(p=>p.id===b.dataset.campPlot);if(!plot)setHidden(b,true);else placeSceneHit(b,plot.sign,renderer,frame,{width:110,height:65});}renderPanel();}
 function tap(e){if(!canInspectBuilding(game)||game.state!=='playing'||root.querySelector('dialog[open]')||!renderer.view)return false;const r=renderer.canvas.getBoundingClientRect(),v=renderer.view,q={x:v.x+(e.clientX-r.left)/r.width*v.w,y:v.y+(e.clientY-r.top)/r.height*v.h};for(const p of [{id:'core',sign:{x:440,y:720}},...availableCampPlots(game.progress)]){const s=nearest(p.sign,q);if(Math.abs(q.x-s.x)<55&&q.y>s.y-65&&q.y<s.y+10)return open(p.id);}return false;}
 function dispose(){scope.dispose();dialog.remove();layer.remove();delete game.openCampLand;}
 game.openCampLand=open;return {open,render,tap,dispose};
}
