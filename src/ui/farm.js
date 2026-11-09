import {setHidden} from './shared/dom-state.js';
import {farmToolReady} from '../config/farm-tools.js';
import {industrialToolKey} from '../config/industry.js';
import {createFarmToolGroups,farmGroupMarkup} from './farm-tool-groups.js';
import {productionIcon} from '../rendering/farm-production.js';
import {createFarmHarvestConfirm} from './farm-harvest-confirm.js';
// 世界农活控件：工具栏按需展开，透明地块命中区、拖动队列与金币飞行独立于结算。
import {createFarmRemoval} from './farm-removal.js';
import {updateFarmCellState,farmCellView,placeFarmCell} from './farm-cell-state.js';
import {createFarmPlacement} from './farm-placement.js';
import {createEventScope} from '../platform/events.js';
import {farmAction,canEnterFarm,canUseFarm,storyFarmAllowed,farmInteractionBlocked,setFarmTool,liftOxPlow,queueFarmWork,queueSeedRow,queueAdvancedFarm} from '../core/farming/farm.js';
import {enterFarmVehicle,restoreFarmVehicle,validateFarmVehicleReturn} from '../core/farming/farm-vehicle.js';
import {canUseFarmDelivery,claimFarmParcel} from '../core/farming/farm-delivery.js';
import {FARM_CROPS,FARM_CATEGORIES,FARM_WATER,FARM_DELIVERY,FARM_SENDERS,farmSeedRequirement} from '../config/farm.js';
import {farmCategoryMarkup,farmCategoryCrops} from './farm-categories.js';
import {farmGrowth} from '../progression/farming/farm.js';
import {loadFarmArt,farmCropMarkup,farmArtBudget} from '../rendering/farm.js';
import {paintFarmToolIcon} from '../rendering/farm-tools.js';
import {canvasRecoveryRevision} from '../rendering/canvas-recovery.js';
import {drawWeapon} from '../rendering/characters.js';
import {drawFunnelIcon} from '../rendering/funnel.js';
import {WEAPONS} from '../config/weapons.js';
import {artStyle} from '../art-styles/state.js';
import {summonOx} from '../core/farming/pasture.js';
import {oxFoot} from '../config/pasture.js';
import {createOxControls} from './ox-plow.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {nearest,worldDistance} from '../world/coordinates.js';
// 锄头、水壶与收割镰刀图标共用正式主体绘制。
function toolIcon(tool){return `<canvas width="88" height="88" data-farm-tool-art="${tool}" aria-hidden="true"></canvas>`;}
// 双角与浅色牛鼻取自牧栏耕牛，工具栏图标独立于动物图集加载。
const oxCallIcon='<svg viewBox="0 0 32 32" aria-hidden="true" stroke="#485d41" stroke-width="1.6" stroke-linejoin="round"><path fill="#f7e0af" d="M11 12C5 13 2 8 5 3Q6 9 12 8M21 12C27 13 30 8 27 3Q26 9 20 8"/><path fill="#be885d" d="M9 12Q1 9 2 15Q4 19 9 17M23 12Q31 9 30 15Q28 19 23 17"/><path fill="#cd9969" d="M7 17Q6 8 16 8Q26 8 25 17L23 23Q16 29 9 23Z"/><ellipse cx="16" cy="22" rx="7.5" ry="4.6" fill="#f4d7ad"/><path d="M12 15v2m8-2v2m-6 4v1m4-1v1" stroke-linecap="round"/></svg>';
// 反射属性和文本相同时不触碰DOM，避免每帧让整片农田参与样式失效。
function farmProperty(node,key,value){if(node[key]!==value)node[key]=value;}
// 无障碍状态保持即时同步，仅省去相同值的重复提交。
function farmAttribute(node,key,value){const text=String(value);if(node.getAttribute(key)!==text)node.setAttribute(key,text);}
// 场景内只提交农活意图，角色动作完成后由核心更新真正的存档。
export function createFarmPanel({game,root,renderer,input,dialogs,onChange,onNotice,onSeedShop,onPasture,onSprinkler,onIndustry}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),layer=root.createElement('div'),menu=root.createElement('button');
 const harvestConfirm=createFarmHarvestConfirm({game,root,dialogs,onChange,onNotice});
 const removalPanel=createFarmRemoval({game,root,dialogs,onChange,onNotice});
 layer.id='farm-world-layer';layer.innerHTML=`<div id="farm-tools" hidden aria-label="种地工具"><button id="farm-hoe" aria-label="锄头，轻点开垦，长按选择耕地农具">${toolIcon('hoe')}<span>锄头</span></button><button id="farm-water" aria-label="水壶：每次浇灌选中的一块田，每茬生长时长最多缩短${FARM_WATER.reduction*100}%">${toolIcon('water')}<span>水壶</span></button><button id="farm-sickle" aria-label="镰刀，轻点收割，长按选择收割农具">${toolIcon('sickle')}<span>镰刀</span></button><button id="farm-seeder" aria-label="条播机：点选一行田地，再选择种子">${toolIcon('seeder')}<span>条播机</span></button><button id="farm-axis" type="button" hidden><span>按行</span></button><button id="farm-combat" aria-label="拿起武器战斗"><canvas id="farm-weapon-icon" width="112" height="112" aria-hidden="true"></canvas><span>战斗</span></button><button id="farm-remove" aria-label="移除地块，点击地块后确认"><span class="farm-remove-symbol" aria-hidden="true">×</span><span>移除</span></button><button id="farm-exit" aria-label="退出种田并恢复武器"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M15 5H6v22h9M13 16h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>退出</span></button>${farmGroupMarkup(toolIcon,oxCallIcon,productionIcon('sprinkler'))}</div><span id="farm-notice" role="status" class="sr-only"></span><div id="farm-picker" hidden aria-label="选择种子"></div><div id="farm-harvest-pop" hidden><button id="farm-harvest" aria-label="挥镰收割">${toolIcon('sickle')}</button></div><div id="farm-ghost" hidden aria-hidden="true"></div><button id="farm-delivery-hit" class="scene-hit" aria-label="查看快递站" hidden></button><section id="farm-mail" hidden aria-label="快递站种子礼物"></section>`;
 menu.id='farm-menu';menu.innerHTML=toolIcon('hoe')+'<span>种地</span>';menu.setAttribute('aria-label','展开或收起种地工具');menu.setAttribute('aria-controls','farm-tools');
 // 种地常驻右下角，直接复用既有开合与驾驶下车流程。
 frame.append(layer);root.querySelector('.field-menu').prepend(menu);
 const oxControls=createOxControls({game,root,layer,renderer,frame,onPasture,onAxis:()=>get('axis').click(),start:startPlow,stop:()=>{stop(false);open(false);},say});
 const placement=createFarmPlacement({game,root,renderer,frame,layer});
 const get=id=>root.getElementById('farm-'+id),coin=root.querySelector('[data-coins]')?.closest('.resource-pill'),cells=new Map(),flights=new Set();
 sceneHit(get('delivery-hit'),'查看快递站');
 const toolCanvases=[menu.querySelector('[data-farm-tool-art]'),...layer.querySelectorAll('[data-farm-tool-art]')];
 let opened=false,combat=false,autoCombat=false,weaponSignature='',selected=0,category='ornamental',seedPage=0,anchor=null,popup=null,loaded=false,disposed=false,gesture=null,signature='',lastResult=null,mailOpen=false,mailSignature='',notice='',introduced=false;
 const groups=createFarmToolGroups({root,layer,toolbar:get('tools'),scope,onChoose:chooseTool,onOpen:()=>{popup=null;mailOpen=false;input.reset();render();},onDrag:startSickleDrag});
 // 镰刀从按钮直接拖到田里时沿用原有拖收手势，原地长按交给分类。
 function startSickleDrag(p){
  if(farmInteractionBlocked(game)||!canUseFarm(game))return;
  if(game.progress.farm.toolChoices.sickle==='reaper'){chooseTool('reaper',true);return;}
  useTool('harvest');gesture={pointer:p.pointer,mode:'harvest',id:null,seen:new Set(),x:p.x,y:p.y,startX:p.x,startY:p.y,moved:true};game.farmDragging=true;
 }
 // 分类中的选项直接连接正式农具或设施的使用入口。
 function chooseTool(id,explicit=false){
  if(!explicit)id=game.progress.farm.toolChoices[id]||id;
  if(!canUseFarm(game)||farmInteractionBlocked(game))return;
  const kit=industrialToolKey(id);if(kit&&!farmToolReady(game.progress,id)){say('到加工厂制作这件农具，再运回仓库启用。');onIndustry();return;}
  if(!farmToolReady(game.progress,id)){say('请先在农具页建造或领养。');onPasture();return;}
  const choices=game.progress.farm.toolChoices;
  const group=['hoe','summon-ox'].includes(id)?'hoe':['water','sprinkler'].includes(id)?'water':['sickle','reaper'].includes(id)?'sickle':null;
  if(group)choices[group]=id;
  if(id==='summon-ox')game.progress.farm.lastTool='ox';
  game.livingPersist?.(game.progress);
  if(id==='summon-ox'){
   const farm=game.progress.farm,site=farm.oxSite;
   if(farm.oxPlow&&!game.oxArrival&&!farm.oxReturn&&site?.mapId===game.mapId&&worldDistance(game.player,oxFoot(site))<=115)startPlow();
   else say(summonOx(game,renderer.view).message);
  }else if(id==='sprinkler'){onSprinkler();}
  else{
   useTool(id==='sickle'?'harvest':id);
   if(id==='reaper')say('选择行列方向，点任意田格即可自动收割这一行。');
   if(id==='water')say(game.progress.farm.doubleCan?'双格壶会一起浇灌右侧相邻的作物。':'点选成长中的作物即可浇水。');
  }
  render();
 }
 // 简短提示独立于底部农具，不再撑出一整块说明底板。
 function say(message){if(!message)return;notice=message;get('notice').textContent=message;onNotice?.(message);}
 // 收起或手动取消不会改动已经成功保存的田块和收益。
 function stop(restoreVehicle=true){releaseGesture();opened=false;combat=false;input.reset();popup=null;mailOpen=false;anchor=null;setFarmTool(game,null);game.farmCursor=null;setHidden(get('ghost'),true);if(restoreVehicle&&restoreFarmVehicle(game)){say('正在走回载具，靠近后倒计时上车；摇杆可取消返车');onChange();}render();}
 // 失焦只释放手势与输入，保留工具和农活队列；后台暂停由全局偏好控制。
 function releaseGesture(){groups.cancel();groups.close();const pointer=gesture?.pointer;gesture=null;game.farmDragging=false;setHidden(get('ghost'),true);if(pointer!==undefined&&layer.hasPointerCapture(pointer))layer.releasePointerCapture(pointer);}
 // 图集失败给出明确提示，下一次打开可以原地重试。
 async function prepare(){try{await loadFarmArt();if(disposed)return;loaded=true;render();}catch(e){loaded=false;say(e.message+'，再次点击种地重试。');}}
 // 打开种地或明确短按田块才允许安全下车，普通拖动不改变驾驶状态。
 function enter(allowDismount=false){
  if(game.vehicle?.active&&!allowDismount)return false;
  const result=enterFarmVehicle(game);if(!result.ok){say(result.message);return false;}
  if(result.dismounted){
   input.reset();onChange();say('已下车，可以开始种田');
  }
  return canUseFarm(game);
 }
 // 种地按钮恢复上次农具；从作业栏返回时保留分类选择并展开工具栏。
 function open(restore=true){if(!enter(true))return;opened=true;combat=false;input.reset();setFarmTool(game,restore?'hoe':'select');popup=null;mailOpen=false;if(!introduced&&!game.progress.farm.lessonRewarded){introduced=true;say('开地 → 播种 → 浇水，然后继续其他委托；成熟后再收割装入背包，出售赚金币');}if(!loaded)prepare();if(restore){const last=game.progress.farm.lastTool;if(last==='ox')chooseTool('summon-ox',true);else if(farmToolReady(game.progress,last))useTool(last);}render();}
 // 从农具页牵牛；换工具和退出种地均释放牛犁。
 function startPlow(){
  if(game.progress.farm.oxReturn){say('耕牛正在走回牧栏。');return;}
  if(game.oxArrival){say('耕牛正在赶来。');return;}
  if(!game.progress.farm.oxPlow||!canUseFarm(game)||farmInteractionBlocked(game)){say('请在安全的地面下车后出工。');return;}
  const site=game.progress.farm.oxSite;
  if(site){
   const body=oxFoot(site);
   if(site.mapId!==game.mapId){say('耕牛正在另一张地图等候。');return;}
   if(worldDistance(game.player,body)>115){
    requestWorldNavigation(game,{...site,...body},'前往耕牛旁');say('已标记耕牛位置，靠近后点击牛身。');return;
   }
  }
  open(false);setFarmTool(game,'ox');game.progress.farm.lastTool='ox';game.livingPersist?.(game.progress);
  game.farmWork.ox={phase:0,facing:site?.facing||1,yaw:(game.progress.farm.axis==='column'?Math.PI/2:0)+(site?.facing===-1?Math.PI:0),approach:site?oxFoot(site):null,row:null,held:false};

  say('点选地格自动犁地，到边界停下；摇杆可随时接管。');render();
 }
 // 控件点击只排队，最终费用与收割结果以动作落点时的事务为准。
 function act(action,id){if(farmInteractionBlocked(game))return {ok:false,message:'战斗中暂不可种地'};const r=queueFarmWork(game,action,{plot:id,crop:selected});if(!r.ok){game.farmDragging=false;gesture=null;say(r.message);}render();return r;}
 // 从车上点开的空田已指定播种目标；普通选种仍可拿起种子袋后拖播。
 let sowOnPick=false;
 function chooseSeed(id){
  if(!enter())return;
  if(game.farmWork?.tool==='seeder'){selected=id;popup=null;input.reset();say(queueSeedRow(game,anchor,id).message);render();return;}
  const sow=popup==='seed'&&sowOnPick;
  selected=id;popup=null;opened=true;setFarmTool(game,'seed');input.reset();
  if(sow){act('plant',anchor);return;}
  say('拖过空田安排播种，猫猫会逐块走近撒种');render();
 }
 // 按田块切换工具；同类连续点击保留已有队列，跨工具时才取消原动作。
 function useTool(tool){if(!enter())return;if(!farmToolReady(game.progress,tool)){say('请先在加工厂建造这件农具并运回仓库。');onIndustry();return;}if(['hoe','water','harvest','seeder','reaper'].includes(tool)){game.progress.farm.lastTool=tool;game.livingPersist?.(game.progress);}opened=true;combat=false;popup=null;mailOpen=false;game.farmCursor=null;input.reset();if(game.farmWork?.tool!==tool)setFarmTool(game,tool);}
 // 点击和拖播共用实时库存判断，当前种子耗尽后回到选种，不再安排空种子袋的播种动作。
 function hasSelectedSeed(){return loaded&&game.progress.farm.seeds[selected]>0;}
 // 查看成长时间只读成熟时间戳，不切换农具或安排农活；浇水减时后会立即反映。
 function showGrowth(plot){
  const seconds=Math.max(1,Math.ceil((plot.readyAt-Date.now())/1000)),minutes=Math.floor(seconds/60);
  popup=null;mailOpen=false;
  say(`${FARM_CROPS[plot.crop].name}距成熟还有 ${minutes?minutes+'分':''}${seconds%60}秒；${plot.watered?'土壤湿润，无需浇水':'选中水壶后点击可浇水'}`);
 }
 // 两种操作都从有库存的种子类别打开选择器。
 function openPlotSeeds(sow=false){
  sowOnPick=sow;popup='seed';seedPage=0;signature='';
  const seeds=game.progress.farm.seeds,available=seeds[selected]>0?selected:seeds.findIndex(n=>n>0);
  category=FARM_CROPS[Math.max(0,available)].category;
 }
 // 驾驶时先安全下车，再按刚点中的田块走近并执行农活。
 function tap(id){
  const p=game.progress.farm.plots.find(p=>p.id===id&&p.mapId===game.mapId);if(combat||!p||farmInteractionBlocked(game))return;
  const riding=!!game.vehicle?.active;
  if(!enter(true))return;
  anchor=id;opened=true;
  if(['ox','reaper'].includes(game.farmWork?.tool)){popup=null;input.reset();say(queueAdvancedFarm(game,{plot:id,view:renderer.view}).message);render();return;}
  if(game.farmWork?.tool==='seeder'){openPlotSeeds();render();return;}
  if(game.farmWork?.tool==='remove'){popup=null;removalPanel.open(p);return;}
  if(p.crop===null){
   if(game.farmWork?.tool==='seed'&&hasSelectedSeed())act('plant',id);
   else{useTool('hoe');openPlotSeeds(riding);}
  }else if(farmGrowth(p)>=1){
   useTool('harvest');if(!loaded){say('作物图片尚未加载，请稍后收割');return;}act('harvest',id);
  }else if(game.farmWork?.tool==='water'||riding&&!p.watered){useTool('water');act('water',id);}
  else {if(riding)useTool('water');showGrowth(p);}
  render();
 }
 // 统一镜头反投影，空白地面的短按开垦不抢占原有拖动摇杆。
 function worldPoint(event){const v=renderer.view,r=renderer.canvas.getBoundingClientRect();return {x:v.x+(event.clientX-r.left)/r.width*v.w,y:v.y+(event.clientY-r.top)/r.height*v.h};}
 // 锄头针对任意地面，电锯针对所点树木；建筑仍由原命中控件处理。
 function tapWorld(event){
  if(!opened||combat||farmInteractionBlocked(game)||!canUseFarm(game)||!renderer.view)return false;const p=worldPoint(event),tool=game.farmWork?.tool;

  popup=null;mailOpen=false;input.reset();let result;
  if(['ox','reaper'].includes(tool)){
   const plot=game.progress.farm.plots.find(t=>{const q=nearest(t,p);return t.mapId===game.mapId&&Math.abs(q.x-p.x)<=28&&Math.abs(q.y-p.y)<=26;});
   result=queueAdvancedFarm(game,{plot:plot?.id,point:p,view:renderer.view});say(result.message);
  }else if(tool==='saw'){
   const tree=(game.trees||[]).filter(t=>t.hp>0).map(t=>({t,d:worldDistance({x:t.x,y:t.y-30},p)})).filter(o=>o.d<65).sort((a,b)=>a.d-b.d)[0]?.t;
   result=tree?queueFarmWork(game,'saw',{tree}):{ok:false,message:'点击一棵树，猫猫会走近用电锯清理'};
  }else if(tool==='hoe'){result=queueFarmWork(game,'dig',{point:p,view:renderer.view});game.farmCursor=result.ok?result.point:null;}
  else {say(tool==='select'?'请选择要使用的农具':tool==='seeder'?'按所选方向点田地，再选择种子':tool==='ox'?'点选地格自动犁地':tool==='remove'?'点击要移除的地块，再确认移除':tool==='water'?'点击成长中的田块，猫猫会走近浇灌这一块田':tool==='harvest'?'点击成熟作物，猫猫会走近挥镰收割':'点击空田安排播种，或点击成熟田收割');return true;}
  if(!result.ok)say(result.message);render();return true;
 }
 // 就地小浮层约束到安全区，随所选田块一起移动。
 function positionPopup(node,site){
  const v=renderer.view;if(!v)return;const f=frame.getBoundingClientRect(),c=renderer.canvas.getBoundingClientRect(),p=nearest(site,{x:v.x+v.w/2,y:v.y+v.h/2}),x=(p.x-v.x)*v.zoom+c.left-f.left,y=(p.y-v.y)*v.zoom+c.top-f.top;
  node.style.left=Math.max(8,Math.min(f.width-node.offsetWidth-8,x-node.offsetWidth/2))+'px';
  const tools=get('tools'),bottom=tools.hidden?f.height-95:tools.getBoundingClientRect().top-f.top-6;
  const above=y-node.offsetHeight-35;node.style.top=Math.max(60,Math.min(bottom-node.offsetHeight,above>=60?above:y+26))+'px';
 }
 // 收获只显示一个金币与金额；重叠收益累加但不重启动画，避免连续收割拖出长尾。
 function flyCoins(event){
  if(!event.point||event.point.mapId!==game.mapId||!coin||!renderer.view)return;
  for(const active of flights){
   if(active.mapId===game.mapId&&['running','paused'].includes(active.animation.playState)){
    active.coins+=event.coins;active.node.querySelector('b').textContent='+'+active.coins;return;
   }
   active.animation.cancel();active.node.remove();flights.delete(active);
  }
  const f=frame.getBoundingClientRect(),c=renderer.canvas.getBoundingClientRect(),v=renderer.view,p=nearest(event.point,game.player),r=coin.getBoundingClientRect(),x=(p.x-v.x)*v.zoom+c.left-f.left,y=(p.y-v.y)*v.zoom+c.top-f.top;
  // 手机钱包关闭时没有屏幕落点，收获金币回到角色，不飞向隐藏节点的零坐标。
  const walletVisible=r.width>0&&r.height>0,dx=walletVisible?r.x+r.width/2-f.left-x:(game.player.x-p.x)*v.zoom,dy=walletVisible?r.y+r.height/2-f.top-y:(game.player.y-p.y)*v.zoom;
  const reduced=root.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const node=root.createElement('span');node.className='farm-coin-flight';node.setAttribute('aria-hidden','true');node.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f5cf63" stroke="#6d7043" stroke-width="2"/><circle cx="12" cy="12" r="7" fill="none" stroke="#ae8335"/><path d="M12 6v12m-3-9h5l-4 6h5" fill="none" stroke="#8b7137" stroke-width="1.5"/></svg><b>+'+event.coins+'</b>';node.style.left=x+'px';node.style.top=y+'px';layer.append(node);
  // 普通模式快速飞向可见钱包或角色；减少动态时仅在田边短暂淡出。
  const start='translate(-50%,-50%) translate(0px,-8px)',end=`translate(-50%,-50%) translate(${dx}px,${dy}px)`;
  const frames=reduced?[{transform:start,opacity:1},{transform:start,opacity:0}]:[{transform:start+' scale(.95)',opacity:1},{transform:end+' scale(.7)',opacity:.9,offset:.85},{transform:end+' scale(.55)',opacity:0}];
  const animation=node.animate(frames,{duration:reduced?120:360,easing:'cubic-bezier(.2,.65,.35,1)',fill:'both'}),flight={node,animation,coins:event.coins,mapId:game.mapId};flights.add(flight);
  // 收益已由正式收割事务入账；动画结束仅清理节点并轻亮一次金币栏。
  animation.onfinish=()=>{node.remove();flights.delete(flight);if(!reduced&&walletVisible)coin.animate([{filter:'brightness(1.2)'},{filter:'none'}],{duration:100});};
 }
 // 快递入口在远处只导航，靠近柜台才展开真正可领取的包裹。
 function openMail(){
  if(!canUseFarmDelivery(game)||root.querySelector('dialog[open]'))return;
  if(worldDistance(game.player,FARM_DELIVERY)>115){requestWorldNavigation(game,{...FARM_DELIVERY,y:FARM_DELIVERY.y+45},'前往快递站领取种子',{direct:true});say('前往小屋北侧的快递站，靠近柜台领取种子礼物');return;}
  // 收起农具但不改变驾驶状态；已有农活返车意图仍在关闭快递时处理。
  stop(false);mailOpen=true;mailSignature='';render();
 }
 // 只在选择种子时读取屏幕高度和库存，战场刷新无需触发布局。
 function renderSeedPicker(f){
  const pageSize=frame.clientHeight<=480?4:8,categorySeeds=farmCategoryCrops(category),pageCount=Math.ceil(categorySeeds.length/pageSize);
  seedPage=Math.min(seedPage,pageCount-1);
  const key=[category,seedPage,pageSize,f.xp,f.unlocked.join(','),f.seeds.join(','),loaded].join(':');
  if(key===signature)return;
  signature=key;
  // 按页显示当前类别，短屏每页四种，保留点选与拖播的完整触控空间。
  get('picker').innerHTML='<header class="farm-picker-header">'+farmCategoryMarkup(category,'data-farm-category',f.seeds)+'<button type="button" class="ui-close" data-farm-picker-close aria-label="关闭种子选择">×</button></header>'+'<div class="farm-seed-grid">'+categorySeeds.slice(seedPage*pageSize,(seedPage+1)*pageSize).map(({crop,i})=>`<button data-farm-seed="${i}" aria-label="${crop.name}种子，库存${f.seeds[i]}粒，${farmSeedRequirement(crop)}，${crop.seconds/60}分钟成熟，售价${crop.value}金币/份" title="${crop.name} · ${farmSeedRequirement(crop)}" ${!loaded||!f.seeds[i]?'disabled':''}>${farmCropMarkup(i)}<span>${crop.name}</span><span class="farm-seed-count" aria-hidden="true">${f.unlocked[i]||f.seeds[i]?f.seeds[i]:'未获'}</span></button>`).join('')+`</div><div class="farm-seed-pages" aria-label="种子翻页"><button data-farm-page="-1" ${seedPage===0?'disabled':''}>上一页</button><span aria-live="polite">${seedPage+1} / ${pageCount}</span><button data-farm-page="1" ${seedPage===pageCount-1?'disabled':''}>下一页</button></div><button data-farm-shop aria-label="种子小屋：购买种子与查看来源">种子小屋</button>`;
 }
 // 地块节点按永久编号创建，数量和空间由存档决定，没有预制十二格限制。
 function render(){
  if(disposed)return;
  const waterButton=get('water'),canLabel=game.progress.farm.doubleCan?'双格水壶，浇选中作物及右邻作物':'基础水壶，浇选中的一格作物';
  const waterLabel=canLabel+'，长按选择浇灌农具';
  if(game.progress.farm.toolChoices.water!=='sprinkler'&&waterButton.getAttribute('aria-label')!==waterLabel){
   waterButton.setAttribute('aria-label',waterLabel);
   get('basic-water').querySelector('span').textContent=game.progress.farm.doubleCan?'双格水壶':'水壶';
   waterButton.querySelector('span').textContent=game.progress.farm.doubleCan?'双格壶':'水壶';
  }
  harvestConfirm.render();
  validateFarmVehicleReturn(game);
  // 小图标画布按风格失效，帧刷新不重复绘制或增加缓存。
  const style=artStyle()+':'+canvasRecoveryRevision();for(const icon of toolCanvases){if(icon.dataset.artStyle!==style){paintFarmToolIcon(icon,icon.dataset.farmToolArt);icon.dataset.artStyle=style;}}
  const active=canUseFarm(game),blocked=farmInteractionBlocked(game),accessible=canEnterFarm(game)&&game.player.hp>0&&!blocked&&!combat,f=game.progress.farm;
  // 分类入口显示上次选择，标题和图标一起切换。
  for(const group of ['hoe','water','sickle']){
   const chosen=f.toolChoices[group],button=get(group);
   if(button.dataset.selectedTool===chosen)continue;
   button.dataset.selectedTool=chosen;
   const source=get(chosen==='hoe'||chosen==='water'||chosen==='sickle'?'basic-'+chosen:chosen);
   button.innerHTML=source.innerHTML;button.setAttribute('aria-label',source.textContent.trim()+'，长按选择同类农具');
   for(const icon of button.querySelectorAll('[data-farm-tool-art]'))paintFarmToolIcon(icon,icon.dataset.farmToolArt);
  }
  const axis=get('axis'),work=game.farmWork;
  farmProperty(axis,'hidden',!['ox','seeder','reaper'].includes(work?.tool));
  farmProperty(axis.querySelector('span'),'textContent',f.axis==='column'?'按列 ↕':'按行 ↔');
  farmAttribute(axis,'aria-label',(f.axis==='column'?'当前按列作业，切换为按行':'当前按行作业，切换为按列'));
  oxControls.render(active&&!blocked);
  placement.render(opened&&accessible&&(!game.oxArrival||f.oxReturn)&&game.farmWork?.tool==='hoe'&&!popup&&!mailOpen&&!root.querySelector('dialog[open]'));
  if(game.farmWork?.tool)combat=false;
  if(opened&&active&&!combat&&!game.farmWork&&!popup)opened=false;
  // 武器图标复用正式画像，只在装备或画风变化时重绘。
  const weaponKey=style+':'+game.progress.weapon;
  if(weaponKey!==weaponSignature){weaponSignature=weaponKey;const c=get('weapon-icon').getContext('2d'),index=game.progress.weapon,controller=WEAPONS[index].controller;c.clearRect(0,0,112,112);if(['funnel','drone'].includes(controller))drawFunnelIcon(c,56,54,1,controller);else{c.save();c.translate(index>=8?40:54,56);c.rotate(-.4);drawWeapon(c,index,0,0,index>=8?1.15:index?1.9:2.2);c.restore();}}
  // 自动迎敌高亮战斗按钮，原工具和排队标记保留；结束后自动恢复原工具，不触发手动退出。
  const defending=!!game.farmWork?.autoCombat,recovering=defending&&game.farmWork.combatRecovery>0;
  if(defending!==autoCombat){autoCombat=defending;if(defending){popup=null;say('发现射程内怪物，自动迎敌；农活队列已保留');}else if(game.farmWork)say('附近威胁已清除，继续农活');}
  farmAttribute(get('combat'),'aria-pressed',combat||defending);
  // 清场后明确显示持枪警戒，避免玩家误以为仍有怪物或农活卡住。
  farmProperty(get('combat').querySelector('span'),'textContent',recovering?'警戒':defending?'迎敌':'战斗');
  farmAttribute(get('combat'),'aria-label',recovering?'持枪警戒，确认安全后继续农活；点击可改为手动战斗':defending?'自动迎敌，结束后继续农活；点击可改为手动战斗':'拿起武器战斗');
  farmProperty(menu,'hidden',!!game.realm||!storyFarmAllowed(game));farmAttribute(menu,'aria-pressed',opened);farmAttribute(menu,'aria-expanded',opened);farmProperty(get('tools'),'hidden',!opened||!active||['ox','reaper'].includes(game.farmWork?.tool));
  if(!accessible){releaseGesture();popup=null;}
  if(get('tools').hidden||root.querySelector('dialog[open]')){groups.cancel();groups.close();}
  // 当前动作算第一步，后续队列按真实执行顺序编号，完成后同步前移。
  const steps=new Map([game.farmWork?.job,...(game.farmWork?.queue||[])].filter(Boolean).map((job,index)=>[job.id,index+1]));
  const ids=new Set(f.plots.map(p=>p.id));for(const [id,b] of cells)if(!ids.has(id)){b.remove();cells.delete(id);}
  const cellView=accessible?farmCellView(renderer,frame):null;
  for(const p of f.plots){let b=cells.get(p.id);if(!b){b=root.createElement('button');b.className='scene-hit farm-cell';b.dataset.farmCell=p.id;b.setAttribute('data-world-movement','');layer.prepend(b);cells.set(p.id,b);}
   if(!accessible||p.mapId!==game.mapId){farmProperty(b,'hidden',true);continue;}placeFarmCell(b,p,renderer,frame,cellView);
   if(b.hidden)continue;
   // 按下选中、已排队与正在操作共用同样清晰的小圆点。
   const selected=gesture?.id===p.id||!!popup&&anchor===p.id;
   updateFarmCellState(b,p,{tool:game.vehicle?.active&&!p.watered?'water':game.farmWork?.tool,step:steps.get(p.id),selected});
  }
  farmAttribute(get('hoe'),'aria-pressed',!defending&&['hoe','seed'].includes(game.farmWork?.tool));farmAttribute(get('sickle'),'aria-pressed',!defending&&game.farmWork?.tool==='harvest');farmAttribute(get('water'),'aria-pressed',!defending&&game.farmWork?.tool==='water');
  if(get('tools').dataset.groupOpen){
   const family=get('tools').dataset.groupOpen;
   farmAttribute(get('basic-'+family),'aria-pressed',get(family).getAttribute('aria-pressed')==='true');
  }
  farmAttribute(get('seeder'),'aria-pressed',!defending&&game.farmWork?.tool==='seeder');
  farmAttribute(get('remove'),'aria-pressed',!defending&&game.farmWork?.tool==='remove');
  if(popup==='seed')renderSeedPicker(f);
  farmProperty(get('picker'),'hidden',popup!=='seed');farmProperty(get('harvest-pop'),'hidden',popup!=='harvest');farmProperty(get('harvest'),'disabled',!loaded||blocked);
  farmProperty(get('sickle'),'disabled',!loaded||blocked);
  farmProperty(get('seeder'),'disabled',!loaded||blocked);
  farmProperty(get('reaper'),'disabled',!loaded||blocked);
  const call=get('summon-ox'),returning=!!f.oxReturn,coming=!!game.oxArrival||returning;
  farmProperty(call,'disabled',blocked||coming);
  farmProperty(call.querySelector('span'),'textContent',returning?'回栏中':coming?'赶来中':'耕牛');
  farmAttribute(call,'aria-label',returning?'耕牛正在回栏':coming?'耕牛正在赶来':'耕牛，牵牛犁地或在田边召牛');
  for(const tool of ['hoe','water','remove'])farmProperty(get(tool),'disabled',blocked);
  const anchorPlot=f.plots.find(p=>p.id===anchor);if(popup&&anchorPlot)positionPopup(get(popup==='seed'?'picker':'harvest-pop'),anchorPlot);
  const parcelCount=f.delivery.parcels.length;
  const deliveryAvailable=canUseFarmDelivery(game)&&!root.querySelector('dialog[open]');
  if(!deliveryAvailable)farmProperty(get('delivery-hit'),'hidden',true);else placeSceneHit(get('delivery-hit'),FARM_DELIVERY,renderer,frame,{width:110,height:95,foot:8});
  if(mailOpen&&(!deliveryAvailable||worldDistance(game.player,FARM_DELIVERY)>140))mailOpen=false;farmProperty(get('mail'),'hidden',!mailOpen);
  const mailKey=mailOpen&&JSON.stringify([f.delivery.parcels,f.inventory]);
  if(mailOpen&&mailKey!==mailSignature){mailSignature=mailKey;get('mail').innerHTML='<header><b>种子快递站</b><button data-farm-mail-close aria-label="关闭快递">×</button></header><p>邻居只会寄来已解锁的种子</p>'+f.delivery.parcels.map(p=>`<article>${farmCropMarkup(p.crop)}<span><b>${FARM_SENDERS[p.sender]}寄来的礼物</b><small>${FARM_CROPS[p.crop].name}种子 ×${p.count}</small></span><button data-farm-parcel="${p.id}">领取</button></article>`).join('')+(parcelCount?'':'<p>暂时没有新包裹，先去种田或巡林吧。</p>')+(f.inventory.some(Boolean)?'<button data-farm-sell>出售背包及在场货舱作物</button>':'');}
  if(mailOpen)positionPopup(get('mail'),FARM_DELIVERY);
  const result=game.farmWork?.result;if(result&&result!==lastResult){lastResult=result;if(!result.needsLoadConfirmation&&(!result.ok||game.farmWork?.job?.action==='saw'))say(result.message);}
  for(const event of (game.farmSignals||[]).splice(0)){if(event.action==='harvest')flyCoins(event);if(event.message)say(event.message);onChange();}
  for(const f of flights)if(game.state==='paused'&&f.animation.playState==='running')f.animation.pause();else if(game.state==='playing'&&f.animation.playState==='paused')f.animation.play();
 }
 // 快速拖动空间插值，重复经过同一格只安排一次；行走在松手后开始。
 function visit(x,y){
  if(!gesture||!loaded)return;const b=root.elementFromPoint(x,y)?.closest('[data-farm-cell]');if(!b||!layer.contains(b))return;
  const id=Number(b.dataset.farmCell);if(gesture.seen.has(id))return;gesture.seen.add(id);const p=game.progress.farm.plots.find(p=>p.id===id);
  if(gesture.mode==='seed'&&p?.crop===null)act('plant',id);if(gesture?.mode==='harvest'&&p&&p.crop!==null&&farmGrowth(p)>=1)act('harvest',id);
  // 浇水拖动只收集未成熟作物，已湿润的田块仍可加入，空田和成熟田直接跳过。
  if(gesture?.mode==='water'&&p&&p.crop!==null&&farmGrowth(p)<1)act('water',id);
 }
 // 拖到田格时由右下角圆点确认选择，文字只跟随空白处的手指，避免盖住邻田标记。
 function ghost(x,y){const r=frame.getBoundingClientRect(),g=get('ghost');setHidden(g,!!root.elementFromPoint(x,y)?.closest('[data-farm-cell]'));g.style.left=x-r.left+12+'px';g.style.top=y-r.top-42+'px';g.textContent=gesture?.mode==='harvest'?'安排收割':gesture?.mode==='water'?'安排浇水':FARM_CROPS[selected].name+'种子';}
 scope.on(layer,'pointerdown',e=>{
  if(e.button!==0||gesture)return;const seed=e.target.closest('[data-farm-seed]'),cell=e.target.closest('[data-farm-cell]'),harvest=e.target.closest('#farm-harvest');
  // 普通田地由统一输入在短按松手后激活，拖动和长按只移动；主动选中农具才接管批量拖动。
  if(farmInteractionBlocked(game)||game.vehicle?.active||cell&&(combat||!opened||!['seed','harvest','water'].includes(game.farmWork?.tool)))return;
  if(!seed&&!cell&&!harvest||e.target.closest('button')?.disabled)return;e.preventDefault();e.stopPropagation();if(!enter())return;input.reset();let mode=null,id=cell?Number(cell.dataset.farmCell):null;
  if(seed){chooseSeed(Number(seed.dataset.farmSeed));if(game.farmWork?.tool==='seeder')return;mode='seed';}else if(harvest){mode='harvest';id=anchor;popup=null;setFarmTool(game,'harvest');}else if(cell&&game.farmWork?.tool==='harvest'){mode='harvest';}else if(cell&&game.farmWork?.tool==='seed'&&hasSelectedSeed()&&game.progress.farm.plots.find(p=>p.id===id)?.crop===null)mode='seed';
  // 成熟田仍可直接拖收；成长田仅在已选水壶时进入浇水拖动，普通触摸不自动换工具。
  if(cell&&loaded&&mode!=='harvest'&&game.farmWork?.tool!=='remove'){const p=game.progress.farm.plots.find(p=>p.id===id&&p.mapId===game.mapId);if(p&&p.crop!==null){anchor=id;if(farmGrowth(p)>=1){if(p.wild)say('发现野外田地，收获后点击空田还能继续种。');useTool('harvest');mode='harvest';}else if(game.farmWork?.tool==='water'){useTool('water');mode='water';}}}
  // 镰刀可从非成熟田开始拖选；原地短按则查看时间或选种，不能提前切换工具。
  const harvestPlot=cell&&game.progress.farm.plots.find(p=>p.id===id&&p.mapId===game.mapId),emptyHarvest=mode==='harvest'&&harvestPlot&&farmGrowth(harvestPlot)<1;
  gesture={pointer:e.pointerId,mode,id,emptyHarvest,seen:new Set(),x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};game.farmDragging=true;layer.setPointerCapture(e.pointerId);
  if(harvest){gesture.seen.add(id);act('harvest',id);}else if(mode&&cell)visit(e.clientX,e.clientY);if(mode)ghost(e.clientX,e.clientY);render();
 });
 scope.on(layer,'pointermove',e=>{if(gesture?.pointer!==e.pointerId)return;e.preventDefault();e.stopPropagation();const g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));g.moved ||= Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>7;if(g.mode){for(let i=1;i<=n&&gesture;i++)visit(g.x+dx*i/n,g.y+dy*i/n);if(gesture)ghost(e.clientX,e.clientY);}g.x=e.clientX;g.y=e.clientY;});
 // 系统取消触摸时清除尚未执行的安排，正常松手后开始逐格农活。
 function finish(e){if(gesture?.pointer!==e.pointerId)return;const g=gesture;gesture=null;game.farmDragging=false;setHidden(get('ghost'),true);if(e.type==='pointercancel'){if(game.farmWork){game.farmWork.queue=[];game.farmWork.job=null;}}else if(e.type==='pointerup'&&(!g.mode||g.emptyHarvest)&&!g.moved&&g.id!==null)tap(g.id);}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])scope.on(layer,type,finish);
 scope.on(layer,'click',e=>{
  // 关闭仅收起选种并归还焦点，保留农具、种子库存及已安排的农活。
  if(e.target.closest('[data-farm-picker-close]')){popup=null;input.reset();render();get(game.farmWork?.tool==='seeder'?'seeder':'hoe').focus({preventScroll:true});return;}
  const tab=e.target.closest('[data-farm-category]');if(tab&&FARM_CATEGORIES.some(c=>c.id===tab.dataset.farmCategory)){category=tab.dataset.farmCategory;seedPage=0;render();return;}
  // 翻页只切换可见种子，不接管播种手势或清除农活队列。
  const page=e.target.closest('[data-farm-page]');if(page&&!page.disabled){seedPage=Math.max(0,seedPage+Number(page.dataset.farmPage));render();return;}
  if(e.target.closest('[data-farm-shop]')){stop();onSeedShop?.();return;}
  const parcel=e.target.closest('[data-farm-parcel]');if(parcel){const r=claimFarmParcel(game,Number(parcel.dataset.farmParcel));if(!r.ok)say(r.message);render();return;}
  if(e.target.closest('[data-farm-mail-close]')){stop();return;}if(e.target.closest('[data-farm-sell]')){say(farmAction(game,'sell').message);render();return;}
  if(e.detail!==0)return;const cell=e.target.closest('[data-farm-cell]'),seed=e.target.closest('[data-farm-seed]');if(cell)tap(Number(cell.dataset.farmCell));else if(seed&&!seed.disabled)chooseSeed(Number(seed.dataset.farmSeed));else if(e.target.closest('#farm-harvest')&&loaded){popup=null;setFarmTool(game,'harvest');act('harvest',anchor);}
 });
 scope.on(menu,'click',()=>{if(farmInteractionBlocked(game)){say('战斗中暂不可种地');return;}opened&&!game.vehicle?.active?stop():open();});
 // 切换方向停止旧路线，下一次点格按新方向预览。
 scope.on(get('axis'),'click',()=>{
  const f=game.progress.farm,work=game.farmWork;if(!work||farmInteractionBlocked(game))return;
  liftOxPlow(game);work.queue=[];work.job=null;f.axis=f.axis==='column'?'row':'column';
  if(work.reaper)Object.assign(work.reaper,{axis:f.axis,held:false,auto:false,route:null,line:[],previewKey:null});
  if(work.ox){work.ox.turn=null;work.ox.yaw=(f.axis==='column'?Math.PI/2:0)+(work.ox.facing===-1?Math.PI:0);}
  game.livingPersist?.(game.progress);render();
 });
 scope.on(get('seeder'),'click',()=>{if(!farmToolReady(game.progress,'seeder')){say('到加工厂制作条播机，再运回仓库启用。');onIndustry();return;}useTool('seeder');say('选择按行或按列，再点田地选种子。');render();});
 // 主动战斗保留工具栏方便切回农具，退出则连同浮层一起收起。
 scope.on(get('combat'),'click',()=>{stop(false);opened=true;combat=true;say('已拿起武器，可以战斗');render();});
 scope.on(get('exit'),'click',()=>stop());
 scope.on(get('remove'),'click',()=>{useTool('remove');say('点击要移除的地块，再确认移除');render();});
 // 与其他建筑共用短按激活；拖动经过柜台不会误开快递，键盘点击保留。
 scope.on(get('delivery-hit'),'click',e=>{if(e.detail===0)openMail();});
 scope.on(root.defaultView,'blur',()=>{releaseGesture();input.reset();render();});scope.on(root,'visibilitychange',()=>{if(root.hidden){releaseGesture();input.reset();}});scope.on(root.defaultView,'keydown',e=>{if(e.key==='Escape'){game.farmDragging=false;stop();mailOpen=false;}});

 prepare();
 // 卸载释放动画与监听，停止未完成动作，不影响已保存的进度。
 function dispose(){groups.cancel();disposed=true;setFarmTool(game,null);game.farmVehicleReturn=null;game.farmDragging=false;scope.dispose();oxControls.dispose();placement.dispose();for(const f of flights){f.animation.cancel();f.node.remove();}flights.clear();harvestConfirm.dispose();removalPanel.dispose();layer.remove();menu.remove();}
 return {open,startPlow,close:stop,render,renderFrame:render,tapWorld,dispose};
}
// 绑定正式世界与实际动画节点，验收不创建替身场景。
export function inspectFarm(game,root){return {designCriterion:'world-farm-delivery',open:!root.getElementById('farm-tools')?.hidden,plots:game.progress.farm.plots.length,coins:game.progress.coins,seeds:game.progress.farm.seeds,parcels:game.progress.farm.delivery.parcels.length,queue:game.farmWork?.queue?.length||0,job:game.farmWork?.job?.action,flights:root.querySelectorAll('.farm-coin-flight').length,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,world:!!root.getElementById('farm-world-layer')&&!root.getElementById('farm-dialog'),art:farmArtBudget(),notice:root.getElementById('farm-notice')?.textContent};}
// 野外验收读取真实永久田块和同一图集预算，不创建专用预览田或替身绘制。
export function inspectWildFarm(game,root){const plots=game.progress.farm.plots.filter(p=>p.wild&&p.mapId===game.mapId);return {...inspectFarm(game,root),designCriterion:'wild-farmland',generatedMaps:game.progress.farm.wildMaps,wildPlots:plots.length,mature:plots.filter(p=>p.crop!==null&&farmGrowth(p)>=1).length,empty:plots.filter(p=>p.crop===null).length};}
// 分类验收读取正式面板、作物清单与共享图集，不另绘制验收用植物。
export function inspectSeedProgression(game,root){return {...inspectFarm(game,root),designCriterion:'seed-progression',categories:FARM_CATEGORIES.map(c=>({id:c.id,count:FARM_CROPS.filter(p=>p.category===c.id).length})),activeCategory:root.querySelector('[data-farm-category][aria-pressed=true]')?.dataset.farmCategory,seedButtons:root.querySelectorAll('#farm-picker [data-farm-seed]').length,rounds:game.progress.bosses};}
