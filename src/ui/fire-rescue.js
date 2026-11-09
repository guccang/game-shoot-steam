import {setHidden} from './shared/dom-state.js';
import {isRainWeather} from '../world/season-weather.js';
import {displayMeters} from '../world/distance-units.js';
import {facilityOpen} from '../config/town-restoration.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
// 世界消防面板、告警和导航摘要；只提交核心意图，不修改战场对象。
import {FIRE_RESCUE as C} from '../config/fire-rescue.js';
import {drawFireCard} from '../rendering/fire-rescue.js';
import {fireObjective,fireMotionText} from '../core/activities/fire-rescue.js';
import {fireTransferOpacity} from '../core/activities/fire-transit.js';
import {worldDistance} from '../world/coordinates.js';
import {createActionCountdown} from './action-countdown.js';
import {createEventScope} from '../platform/events.js';
import {layoutMobileActions} from './mobile-panels.js';
// 火警邀请用独立警报灯和火焰剪影表达主题，内联矢量避免新增位图加载。
export function fireAlertIcon(){return '<svg class="fire-alert-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g stroke="#365a45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 37V24a13 13 0 0 1 26 0v13" fill="#c77856"/><path d="M15 34V24a9 9 0 0 1 18 0v10" fill="#e6a467" stroke="none"/><path d="M24 15c2 7-3 7-2 11 2-1 4-3 4-5 8 7 5 15-2 15-8 0-11-10-6-15 0 3 1 4 2 4-1-4 3-6 4-10Z" fill="#fff0b3" stroke-width="1.6"/><path d="M24 3v4M7 11l4 4M41 11l-4 4M3 24h4M41 24h4" fill="none"/><rect x="7" y="37" width="34" height="7" rx="3" fill="#d6d9b0"/></g></svg>';}
// 原玩法目录保留主动接警入口，明确任务发生在当前森林。
export function fireCard(record,dead=false){return `<article class="realm-card realm-fire"><div class="realm-art"><canvas data-fire-art width="480" height="320" role="img" aria-label="${i18nHtml("ui.fire-rescue.197e370a18")}"></canvas><span class="realm-badge">${i18nHtml("ui.fire-rescue.770800d808")}</span></div><div class="realm-card-body"><div class="realm-card-heading"><div><h3>${i18nHtml("config.realms.12658843f1")}</h3><div class="realm-record">${i18nHtml("ui.fire-rescue.4238cd7f97", { p0: (record.clears) })}</div></div><button class="primary" data-enter-realm="fire" ${dead?'disabled':''}>${i18nHtml("ui.fire-rescue.97225a720d")}</button></div><div class="realm-card-loot">${i18nHtml("ui.fire-rescue.a886824aa7")}</div></div></article>`;}
// 卡片复用正式消防站与车体。
export function paintFirePanel(root){for(const c of root.querySelectorAll('[data-fire-art]'))drawFireCard(c.getContext('2d'));}
// 消防状态独立呈现，不把世界事件伪装成秘境圈。
export function createFirePanel({game,root,dialogs,onChange}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),dialog=root.createElement('dialog'),notice=root.createElement('section');
 dialog.id='fire-dialog';dialog.className='fire-dialog';dialog.setAttribute('aria-labelledby','fire-title');
 dialog.innerHTML=`<div class="fire-dialog-head"><h2 id="fire-title">${i18nHtml("ui.fire-rescue.b8d855109d")}</h2><button data-fire-close aria-label="${i18nHtml("ui.fire-rescue.4f5bb0bfa5")}">×</button></div><div id="fire-content"></div>`;
 notice.className='fire-notice';notice.id='fire-notice';notice.setAttribute('aria-label',i18nText("ui.fire-rescue.3f5f6a6614"));setHidden(notice,true);frame.append(notice);root.body.append(dialog);
 // 黑屏只覆盖游戏视口；独立节点阻止转场期间误点，不增加图片或动画资源。
 const transfer=root.createElement('div');transfer.id='fire-town-transfer';setHidden(transfer,true);transfer.setAttribute('role','status');transfer.setAttribute('aria-label','正在返回小镇，随后前往消防站');frame.append(transfer);
 dialogs.register('fire-dialog');let key='';
 const countdown=createActionCountdown(root,{action:'关闭火警提示'});countdown.node.setAttribute('data-fire-countdown','');
 // 从目录转入消防时交接暂停归属，关闭详情后能恢复原先的巡逻状态。
 function open(){if(!facilityOpen(game.progress,'fire')){game.requestFacility?.('fire');return false;}if(game.realm||game.story||game.mapId!=='forest'||game.state==='dead')return false;if(!game.fireRescue&&!game.requestFireRescue())return false;render();dialogs.open('fire-dialog');dialogs.transferResume('realm-dialog','fire-dialog');dialogs.close('realm-dialog');return true;}
 // 即时数字只更新已有节点，避免开着面板时反复替换焦点。
 function render(){
  renderFrame();
  const r=game.fireRescue,active=game.fireActive,available=!game.realm&&!game.story&&game.mapId==='forest';
  // 成功交接由奖励面板展示结果，保留存档与车库状态时也不再留下常驻消防提示。
  setHidden(notice,!r||r.phase==='won'||!available||game.state==='dead');frame.classList.toggle('fire-world-active',active);
  if(!r){key='';return;}
  const current=r.phase+':'+r.source;
  if(key!==current){key=current;root.getElementById('fire-title').textContent=r.phase==='won'?i18nText("ui.fire-rescue.3783ef3b39"):r.phase==='lost'?i18nText("ui.fire-rescue.a688834686"):i18nText("ui.fire-rescue.b8d855109d");
   root.getElementById('fire-content').innerHTML=game.fireTransit?`<p class="fire-call">${fireMotionText(r.phase)}</p><p>${i18nHtml('fire.motion.explanation')}</p><button class="primary" data-fire-close>${i18nHtml('fire.motion.continue')}</button>`:r.phase==='offered'?`<canvas class="fire-banner" data-fire-art width="480" height="320" aria-label="${i18nHtml("ui.fire-rescue.236721bc18")}"></canvas><p class="fire-call">${r.source==='random'?i18nText("ui.fire-rescue.2ed2159944"):i18nText("ui.fire-rescue.20cfa0cb99")}</p><p>${i18nHtml("ui.fire-rescue.5bebd5a296")}</p><p>${i18nHtml("ui.fire-rescue.a4a8b22d87")}</p><button class="primary fire-start" data-fire-accept>${i18nHtml("ui.fire-rescue.2591a006eb")}</button><button data-fire-dismiss>${i18nHtml("ui.fire-rescue.887f4da96a")}</button>`:r.phase==='returning'?`<p class="fire-call">${i18nHtml("ui.fire-rescue.568ff05d9e")}</p><p data-fire-status></p><p>${i18nHtml("ui.fire-rescue.2a0baa71f3")}</p><button class="primary" data-fire-close>${i18nHtml("ui.fire-rescue.e4adc720b8")}</button>`:r.phase==='active'?`<p class="fire-call">${i18nHtml("ui.fire-rescue.dbb036da59")}</p><p data-fire-status></p><p>${i18nHtml("ui.fire-rescue.0f288d3f7c")}</p><button data-fire-water>${i18nHtml("ui.fire-rescue.491e61053c")}</button><button class="primary" data-fire-close>${i18nHtml("ui.fire-rescue.4c77abeabd")}</button><button data-fire-dismiss>${i18nHtml("ui.fire-rescue.228e6649b2")}</button>`:`<p class="fire-call">${r.phase==='won'?i18nText("ui.fire-rescue.b0477935b9"):i18nText("ui.fire-rescue.e60cbd55ab")}</p><p>${r.phase==='won'?i18nText("ui.fire-rescue.3a96d7c6dd"):''}</p><p>${i18nHtml("ui.fire-rescue.f75a40fd80", { p0: (r.fires.filter(f=>f.ever&&f.hp<=0).length), p1: (r.refills) })}</p><button class="primary" data-fire-dismiss>${i18nHtml("ui.fire-rescue.0c6a406950")}</button>`;
   paintFirePanel(dialog);
   layoutMobileActions(root.getElementById('fire-content'));
  }
  // 靠泊判断沿用坐标单位与原取整方式，米值只用于显示。
  const o=fireObjective(game),distance=o?.target?worldDistance(o.target,game.player):0,meters=displayMeters(distance);
  const description=game.fireTransit?fireMotionText(r.phase):r.phase==='returning'?i18nText("ui.fire-rescue.7e76f40099", { p0: (o.name), p1: (meters) }):active?i18nText("ui.fire-rescue.9cab849269", { p0: (o.name), p1: (meters), p2: (Math.ceil(r.water)), p3: (Math.ceil(r.remaining)) }):r.phase==='offered'?i18nText("ui.fire-rescue.79e42f6278"):r.phase==='won'?i18nText("ui.fire-rescue.f233b166df"):i18nText("ui.fire-rescue.9726507e17");
  const offered=r.phase==='offered';notice.classList.toggle('fire-notice-alert',offered);
  const noticeKey=r.phase+':'+Boolean(r.waterGuide);if(notice.dataset.state!==noticeKey){notice.dataset.state=noticeKey;notice.innerHTML=offered?`<button data-fire-open class="fire-alert-button" title="森林火警 · 点击查看火情">${fireAlertIcon()}</button>`:`<button data-fire-open class="fire-notice-main"><b data-fire-notice-text></b><small>${active?i18nText("ui.fire-rescue.b3c7964f35"):i18nText("ui.fire-rescue.e230dc6a08")}</small></button>${r.phase==='active'?`<button data-fire-water>${r.waterGuide?i18nText("ui.fire-rescue.bdcf5ad3f6"):i18nText("ui.fire-rescue.5bc81ab6fe")}</button>`:''}`;}
  if(offered){
   const button=notice.querySelector('[data-fire-open]'),remaining=r.offerRemaining??C.offerSeconds;
   if(countdown.node.parentElement!==button)button.prepend(countdown.node);
   countdown.update(remaining*1000,C.offerSeconds*1000);
   button.setAttribute('aria-label',`森林火警，${Math.max(1,Math.ceil(remaining))}秒后自动关闭，点击查看火情`);
  }else notice.querySelector('[data-fire-notice-text]').textContent=description;
  const status=dialog.querySelector('[data-fire-status]');if(status)status.textContent=description;
  if(active){const $=id=>root.getElementById(id);setHidden($('quest'),false);$('quest').classList.remove('incoming','wave-quest');$('quest-title').textContent=game.fireTransit?description:r.phase==='returning'?i18nText("ui.fire-rescue.568ff05d9e"):i18nText("ui.fire-rescue.3821a1ec3e", { p0: (o.left) });$('quest-detail').textContent=r.phase==='active'&&isRainWeather(game.livingWeather)?'雨水正在灭火 · 扑灭后驾车返站':game.fireTransit?i18nText('fire.motion.automatic'):!game.vehicle.active?i18nText("ui.fire-rescue.750036b981"):r.phase==='returning'&&Math.round(distance)<=C.dockRadius?i18nText("ui.fire-rescue.d8f3c6a7b8"):i18nText("ui.fire-rescue.a6531b79bd", { p0: (o.name) });$('quest-count').textContent=game.fireTransit?'':r.phase==='returning'?i18nText("ui.fire-rescue.c567d4af4d", { p0: (meters) }):i18nText("ui.fire-rescue.b7ec775f60", { p0: (Math.ceil(r.water)) });setHidden($('boss-button'),true);setHidden($('wave-track'),true);}
 }
 // 点击响应沿用原生弹窗暂停归属，拒绝不会立即再次弹警。
 function action(event){const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-fire-open')){open();return;}
  if(b.hasAttribute('data-fire-close')){dialogs.close('fire-dialog');return;}
  if(b.hasAttribute('data-fire-accept')){if(game.startFireRescue()){dialogs.cancelResume();dialogs.close('fire-dialog');}}
  if(b.hasAttribute('data-fire-dismiss')){game.dismissFireRescue();dialogs.close('fire-dialog');}
  if(b.hasAttribute('data-fire-water'))game.guideFireWater();onChange();
 }
 scope.on(dialog,'click',action);scope.on(notice,'click',action);
 // 动态界面随应用卸载，重复挂载不遗留门牌和监听器。
 function dispose(){scope.dispose();dialog.remove();notice.remove();transfer.remove();}
 // 每帧同步遮罩与换位时刻，不能等待低频 HUD 刷新才遮住原场景。
 function renderFrame(){setHidden(transfer,game.fireRescue?.phase!=='transferring');transfer.style.opacity=String(fireTransferOpacity(game));}
 return {open,render,renderFrame,dispose};
}
