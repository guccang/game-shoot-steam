import {setHidden,setText} from './shared/dom-state.js';
// 驿站页复用手机底板；建站落盘后反馈，自动行程始终由正式更新循环驱动。
import {createEventScope} from '../platform/events.js';
import {WAYSTATIONS} from '../config/waystations.js';
import {buildWaystation,travelToWaystation,stopWaystationTravel,waystationBuildReason,waystationUnavailable} from '../core/navigation/waystations.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {displayMeters} from '../world/distance-units.js';
export function createWaystations({game,root,renderer,dialogs,persist,onChange,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog'),hud=root.createElement('section');let message='',lastNotice='';
 panel.id='waystations-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','waystations-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="waystations-title">林间驿站</h2><p>在走过的地方，留下下一程的路标</p></div><button type="button" class="ui-close" aria-label="关闭驿站">×</button></header><div class="ui-panel__body"><section class="ui-section"><h3>当前位置建立驿站</h3><p>名称随机生成，编号从 1 开始依次递增。</p><p id="waystation-build-note"></p><button type="button" class="ui-button ui-button--primary" id="waystation-build">在这里建立</button></section><h3 id="waystation-count"></h3><p>选择驿站后自动步行或驾驶前往，操作方向即可接管。路线受阻时会停下。</p><div id="waystation-list"></div></div><footer class="ui-panel__footer"><p id="waystation-message" role="status"></p></footer>';
 root.body.append(panel);
 hud.id='waystation-travel';hud.hidden=true;hud.setAttribute('aria-label','驿站自动行进');hud.innerHTML='<span role="status"></span><button type="button" class="ui-button" aria-label="停止驿站导航">停止</button>';root.getElementById('game-frame').append(hud);
 const get=id=>root.getElementById(id);
 // 站名使用textContent，读档中的文字不会进入HTML模板。
 function render(){
  const sites=game.progress.waystations?.sites||[],reason=waystationBuildReason(game);
  setText(get('waystation-count'),`已建驿站 ${sites.length} / ${WAYSTATIONS.limit}`);
  setText(get('waystation-build-note'),reason||'免费建立，保存在当前落脚点。');get('waystation-build').disabled=!!reason;
  setText(get('waystation-message'),message);get('waystation-list').replaceChildren();
  if(!sites.length){const empty=root.createElement('p');setText(empty,'还没有驿站。在这里建立第一座吧。');get('waystation-list').append(empty);}
  for(const site of sites){const row=root.createElement('section');row.className='ui-section';const title=root.createElement('h3'),note=root.createElement('p'),go=root.createElement('button');setText(title,`${site.id} · ${site.name}`);const distance=worldDistance(game.player,site);setText(note,distance<=WAYSTATIONS.arrival?'当前驿站':`距离 ${displayMeters(distance)}米`);go.type='button';go.className='ui-button';setText(go,'自动前往');go.dataset.stationGo=site.id;go.disabled=!!waystationUnavailable(game)||distance<=WAYSTATIONS.arrival;go.setAttribute('aria-label','自动前往'+site.name);row.append(title,note,go);get('waystation-list').append(row);}
 }
 dialogs.register(panel.id,{onOpen:render});
 // 从手机转交暂停归属，离开驿站页不会留下覆盖战场的旧页面。
 function open(){message='';dialogs.open(panel.id);const phone=root.getElementById('phone-dialog');if(phone?.open){dialogs.transferResume(phone.id,panel.id);dialogs.close(phone.id);}}
 scope.on(panel.querySelector('.ui-close'),'click',()=>dialogs.close(panel.id));
 scope.on(get('waystation-build'),'click',()=>{
  const old=game.progress.waystations,backup=old?{...old,sites:[...old.sites]}:old,result=buildWaystation(game);
  if(result.ok&&!persist(game.progress)){game.progress.waystations=backup;message='保存失败，驿站尚未建立，请重试。';}
  else message=result.message;
  render();onChange();
 });
 // 出发进度由实时HUD统一显示，旧的“正在规划”飘字不会在已经起步后继续残留。
 scope.on(panel,'click',event=>{const b=event.target.closest('[data-station-go]');if(!b||b.disabled)return;const result=travelToWaystation(game,Number(b.dataset.stationGo));message=result.message;if(result.ok)dialogs.close(panel.id);else render();onChange();});
 scope.on(hud.querySelector('button'),'click',()=>{stopWaystationTravel(game);onChange();});
 // 场景牌面与真实坐标共用命中范围，拖动仍由原输入系统负责。
 function tapWorld(event){
  const view=renderer.view;if(!view||game.state!=='playing'||waystationUnavailable(game))return false;
  const rect=renderer.canvas.getBoundingClientRect(),point={x:view.x+(event.clientX-rect.left)*view.w/rect.width,y:view.y+(event.clientY-rect.top)*view.h/rect.height};
  const hit=(game.progress.waystations?.sites||[]).some(s=>{const p=nearest(s,point);return Math.abs(p.x-point.x)<40&&point.y>=p.y-86&&point.y<=p.y+12;});
  if(hit)open();return hit;
 }
 // HUD每帧只更新短状态，不重建长列表或触发存档。
 function renderFrame(){
  const trip=game.waystationTravel,site=trip&&game.progress.waystations?.sites.find(s=>s.id===trip.id);
  setHidden(hud,!site||game.state!=='playing'||!!root.querySelector('dialog[open]'));
  if(site)setText(hud.querySelector('span'),(trip.phase==='planning'?'正在寻路 · ':trip.moving?'自动前往 · ':'正在起步 · ')+site.name+' · '+displayMeters(worldDistance(game.player,site))+'米');
  const notice=game.waystationMessage;if(notice&&notice!==lastNotice){onNotice(notice);lastNotice=notice;}if(!notice)lastNotice='';
 }
 return {open,tapWorld,renderFrame,dispose(){scope.dispose();panel.remove();hud.remove();}};
}
