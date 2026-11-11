// 现场与大地图使用同一份建设清单，点击的世界坐标就是实际施工位置。
import {CAMP_CONSTRUCTION,constructionState,buildCampAt} from '../core/camp/free-construction.js';
import {CAMP_PLOTS,insideCampLand} from '../config/camp-land.js';
import {canInspectBuilding} from '../core/camp/building-entry.js';
import {campProgress} from '../progression/camp/camp-level.js';
import {workshopMaterialCount} from '../progression/workshop/workshop-materials.js';
import {WORLD,canonical} from '../world/coordinates.js';

// 地图以全世界坐标选址，现场则按当前镜头换算，两个入口共用提交动作。
export function createMapCampPlots({game,root,scope,onChange,dialogs,renderer}){
 const section=root.createElement('section'),canvas=root.getElementById('region-map'),dialog=root.getElementById('map-dialog');
 section.className='ui-section map-camp-plots';
 section.innerHTML='<h3>营地建设</h3><label>选择建筑或栅栏<select data-construction-kind></select></label><p data-construction-wallet></p><p role="status"></p><button type="button" class="ui-button" data-build-here>在此建设</button> <button type="button" class="ui-button" data-build-world>到现场点地建设</button>';
 canvas.before(section);
 const select=section.querySelector('select'),wallet=section.querySelector('[data-construction-wallet]'),notice=section.querySelector('[role=status]'),here=section.querySelector('[data-build-here]'),world=section.querySelector('[data-build-world]');
 const bar=root.createElement('div');bar.className='camp-placement-hint';bar.hidden=true;bar.innerHTML='<span role="status"></span> <button class="ui-button" type="button">结束建设</button>';root.getElementById('game-frame').append(bar);
 let target=null,armed=false;
 // 每次打开时读取真实的等级、已建设施和全部可用库存。
 function refresh(){
  section.hidden=!canInspectBuilding(game);if(section.hidden)return;
  const previous=select.value;
  select.replaceChildren(new root.defaultView.Option('选择要建造的设施',''));
  for(const b of CAMP_CONSTRUCTION){
   const state=constructionState(game.progress,b),option=root.createElement('option');
   option.value=b.id;option.disabled=state.built||!state.landOpen||state.level<b.level;
   option.textContent=b.name+' · '+(state.built?'已建成':!state.landOpen?'扩建'+CAMP_PLOTS.find(p=>p.id===b.plot).name+'后开放':state.level<b.level?'营地 '+b.level+' 级开放':(b.cost.coins?b.cost.coins+' 金币 + ':'')+b.cost.wood+' 木材');select.append(option);
  }
  select.value=[...select.options].some(o=>o.value===previous&&!o.disabled)?previous:'';
  wallet.textContent='营地 '+campProgress(game.progress).tier+' 级 · 持有 '+game.progress.coins+' 金币、'+workshopMaterialCount(game.progress,'wood')+' 木材';
  here.hidden=!target;here.disabled=!select.value;world.disabled=!select.value;
 }
 // 已完成的房屋停止重复建设，栅栏保留选择，便于连续摆放。
 function place(point){
  const id=select.value,r=buildCampAt(game,id,point);notice.textContent=r.message;
  bar.querySelector('span').textContent=r.message+(id.startsWith('fence-')?' 可继续点地放置。':'');
  if(r.ok){target=null;if(!id.startsWith('fence-'))armed=false;onChange();}
  refresh();return true;
 }
 // 已选地面可直接选建筑；从管理页打开时先选建筑再点地。
 function open(point=null,kind=''){
  if(!canInspectBuilding(game))return false;
  target=point;armed=false;bar.hidden=true;
  const previous=[...root.querySelectorAll('dialog[open]')].filter(d=>d!==dialog);dialogs.open(dialog.id);
  for(const d of previous){dialogs.transferResume(d.id,dialog.id);dialogs.close(d.id);}
  refresh();if(kind&&[...select.options].some(o=>o.value===kind&&!o.disabled))select.value=kind;
  notice.textContent=point?'已选中地面，选择设施后即可建设。':'选择设施后，点大地图或现场的营地空地即可建设。';
  here.disabled=!select.value;world.disabled=!select.value;section.scrollIntoView({block:'nearest'});return true;
 }
 scope.on(select,'change',()=>{here.disabled=!select.value;world.disabled=!select.value;notice.textContent=target?'点击“在此建设”使用已选地面。':'点击大地图上已解锁的营地空地即可建设。';});
 scope.on(here,'click',()=>{if(target&&select.value)place(target);});
 scope.on(world,'click',()=>{armed=true;target=null;bar.hidden=false;bar.querySelector('span').textContent='点击空地建设 · '+select.selectedOptions[0].textContent;dialogs.close(dialog.id);});
 scope.on(bar.querySelector('button'),'click',()=>{armed=false;bar.hidden=true;});
 scope.on(canvas,'click',e=>{
  if(section.hidden)return;
  const r=canvas.getBoundingClientRect(),point={x:(e.clientX-r.left)*WORLD.width/r.width,y:(e.clientY-r.top)*WORLD.height/r.height};
  if(select.value)place(point);
  else if(insideCampLand(game.progress,point.x,point.y,point.x,point.y))open(point);
  else notice.textContent='请选择已解锁的营地，或点击“扩建营地”查看下一块地。';
 });
 // 建设模式优先于普通地点交互；普通空地点击可先选落点。
 function tap(event,onlyArmed){
  if((onlyArmed&&!armed)||!renderer.view||game.state!=='playing'||!canInspectBuilding(game)||root.querySelector('dialog[open]'))return false;
  const r=renderer.canvas.getBoundingClientRect(),v=renderer.view,point={x:v.x+(event.clientX-r.left)*v.w/r.width,y:v.y+(event.clientY-r.top)*v.h/r.height};
  return armed?place(point):insideCampLand(game.progress,point.x,point.y,point.x,point.y)&&open(point);
 }
 // 已建房屋以实际坐标标在大地图上。
 function draw(c,sx,sy){
  if(section.hidden)return;
  c.save();c.fillStyle='#325c42';
  for(const site of Object.values(game.progress.campLand?.sites||{})){const p=canonical(site);c.fillRect(p.x*sx-3,p.y*sy-3,6,6);}
  c.restore();
 }
 game.openCampConstruction=open;game.tapCampConstruction=tap;
 return {refresh,draw,dispose(){delete game.openCampConstruction;delete game.tapCampConstruction;section.remove();bar.remove();}};
}
