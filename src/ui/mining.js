import {beginFishing} from '../core/outdoors.js';
import {readyMineWeapon} from '../core/mine-combat.js';
import {createMineCartDirections} from './mine-cart-directions.js';
import {mineToolIcon,MINE_TOOLS} from './mine-tool-icons.js';
// 地下界面展示当前层实际开发率，并将生态操作提交给正式规则。
import {currentMineLayer,travelMineLayer} from '../core/mine-layers.js';
import {mineDevelopment} from '../progression/mine-layers.js';
import {mineTerrain} from '../config/mine-ecology.js';
import {buildMineBridge,harvestMine} from '../core/mine-ecology.js';
import {catLoad} from '../progression/load-weight.js';
// 地下手机操作复用统一底板，施工说明暂停游戏，确认后回场景执行真实事务。
import {createEventScope} from '../platform/events.js';
import {MINING,mineCell,mineKey} from '../config/mining.js';
import {selectMineTool,buildMine,rideMineCart,toggleMineCart,startMineShaft,leaveMine} from '../core/mining.js';
import {drawMineMap} from '../rendering/mining.js';
import {canonical} from '../world/coordinates.js';

// HUD只更新数值和按钮状态，避免每帧重建触摸目标。
export function createMining({game,renderer,root,panel,input,dialogs,onCharacter}){
 const scope=createEventScope(),hud=root.createElement('div'),controls=root.createElement('div'),dialog=root.createElement('dialog');let pending=null,mapTime=0,hudTime=-Infinity,hudRoom=null,hudSignature='',toolsOpen=false,wasFishing=false;
 hud.id='mine-hud';hud.hidden=true;hud.innerHTML='<div><b id="mine-layer-title">矿锄 · 地下探索</b><p id="mine-wallet"></p><p id="mine-development"></p><p id="mine-position"></p><p id="mine-home"></p></div><canvas id="mine-minimap" width="224" height="224" aria-label="地下小地图，北方朝上，小屋为黄色，洞口为蓝色"></canvas>';
 controls.id='mine-controls';controls.hidden=true;controls.innerHTML=`<p id="mine-message" role="status"></p><div class="mine-compact"><button class="ui-button" id="mine-fish">钓鱼</button><button class="ui-button" id="mine-tools-toggle" aria-expanded="false" aria-controls="mine-tools-panel">工具 ▴</button></div><div id="mine-tools-panel" hidden><div class="mine-tools" role="group" aria-label="地下快捷工具">${MINE_TOOLS.map(([id,name])=>`<button class="ui-button" data-mine-tool="${id}" aria-label="${name}" aria-pressed="false">${mineToolIcon(id)}<span>${name}</span></button>`).join('')}</div><div class="mine-actions"><button class="ui-button" id="mine-weapon" aria-pressed="false">拿起武器</button><button class="ui-button" id="mine-build">更多建设</button><button class="ui-button" id="mine-board">乘矿车</button><button class="ui-button" id="mine-drive" hidden>开车</button><button class="ui-button" id="mine-exit">返回小屋</button></div></div>`;
 dialog.id='mine-build-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','mine-build-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="mine-build-title" tabindex="-1">地下建设</h2><p id="mine-build-wallet"></p></div><button class="ui-close" data-mine-close aria-label="关闭地下建设">×</button></header><div class="ui-panel__body"><section class="ui-section"><h3>层级与生态</h3><p id="mine-layer-rule"></p><button class="ui-button" data-mine-special="down">开通 / 进入下一层</button><button class="ui-button" data-mine-special="up">沿入口返回上一层</button><button class="ui-button" data-mine-special="harvest">采集脚下景观</button><button class="ui-button" data-mine-special="bridge">前方建桥 · 2 矿石 + 4 木材</button><button class="ui-button" data-mine-special="bridge-here">脚下建桥 · 2 矿石 + 4 木材</button><p>九类地下景观在开层时就天然存在，无需挖出。实际走访天然地块或开掘岩层计入开发率，地下没有预设道路。菌木、晶簇、草药与化石可采集，并按本层探索时间再生。水面需要桥梁，两栖载具可直接过水。默认使用已装备武器自动迎敌，弹药与地表共用；选择矿镐或铺轨时改为近身矿镐防卫，点击「拿起武器」恢复射击。前两层最多两只主动围攻，第三至五层三只，更深四只；怪物成长在第九层封顶。入口周围可避险；战车主炮使用自身弹药迎敌。濒危会紧急撤回本层入口。</p></section><section class="ui-section"><h3>铺设路线</h3><p>选择快捷栏「铺轨」，移动时沿途自动开采岩层并铺轨；天然洞厅可直接施工。铺轨时沿主方向前进，转弯后相邻轨道自动相连。</p><button class="ui-button" data-mine-build="rail">脚下铺轨 · 1 矿石 + 2 木材</button><button class="ui-button" data-mine-build="rail" data-ahead>前方铺轨 · 1 矿石 + 2 木材</button><button class="ui-button" data-mine-build="cart">脚下造矿车 · 8 矿石 + 12 木材</button><p>靠近矿车后乘坐，点击开车持续行驶；端点自动折返，岔路默认直行优先，再右转、左转。停车后点「开车方向」选择起步或掉头；下车靠近交叉路口，点「路口方向」保存自动行驶方向。</p></section><section class="ui-section"><h3>装点矿道</h3><p>摆件放在脚下格的边缘，不阻挡通行。</p><button class="ui-button" data-mine-build="lamp">放置矿灯 · 1 矿石 + 1 木材</button><button class="ui-button" data-mine-build="sign">放置路牌 · 2 木材</button></section><section class="ui-section"><h3>向上挖洞口</h3><p>在地表可通行的空地正下方施工 4 秒。建筑、树木和水域下不能开洞；移动取消施工。仅地下一层可以向上开地表洞口。施工同时开出九格车辆回转平台，建好后战车可以沿坡道双向通行。战车可走天然洞厅和挖开的通道，重型车至少需要两格宽；窄处需先步行拓宽。</p><button class="ui-button" data-mine-shaft>向上开洞 · 5 矿石 + 8 木材</button></section><section class="ui-inset"><h3>矿锄与方向</h3><button class="ui-button" data-mine-backpack>整理背包</button><p>选择快捷栏「矿镐」，拖动场景行走与转向，靠近岩壁自动挥镐；松开即停止。再次点击所选工具可取消自动作业。矿石自动进入矿区材料库，木材使用仓库库存。小地图始终北朝上，小屋标记超出范围时停在边缘指向原址。</p></section></div><footer class="ui-panel__footer"><button class="ui-button" data-mine-close>回到矿道</button></footer>';
 panel.append(hud,controls);root.body.append(dialog);
 const directions=createMineCartDirections({game,root,controls,input,dialogs});
 dialogs.register(dialog.id,{focusId:'mine-build-title',onOpen:()=>{const l=currentMineLayer(game);root.getElementById('mine-layer-rule').textContent=`当前地下 ${game.cottage.depth||1} 层，面积为地表的 ${l.coverage.toFixed(0)}%，已开发 ${(mineDevelopment(l).ratio*100).toFixed(2)}%。实际勘探或挖掘覆盖本层至少 50% 才能开通下一层。一层 100%，二层 10%–50%，三层及以后 10%–100%；面积和景观只在首次开通时随机，此后保持不变。开通后从原施工格通行，地下层数没有上限，可以一直向下开掘。`;root.getElementById('mine-build-wallet').textContent=`矿石 ${game.progress.mining.ore} · 木材 ${game.progress.wood}`;}});
 // 简短操作在运行场景直接完成；施工页只排队一个动作，关闭后才结算。
 scope.on(controls,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled||game.cottage?.kind!=='mine')return;
  if(b.id==='mine-tools-toggle'){input.reset();toolsOpen=!toolsOpen;render();}
  else if(b.id==='mine-fish'){input.reset();const result=beginFishing(game);game.cottage.notice=result.message;if(result.ok)toolsOpen=false;render();}
  else if(b.dataset.mineTool){input.reset();selectMineTool(game,b.dataset.mineTool);}
  else if(b.id==='mine-weapon'){input.reset();readyMineWeapon(game);}
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
  if(!isMine){hudRoom=null;hudTime=-Infinity;toolsOpen=false;wasFishing=false;directions.render();pending=null;if(dialog.open)dialogs.close(dialog.id);return;}
  if(hudRoom!==room){toolsOpen=false;wasFishing=false;}
  if(wasFishing&&!game.fishing)room.notice=game.outdoorNotice||'已收竿。';
  wasFishing=!!game.fishing;controls.hidden=wasFishing;
  if(pending&&game.state==='playing'){const action=pending;pending=null;if(action.room===room){if(action.kind==='backpack'){input.reset();onCharacter();}else if(action.kind==='down'||action.kind==='up')travelMineLayer(game,action.kind==='down'?1:-1);else if(action.kind==='harvest')harvestMine(game);else if(action.kind==='bridge'||action.kind==='bridge-here')buildMineBridge(game,action.kind==='bridge');else if(action.kind==='shaft')startMineShaft(game);else buildMine(game,action.kind,action.ahead);}}
  // 数值与小地图同为10Hz刷新；工具、停车、弹窗和屏幕尺寸变化立即更新。
  // 避免每个显示帧重写相同文本后强制测量布局，让镜头移动不被HUD阻塞。
  const now=performance.now(),signature=[toolsOpen,!!game.fishing,room.tool,room.autoDig,room.ride,room.running,room.weaponReady,room.notice,game.state,renderer.width,renderer.height].join('|');
  if(room===hudRoom&&signature===hudSignature&&now-hudTime<100)return;
  hudTime=now;hudRoom=room;hudSignature=signature;directions.render();
  const toggle=root.getElementById('mine-tools-toggle');toggle.setAttribute('aria-expanded',String(toolsOpen));toggle.textContent=toolsOpen?'收起 ▾':'工具 ▴';
  root.getElementById('mine-tools-panel').hidden=!toolsOpen;hud.dataset.expanded=String(toolsOpen);
  root.getElementById('mine-fish').disabled=!!room.ride||game.vehicle.active;
  const m=currentMineLayer(game),cell=mineCell(game.player),key=mineKey(cell),point=canonical(game.player),distance=Math.round(Math.hypot(cell.x,cell.y));
  root.getElementById('mine-layer-title').textContent=`地下 ${room.depth||1} 层 · ${mineTerrain(cell,m).biome.name}`;
  root.getElementById('mine-development').textContent=`面积 ${m.coverage.toFixed(0)}% · 开发 ${(mineDevelopment(m).ratio*100).toFixed(2)}% / 50%`;
  root.getElementById('mine-wallet').textContent=`矿石 ${game.progress.mining.ore} · ${game.vehicle.active?'装甲 '+Math.ceil(game.vehicle.hp):'生命 '+Math.ceil(game.player.hp)}`;
  const weaponButton=root.getElementById('mine-weapon'),weapon=game.weapon(),mag=game.magazines[game.loadout.weapon];
  weaponButton.disabled=game.vehicle.active;weaponButton.setAttribute('aria-pressed',String(!!room.weaponReady));
  weaponButton.textContent=room.weaponReady?(mag.remaining>0?'装填 '+mag.remaining.toFixed(1)+'秒':weapon.name+' · '+Math.floor(mag.ammo)):'拿起武器';
  root.getElementById('mine-position').textContent=`地表坐标 ${Math.round(point.x)}，${Math.round(point.y)}`;
  root.getElementById('mine-home').textContent=distance?`小屋 ${cell.y>0?'北':cell.y<0?'南':''}${cell.x>0?'西':cell.x<0?'东':''} · ${distance} 格`:'这里是小屋正下方';
  root.getElementById('mine-message').textContent=catLoad(game).overloaded?'背包载荷已满，行走变慢。可在「更多建设」中整理背包。':room.shaftWork?`向上开洞 ${Math.min(100,Math.round(room.shaftWork/MINING.shaftSeconds*100))}% · 移动取消`:room.notice;
  for(const button of controls.querySelectorAll('[data-mine-tool]')){const tool=button.dataset.mineTool;button.disabled=!!room.ride||game.vehicle.active;button.setAttribute('aria-pressed',String(tool===room.tool||tool==='shaft'&&!!room.shaftWork));}
  root.getElementById('mine-build').disabled=!!room.ride;
  root.getElementById('mine-board').disabled=game.vehicle.active;root.getElementById('mine-board').textContent=room.ride?'停车下车':'乘矿车';
  const drive=root.getElementById('mine-drive');drive.hidden=!room.ride;drive.textContent=room.running?'立即停车':'开车';
  const exit=root.getElementById('mine-exit');exit.hidden=!!room.ride||((room.depth||1)>1?key!==m.entry:key!=='0,0'&&!m.shafts.includes(key));exit.textContent=(room.depth||1)>1?'返回上层':key==='0,0'?'返回小屋':'返回地面';
  renderer.mineControlsTop=controls.hidden?renderer.height:controls.getBoundingClientRect().top-panel.getBoundingClientRect().top;
  if(performance.now()-mapTime>=100){drawMineMap(root.getElementById('mine-minimap'),game);mapTime=performance.now();}
 }
 // 离开应用时回收地图画布、弹窗和监听，不留下第二套输入系统。
 function dispose(){directions.dispose();if(dialog.open)dialogs.close(dialog.id);scope.dispose();hud.remove();controls.remove();dialog.remove();}
 return {render,dispose};
}
