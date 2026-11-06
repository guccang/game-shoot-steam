import {homeFloors} from '../config/home-construction.js';
import {COTTAGE,cottageFloor} from '../config/cottage.js';
// 小屋装扮手机页面：购买与位置确认分开，预览使用正式房间绘制器。
import {createEventScope} from '../platform/events.js';
import {HOME_CATALOG,HOME_LIMIT,HOME_PLANTS,HOME_GRID,decorDefinition} from '../config/home-decor.js';
import {placedDecor,placementError,plantState} from '../progression/home-decor.js';
import {buyDecor,moveDecor,storeDecor,sowDecor,harvestDecor} from '../core/home-decor.js';
import {drawCottageRoom,drawFurniture} from '../rendering/cottage.js';
import {drawHomeDecor} from '../rendering/home-decor.js';

// 生命周期与现有弹窗管理器共用，关闭后恢复原游戏暂停状态。
export function createHomeDecor({game,root,panel,dialogs,input,onChange}){
 const scope=createEventScope(),entry=root.createElement('button'),dialog=root.createElement('dialog');
 entry.id='home-decor-open';entry.textContent='装扮小屋';entry.className='ui-button';panel.querySelector(':scope > footer').append(entry);
 dialog.id='home-decor-dialog';dialog.className='ui-panel';dialog.setAttribute('aria-labelledby','home-decor-title');
 dialog.innerHTML=`<header class="ui-panel__header"><div><h2 id="home-decor-title">布置我的小屋</h2><p id="home-wallet"></p></div><button class="ui-close" id="home-close" aria-label="关闭家具页面">×</button></header>
 <div class="ui-panel__body"><nav class="home-tabs" aria-label="装扮分类"><button class="ui-button" data-tab="room">我的家具</button><button class="ui-button" data-tab="shop">家具小铺</button></nav>
 <section id="home-shop" hidden aria-label="金币家具商店"><p>买下后收入收纳，回巡林小屋布置。</p><div id="home-products"></div></section>
 <section id="home-room"><p id="home-hint">选一件家具，挪到喜欢的位置。床保留在原处。</p><canvas id="home-preview" width="960" height="1120" tabindex="0" aria-label="小屋摆放预览；选择移动后，点击位置或使用方向键微调"></canvas>
 <div id="home-nudge" hidden aria-label="微调家具位置"><button class="ui-button" data-nudge="left" aria-label="向左移动">←</button><button class="ui-button" data-nudge="up" aria-label="向上移动">↑</button><button class="ui-button" data-nudge="down" aria-label="向下移动">↓</button><button class="ui-button" data-nudge="right" aria-label="向右移动">→</button></div>
 <div id="home-owned" aria-label="已拥有的家具"></div><section id="home-detail" aria-label="家具操作"></section></section></div>
 <footer class="ui-panel__footer"><p id="home-message" role="status" aria-live="polite"></p><div class="home-actions"><button class="ui-button" id="home-cancel" hidden>取消移动</button><button class="ui-button ui-button--primary" id="home-confirm">回到小屋</button></div></footer>`;
 panel.append(dialog);dialogs.register(dialog.id,{focusId:'home-close',onOpen:()=>{tab=game.cottage?.kind==='furniture'?'shop':'room';selected=null;draft=null;message='';renderContent();}});
 let tab='room',selected=null,draft=null,message='',lastHome=null,lastCoins=null;
 const $=id=>dialog.querySelector('#'+id);
 // 目录小图共用正式主体绘制器，只调整显示比例，不替换造型。
 function icon(canvas,d,item={}){const c=canvas.getContext('2d');c.clearRect(0,0,128,128);c.save();c.translate(64,96);const scale=Math.min(['cabinet','bookcase','plant'].includes(d.id)?1.1:1.5,108/d.width);c.scale(scale,scale);if(['desk','chair','cabinet','plant'].includes(d.id))drawFurniture(c,{...d,x:0,y:0},false);else drawHomeDecor(c,{...d,...item,type:d.id,x:0,y:0},false,game.progress.living.calendar,game.progress);c.restore();}
 // 选中项始终通过稳定实例号查找，存档整体替换后不持有过期引用。
 function selection(){return game.progress.homeDecor.items.find(i=>i.uid===selected);}
 // 初次摆放寻找合法空位，找不到时保留可操作的无效预览供玩家挪动。
 function suggest(item){const d=decorDefinition(item.type),xs=d.layer==='curtain'?[81,271]:d.layer==='wall'?[144,204]:Array.from({length:35},(_,i)=>36+i*12),ys=['wall','curtain'].includes(d.layer)?[46]:Array.from({length:30},(_,i)=>108+i*12);for(const y of ys)for(const x of xs)if(!placementError(game.progress.homeDecor,item.uid,x,y,game.player,cottageFloor(game.cottage)))return {x,y};return {x:xs[0],y:ys[0]};}
 // 操作结果立刻显示；失败时保留候选位置和原存档，便于重试。
 function apply(result,success){message=result.ok?success:result.message;if(result.ok)onChange();renderContent();return result.ok;}
 // 实例列表和商店只在操作时重建，不在游戏帧循环中创建画布。
 function renderContent(){
  const home=game.progress.homeDecor,shopping=game.cottage?.kind==='furniture';lastHome=home;lastCoins=game.progress.coins;
  tab=shopping?'shop':'room';dialog.querySelector('.home-tabs').hidden=true;$('home-decor-title').textContent=shopping?'家具小铺':`布置小屋 · ${cottageFloor(game.cottage)+1}楼`;
  $('home-wallet').textContent=`金币 ${game.progress.coins} · 家具 ${home.items.length}/${HOME_LIMIT*homeFloors(home)}`;
  for(const button of dialog.querySelectorAll('[data-tab]'))button.setAttribute('aria-pressed',String(button.dataset.tab===tab));
  $('home-shop').hidden=tab!=='shop';$('home-room').hidden=tab!=='room';
  if(tab==='shop'){
   $('home-products').innerHTML=HOME_CATALOG.map(d=>`<article class="home-product"><canvas width="128" height="128" aria-hidden="true" data-icon="${d.id}"></canvas><div><h3>${d.name}</h3><p>${d.description}</p><button class="ui-button" data-shop-name="${d.name}" data-shop-price="${d.price} 金币" data-shop-place="小屋家具收纳" data-buy="${d.id}" ${game.progress.coins<d.price||home.items.length>=HOME_LIMIT*homeFloors(home)?'disabled':''}>${game.progress.coins<d.price?'金币不足 · ':''}${d.price} 金币 · 加入购物车</button></div></article>`).join('');
   for(const node of dialog.querySelectorAll('[data-icon]'))icon(node,decorDefinition(node.dataset.icon));
  }else{
   $('home-owned').innerHTML=home.items.map(item=>`<button class="home-owned-item ui-button" data-select="${item.uid}" aria-pressed="${item.uid===selected}"><canvas width="128" height="128" aria-hidden="true"></canvas><b>${decorDefinition(item.type).name}</b><small>${item.x===null?'收纳中':`${(item.floor||0)+1}楼 · 已摆放`}</small></button>`).join('');
   for(const node of $('home-owned').children){const item=home.items.find(i=>i.uid===Number(node.dataset.select));icon(node.querySelector('canvas'),decorDefinition(item.type),item);}
   const item=selection(),d=decorDefinition(item?.type),state=plantState(item,game.progress.living.calendar);
   $('home-detail').innerHTML=item?`<h3>${d.name}</h3><div class="home-actions"><button class="ui-button" data-move ${draft?'disabled':''}>${item.x===null?'摆进小屋':'移动位置'}</button><button class="ui-button" data-store ${item.x===null||draft||item.weapons?.length?'disabled':''}>收进收纳</button></div>${item.type==='pot'?`<div class="home-plant"><p>${state.plant?state.plant.name+' · '+state.label:'空花盆 · 摆好后就能播种'}</p>${state.plant?`<progress max="1" value="${state.ratio}" aria-label="植物生长进度"></progress><button class="ui-button" data-harvest ${!state.ready||item.x===null||draft?'disabled':''}>采收 · ${state.plant.reward} 金币</button>`:HOME_PLANTS.map(p=>`<button class="ui-button" data-shop-name="${p.name}种子" data-shop-price="${p.cost} 金币" data-shop-place="当前花盆，立即播种" data-shop-key="pot-${item.uid}-${p.id}" data-sow="${p.id}" ${item.x===null||draft||game.progress.coins<p.cost?'disabled':''}>加入购物车 · ${p.cost}金币 / ${p.days}天</button>`).join('')}<p>按游戏日期生长，巡林或睡觉都算；成熟可留作装饰。收纳保留植物，采收后可再种。</p></div>`:''}`:'<p>从上面的家具中选择一件，或到家具小铺添置新物件。</p>';
   if(item?.type==='weapon-rack')$('home-detail').insertAdjacentHTML('beforeend',`<p>已存放 ${item.weapons?.length||0}/3 把。关闭装扮页，靠近并点击武器架存取；取空后才能收纳架子。</p>`);
   $('home-hint').textContent=draft?d.layer==='curtain'?'点击左窗或右窗，确认挂上窗帘。':d.layer==='wall'?'点击两扇窗之间，或用左右按钮微调。':'点击木地板选位置，用方向按钮微调；确认后保存。':`选一件家具，摆放到当前${cottageFloor(game.cottage)+1}楼。楼梯和门口保持畅通。`;
   drawPreview();
  }
  const error=draft?placementError(home,selected,draft.x,draft.y,game.player,cottageFloor(game.cottage)):'';
  $('home-nudge').hidden=!draft;$('home-cancel').hidden=!draft;$('home-confirm').textContent=draft?'确认摆放':shopping?'回到店内':'回到小屋';$('home-confirm').disabled=!!error;
  $('home-message').textContent=message||(draft?(error||'这个位置可以摆放。'):'购买和每次确认都会保存。');
 }
 // 候选实例仅存在于临时绘制副本，关闭或取消不改变正式布局。
 function drawPreview(){
  const c=$('home-preview').getContext('2d'),g=Object.create(game),home=game.progress.homeDecor;
  g.progress={...game.progress,homeDecor:{...home,items:home.items.map(i=>i.uid===selected&&draft?{...i,...draft,floor:cottageFloor(game.cottage)}:i)}};
  c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,COTTAGE.width,COTTAGE.height);drawCottageRoom(c,g,{reduced:true});
  const item=selection();if(item&&(draft||item.x!==null&&item.floor===cottageFloor(game.cottage))){const p=draft||item,d=decorDefinition(item.type),bad=draft&&placementError(home,selected,p.x,p.y,game.player,cottageFloor(game.cottage));c.strokeStyle=bad?'#a24f3b':'#315c43';c.lineWidth=2;c.setLineDash([4,3]);c.strokeRect(p.x-d.width/2-3,p.y-d.height/2-3,d.width+6,d.height+6);c.setLineDash([]);}
 }
 // 布局选择始终取消上一件未确认预览，避免切换物品时偷偷提交。
 function select(uid){selected=uid;draft=null;message='';const item=selection();if(item?.x===null)draft=suggest(item);renderContent();}
 // 触摸点击会吸附到统一网格，窗帘和墙饰使用各自真实挂点。
 function point(x,y){const d=decorDefinition(selection()?.type);if(!d||!draft)return;if(d.layer==='curtain')draft={x:x<180?81:271,y:46};else if(d.layer==='wall')draft={x:Math.round(x/HOME_GRID)*HOME_GRID,y:46};else draft={x:Math.round(x/HOME_GRID)*HOME_GRID,y:Math.round(y/HOME_GRID)*HOME_GRID};message='';renderContent();}
 // 方向按钮提供不依赖细小拖拽的44像素触控入口，键盘共用同一逻辑。
 function nudge(direction){if(!draft)return;const d=decorDefinition(selection().type);if(d.layer==='curtain')point(direction==='left'?81:271,46);else point(draft.x+({left:-12,right:12}[direction]||0),draft.y+({up:-12,down:12}[direction]||0));}
 scope.on(entry,'click',()=>{if(game.cottage&&!game.cottage.sleep&&game.state==='playing'){input.reset();dialogs.open(dialog.id);}});
 scope.on($('home-close'),'click',()=>dialogs.close(dialog.id));
 scope.on(dialog,'close',()=>{draft=null;selected=null;message='';});
 scope.on($('home-cancel'),'click',()=>{draft=null;message='已取消移动，原布局保留。';renderContent();});
 scope.on($('home-confirm'),'click',()=>{if(!draft){dialogs.close(dialog.id);return;}const result=moveDecor(game,selected,draft.x,draft.y);if(result.ok)draft=null;apply(result,'摆好了，布局已保存。');});
 scope.on(dialog,'click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.tab){tab=b.dataset.tab;draft=null;message='';renderContent();}
  else if(b.dataset.buy){const result=buyDecor(game,b.dataset.buy);if(result.ok){selected=null;draft=null;}apply(result,'已购入收纳，回巡林小屋后点击「装扮小屋」摆放。');}
  else if(b.dataset.select)select(Number(b.dataset.select));
  else if(b.hasAttribute('data-move')){const item=selection();draft=item.x===null||item.floor!==cottageFloor(game.cottage)?suggest(item):{x:item.x,y:item.y};message='';renderContent();}
  else if(b.hasAttribute('data-store'))apply(storeDecor(game,selected),'已收入收纳，需要时可重新摆放。');
  else if(b.dataset.sow)apply(sowDecor(game,selected,b.dataset.sow),'种好了，巡林或休息后回来看看。');
  else if(b.hasAttribute('data-harvest'))apply(harvestDecor(game,selected),'采收成功，金币已到账，可以再次播种。');
  else if(b.dataset.nudge)nudge(b.dataset.nudge);
 });
 scope.on($('home-preview'),'click',e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*COTTAGE.width,y=(e.clientY-r.top)/r.height*COTTAGE.height;if(draft)point(x,y);else{const item=placedDecor(game.progress.homeDecor,cottageFloor(game.cottage)).sort((a,b)=>b.y-a.y).find(i=>Math.abs(x-i.x)<Math.max(22,i.width/2)&&y>i.y-Math.max(30,i.height)&&y<i.y+i.height/2);if(item)select(item.uid);}});
 scope.on($('home-preview'),'keydown',e=>{const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(direction&&draft){e.preventDefault();nudge(direction);}});
 // 父级逐帧只同步可见性；存档对象或金币变化后才更新内容。
 function render(){entry.hidden=!game.cottage||!!game.cottage.balcony||!!game.cottage.kind&&game.cottage.kind!=='cottage';entry.disabled=!!game.cottage?.sleep||game.state!=='playing';if(dialog.open){if(!game.cottage||game.cottage.balcony||game.cottage.kind&&!['cottage','furniture'].includes(game.cottage.kind)){dialogs.close(dialog.id);return;}if(lastHome!==game.progress.homeDecor||lastCoins!==game.progress.coins)renderContent();}}
 // 动态节点跟随小屋控制器卸载，避免重复事件和残留预览。
 function dispose(){scope.dispose();if(dialog.open)dialog.close();entry.remove();dialog.remove();}
 // 屋内售货员打开家具服务，保持原暂停与保存流程。
 function open(){if(game.cottage&&(!game.cottage.kind||['cottage','furniture'].includes(game.cottage.kind))&&!game.cottage.sleep&&game.state==='playing'){input.reset();dialogs.open(dialog.id);}}
 return {render,dispose,open};
}
