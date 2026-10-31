// 普通奖励三秒关闭；清缴结算从首轮起提供原地续战，不重复结算资源。
import {acceptNextClearing,canAcceptNextClearing} from '../core/living-world.js';
import {clearingSite} from '../progression/clearing-site.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import {prepareStoryRoute} from '../core/story-route.js';
import {updateMainline} from '../core/mainline-manager.js';
import {finishClearingNavigation} from '../core/clearing-completion.js';
import {createActionCountdown} from './action-countdown.js';
import {createEventScope} from '../platform/events.js';
import {resourceIcon,resourceName} from '../rendering/resource-icons.js';
import {storyEquipmentName} from '../progression/story-rewards.js';
import {drawVehicleIcon} from '../rendering/vehicle.js';
import {drawWorkshopEquipment} from '../rendering/workshop.js';
import {challengeProgressMarkup} from './challenge-feedback.js';
import {HEROES} from '../config/heroes.js';

// 奖励画像复用正式装备绘制器；高清透明画布按原比例显示，不使用通用占位图。
function equipmentPortrait(root,progress,item){
 const canvas=root.createElement('canvas');canvas.className='task-reward-portrait';canvas.width=220;canvas.height=170;
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label',storyEquipmentName(item)+'图片');
 const context=canvas.getContext('2d');
 if(item.kind==='vehicle')drawVehicleIcon(context,item.index);
 else drawWorkshopEquipment(context,progress,'weapons',item.index,0,true);
 return canvas;
}

// 复用正式资源图标与装备目录，纯文本名称不会被解释为HTML。
export function createTaskReward({game,root,host,dialogs,input,onChange,isActive,onContinue=()=>{}}){
 const scope=createEventScope(),node=root.createElement('dialog'),queue=[];
 node.id='task-reward-dialog';node.setAttribute('aria-labelledby','task-reward-heading');node.setAttribute('aria-describedby','task-reward-title');
 node.innerHTML='<div class="task-reward-panel"><header><h2 id="task-reward-heading">获得奖励</h2><button id="task-reward-close" aria-label="关闭奖励面板">×</button></header><p id="task-reward-title"></p><div id="task-reward-challenge" hidden></div><ul id="task-reward-items"></ul><p id="task-reward-return-camp" hidden>下一次清缴请回营地告示牌领取。</p></div>';
 node.querySelector('.task-reward-panel').insertAdjacentHTML('beforeend','<div id="task-reward-next" hidden><p>继续在本次清缴地点清群，或结束本次清缴。离开场地后可沿路点返回。</p><p id="task-reward-error" role="status"></p><button type="button" id="task-reward-end-clearing" class="ui-button">结束</button><button type="button" id="task-reward-next-clearing" class="ui-button ui-button--primary">继续下一轮</button></div>');
 const countdown=createActionCountdown(root,{id:'task-reward-countdown',action:'关闭奖励面板'});node.prepend(countdown.node);
 root.body.append(node);
 let timer=null,pending=null,remaining=3000,last=0,resume=false,disposed=false,clearingRound=0,showing=false;
 // 每份收据独立三秒；隐藏页面时不消耗玩家尚未看到的阅读时间。
 function tick(){if(timer===null)return;const now=host.performance.now();if(!root.hidden)remaining-=now-last;last=now;
  countdown.update(remaining,3000);
  if(remaining<=0)dialogs.close(node.id);
 }
 // 用户开始阅读便取消本次自动关闭；保留徽记占位，避免按下关闭按钮时布局移动。
 function keepOpen(){
  if(!node.open||timer===null)return;
  host.clearInterval(timer);timer=null;countdown.node.style.visibility='hidden';countdown.node.setAttribute('aria-hidden','true');
 }
 // 原生 close 事件异步派发；旧收据完成清理前不重开，否则会清掉新收据的轮次和暂停归属。
 function schedule(){if(disposed||pending!==null||showing||!queue.length)return;pending=host.setTimeout(()=>{pending=null;if(!isActive()){queue.length=0;return;}show(queue.shift());},0);}
 // 一行一种奖励，优先使用已到账数量，资源满额时不虚报配置数值。
 function show(receipt){
  showing=true;
  clearingRound=receipt.clearingRound||0;
  const clearingComplete=!!clearingRound,next=canAcceptNextClearing(game,clearingRound);
  node.querySelector('#task-reward-return-camp').hidden=!clearingComplete||next;
  node.querySelector('#task-reward-next').hidden=!next;node.querySelector('#task-reward-error').textContent='';node.querySelector('#task-reward-next-clearing').disabled=false;
  node.querySelector('#task-reward-title').textContent=receipt.title||'任务完成';const list=node.querySelector('#task-reward-items');list.replaceChildren();
  // 使用胜利发生时的快照，连续结算不会把后一场进度提前展示到前一份收据。
  const q=receipt.challenge,challenge=node.querySelector('#task-reward-challenge');
  node.querySelector('#task-reward-heading').textContent=q?(q.tier>q.previousTier?'营地等级提升':q.gained?'营地经验增加':'营地已满级'):'获得奖励';
  challenge.hidden=!q;challenge.innerHTML=q?`<p class="challenge-result-change">${q.tier>q.previousTier?`<span>${q.previousTier} 级 → ${q.tier} 级</span><span>购买${q.percent/10}折</span><small>营地经验 +${q.gained}</small>`:`营地经验 +${q.gained}`}</p>${challengeProgressMarkup(q,null,false)}`:'';
  for(const [key,amount] of Object.entries(receipt.reward||{}))if(amount>0&&resourceName(key)){
   const row=root.createElement('li');row.innerHTML=resourceIcon(key);const name=root.createElement('span'),count=root.createElement('strong');name.textContent=resourceName(key);count.textContent='+'+amount;row.append(name,count);list.append(row);
  }
  for(const item of receipt.equipment||[]){const row=root.createElement('li'),name=root.createElement('span'),count=root.createElement('strong');row.className='task-reward-equipment';name.textContent=storyEquipmentName(item);count.textContent='已获得';row.append(equipmentPortrait(root,game.progress,item),name,count);list.append(row);}
  // 经验使用已保存事务的收据，不因再次打开奖励页面重复发放。
  if(receipt.heroExperience){const e=receipt.heroExperience,row=root.createElement('li');row.textContent=`${HEROES[e.index].name}经验 +${e.gained}${e.level>e.previousLevel?` · 升至 ${e.level} 级`:''}`;list.append(row);}
  // 空收据只确认任务完成，不能据此判断资源已满，也不显示空奖励占位。
  if(!list.children.length&&!q)node.querySelector('#task-reward-heading').textContent='任务完成';
  resume=game.state==='playing'||[...root.querySelectorAll('dialog[open]')].some(d=>dialogs.willResume(d.id));
  remaining=3000;last=host.performance.now();countdown.node.style.visibility='';countdown.node.removeAttribute('aria-hidden');countdown.update(remaining,3000);
  input.reset();dialogs.open(node.id);timer=host.setInterval(tick,50);
  if(clearingComplete)keepOpen();
 }
 dialogs.register(node.id,{focusId:'task-reward-close'});
 // 监听内容区而非全屏遮罩；打开时的自动聚焦不算阅读，鼠标、触屏和键盘均可主动保留。
 const panel=node.querySelector('.task-reward-panel');
 scope.on(panel,'pointerdown',keepOpen,{capture:true});
 scope.on(panel,'click',keepOpen,{capture:true});
 scope.on(panel,'wheel',keepOpen,{passive:true});
 scope.on(panel,'keydown',event=>{if(event.key!=='Escape')keepOpen();},{capture:true});
 // 保存成功才关闭结算并更新导航，失败留在当前面板供玩家重试。
 scope.on(node.querySelector('#task-reward-next-clearing'),'click',()=>{
  const result=acceptNextClearing(game,clearingRound);
  if(!result.ok){node.querySelector('#task-reward-error').textContent=result.message;return;}
  // 主动续战明确要求恢复战斗，不沿用上一轮可能已被撤销的自动恢复资格。
  node.querySelector('#task-reward-next-clearing').disabled=true;resume=true;
  requestWorldNavigation(game,clearingSite(game.progress),'前往本次清缴地点');dialogs.close(node.id);onContinue(result.message);onChange();
 });
 scope.on(node.querySelector('#task-reward-close'),'click',()=>dialogs.close(node.id));
 // 结束沿用关闭结算的行为，保留已发奖励并恢复探索，不接取下一轮。
 scope.on(node.querySelector('#task-reward-end-clearing'),'click',()=>dialogs.close(node.id));
 // close 捕获阶段早于通用弹窗的恢复回调；首个游戏刷新前先交付当前目标的真实路线。
 scope.on(node,'close',()=>{
  // 结束、关闭和返回键共用收尾；主动续战已消费收据，不会在这里被改回主线。
  if(clearingRound&&isActive())finishClearingNavigation(game,clearingRound);
  if(clearingRound&&resume&&isActive()&&!root.querySelector('dialog[open]')){
   // 领主死亡与弹窗可能发生在同一逻辑帧，先结转已满足的交付阶段，避免准备旧的告示牌目标。
   if(game.state==='paused')updateMainline(game,0);
   prepareStoryRoute(game);
  }
 },{capture:true});
 scope.on(node,'close',()=>{
  if(timer!==null)host.clearInterval(timer);timer=null;
  // 领取按钮可能同时关闭下层面板，接续其暂停归属，避免奖励关闭后卡在暂停。
  if(resume&&isActive()&&game.state==='paused'&&!root.querySelector('dialog[open]'))game.pause();
  resume=false;clearingRound=0;showing=false;onChange();schedule();
 });
 // 连续任务排队，内容复制后不受随后切换任务或钱包变化影响。
 function enqueue(receipt){if(disposed||!isActive())return;queue.push(structuredClone(receipt));schedule();}
 // 返回首页、重置或卸载时取消待显示奖励，避免旧任务弹窗跨存档出现。
 function clear(){queue.length=0;resume=false;if(pending!==null)host.clearTimeout(pending);pending=null;if(timer!==null)host.clearInterval(timer);timer=null;if(node.open)dialogs.close(node.id);}
 function dispose(){disposed=true;clear();scope.dispose();node.remove();}
 return {enqueue,clear,dispose};
}
