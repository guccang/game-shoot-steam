// 以正式可见面板判定当前战斗，涵盖普通波次、波间、待战与领主战。
export function combatHudVisible(root){
 return ['quest','boss-hud','camp-defense-hud'].some(id=>{const node=root.getElementById(id);return node&&!node.hidden&&node.offsetHeight>0;});
}
// 钱包归入手机后，生命卡与右侧设置共用安全区顶边，不保留原资源行空白。
export function taskCombatHudTop(root){
 const frame=root.getElementById('game-frame'),r=frame.getBoundingClientRect(),resources=root.querySelector('.hud-resources').getBoundingClientRect();
 const compact=frame.matches('.story-active,.task-combat-active'),health=root.querySelector('.bottom-info'),panel=health?.querySelector('.player-hud');
 const minimap=frame.classList.contains('has-local-minimap')&&root.getElementById('local-minimap')?.getBoundingClientRect();
 // 设置跟随圆形小地图右下角时，生命卡仍固定在地图顶边，不跟着设置下移。
 let top=minimap?minimap.top-r.top:resources.height?resources.top-r.top:12;
 // 帧率只占右侧设置按钮下方，不再无条件推低整条左侧生命卡。
 const fps=root.getElementById('fps-display'),fpsBox=fps?.getBoundingClientRect(),healthBox=health?.getBoundingClientRect();
 if(!compact&&fpsBox?.height&&healthBox&&fpsBox.left<healthBox.right&&fpsBox.right>healthBox.left)
  top=Math.max(top,fpsBox.bottom-r.top+4);
 // 任务按生命卡真实高度继续排列，隐藏生命卡的模式自动回收留白。
 if(health)setTop(health,top);
 const visible=panel?.getBoundingClientRect().height>0&&getComputedStyle(panel).visibility!=='hidden';
 // 高塔、守护和远征使用 CSS 安全区定位，以真实生命卡底边接续进度，兼容刘海与独立弹药高度。
 if(frame.matches('.tower-active,.guardian-active,.rogue-active'))return health.getBoundingClientRect().top-r.top+(visible?health.getBoundingClientRect().height+6:0);
 const next=top+(visible?health.getBoundingClientRect().height+6:0);
 // 战斗条横向内容较宽，排到地图和设置下方，避免右端详情入口被圆盘挡住。
 return minimap&&!frame.classList.contains('camp-defending')&&combatHudVisible(root)?Math.max(next,minimap.bottom-r.top+8,resources.bottom-r.top+8):next;
}
// 相同位置不重复写入样式；空值只在从任务堆叠切回 CSS 布局时移除。
function setTop(node, top){
 const value=top===null?'':top+'px';
 if(node.style.top===value)return;
 if(value)node.style.top=value;else node.style.removeProperty('top');
}
// 任务优先、战斗进度随后，按正式DOM尺寸排列，避免窄屏依靠固定高度相互遮挡。
export function layoutTaskCombatHud(root){
 const frame=root.getElementById('game-frame'),card=root.getElementById('mainline-hud'),quest=root.getElementById('quest'),boss=root.getElementById('boss-hud'),goal=root.getElementById('equipment-goal');
 const taskTop=taskCombatHudTop(root);
 const arrival=root.getElementById('ranger-arrival'),nodes=[quest,boss,goal];
 if(card.hidden&&frame.classList.contains('realm-active')){
  // 仅切换模式时释放任务偏移；必须先还原 quest 的 CSS 位置，才能测量秘境血条起点。
  // 高塔、守护与远征先放生命卡，再放局内进度；其他秘境继续使用各自原有布局。
  setTop(quest,frame.matches('.tower-active,.guardian-active,.rogue-active')?taskTop:null);setTop(goal,null);
  const height=quest.hidden?0:quest.offsetHeight,top=height?quest.offsetTop+height+8:null;
  if(arrival&&!arrival.hidden)setTop(arrival,taskTop);
  setTop(boss,top!==null&&!boss.hidden?top:null);
  return;
 }
 // 同一轮先测量全部高度，再统一写入，避免一张卡写位置后下一张卡强制布局。
 const heights=nodes.map(n=>n.hidden?0:n.offsetHeight),cardHeight=card.hidden?0:card.offsetHeight;
 const stack=!card.hidden||quest.classList.contains('wave-quest')||!quest.hidden||!boss.hidden;
 let top=taskTop;
 if(arrival&&!arrival.hidden)setTop(arrival,taskTop);
 if(!card.hidden){setTop(card,top);top+=cardHeight+8;}
 nodes.forEach((n,i)=>{const height=heights[i];setTop(n,stack&&height?top:null);if(stack&&height)top+=height+8;});
}

// 任务栏位置只依赖屏幕面板布局。镜头移动时复用位置，尺寸或显示模式变化才重新测量。
export function createTaskHudLayout(root) {
 const frame=root.getElementById('game-frame');
 const panels=[...frame.querySelectorAll('.hud-resources,.bottom-info,.player-hud,#local-minimap,#fps-display,#mainline-hud,#quest,#boss-hud,#equipment-goal,#ranger-arrival,#camp-defense-hud')];
 let dirty=true, previous='';
 // 视口变化由事件标记，平移时读取 innerWidth 会强制浏览器同步布局。
 const invalidate=()=>{dirty=true;};
 const observer=new root.defaultView.ResizeObserver(invalidate);
 root.defaultView.addEventListener('resize',invalidate);
 for(const node of [frame,...panels]) observer.observe(node);
 // 显隐或玩法切换时同步排版；字体加载和屏幕旋转引起的尺寸变化由观察器标记。
 function update() {
   const state=[frame.className,frame.dataset.page,frame.dataset.supply,!!root.querySelector('.npc-bottom-dialogue:not(dialog):not([hidden]),dialog.npc-bottom-dialogue[open]'),...panels.map(node=>node.hidden+' '+node.className)].join('|');
   if(!dirty&&previous===state)return;
   layoutTaskCombatHud(root);
   previous=state;dirty=false;
 }
 return {update,dispose(){observer.disconnect();root.defaultView.removeEventListener('resize',invalidate);}};
}
