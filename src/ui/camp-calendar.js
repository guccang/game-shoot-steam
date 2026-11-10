import {campPlazaOccupied} from '../world/camp-plaza.js';
// 手机节日日历复用统一底板及暂停归属，日期只读取游戏历法。
import {createEventScope} from '../platform/events.js';
import {festivalCalendar,activeCampFestival} from '../world/camp-festivals.js';
import {buyCampFestival,setCampFestival} from '../core/camp/camp-management.js';
// 节庆购买与切换共用页面，手机日历和装饰铺都可直接进入。
export function createCampCalendar({game,root,dialogs,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog');dialog.id='camp-calendar-dialog';dialog.className='ui-panel ui-panel--fullscreen ui-page';dialog.setAttribute('aria-labelledby','camp-calendar-title');dialog.innerHTML='<header class="ui-panel__header"><h2 id="camp-calendar-title">节日日历</h2><button class="ui-close" aria-label="关闭节日日历">×</button></header><div class="ui-panel__body" data-calendar-body></div><footer class="ui-panel__footer"><p role="status" aria-live="polite"></p><button class="ui-button" data-calendar-back>返回</button></footer>';root.body.append(dialog);dialogs.register(dialog.id,{});
 // 当前日期、轮换顺序与已购状态在操作后一次刷新，不每帧重建列表。
 function render(){const {view,today,remaining,upcoming}=festivalCalendar(game.progress.living.calendar),state=game.progress.campManagement,active=activeCampFestival(game.progress),mode=state.festivalMode;dialog.querySelector('[data-calendar-body]').innerHTML=`<section class="ui-section"><h3>${view.label}</h3><h2>今天 · ${today.name}</h2><p>${today.description}</p><p>距下个节日约 ${Math.ceil(remaining/60000)} 分钟有效游玩时间</p><p>游戏节庆每季轮换，三年一轮；暂停和离线不推进，与现实日期无关。</p></section><section class="ui-section"><h3>营地节日装扮</h3>${campPlazaOccupied(game.progress)?'<p>广场被原有建筑、农田或装饰占用，庆典表演暂缓。请在营地管理中移走占用物；现有物品不会自动移动。</p>':''}<p>当前：${active?.name||'日常营地'} · 金币 ${game.progress.coins}</p><div class="camp-manager-actions"><button class="ui-button" data-festival-mode="auto" aria-pressed="${mode==='auto'}">跟随日历</button><button class="ui-button" data-festival-mode="normal" aria-pressed="${mode==='normal'}">日常装扮</button></div><p>自动模式只启用已购买的套装；手动选择会持续保留，直到重新选择跟随日历。原有摆件保持不变。</p></section>${upcoming.map((f,i)=>{const owned=state.festivals.includes(f.id);return `<article class="ui-section"><small>${i===0?'正在庆祝':`约 ${Math.ceil(f.startsIn/60000)} 分钟有效游玩后`}</small><h3>${f.name}</h3><p>${f.dateLabel}</p><p>${f.description}</p>${owned?`<button class="ui-button" data-festival-mode="${f.id}" aria-pressed="${mode===f.id}">${mode===f.id?'手动使用中':'手动换装'}</button>`:`<button class="ui-button" data-festival-buy="${f.id}" ${game.progress.coins<f.price?'disabled':''}>购买装扮 · ${f.price} 金币</button>`}</article>`;}).join('')}`;}
 // 保留原面板的恢复标记，关闭日历不会意外解除另一页的暂停。
 function open(){render();const previous=[...root.querySelectorAll('dialog[open]')];dialogs.open(dialog.id);for(const d of previous){dialogs.transferResume(d.id,dialog.id);dialogs.close(d.id);}return true;}
 scope.on(dialog,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.matches('.ui-close,[data-calendar-back]')){dialogs.close(dialog.id);return;}const id=b.dataset.festivalBuy||b.dataset.festivalMode;if(!id)return;const r=b.dataset.festivalBuy?buyCampFestival(game,id):setCampFestival(game,id);if(r.ok){onChange();render();}dialog.querySelector('[role=status]').textContent=r.ok?(b.dataset.festivalBuy?'装扮已购买，可随节日自动启用。':'装扮模式已保存。'):r.message;});
 game.openCampCalendar=open;
 // 页面生命周期内只注册一次入口，离开游戏完整清理。
 function dispose(){scope.dispose();dialog.remove();delete game.openCampCalendar;}
 return {open,dispose};
}
