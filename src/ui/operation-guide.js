import {taskNavigationEnabled} from '../core/task-navigation.js';
import {harvestGuidePlot} from '../core/harvest-guide.js';
// 主线操作覆盖层：定位真实控件与安装圈，不接管交易或复制工坊逻辑。
import {mainlineTask,mainlineSteps,mainlineOperation,mainlineAction,mainlineObjective} from '../core/mainline-manager.js';
import {workshopGuideCue} from '../core/workshop-guide.js';
import {nativeVehicleWeapon} from '../config/vehicle-armaments.js';
import {worldDistance} from '../world/coordinates.js';
import {arrivalWorkshopGuide} from './arrival-workshop-guide.js';
import {clearingCombatActive} from '../core/living-safety.js';
import {FARM_CROPS,FARM_CATEGORIES} from '../config/farm.js';

// 每个界面只有一组引导，所有绘制位置使用目标节点的实时屏幕矩形。
export function createOperationGuide({game,root,workshop}){
 const host=root.defaultView,layer=root.createElement('div');layer.id='operation-guide';layer.hidden=true;
 layer.innerHTML='<svg aria-hidden="true"><defs><marker id="operation-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z"/></marker></defs><path class="operation-line" marker-end="url(#operation-arrow)"/></svg><span class="operation-tip" role="status" aria-live="polite"></span><span class="operation-destination">放到这里</span>';
 const tip=layer.querySelector('.operation-tip'),arrow=layer.querySelector('.operation-line'),destination=layer.querySelector('.operation-destination');
 // 复用Boss教学的奶油色猫爪，不新增图片或独立美术资源。
 const paw=root.createElement('span'),pawArt=root.querySelector('#boss-button .boss-paw').cloneNode(true);
 paw.className='operation-paw';paw.setAttribute('aria-hidden','true');pawArt.removeAttribute('class');paw.append(pawArt);layer.append(paw);

 let marked=[],lastKey='',lastCue=null,lastDrawKey='',revealUntil=0;
 // 清理仅移除本引导加上的样式，不改变其他面板和原生焦点。
 function clear(){for(const n of marked)n.classList.remove('operation-source','operation-target','mainline-cue-target');marked=[];if(!layer.hidden)layer.hidden=true;lastKey='';lastCue=null;}
 // 隐藏祖先中的按钮不是可点目标；被滚动裁切的目标允许随后自动定位。
 function visible(n){return !!n&&!n.closest('[hidden]')&&n.getClientRects().length>0&&host.getComputedStyle(n).visibility!=='hidden';}
 // 只在步骤变化时展开折叠说明和滚到控件，拖动过程中绝不移动界面。
 function reveal(node,target){
  // 世界热点随镜头移动；即使 overflow:hidden 也会被 scrollIntoView 滚动，带着整张战场闪跳。
  // 只有弹窗中的控件允许自动滚动，场景内继续使用原位置的高亮与箭头。
  if(!node.closest('dialog[open]'))return;
  // 新工坊只允许左侧目录独立滚动，指引不能推动固定工作台。
  if(node.closest('#workshop-dialog')){const shelf=node.closest('#ws-shelf');if(shelf){const a=node.getBoundingClientRect(),b=shelf.getBoundingClientRect();if(a.top<b.top)shelf.scrollTop+=a.top-b.top;else if(a.bottom>b.bottom)shelf.scrollTop+=a.bottom-b.bottom;}return;}
  for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
  node.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  if(!target)return;
  const scroll=node.closest('.ws-layout'),a=node.getBoundingClientRect(),b=target.getBoundingClientRect();
  if(scroll){const r=scroll.getBoundingClientRect(),top=Math.min(a.top,b.top),bottom=Math.max(a.bottom,b.bottom);if(bottom-top<r.height-16){if(top<r.top+8)scroll.scrollTop+=top-r.top-8;else if(bottom>r.bottom-8)scroll.scrollTop+=bottom-r.bottom+8;}}
 }
 // 关闭按钮只用于当前弹窗，避免指向被顶层弹窗遮挡的页面。
 function closeCue(dialog,text='完成了，返回任务指引'){
  const node=dialog?.querySelector('button[id*="close"],button[data-fire-close],button[id$="-done"]');
  return node?{id:'close',node,text}:null;
 }
 // 当前动作先确定所属面板，再确定其中的控件；路径来自操作配置而非任务ID。
 function resolve(o,step,operation,action,dialog){
  const cue=(id,source,text,target=null)=>({id,source,text,target});
  // 试射达标只更新任务记录，始终先让玩家决定何时结束试射。
  if(dialog?.id==='weapon-trial-dialog')return cue('trial','#weapon-trial-close',game.progress.mainline.seen[operation?.record||'trial']?'演练达标，点这里返回':'击破靶子后，点这里返回');
  if(o.phase==='meet')return !dialog&&visible(root.getElementById('mainline-npc'))?cue('talk','#mainline-npc','与营地伙伴交谈'):null;
  if(o.phase==='report'||!step)return dialog?closeCue(dialog,'操作完成，返回领取奖励'):null;
  if(dialog?.id==='mainline-dialog')return cue('mainline-action','#mainline-action','从这里开始当前操作');
  // 后勤面板复用原控件高亮；数量确认期间不能把关闭按钮误标成操作目标。
  if(['warehouse','cleanup-bag','cleanup-vehicle','logistics','vehicle-repair'].includes(action?.type)){
   if(dialog?.id==='warehouse-quantity')return cue('warehouse-confirm','#warehouse-quantity [data-confirm]','核对数量，再确认存取');
   if(dialog?.id==='warehouse-dialog'){
    const vehicle=['vehicle-weight','cargo-cleanup'].includes(o.task.id),source=root.getElementById('warehouse-source');
    if(source.value!==(vehicle?String(game.vehicle.index):'bag'))return cue('warehouse-source','#warehouse-source',vehicle?'选择当前载具；需把车停在仓库旁':'选择猫猫背包');
    const deposit=o.task.id==='warehouse-lesson'&&game.progress.mainline.seen.warehouseWithdrawn,selector=`#warehouse-dialog [data-direction="${deposit?'deposit':'withdraw'}"][data-item="material:wood"]`;
    return visible(root.querySelector(selector))?cue('warehouse-item',selector,deposit?'选一份木头存回仓库':'选一份木头取出练习'):null;
   }
   if(dialog?.id==='load-cleanup-quantity')return cue('cleanup-confirm','[data-quantity-confirm]','核对物品与数量，确认后无法找回');
   if(dialog?.id==='load-cleanup-dialog'){
    const wood='[data-cleanup-item="material:wood"]',selector=visible(root.querySelector(wood))?wood:'[data-cleanup-item]';
    return visible(root.querySelector(selector))?cue('cleanup-item',selector,'选择不需要的物品，仅清理一份即可'):null;
   }
   if(dialog?.id==='vehicle-repair-dialog'){
    const confirm=dialog.querySelector('[data-repair-confirm]'),row=dialog.querySelector('[data-repair-hull]:not(:disabled)');
    if(!confirm.disabled)return cue('repair-confirm','[data-repair-confirm]','核对维修费用后确认');
    return row?{id:'repair-vehicle',node:row,text:'选择需要维修的车辆'}:closeCue(dialog,'关闭页面，等待维修或返回交付');
   }
  }
  if(['clearing','patrol-boss'].includes(operation?.type)){
   // 禁用时操作栏已经显示真实原因，不再叠加通用气泡遮住说明。
   if(dialog?.id==='clearing-dialog')return root.getElementById('clearing-accept').disabled?null:cue('clearing-accept','#clearing-accept',game.progress.living.patrolActive?'继续前往清缴场':'点击接取，沿光点出发');
   if(dialog)return closeCue(dialog,'返回场景，去盾牌告示牌');
   // 场景入口统一由附近建筑提示负责，未接主线也可见；面板内接取引导保留。
   return null;
  }
  if(operation?.type==='camp-defense'){
   if(dialog?.id==='camp-defense-dialog'){
    const selected=root.querySelector(`[data-select-gate="${operation.gate}"]`);
    return selected?.getAttribute('aria-pressed')==='true'?cue('camp-start','#camp-primary','开始守门，伙伴会接应'):cue('camp-gate',`[data-select-gate="${operation.gate}"]`,'选择西门');
   }
   if(dialog)return closeCue(dialog,'返回场景，去西门盾牌');
   // 到达任务指定营门后才提示点击真实站牌，远处继续沿用路线指引。
   if(game.mapId!==o.site.mapId||worldDistance(game.player,o.site)>160)return null;
   // 短屏站牌可能位于HUD后方，指向同一站牌的可见入口，不高亮整块透明命中区。
   const selector=`#nearby-interaction[data-target="gate-${operation.gate}"]`;
   return visible(root.querySelector(selector))?cue('camp-marker',selector,'点击怪潮站牌，打开怪潮页面'):null;
  }
  // 地图教学先指向手机内应用，不能高亮已经移除的战场地图入口。
  if(dialog?.id==='phone-dialog'&&action?.id==='phone-button')return cue('phone-map','#phone-dialog [data-pack-action="map"]','点击手机里的地图');
  if(dialog?.id==='logistics-dialog'&&operation?.kind==='vehicle'&&operation.type==='upgrade')return cue('vehicle-fit',operation.part==='engine'?`[data-fit-engine="${operation.choice??1}"]`:'[data-fit-armor="add-armor"]',operation.part==='engine'?'选择发动机换装':'加装装甲，注意载重');
  if(dialog?.id==='workshop-dialog'){
   if(!operation?.kind)return closeCue(dialog,step.label);
   const current=workshop.guideState(),op={...operation};
   if(op.indices?.includes(current.index)&&(['buy','track','trial'].includes(op.type)||game.progress[op.kind==='vehicle'?'vehicleHulls':'weapons'][current.index]>0))op.index=current.index;
   // 未购买装备的免费演练留在购买目录，不能被引导到只列已拥有装备的升级页。
   if(op.type==='trial')op.owned=game.progress[op.kind==='vehicle'?'vehicleHulls':'weapons'][op.index]>0;
   if(op.type==='drive'&&current.kind===op.kind&&current.index===op.index&&game.progress.vehicleIndex===op.index&&game.vehicle.active)return closeCue(dialog,'战车已开出，返回地图驾驶');
   if(op.native)op.turret=nativeVehicleWeapon(op.index)?.weaponIndex;
   if(op.type==='upgrade'&&op.kind==='vehicle'&&['engine','armor'].includes(op.part)&&current.kind==='vehicle'&&current.index===op.index&&current.page==='upgrade')return cue('vehicle-fit','#ws-vehicle-fit','打开载具装配');
   const state=workshop.guideState(op.type==='upgrade'?op.part:undefined);
   const result=workshopGuideCue(op,state);
   if(result?.prepare)workshop.guidePreview(result.prepare);
   if(op.type==='controller'&&state.kind===op.kind&&state.index===op.index&&state.page==='upgrade'&&!state.draft&&game.progress.weapon===op.index)return cue('configure',{12:'#ws-funnel',15:'#ws-mechanical',16:'#ws-spider'}[op.index],'打开伙伴配置');
   if(result&&result.source==='#ws-purchase'&&!state.affordable)return cue('purchase-short',visible(root.getElementById('ws-track'))?'#ws-track':'#ws-resources','条件未齐，追踪配方再准备');
   return result;
  }
  if(operation?.type==='hero-experience'){
   const index=operation.index;
   if(dialog?.id==='resident-chat'&&game.cottage?.residentTalk===index)return cue('hero-select','[data-resident-switch]','请伙伴接班出战');
   if(dialog?.id==='current-cat-dialog'&&game.progress.hero!==index)return cue('hero-home','[data-cat-go-home]','去巡林小屋找伙伴换班');
   if(dialog?.id==='cat-home-dialog')return closeCue(dialog,game.progress.hero===index?'出门巡林积累经验':'回巡林小屋，到伙伴房间聊天');
  }
  if(dialog?.id==='story-dialog'&&operation?.type==='story'){
   const selector=`[data-story-chapter="${operation.chapter}"]`,node=dialog.querySelector(selector);
   return node?.getAttribute('aria-pressed')==='true'?cue('story-enter','[data-story-command="enter"]','从这里开始故事'):cue('story-chapter',selector,'选择这章故事');
  }
  if(operation?.type==='sell-crops'&&dialog?.id==='seed-shop-dialog')return cue('sell-crops','#seed-shop-sell','出售背包作物，金币到账');
  if(dialog&&operation?.type==='click'&&dialog.id===operation.dialog){
   if(dialog.id==='fire-dialog'&&game.fireRescue?.phase!=='offered')return closeCue(dialog,'返回森林，沿指引出动');
   const node=dialog.querySelector(operation.selector);
   // 有车停在店旁时商店默认车载分类，购弹教学先指引切到猫猫弹药。
   if(!visible(node)&&dialog.id==='field-equipment-dialog'&&o.task.id==='supply-ammo')return cue('ammo-target','[data-supply-target="hand"]','选择猫猫弹药');
   if(!visible(node)&&dialog.id==='living-dialog')return cue('board','[data-living-tab="board"]','打开邻里委托');
   // 购种任务的商品位于分类中，切到其他类后先指回真实分类按钮。
   if(!visible(node)&&dialog.id==='seed-shop-dialog'){const crop=FARM_CROPS[mainlineTask(game)?.gardening?.crop];if(crop)return cue('seed-category',`[data-seed-shop-category="${crop.category}"]`,'选择'+FARM_CATEGORIES.find(c=>c.id===crop.category).name);}
   return cue('action',operation.selector,operation.label);
  }
  if(dialog)return closeCue(dialog,step.label);
  // 农活引导只指向现有工具、种子卡和田块，成熟前只提示等待或自愿浇水，不自动结算。
  if(operation?.type==='farm'){
   if(!visible(root.getElementById('farm-tools')))return visible(root.getElementById('farm-menu'))?cue('farm-open','#farm-menu','打开种地，拿起农具'):cue('farm-entry','#field-menu-toggle','展开菜单，选择种地');
   if(game.farmWork?.job||game.farmWork?.queue?.length)return null;
   if(operation.id==='dig')return cue('farm-dig','#farm-hoe','拿锄头，点击能站立的草地开田');
   // 手指高亮与任务路线选择同一块田，避免身旁的未熟田抢走远处成熟田的教学。
   const lesson=mainlineTask(game)?.gardening,tracked=lesson?.kind==='grow'?game.progress.mainline.gardening?.plotId:lesson?.kind==='harvest'?harvestGuidePlot(game)?.id??null:null;
   const plots=game.progress.farm.plots.filter(p=>p.mapId===game.mapId&&(operation.id==='plant'||tracked===null||p.id===tracked)&&visible(root.querySelector(`[data-farm-cell="${p.id}"]`)));
   if(operation.id==='plant'){
    if(!['hoe','seed'].includes(game.farmWork?.tool))return cue('farm-hoe','#farm-hoe','先收起其他农具，再点击空田选种');
    const seedSelector=lesson?.kind==='grow'?`[data-farm-seed="${lesson.crop}"]:not(:disabled)`:'[data-farm-seed]:not(:disabled)';
    if(visible(root.querySelector(seedSelector)))return cue('farm-seed',seedSelector,lesson?.kind==='grow'?'选择委托需要的胡萝卜种子':'选择一包库存种子');
    // 委托种子尚有库存但在其他分类时，先选类别，不误导玩家再去购买。
    if(lesson?.kind==='grow'&&game.progress.farm.seeds[lesson.crop]>0){const category=FARM_CROPS[lesson.crop].category,selector=`[data-farm-category="${category}"]`;if(visible(root.querySelector(selector)))return cue('farm-category',selector,'选择'+FARM_CATEGORIES.find(c=>c.id===category).name);}
    if(visible(root.querySelector('[data-farm-shop]')))return cue('farm-source','[data-farm-shop]','查看种子来源或购买已解锁种子');
    const plot=plots.find(p=>p.crop===null);return plot?cue('farm-plant',`[data-farm-cell="${plot.id}"]`,game.farmWork?.tool==='seed'?'点击田块或拖过空田，猫猫会播种':'点击空田，打开种子袋'):null;
   }
   const mature=plots.find(p=>p.crop!==null&&p.readyAt<=Date.now());
   if(mature)return game.farmWork?.tool==='harvest'?cue('farm-harvest',`[data-farm-cell="${mature.id}"]`,operation.id==='water'&&lesson?.kind==='grow'?'已成熟，收割后重新播种一茬并及时浇水':'点击成熟作物，走近收割装入背包，出售赚金币'):cue('farm-sickle','#farm-sickle','选镰刀，再点击成熟作物');
   const growing=plots.find(p=>p.crop!==null);if(!growing)return null;
   const seconds=Math.max(1,Math.ceil((growing.readyAt-Date.now())/1000));
   return !growing.watered?game.farmWork?.tool==='water'?cue('farm-water-target',`[data-farm-cell="${growing.id}"]`,'点击田块浇水，加快本茬成长'):cue('farm-water','#farm-water',operation.id==='water'?'本次委托需要给这块田浇水':'可选：浇水提前成熟，也可先去巡林'):cue('farm-wait','#mainline-hud',`约${seconds}秒后成熟，可先去巡林`);
  }
  if(operation?.type==='dismount'||operation?.type==='drive'&&game.progress.vehicleIndex===operation.index&&!game.vehicle.active&&!root.getElementById('vehicle-button').disabled)return cue('vehicle','#vehicle-button',operation.type==='dismount'?'点击下车':'定位载具');
  if(operation?.type==='drive'&&game.vehicle.active)return null;
  if(!action)return null;
  if(action.type==='menu'){
   // 现场入口先让玩家沿路线抵达，随身菜单才允许在任意位置高亮。
   if(o.navigation!==false&&(game.mapId!==o.site.mapId||worldDistance(game.player,o.site)>150))return null;
   const node=root.getElementById(action.id);
   if(!visible(node)&&root.getElementById('field-menu-items').contains(node))return cue('menu','#field-menu-toggle','展开菜单，找到下一步');
   if(visible(node))return cue('menu-action','#'+action.id,action.label);
  }
  const site=o.site;
  // 任务条现在只切换寻路，进入建筑的引导必须指向真正的附近操作按钮。
  return game.mapId===site.mapId&&worldDistance(game.player,site)<=150&&visible(root.getElementById('nearby-interaction'))?cue('entry','#nearby-interaction','点击进入：'+step.label):null;
 }
 // 爪尖贴近按钮边缘，默认放在按钮上方，顶部空间不足时翻到下方；禁用和实际拖拽期间不催促点击。
 function positionPaw(source,a,view,interaction){
  paw.hidden=!source.matches('button,a,[role=button],input,select,[draggable=true]')||source.disabled||source.getAttribute('aria-disabled')==='true'||interaction.dragging||interaction.tool.pointer;
  if(paw.hidden)return null;
  const width=42,height=42,leftEdge=Math.max(6,view.left+6),rightEdge=Math.min(host.innerWidth-6,view.right-6),topEdge=Math.max(6,view.top+6),bottomEdge=Math.min(host.innerHeight-6,view.bottom-6);
  // 新手任务卡上方是资源栏，猫爪放在卡片下缘，避免遮住资源和环境按钮。
  const above=source.id!=='arrival-goal'&&a.top-height+10>=topEdge,left=Math.max(leftEdge,Math.min(rightEdge-width,a.right-27)),top=Math.max(topEdge,Math.min(bottomEdge-height,above?a.top-height+10:a.bottom-10));
  paw.dataset.side=above?'above':'below';paw.style.left=left+'px';paw.style.top=top+'px';
  return {left,right:left+width,top,bottom:top+height};
 }
 // 提示贴在控件外侧，箭头连接真实中心，保持拖拽命中区域畅通。
 function draw(cue,dialog,key){
  if(cue?.preserve){if(lastCue)draw(lastCue,dialog,lastDrawKey);return;}
  const parent=dialog||root.getElementById('game-frame'),source=cue?.node||(cue?.source?parent.querySelector(cue.source):null),target=cue?.target?parent.querySelector(cue.target):null;
  if(source&&source.closest('details:not([open])'))for(let p=source.parentElement;p&&p!==parent;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
  // 房屋保持本体点击；怪潮抵达教学允许猫爪直接标出真实站牌，避免到点后不知如何开始。
  if(!cue||!visible(source)||!dialog&&cue.id!=='camp-marker'&&source.matches('.world-workshop-entry,.world-realm-entry,#nearby-interaction,[data-camp-gate]')){clear();return;}
  if(layer.parentElement!==parent)parent.append(layer);
  const signature=key+':'+cue.id+':'+(cue.source||source.id)+':'+host.innerWidth+':'+host.innerHeight,changed=signature!==lastKey;
  // 原生弹窗的初始焦点和画布尺寸观察器会稍后落位；短暂重定位，之后允许自由滚动。
  if(changed)revealUntil=host.performance.now()+450;
  const interaction=workshop.guideState();
  if((changed||host.performance.now()<revealUntil)&&!interaction.dragging&&!interaction.tool.pointer)reveal(source,target);
  const next=[source,...(visible(target)?[target]:[])];
  for(const n of marked)if(!next.includes(n))n.classList.remove('operation-source','operation-target','mainline-cue-target');
  for(const name of ['operation-source','mainline-cue-target'])source.classList.add(name);
  if(next[1]&&!next[1].classList.contains('operation-target'))next[1].classList.add('operation-target');marked=next;
  lastKey=signature;lastDrawKey=key;lastCue=cue;if(layer.hidden)layer.hidden=false;if(layer.dataset.stage!==cue.id)layer.dataset.stage=cue.id;if(layer.dataset.step!==key)layer.dataset.step=key;
  const a=source.getBoundingClientRect(),b=next[1]?.getBoundingClientRect();
  let view=dialog?dialog.getBoundingClientRect():parent.getBoundingClientRect();
  // 怪潮入口本身已写明点击动作，只加猫爪；为顶部HUD留白，避免重复气泡遮挡任务卡。
  const campEntry=!dialog&&cue.id==='camp-marker';tip.hidden=campEntry;
  if(campEntry){const bottom=Math.max(view.top,...[...root.querySelectorAll('.hud-resources,#quest,#mainline-hud,#boss-hud')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect().bottom));view={left:view.left,right:view.right,top:bottom+8,bottom:view.bottom};}
  const text=source.disabled?'条件未满足，请先补齐所需资源或资格':cue.text;if(tip.textContent!==text)tip.textContent=text;
  const pawBox=positionPaw(source,a,view,interaction);
  const x=Math.max(view.left+8,Math.min(view.right-tip.offsetWidth-8,a.left+a.width/2-tip.offsetWidth/2));
  let y=a.top-tip.offsetHeight-9;if(y<view.top+10)y=a.bottom+9;
  // 任务卡紧贴资源栏，开关教学固定放到卡片下方，避免遮住金币和环境控件。
  if(source.id==='task-navigation-toggle')y=(root.querySelector('.task-route-anchor')?.getBoundingClientRect().bottom||a.bottom)+9;
  if(source.id==='arrival-goal')y=a.bottom+9;
  // 猫爪翻到上方时让说明避开爪子，仍贴近同一操作目标。
  if(pawBox&&x<pawBox.right&&x+tip.offsetWidth>pawBox.left&&y<pawBox.bottom&&y+tip.offsetHeight>pawBox.top)y=source.id==='arrival-goal'?pawBox.bottom+6:pawBox.top-tip.offsetHeight-6>=view.top+8?pawBox.top-tip.offsetHeight-6:a.bottom+9;
  // 收获任务的短屏气泡避开金币缺口卡，移到田块与角色下方，不遮挡任务文字。
  const harvestHud=!dialog&&mainlineTask(game)?.goal.harvestFor&&source.matches('[data-farm-cell]')?root.getElementById('mainline-hud'):null;
  if(harvestHud&&!harvestHud.hidden){const r=harvestHud.getBoundingClientRect();if(x<r.right&&x+tip.offsetWidth>r.left&&y<r.bottom&&y+tip.offsetHeight>r.top)y=Math.max(r.bottom+8,a.bottom+82);}
  const left=x+'px',top=Math.min(host.innerHeight-tip.offsetHeight-8,Math.max(8,y))+'px';
  if(tip.style.left!==left)tip.style.left=left;if(tip.style.top!==top)tip.style.top=top;
  if(arrow.hasAttribute('hidden')!==!b)arrow.toggleAttribute('hidden',!b);if(destination.hidden!==!b)destination.hidden=!b;
  if(b){const sx=a.left+a.width/2,sy=a.top+a.height/2,tx=b.left+b.width/2,ty=b.top+b.height/2;
   arrow.setAttribute('d',`M${sx} ${sy} Q${sx+Math.min(70,Math.abs(tx-sx)*.3+30)} ${(sy+ty)/2} ${tx} ${ty}`);
   destination.style.left=Math.max(view.left+6,Math.min(view.right-destination.offsetWidth-6,tx-destination.offsetWidth/2))+'px';destination.style.top=Math.max(view.top+6,b.top-destination.offsetHeight-7)+'px';
  }
 }
 // 每帧跟随矩形；步骤变化时只调整指引，不自动关闭玩家正在操作的页面。
 function render(){
  if(!taskNavigationEnabled(game)&&mainlineOperation(game)?.id!=='task-navigation-toggle'&&!root.querySelector('dialog[open]')){clear();return;}
  const o=mainlineObjective(game),dialog=root.activeElement?.closest('dialog[open]')||[...root.querySelectorAll('dialog[open]')].at(-1);
  // 奖励已有独立关闭徽记，主线箭头不能盖住计时，也不催促玩家再领取一次。
  if(dialog?.id==='restoration-dialog'||dialog?.id==='task-reward-dialog'||o?.restoration||o?.cottageRest||game.progress.arrival?.phase==='repair'){clear();return;}
  // 靠近房屋时只保留本体热点，不再显示额外任务操作气泡。
  const nearby=root.getElementById('nearby-interaction');
  // 待阅读来信仍须提示任务按钮，不能因站在工坊旁而丢失猫爪。
  if(!dialog&&game.progress.arrival?.phase!=='letter'&&(game.cottageEntry||nearby&&!nearby.hidden&&nearby.dataset.presentation==='building')){clear();return;}
  // 入职同样使用正式操作高亮；不要求玩家先结束入职才能看见点哪间房屋。
  if(game.arrivalPending){
   if(root.hidden||game.state!=='playing'&&!dialog){clear();return;}
   draw(arrivalWorkshopGuide(game,dialog?.id),dialog,'arrival:'+game.progress.arrival.phase);return;
  }
  // 清缴进度接管屏幕时不高亮下一项主线操作，Boss仍使用原头像手势提示。
  if(clearingCombatActive(game)){clear();return;}
  if(!o||root.hidden||game.mainlineSpeech||game.state!=='playing'&&!dialog){clear();return;}
  const task=mainlineTask(game),steps=mainlineSteps(game),step=steps.find(s=>!s.done),action=mainlineAction(game);
  const operation=mainlineOperation(game),key=task.id+':'+steps.findIndex(s=>!s.done)+':'+(step?.progress||'');
  draw(resolve(o,step,operation,action,dialog),dialog,key);
 }
 // 应用销毁必须撤回所有描边和顶层节点。
 function dispose(){clear();layer.remove();}
 return {render,dispose};
}
