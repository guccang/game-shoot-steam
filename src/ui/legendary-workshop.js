// 红狼专属传承页与坦克设计台；预览只修改草稿，保存与解锁走原子事务。
import {LEGENDARY_STORY,TANK_PAINTS,TANK_BADGES,normalizeTankDesign} from "../config/legendary-workshop.js";
import {legendaryAccessReason,legendaryNavigationReason,legendaryNearby,travelLegendary,commitLegendary} from "../core/legendary-workshop.js";
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {createVehicle} from '../combat/vehicle.js';
import {drawVehicleTracks,drawVehicleArmor} from '../rendering/vehicle.js';
import {createEventScope} from '../platform/events.js';

// 组装唯一传奇页面与世界门牌，所有事件随应用生命周期释放。
export function createLegendaryWorkshop({game,root,renderer,dialogs,persist,onChange,onNotice,workshop}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),entry=root.createElement('button'),frame=root.getElementById('game-frame');
 dialog.id='legendary-dialog';dialog.innerHTML='<header><div><small>红狼传承</small><h2>传奇工坊</h2></div><button id="legendary-close" aria-label="关闭传奇工坊">×</button></header><div id="legendary-content"></div><p id="legendary-status" role="status"></p><button id="legendary-primary" class="ui-button"></button>';
 root.body.append(dialog);dialogs.register(dialog.id,{focusId:'legendary-close'});
 entry.id='legendary-entry';entry.className='legendary-entry';entry.textContent='传奇工坊 · 点击';entry.hidden=true;frame.append(entry);
 const $=id=>root.getElementById(id);let page='story',vehicle=6,draft=normalizeTankDesign();
 // 当前资格每次操作重新校验，打开面板后切换场景也不能绕过所有权和现场门槛。
 function submit(action){const r=commitLegendary(game,action,persist);$('legendary-status').textContent=r.ok?action.type==='unlock'?'传奇工坊已解锁，枪械最高等级提升至 LV30。':action.type==='paint'?'配色已应用到坦克。':'外观方案已保存。':r.reason;if(r.ok){render();onChange();}return r.ok;}
 // 设计预览调用正式车体与主炮，不使用截图或替代模型。
 function paint(){const canvas=$('legendary-preview');if(!canvas)return;const p={...game.progress,legendaryWorkshop:{...game.progress.legendaryWorkshop,designs:{...game.progress.legendaryWorkshop.designs,[vehicle]:draft}}},c=canvas.getContext('2d'),v=createVehicle(p, vehicle);v.angle=-.15;c.clearRect(0,0,320,190);c.save();c.translate(135,105);c.scale(1.1,1.1);drawVehicleTracks(c,{x:0,y:0,walkPhase:0},v,true,0,p);drawVehicleArmor(c,{x:0,y:0},v,p,0,true);c.restore();}
 // 能力介绍与真实权限一致；高阶升级延续原工坊的试装、报价和长按确认。
 function render(){
  const unlocked=game.progress.legendaryWorkshop.unlocked,near=legendaryNearby(game),reason=near?legendaryAccessReason(game):legendaryNavigationReason(game),content=$('legendary-content'),primary=$('legendary-primary');
  if(page==='design'&&unlocked&&near){
   content.innerHTML='<button data-legendary-back>返回工坊介绍</button><label class="legendary-vehicle">设计车型 <select id="legendary-vehicle">'+[6,1].filter(i=>game.progress.vehicleHulls[i]).map(i=>`<option value="${i}" ${i===vehicle?'selected':''}>${COLLECTED_VEHICLES[i].name}</option>`).join('')+'</select></label><canvas id="legendary-preview" width="320" height="190" aria-label="坦克外观预览"></canvas><p class="legendary-note">外观设计不改变装甲、速度或主武器。确认应用前只预览。</p>'+[['hull','车体'],['turret','炮塔'],['tracks','履带']].map(([key,name])=>`<fieldset><legend>${name}配色</legend><div class="legendary-swatches">${TANK_PAINTS.map((p,i)=>`<button data-paint-part="${key}" data-paint-value="${i}" aria-pressed="${draft[key]===i}"><i style="background:${p.color||'#e8dfc4'}"></i>${p.name}</button>`).join('')}</div></fieldset>`).join('')+'<fieldset><legend>前甲徽记</legend><div class="legendary-swatches">'+TANK_BADGES.map((name,i)=>`<button data-paint-part="badge" data-paint-value="${i}" aria-pressed="${draft.badge===i}">${name}</button>`).join('')+'</div></fieldset><h3>外观方案 · 最多3份</h3>'+[0,1,2].map(i=>{const s=game.progress.legendaryWorkshop.schemes[i];return `<div class="legendary-scheme"><span>方案${i+1}${s?' · '+COLLECTED_VEHICLES[s.vehicle].shortName:' · 空'}</span><button data-scheme-load="${i}" ${s?'':'disabled'}>预览</button><button data-scheme-save="${i}" ${i>game.progress.legendaryWorkshop.schemes.length?'disabled':''}>${s?'覆盖':'保存'}</button></div>`;}).join('');
   primary.textContent='应用当前外观';primary.disabled=false;paint();return;
  }
  page='story';content.innerHTML=`<section class="legendary-letter"><h3>${LEGENDARY_STORY.title}</h3><details ${unlocked?'':'open'}><summary>赤榛留下的信</summary>${LEGENDARY_STORY.paragraphs.map(p=>'<p>'+p+'</p>').join('')}</details></section><section class="legendary-abilities"><h3>${unlocked?'已解锁能力':'传承能力'}</h3><dl><dt>传奇锻造 · LV30</dt><dd>枪械主等级上限从 LV20 提升至 LV30。LV20 → 21 需25,000金币与10,000木材，之后逐级增加；附属部件和车体上限不变。</dd><dt>坦克部件染色</dt><dd>分别调整红狼、重型坦克的车体、炮塔与履带颜色。</dd><dt>载具外观设计</dt><dd>搭配配色与前甲徽记，保存最多3份外观方案，应用后实战生效。</dd></dl></section><p class="legendary-note">${unlocked?'炉火已经交到你手中。营地任务仍可继续，也可以自行远行、采集与挑战。':'红狼本身就是钥匙，无需额外道具。获得红狼后，步行或驾驶其他车辆也能看见工坊。按路线到门口站定1秒进入，再找匠人接受传承。'}</p>${unlocked&&near?'<div class="legendary-actions"><button data-legendary-upgrade>锻造枪械</button><button data-legendary-design>设计坦克外观</button></div>':''}<p class="legendary-reason">${reason||(!near?'工坊位于晴叶森林深处。可在此标记路线，也可在手机地图中找到传奇工坊。':'红狼铭牌已识别，欢迎归来。')}</p>`;
  primary.textContent=!near?'标记传奇工坊路线':!unlocked?'接受传承 · 解锁工坊':'继续自由探索';primary.disabled=!!reason;
 }
 // 从红狼档案进入，关闭旧工坊并转交暂停归属，避免叠窗后无法恢复游玩。
 function open(){page='story';$('legendary-status').textContent='';render();dialogs.open(dialog.id);for(const id of ['ws-equipment-dialog','workshop-dialog','vehicle-collection-dialog'])if($(id)?.open){dialogs.transferResume(id,dialog.id);dialogs.close(id);}}
 scope.on($('legendary-close'),'click',()=>dialogs.close(dialog.id));scope.on(entry,'click',()=>{if(legendaryNearby(game))open();else onNotice('请沿路线抵达传奇工坊门口。');});
 scope.on($('legendary-primary'),'click',()=>{
  if(page==='design'){submit({type:'paint',vehicle,design:draft});return;}
  if(!legendaryNearby(game)){const r=travelLegendary(game);if(!r.ok){$('legendary-status').textContent=r.reason;return;}dialogs.close(dialog.id);onChange();onNotice((r.exitFirst?'请先离开载具工坊。':'')+'传奇工坊路线已开启，到门口站定1秒进入，再找匠人接受传承。');return;}
  if(!game.progress.legendaryWorkshop.unlocked)submit({type:'unlock'});else dialogs.close(dialog.id);
 });
 scope.on(dialog,'change',e=>{if(e.target.id==='legendary-vehicle'){vehicle=Number(e.target.value);draft=normalizeTankDesign(game.progress.legendaryWorkshop.designs[vehicle]);render();}});
 scope.on(dialog,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-legendary-design')){if(!legendaryNearby(game))return;page='design';vehicle=6;draft=normalizeTankDesign(game.progress.legendaryWorkshop.designs[vehicle]);render();}
  if(b.hasAttribute('data-legendary-back')){page='story';render();}
  if(b.hasAttribute('data-legendary-upgrade')){if(!legendaryNearby(game))return;workshop.open('weapons',game.progress.weapon);dialogs.transferResume(dialog.id,'workshop-dialog');dialogs.close(dialog.id);}
  if(b.dataset.paintPart){draft[b.dataset.paintPart]=Number(b.dataset.paintValue);for(const n of dialog.querySelectorAll(`[data-paint-part="${b.dataset.paintPart}"]`))n.setAttribute('aria-pressed',String(n===b));paint();}
  if(b.dataset.schemeSave!==undefined)submit({type:'save-scheme',vehicle,design:draft,slot:Number(b.dataset.schemeSave)});
  if(b.dataset.schemeLoad!==undefined){const s=game.progress.legendaryWorkshop.schemes[Number(b.dataset.schemeLoad)];if(s&&game.progress.vehicleHulls[s.vehicle]){vehicle=s.vehicle;draft=normalizeTankDesign(s.design);render();$('legendary-status').textContent='已载入方案预览，点击应用后更换实战外观。';}}
 });
 // 室外沿用统一门口候停，保留旧接口但不重复显示已停用的浮动门牌。
 function renderFrame(){entry.hidden=true;}
 // 卸载时释放入口、模态和全部监听。
 function dispose(){scope.dispose();if(dialog.open)dialogs.close(dialog.id);dialog.remove();entry.remove();}
 return {open,renderFrame,dispose};
}
