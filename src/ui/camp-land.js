import {PARKING_SPOTS} from '../config/parking.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {assignParkingSpot,canAssignParkingSpot} from '../core/vehicles/camp-parking.js';
// 购地页复用手机底板；木牌短按、导航与保存共用正式地契事务。
import {canInspectBuilding} from '../core/camp/building-entry.js';
import {TOWN_RESTORATIONS} from '../config/town-restoration.js';
import {createEventScope} from '../platform/events.js';
export function createCampLandPanel({game,root,renderer,dialogs,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog');let parkingHull=0,selected='workyard',message='',lastPanel='';
 dialog.id='camp-land-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','camp-land-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><small>营地 · 土地与建设</small><h2 id="camp-land-title">停车场</h2></div><button class="ui-close" aria-label="关闭停车场">×</button></header><div class="ui-panel__body"><button class="ui-button" data-land-management>营地管理与装饰</button><button class="ui-button" data-land-layout>营地布局规划</button><details><summary>停车场 · 设置车位</summary><p>可为每辆车指定归场车位。选择另一辆场内车的位置可互换车位。</p><div data-parking-settings></div></details><p role="status" data-land-message></p></div>';
 root.body.append(dialog);
 const find=s=>dialog.querySelector(s);
 // 当前页面只读存档状态，价格、相邻条件和余额由核心层复核。
 function renderPanel(){
  if(!dialog.open){lastPanel='';return;}const key=JSON.stringify([selected,parkingHull,message,game.progress.coins,game.progress.campLand,game.progress.restoration,game.progress.campParking,game.progress.vehicleHulls,game.player.x,game.player.y]);if(key===lastPanel)return;lastPanel=key;
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
  find('[data-land-message]').textContent=message;
 }
 function open(id,showParking=false){if(!showParking)return game.openCampConstruction?.(null,TOWN_RESTORATIONS.find(f=>f.plotId===id)?.id)||false;if(!canInspectBuilding(game))return false;selected=id;message='';find('details').open=showParking;const previous=[...root.querySelectorAll('dialog[open]')].filter(d=>d!==dialog);lastPanel='';dialogs.open(dialog.id);for(const d of previous){dialogs.transferResume(d.id,dialog.id);dialogs.close(d.id);}renderPanel();return true;}
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
 // 车位面板仅在打开时刷新。
 function render(){renderPanel();}
 function dispose(){scope.dispose();dialog.remove();delete game.openCampLand;}
 game.openCampLand=open;return {open,render,dispose};
}
