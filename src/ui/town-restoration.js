// 手机修复页复用公共底板；任务建筑靠近自动开工，自选建筑在门前点击确认。
import {TOWN_RESTORATIONS,facilityOpen} from '../config/town-restoration.js';
import {FIRST_HOUR_PLAN,forestRuleLines} from '../config/forest-rules.js';
import {restorationStatus,repairFacility} from '../core/town-restoration.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import {worldDistance} from '../world/coordinates.js';
import {createEventScope} from '../platform/events.js';
// 标准页面只读取核心状态，不直接增减资源或改解锁。
export function createRestorationPanel({game,root,dialogs,onChange,onUse}){
 const scope=createEventScope(),dialog=root.createElement('dialog');let selected=null,message='',useOnClose=null;
 dialog.id='restoration-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','restoration-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><small>营地 · 修复设施</small><h2 id="restoration-title">修复设施</h2></div><button class="ui-close" id="restoration-close" aria-label="关闭修复任务">×</button></header><div class="ui-panel__body"><section class="ui-section" id="restoration-summary"></section><p role="status" id="restoration-message"></p><details class="ui-section"><summary>为什么不能使用其他功能？</summary><p>备齐木头后，步行或骑乘到达当前任务的建筑修复区，会自动投料开工。其他建筑需要点击本页的修复按钮，也可提前修复。修好后永久开放，主线会跳过已完成的修复步骤。地图、背包和设置始终可用。</p><div id="restoration-roadmap"></div></details><details class="ui-section"><summary>野外怪物怎样出现？</summary><div id="restoration-rules"></div></details><details class="ui-section"><summary>第1、10、60分钟玩什么？</summary><div id="restoration-pacing"></div><p>这是体验节奏目标；可自行选择修复顺序，不需要挂机等解锁。</p></details></div><footer class="ui-panel__footer"><button class="ui-button" id="restoration-go">前往设施</button><button class="ui-button ui-button--primary" id="restoration-repair">修复</button></footer>';
 root.body.append(dialog);
 const get=id=>root.getElementById(id);
 // 目录为固定中文配置，动态数字和提示用 textContent 输出。
 function render(){
  const s=restorationStatus(game,selected);if(!s)return;
  const building=game.progress.restoration.build?.id===selected,f=s.facility;
  get('restoration-title').textContent=f.name;
  const summary=get('restoration-summary');summary.replaceChildren();
  for(const text of [s.ready?'已修复 · 功能已开放':building?'木料已投放 · 正在修复':s.taskRequired?'当前任务 · 靠近自动修复':s.active?'可提前修复 · 不受主线顺序限制':'完成初次入营引导后可自由修复',f.benefit,building?'已投入 '+f.wood+' 木头':'持有木头 '+game.progress.wood+' / '+f.wood,
   s.ready?'不需要重复修复，主线会自动跳过修复步骤。':building?'返回游戏继续施工，无需再次交付木料。':!s.enough?'还差 '+(f.wood-game.progress.wood)+' 木头；靠近树木使用锯子采集，补齐后返回这里。':s.taskRequired?'返回游戏并靠近修复区，自动投入 '+f.wood+' 木头开工。':'到达修复区后点击修复，投入 '+f.wood+' 木头并开始修复。']){
   const p=root.createElement('p');p.textContent=text;summary.append(p);
  }
  get('restoration-message').textContent=game.restorationError||message;
  get('restoration-repair').textContent=s.ready?'使用功能':building?'正在修复':!s.active?'完成入营引导后修复':!s.near?'请先到达修复区':!s.enough?'木头不足':'修复 · 消耗 '+f.wood+' 木头';
  get('restoration-repair').disabled=!s.ready&&!s.canRepair;
  get('restoration-go').textContent=s.ready||s.enough?'前往设施':'前往采木';
  get('restoration-roadmap').replaceChildren();
  for(const f of TOWN_RESTORATIONS){const p=root.createElement('p');p.textContent=(facilityOpen(game.progress,f.id)?'✓ 已修复 · ':'待修复 · ')+f.name+' · '+f.wood+' 木头';get('restoration-roadmap').append(p);}
 }
 // 已有面板转交暂停归属，返回后恢复原游玩状态。
 function open(id){
  if(!TOWN_RESTORATIONS.some(f=>f.id===id))return false;selected=id;message='';
  const previous=[...root.querySelectorAll('dialog[open]')].map(d=>d.id).filter(id=>id!==dialog.id);
  dialogs.open(dialog.id);for(const id of previous){dialogs.transferResume(id,dialog.id);dialogs.close(id);}render();return true;
 }
 dialogs.register(dialog.id,{onOpen:render,focusId:'restoration-close'});
 // 自选修复设施有独立导航，不把玩家送回尚未推进到此处的主线建筑。
 function navigate(){
  const s=restorationStatus(game,selected),f=s.facility;
  const tree=!s.ready&&!s.enough?game.trees.filter(t=>t.hp>0).sort((a,b)=>worldDistance(game.player,a)-worldDistance(game.player,b))[0]:null;
  requestWorldNavigation(game,tree?{x:tree.x,y:tree.y,mapId:'forest'}:{...f.site,repairArea:s.area},tree?'采集木头，修复'+f.name:'前往'+f.name,{direct:true});
 }
 scope.on(get('restoration-close'),'click',()=>dialogs.close(dialog.id));
 scope.on(get('restoration-go'),'click',()=>{
  navigate();
  dialogs.close(dialog.id);onChange();
 });
 scope.on(get('restoration-repair'),'click',()=>{
  const s=restorationStatus(game,selected);
  if(s.ready)useOnClose=selected;
  else {
   const result=repairFacility(game,selected);message=result.message;
   if(!result.ok){render();return;}
  }
  dialogs.close(dialog.id);onChange();
 });
 // 公共弹窗先恢复游玩，再处理进入房间等需要 playing 状态的动作。
 scope.on(dialog,'close',()=>{if(useOnClose){const id=useOnClose;useOnClose=null;onUse(id);}});

 for(const text of forestRuleLines()){const p=root.createElement('p');p.textContent=text;get('restoration-rules').append(p);}
 for(const row of FIRST_HOUR_PLAN){const p=root.createElement('p');p.textContent=row.time+'：'+row.text;get('restoration-pacing').append(p);}
 // 构建与销毁成对，重新开局不遗留旧页或点击监听。
 function dispose(){scope.dispose();dialog.remove();}
 return {open,render,dispose};
}
