import {createMinePortals} from './mine-portals.js';
import {approachMinePortal} from '../core/navigation/scene-approach.js';
import {setHidden} from './shared/dom-state.js';
import {coupleMineCart,mineTrain,mineCartCanDrive} from '../core/mining/mine-train.js';
import {oreCount,CART_CAPACITY,ORE_KEYS,ORE_NAMES,mineOreWeights} from '../config/mine-freight.js';
import {createMineDemolition} from './mine-demolition.js';
import {createMineMap} from './mine-map.js';
import {readyMineWeapon} from '../core/mining/mine-combat.js';
import {createMineCartDirections} from './mine-cart-directions.js';
import {mineToolIcon,MINE_TOOLS} from './mine-tool-icons.js';
// 地下界面展示当前层实际开发率，并将生态操作提交给正式规则。
import {currentMineLayer,travelMineLayer,mineLayerUnlockQuote} from '../core/mining/mine-layers.js';
import {mineDevelopment} from '../progression/mining/mine-layers.js';
import {mineTerrain} from '../config/mine-ecology.js';
import {buildMineBridge,harvestMine} from '../core/mining/mine-ecology.js';
import {catLoad} from '../progression/inventory/load-weight.js';
// 地下手机操作复用统一底板，施工说明暂停游戏，确认后回场景执行真实事务。
import {createEventScope} from '../platform/events.js';
import {MINING,mineCell,mineKey,mineFreightCell} from '../config/mining.js';
import {selectMineTool,buildMine,rideMineCart,toggleMineCart,startMineShaft} from '../core/mining/mining.js';
import {drawMineMap} from '../rendering/mining.js';
import {canonical} from '../world/coordinates.js';

// HUD只更新数值和按钮状态，避免每帧重建触摸目标。
export function createMining({game,renderer,root,panel,input,dialogs,onCharacter,onOutdoors}){
 const scope=createEventScope(),hud=root.createElement('div'),controls=root.createElement('div'),dialog=root.createElement('dialog');let pending=null,mapTime=0,hudTime=-Infinity,hudRoom=null,hudSignature='',toolsOpen=false,wasFishing=false;
 hud.id='mine-hud';setHidden(hud,true);hud.innerHTML='<div><b id="mine-layer-title">矿锄 · 地下探索</b><p id="mine-wallet"></p><p id="mine-development"></p><p id="mine-position"></p><p id="mine-home"></p></div><button id="mine-map-open" aria-label="打开地下探索地图" title="查看探索区域与铁轨"><canvas id="mine-minimap" width="224" height="224" aria-label="地下小地图，北方朝上，小屋为黄色，洞口为蓝色"></canvas></button>';
 controls.id='mine-controls';setHidden(controls,true);controls.innerHTML=`<p id="mine-message" role="status"></p><div class="mine-compact"><button class="ui-button" id="mine-pick" data-mine-tool="pick" aria-label="挖矿，遇敌自动战斗后恢复作业" aria-pressed="false">挖矿</button><span id="mine-recycle-slot"></span><button class="ui-button" id="mine-quick-board" aria-label="在脚下放置矿灯">矿灯</button><button class="ui-button" id="mine-rail" data-mine-tool="rail" aria-label="铺轨，移动时沿途施工" aria-pressed="false">铺轨</button><button class="ui-button" id="mine-tools-toggle" aria-expanded="false" aria-controls="mine-tools-panel">工具 ▴</button></div><div id="mine-tools-panel" hidden><div class="mine-tools" role="group" aria-label="地下快捷工具">${MINE_TOOLS.filter(([id])=>!['pick','rail'].includes(id)).map(([id,name])=>`<button class="ui-button" data-mine-tool="${id}" aria-label="${name}" aria-pressed="false">${mineToolIcon(id)}<span>${name}</span></button>`).join('')}</div><div class="mine-actions"><button class="ui-button" id="mine-weapon" aria-pressed="false">拿起武器</button><button class="ui-button" id="mine-build">更多建设</button><button class="ui-button" id="mine-board">乘矿车</button><button class="ui-button" id="mine-drive" hidden>开车</button><button class="ui-button" id="mine-couple" hidden>加挂矿车</button><button class="ui-button" id="mine-detach" hidden>解开挂钩</button><button class="ui-button" id="mine-exit">返回小屋</button></div></div>`;
 dialog.id='mine-build-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','mine-build-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="mine-build-title" tabindex="-1">地下建设</h2><p id="mine-build-wallet"></p></div><button class="ui-close" data-mine-close aria-label="关闭地下建设">×</button></header><div class="ui-panel__body"><section class="ui-section"><h3>层级与生态</h3><p id="mine-layer-rule"></p><p id="mine-ore-rates"></p><button class="ui-button" data-mine-special="down">开通 / 进入下一层</button><button class="ui-button" data-mine-special="up">沿入口返回上一层</button><button class="ui-button" data-mine-special="harvest">采集脚下景观</button><button class="ui-button" data-mine-special="bridge">前方建桥 · 2 矿石 + 4 木材</button><button class="ui-button" data-mine-special="bridge-here">脚下建桥 · 2 矿石 + 4 木材</button><p>一层面积为地表的100%，二层10%–50%，三层及以后10%–100%；面积和景观首次开通时随机并永久保存。地下层数没有上限，已开通层从原施工格通行。</p><p>九类地下景观在开层时就天然存在，无需挖出。实际走访天然地块或开掘岩层计入开发率，地下没有预设道路。菌木、晶簇、草药与化石可采集；景观山体可用矿镐或武器击碎，每座获得6矿石，并按本层探索时间再生。水面需要桥梁，两栖载具可直接过水。默认使用已装备武器自动迎敌，弹药与地表共用；挖矿或铺轨遇到可见怪物时自动收起工具并使用已装备武器，周围安全后自动恢复原作业；点击「拿起武器」可改为持续战斗。前两层最多两只主动围攻，第三至五层三只，更深四只；怪物成长在第九层封顶。入口周围可避险；战车主炮使用自身弹药迎敌。濒危会紧急撤回本层入口。</p></section><section class="ui-section"><h3>铺设路线</h3><p>选择快捷栏「铺轨」，移动时沿途自动开采岩层并铺轨；天然洞厅可直接施工。铺轨和造矿车都优先用库存矿石，不足时用背包原矿补齐，先用石矿，再用铜、铁，最后用稀有原矿。铺轨时沿主方向前进，转弯后相邻轨道自动相连。</p><button class="ui-button" data-mine-build="rail">脚下铺轨 · 1 矿石 + 2 木材</button><button class="ui-button" data-mine-build="rail" data-ahead>前方铺轨 · 1 矿石 + 2 木材</button><button class="ui-button" data-mine-build="cart">脚下造矿车 · 8 矿石 + 12 木材</button><p>矿车每辆装'+CART_CAPACITY+'份，矿点附近有车时先装车，装不下再放背包。背包靠近有余量的矿车会自动装矿；两边都满时仍可挖掘，未收纳的矿物不会入库。乘车靠近另一辆矿车，在相连的轨道上前后停好，点「加挂矿车」即可自动对齐。两组已挂接的矿车也可在首端或尾端合并，挂接后保持猫猫当前位置和座位，不会自动换座。每节车厢均可乘坐，首尾两端都能开车，中间车厢仅乘坐；换驾驶端时自行下车，走到另一端上车。一层的仓库升井在小屋楼梯以东约一屏。任一节车开到升井旁边，整列原矿会自动入库。车已停在井旁时，人走近也能卸车。步行携带的原矿在井口卸下；深层在上行入口卸货。行驶中推动摇杆或按方向键 / WASD，到达路口时优先驶向所指的相连轨道；松开或所指方向无轨道时，按路口设置或自动规则行驶。默认直行优先，再右转、左转，尽头停车。停车后推动摇杆或按方向键 / WASD 即可选向并启动；点击「立即停车」停止，松开方向后再次推动可重新起步。也可点「开车方向」预选方向，再点「开车」；下车靠近交叉路口，点「路口方向」保存自动行驶方向。「拆除 / 回收」可回收附近铁轨和空矿车，返还建造材料。</p></section><section class="ui-section"><h3>装点矿道</h3><p>矿灯照亮附近一小片矿道，荧菇也会发出微光。离开照明范围会重新被迷雾遮住；摆件不阻挡通行。</p><button class="ui-button" data-mine-build="lamp">放置矿灯 · 1 矿石 + 1 木材</button><button class="ui-button" data-mine-build="sign">放置路牌 · 2 木材</button></section><section class="ui-section"><h3>向上挖洞口</h3><p>在地表可通行的空地正下方施工 4 秒。建筑、树木和水域下不能开洞；移动取消施工。仅地下一层可以向上开地表洞口。施工同时开出九格车辆回转平台，建好后战车可以沿坡道双向通行。战车可走天然洞厅和挖开的通道，重型车至少需要两格宽；窄处需先步行拓宽。</p><button class="ui-button" data-mine-shaft>向上开洞 · 5 矿石 + 8 木材</button></section><section class="ui-inset"><h3>矿锄与方向</h3><button class="ui-button" data-mine-backpack>整理背包</button><p>点击快捷栏「挖矿」，拖动场景行走与转向，靠近岩壁自动挥镐；松开即停止。再次点击所选工具可取消自动作业。原矿可随身携带或用矿车运输，施工木材使用仓库库存。小地图始终北朝上，小屋标记超出范围时停在边缘指向原址。</p></section></div><footer class="ui-panel__footer"><button class="ui-button" data-mine-close>回到矿道</button></footer>';
 panel.append(hud,controls);root.body.append(dialog);
 const portals=createMinePortals({game,renderer,root,panel});
 const map=createMineMap({game,renderer,root,dialogs,input});
 const directions=createMineCartDirections({game,root,controls,input,dialogs});
 const demolition=createMineDemolition({game,root,controls,input,dialogs});
 // 报价在打开时读取实时钱包，按钮明确显示本次费用，避免把通行和首次付费混在一起。
 dialogs.register(dialog.id,{focusId:'mine-build-title',onOpen:()=>{
  const l=currentMineLayer(game),quote=mineLayerUnlockQuote(game),cost=quote.cost;
  root.getElementById('mine-ore-rates').textContent='本层矿点产出概率：'+ORE_KEYS.map(key=>ORE_NAMES[key]+' '+mineOreWeights(game.cottage.depth)[key]/100+'%').join(' · ')+'。每个矿点抽取一种；层数越深，高阶矿物越常见。';
  root.getElementById('mine-layer-rule').textContent=`当前地下 ${game.cottage.depth||1} 层，面积为地表的 ${l.coverage.toFixed(0)}%，已开发 ${(mineDevelopment(l).ratio*100).toFixed(2)}%（仅地图统计）。开通下一层支付金币、库存矿石和木材，不要求探索或开发进度。金币从二层1万起，每深一层乘3（达到钱包上限后封顶）；每层只付一次，往返免费。`+(quote.missing.length?'当前不足：'+quote.missing.join('，')+'。':'');
  dialog.querySelector('[data-mine-special="down"]').textContent=quote.unlocked?`进入地下 ${quote.depth} 层 · 免费`:`开通地下 ${quote.depth} 层 · ${cost.coins} 金币 + ${cost.ore} 矿石 + ${cost.wood} 木材`;
  root.getElementById('mine-build-wallet').textContent=`金币 ${game.progress.coins} · 库存矿石 ${game.progress.mining.ore} · 背包原矿 ${oreCount(game.progress.mining.bagOre)} · 木材 ${game.progress.wood}`;
 }});
 // 简短操作在运行场景直接完成；施工页只排队一个动作，关闭后才结算。
 scope.on(controls,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled||game.cottage?.kind!=='mine')return;
  if(b.id==='mine-tools-toggle'){input.reset();toolsOpen=!toolsOpen;render();}
  // 步行时同一位置用于放灯；乘坐时先停车再下车，放灯不清除当前作业。
  else if(b.id==='mine-quick-board'){if(!game.cottage.ride)buildMine(game,'lamp');else{input.reset();if(game.cottage.running)toggleMineCart(game);else rideMineCart(game);}}
  else if(b.id==='mine-rail'&&game.cottage.ride&&game.cottage.running)buildMine(game,'lamp');
  else if(b.dataset.mineTool){input.reset();selectMineTool(game,b.dataset.mineTool);}
  else if(b.id==='mine-weapon'){input.reset();readyMineWeapon(game);}
  else if(b.id==='mine-build'){input.reset();dialogs.open(dialog.id);}
  else if(b.id==='mine-couple'||b.id==='mine-detach')coupleMineCart(game,b.id==='mine-detach');
  else if(b.id==='mine-board')rideMineCart(game);
  else if(b.id==='mine-drive')toggleMineCart(game);
  else if(b.id==='mine-exit'){const layer=currentMineLayer(game),key=mineKey(mineCell(game.player));approachMinePortal(game,key===layer.entry?'up':key===mineKey(mineFreightCell(layer,(game.cottage.depth||1)))?'depot':'shaft:'+key);}
 });
 // 对话框只保留稳定按钮，真实规则在矿区核心再次核验范围、资源及状态。
 scope.on(dialog,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-mine-close'))dialogs.close(dialog.id);else if(b.dataset.mineSpecial||b.dataset.mineBuild||b.hasAttribute('data-mine-shaft')||b.hasAttribute('data-mine-backpack')){pending={room:game.cottage,kind:b.dataset.mineSpecial||b.dataset.mineBuild||(b.hasAttribute('data-mine-backpack')?'backpack':'shaft'),ahead:b.hasAttribute('data-ahead')};dialogs.close(dialog.id);}});
 // 地图每100毫秒采样可见格，所有按钮保留44像素触摸范围。
 function render(){
  map.sync();demolition.render();portals.render();
  const room=game.cottage,isMine=room?.kind==='mine';setHidden(hud,setHidden(controls,!isMine));
  if(!isMine){hudRoom=null;hudTime=-Infinity;toolsOpen=false;wasFishing=false;directions.render();pending=null;if(dialog.open)dialogs.close(dialog.id);return;}
  if(hudRoom!==room){toolsOpen=false;wasFishing=false;}
  if(wasFishing&&!game.fishing)room.notice=game.outdoorNotice||'已收竿。';
  wasFishing=!!game.fishing;setHidden(controls,wasFishing);
  if(pending&&game.state==='playing'){const action=pending;pending=null;if(action.room===room){if(action.kind==='backpack'){input.reset();onCharacter();}else if(action.kind==='down'||action.kind==='up'){if(action.kind==='up'||currentMineLayer(game).descent)approachMinePortal(game,action.kind);else travelMineLayer(game,1);}else if(action.kind==='harvest')harvestMine(game);else if(action.kind==='bridge'||action.kind==='bridge-here')buildMineBridge(game,action.kind==='bridge');else if(action.kind==='shaft')startMineShaft(game);else buildMine(game,action.kind,action.ahead);}}
  // 数值与小地图同为10Hz刷新；工具、停车、弹窗和屏幕尺寸变化立即更新。
  // 避免每个显示帧重写相同文本后强制测量布局，让镜头移动不被HUD阻塞。
  const now=performance.now(),signature=[toolsOpen,!!game.fishing,room.tool,room.autoDig,room.ride,room.running,room.weaponReady,!!room.combatWork,room.notice,game.state,renderer.width,renderer.height].join('|');
  if(room===hudRoom&&signature===hudSignature&&now-hudTime<100)return;
  hudTime=now;hudRoom=room;hudSignature=signature;directions.render();
  const toggle=root.getElementById('mine-tools-toggle');toggle.setAttribute('aria-expanded',String(toolsOpen));toggle.textContent=toolsOpen?'收起 ▾':'工具 ▴';
  setHidden(root.getElementById('mine-tools-panel'),!toolsOpen);hud.dataset.expanded=String(toolsOpen);
  const m=currentMineLayer(game),cell=mineCell(game.player),key=mineKey(cell),point=canonical(game.player),distance=Math.round(Math.hypot(cell.x,cell.y));
  root.getElementById('mine-layer-title').textContent=`地下 ${room.depth||1} 层 · ${mineTerrain(cell,m).biome.name}`;
  root.getElementById('mine-development').textContent=`面积 ${m.coverage.toFixed(0)}% · 开发 ${(mineDevelopment(m).ratio*100).toFixed(2)}% / 50%`;
  root.getElementById('mine-wallet').textContent=`矿石 ${game.progress.mining.ore} · ${game.vehicle.active?'装甲 '+Math.ceil(game.vehicle.hp):'生命 '+Math.ceil(game.player.hp)}`;
  const weaponButton=root.getElementById('mine-weapon'),weapon=game.weapon(),mag=game.magazines[game.loadout.weapon];
  weaponButton.disabled=game.vehicle.active;weaponButton.setAttribute('aria-pressed',String(!!room.weaponReady));
  weaponButton.textContent=room.weaponReady?(mag.remaining>0?'装填 '+mag.remaining.toFixed(1)+'秒':weapon.name+' · '+Math.floor(mag.ammo)):'拿起武器';
  root.getElementById('mine-position').textContent=`地表坐标 ${Math.round(point.x)}，${Math.round(point.y)}`;
  root.getElementById('mine-home').textContent=distance?`小屋 ${cell.y>0?'北':cell.y<0?'南':''}${cell.x>0?'西':cell.x<0?'东':''} · ${distance} 格`:'这里是小屋正下方';
  root.getElementById('mine-message').textContent=room.cartBoarding?'靠近上车 · 走开取消':catLoad(game).overloaded&&!room.autoDig?'背包已满，仍可开采；未收纳的矿物不会入库，靠近空矿车可自动装矿。':room.shaftWork?`向上开洞 ${Math.min(100,Math.round(room.shaftWork/MINING.shaftSeconds*100))}% · 移动取消`:room.notice;
  root.getElementById('mine-pick').textContent=room.combatWork?.tool==='pick'?'迎敌中':'挖矿';
  // 同一快捷位置随行驶状态切换，原铺轨选中态与原矿灯施工接口共用。
  const moving=!!room.ride&&!!room.running,quickBoard=root.getElementById('mine-quick-board'),quickWork=root.getElementById('mine-rail');
  quickBoard.textContent=moving?'停车':room.ride?'下车':'矿灯';quickBoard.disabled=game.vehicle.active;quickBoard.setAttribute('aria-label',moving?'停止矿车并保持乘坐':room.ride?'停稳后下矿车':'在脚下放置矿灯');
  quickWork.textContent=moving?'放置矿灯':'铺轨';quickWork.dataset.mineTool=moving?'lamp':'rail';quickWork.setAttribute('aria-label',moving?'行驶中在脚下放置矿灯':'铺轨，移动时沿途施工');
  for(const button of controls.querySelectorAll('[data-mine-tool]')){const tool=button.dataset.mineTool;button.disabled=!(button===quickWork&&moving)&&(!!room.ride||game.vehicle.active);button.setAttribute('aria-pressed',String(tool===(room.combatWork?.tool||room.tool)||tool==='shaft'&&!!room.shaftWork));}
  root.getElementById('mine-build').disabled=!!room.ride;
  const layer=currentMineLayer(game),head=layer.carts.find(c=>c.id===room.ride),train=mineTrain(layer,head);
  setHidden(root.getElementById('mine-couple'),!room.ride||room.running);
  setHidden(root.getElementById('mine-detach'),train.length<2||room.running);
  root.getElementById('mine-wallet').textContent+=' · '+(head?'列车 '+train.reduce((n,c)=>n+oreCount(c.cargo),0)+'/'+train.length*CART_CAPACITY:'背包原矿 '+oreCount(game.progress.mining.bagOre));
  root.getElementById('mine-board').disabled=game.vehicle.active;root.getElementById('mine-board').textContent=room.ride?'停车下车':room.cartBoarding?'上车中…':'乘矿车';
  const drive=root.getElementById('mine-drive'),driver=mineCartCanDrive(game);setHidden(drive,!room.ride);drive.disabled=!!room.ride&&!driver&&!room.running;drive.textContent=room.running?'立即停车':driver?'开车':'请到首尾开车';
  const atDepot=(room.depth||1)===1&&key===mineKey(mineFreightCell(m,1));
  const exit=root.getElementById('mine-exit');setHidden(exit,!!room.ride||((room.depth||1)>1?key!==m.entry:!atDepot&&key!=='0,0'&&!m.shafts.includes(key)));exit.textContent=(room.depth||1)>1?'返回上层':atDepot?'返回仓库':key==='0,0'?'返回小屋':'返回地面';
  renderer.mineControlsTop=controls.hidden?renderer.height:controls.getBoundingClientRect().top-panel.getBoundingClientRect().top;
  if(performance.now()-mapTime>=100){drawMineMap(root.getElementById('mine-minimap'),game);mapTime=performance.now();}
 }
 // 离开应用时回收地图画布、弹窗和监听，不留下第二套输入系统。
 function dispose(){portals.dispose();map.dispose();directions.dispose();demolition.dispose();if(dialog.open)dialogs.close(dialog.id);scope.dispose();hud.remove();controls.remove();dialog.remove();}
 return {render,dispose,tap:portals.tap};
}
