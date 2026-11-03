// 地下界面展示当前层实际开发率，并将生态操作提交给正式规则。
import {currentMineLayer,travelMineLayer} from '../core/mine-layers.js';
import {mineDevelopment} from '../progression/mine-layers.js';
import {mineTerrain} from '../config/mine-ecology.js';
import {buildMineBridge,harvestMine} from '../core/mine-ecology.js';
import {catLoad} from '../progression/load-weight.js';
// 地下手机操作复用统一底板，施工说明暂停游戏，确认后回场景执行真实事务。
import {createEventScope} from '../platform/events.js';
import {MINING,MINE_DIRECTIONS,mineCell,mineKey} from '../config/mining.js';
import {faceMine,toggleMineDig,buildMine,rideMineCart,toggleMineCart,startMineShaft,leaveMine} from '../core/mining.js';
import {drawMineMap} from '../rendering/mining.js';
import {canonical} from '../world/coordinates.js';

// HUD只更新数值和按钮状态，避免每帧重建触摸目标。
export function createMining({game,renderer,root,panel,input,dialogs,onCharacter}){
 const scope=createEventScope(),hud=root.createElement('div'),controls=root.createElement('div'),dialog=root.createElement('dialog');let pending=null,mapTime=0;
 hud.id='mine-hud';hud.hidden=true;hud.innerHTML='<div><b id="mine-layer-title">矿锄 · 地下探索</b><p id="mine-wallet"></p><p id="mine-development"></p><p id="mine-position"></p><p id="mine-home"></p></div><canvas id="mine-minimap" width="224" height="224" aria-label="地下小地图，北方朝上，小屋为黄色，洞口为蓝色"></canvas>';
 controls.id='mine-controls';controls.hidden=true;controls.innerHTML=`<p id="mine-message" role="status"></p><div class="mine-directions" aria-label="矿锄朝向">${MINE_DIRECTIONS.map((d,i)=>`<button class="ui-button" data-mine-face="${i}" aria-label="朝${d.name}挖矿">${['↑','→','↓','←'][i]} ${d.name}</button>`).join('')}</div><div class="mine-actions"><button class="ui-button ui-button--primary" id="mine-dig">开始挖矿</button><button class="ui-button" id="mine-build">修建路线</button><button class="ui-button" id="mine-board">乘矿车</button><button class="ui-button" id="mine-drive" hidden>开车</button><button class="ui-button" id="mine-exit">返回小屋</button></div>`;
 dialog.id='mine-build-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','mine-build-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="mine-build-title" tabindex="-1">地下建设</h2><p id="mine-build-wallet"></p></div><button class="ui-close" data-mine-close aria-label="关闭地下建设">×</button></header><div class="ui-panel__body"><section class="ui-section"><h3>层级与生态</h3><p id="mine-layer-rule"></p><button class="ui-button" data-mine-special="down">开通 / 进入下一层</button><button class="ui-button" data-mine-special="up">沿入口返回上一层</button><button class="ui-button" data-mine-special="harvest">采集脚下景观</button><button class="ui-button" data-mine-special="bridge">前方建桥 · 2 矿石 + 4 木材</button><button class="ui-button" data-mine-special="bridge-here">脚下建桥 · 2 矿石 + 4 木材</button><p>九类地下景观随挖掘显露。菌木、晶簇、草药与化石可采集，并按本层探索时间再生。水面需要桥梁，两栖载具可直接过水。矿锄自动近身防卫；战车主炮使用自身弹药迎敌。濒危会紧急撤回本层入口。</p></section><section class="ui-section"><h3>铺设路线</h3><p>先挖通矿道，再逐格铺轨，相邻轨道自动相连。前方由场景中的四向按钮选择。</p><button class="ui-button" data-mine-build="rail">脚下铺轨 · 1 矿石 + 2 木材</button><button class="ui-button" data-mine-build="rail" data-ahead>前方铺轨 · 1 矿石 + 2 木材</button><button class="ui-button" data-mine-build="cart">脚下造矿车 · 8 矿石 + 12 木材</button><p>靠近矿车后乘坐，点击开车持续行驶；端点自动折返，岔路优先选择当前朝向。可随时停车、下车。</p></section><section class="ui-section"><h3>装点矿道</h3><p>摆件放在脚下格的边缘，不阻挡通行。</p><button class="ui-button" data-mine-build="lamp">放置矿灯 · 1 矿石 + 1 木材</button><button class="ui-button" data-mine-build="sign">放置路牌 · 2 木材</button></section><section class="ui-section"><h3>向上挖洞口</h3><p>在地表可通行的空地正下方施工 4 秒。建筑、树木和水域下不能开洞；移动取消施工。仅地下一层可以向上开地表洞口。施工同时开出九格车辆回转平台，建好后战车可以沿坡道双向通行。战车需走已挖开的通道，重型车至少需要两格宽；请先步行挖路。</p><button class="ui-button" data-mine-shaft>向上开洞 · 5 矿石 + 8 木材</button></section><section class="ui-inset"><h3>矿锄与方向</h3><button class="ui-button" data-mine-backpack>整理背包</button><p>开启挖矿后，面向近处岩壁持续挥锄。拖动场景行走与转向，或点四向按钮调整朝向。矿石自动进入矿区材料库，木材使用仓库库存。小地图始终北朝上，小屋标记超出范围时停在边缘指向原址。</p></section></div><footer class="ui-panel__footer"><button class="ui-button" data-mine-close>回到矿道</button></footer>';
 panel.append(hud,controls);root.body.append(dialog);
 dialogs.register(dialog.id,{focusId:'mine-build-title',onOpen:()=>{const l=currentMineLayer(game);root.getElementById('mine-layer-rule').textContent=`当前地下 ${game.cottage.depth||1} 层，面积为地表的 ${l.coverage.toFixed(0)}%，已开发 ${(mineDevelopment(l).ratio*100).toFixed(2)}%。每层开发至少 50% 才能开通下一层。一层 100%，二层 10%–50%，三层及以后 10%–100%；面积和景观只在首次开通时随机，此后保持不变。开通后从原施工格通行，地下层数没有上限，可以一直向下开掘。`;root.getElementById('mine-build-wallet').textContent=`矿石 ${game.progress.mining.ore} · 木材 ${game.progress.wood}`;}});
 // 简短操作在运行场景直接完成；施工页只排队一个动作，关闭后才结算。
 scope.on(controls,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled||game.cottage?.kind!=='mine')return;
  if(b.dataset.mineFace!==undefined)faceMine(game,Number(b.dataset.mineFace));
  else if(b.id==='mine-dig')toggleMineDig(game);
  else if(b.id==='mine-build'){input.reset();dialogs.open(dialog.id);}
  else if(b.id==='mine-board')rideMineCart(game);
  else if(b.id==='mine-drive')toggleMineCart(game);
  else if(b.id==='mine-exit')leaveMine(game);
 });
 // 对话框只保留稳定按钮，真实规则在矿区核心再次核验范围、资源及状态。
 scope.on(dialog,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-mine-close'))dialogs.close(dialog.id);else if(b.dataset.mineSpecial||b.dataset.mineBuild||b.hasAttribute('data-mine-shaft')||b.hasAttribute('data-mine-backpack')){pending={room:game.cottage,kind:b.dataset.mineSpecial||b.dataset.mineBuild||(b.hasAttribute('data-mine-backpack')?'backpack':'shaft'),ahead:b.hasAttribute('data-ahead')};dialogs.close(dialog.id);}});
 // 地图每100毫秒采样可见格，所有按钮保留44像素触摸范围。
 function render(){
  const room=game.cottage,isMine=room?.kind==='mine';hud.hidden=controls.hidden=!isMine;
  if(!isMine){pending=null;if(dialog.open)dialogs.close(dialog.id);return;}
  if(pending&&game.state==='playing'){const action=pending;pending=null;if(action.room===room){if(action.kind==='backpack'){input.reset();onCharacter();}else if(action.kind==='down'||action.kind==='up')travelMineLayer(game,action.kind==='down'?1:-1);else if(action.kind==='harvest')harvestMine(game);else if(action.kind==='bridge'||action.kind==='bridge-here')buildMineBridge(game,action.kind==='bridge');else if(action.kind==='shaft')startMineShaft(game);else buildMine(game,action.kind,action.ahead);}}
  const m=currentMineLayer(game),cell=mineCell(game.player),key=mineKey(cell),point=canonical(game.player),distance=Math.round(Math.hypot(cell.x,cell.y));
  root.getElementById('mine-layer-title').textContent=`地下 ${room.depth||1} 层 · ${mineTerrain(cell,m).biome.name}`;
  root.getElementById('mine-development').textContent=`面积 ${m.coverage.toFixed(0)}% · 开发 ${(mineDevelopment(m).ratio*100).toFixed(2)}% / 50%`;
  root.getElementById('mine-wallet').textContent=`矿石 ${game.progress.mining.ore} · ${game.vehicle.active?'装甲 '+Math.ceil(game.vehicle.hp):'生命 '+Math.ceil(game.player.hp)}`;
  root.getElementById('mine-position').textContent=`地表坐标 ${Math.round(point.x)}，${Math.round(point.y)}`;
  root.getElementById('mine-home').textContent=distance?`小屋 ${cell.y>0?'北':cell.y<0?'南':''}${cell.x>0?'西':cell.x<0?'东':''} · ${distance} 格`:'这里是小屋正下方';
  root.getElementById('mine-message').textContent=catLoad(game).overloaded?'背包载荷已满，行走变慢。可在「修建路线」中整理背包。':room.shaftWork?`向上开洞 ${Math.min(100,Math.round(room.shaftWork/MINING.shaftSeconds*100))}% · 移动取消`:room.notice;
  root.getElementById('mine-dig').textContent=game.vehicle.active?'请步行挖路':room.autoDig?'停止挖矿':'开始挖矿';root.getElementById('mine-dig').disabled=!!room.ride||game.vehicle.active;
  root.getElementById('mine-build').disabled=!!room.ride;
  root.getElementById('mine-board').disabled=game.vehicle.active;root.getElementById('mine-board').textContent=room.ride?'停车下车':'乘矿车';
  const drive=root.getElementById('mine-drive');drive.hidden=!room.ride;drive.textContent=room.running?'立即停车':'开车';
  const exit=root.getElementById('mine-exit');exit.hidden=!!room.ride||((room.depth||1)>1?key!==m.entry:key!=='0,0'&&!m.shafts.includes(key));exit.textContent=(room.depth||1)>1?'返回上层':key==='0,0'?'返回小屋':'返回地面';
  for(const button of controls.querySelectorAll('[data-mine-face]'))button.setAttribute('aria-pressed',String(Number(button.dataset.mineFace)===room.direction));
  if(performance.now()-mapTime>=100){drawMineMap(root.getElementById('mine-minimap'),game);mapTime=performance.now();}
 }
 // 离开应用时回收地图画布、弹窗和监听，不留下第二套输入系统。
 function dispose(){if(dialog.open)dialogs.close(dialog.id);scope.dispose();hud.remove();controls.remove();dialog.remove();}
 return {render,dispose};
}
