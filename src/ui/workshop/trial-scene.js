// 全屏演练页复用统一弹窗；工坊草稿留在底层，返回时不丢选择。
import {createEventScope} from '../../platform/events.js';
import {catSprites} from '../../rendering/cat-animation.js';
import {drawWeaponTrialScene,releaseTrialSceneGraphics} from '../../rendering/weapon-trial-scene.js';
const activeScenes=new WeakMap();
// 工作台验收只读取当前正式会话，不创建另一套模拟器。
export function inspectWeaponTrialScene(dialog){const s=activeScenes.get(dialog);return s?{weapon:s.game.weapon().id,elapsed:s.elapsed,batch:s.batch,destroyed:s.destroyed,damage:s.damage,treesCut:s.treesCut,refillRemaining:s.refillRemaining,remnants:s.game.remnants.length,numbers:s.game.numbers.map(n=>n.text),player:{x:s.game.player.x,y:s.game.player.y},targets:s.game.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),spec:s.spec.name}:null;}
// 页面事件只绑定一次；临时会话在关闭、重来和销毁时释放。
export function createWeaponTrialPage({root,dialog:workshop,dialogs,createTrial,reduced,onHit=()=>{},load=()=>catSprites.load()}){
 const host=root.defaultView,scope=createEventScope(),dialog=root.createElement('dialog');
 dialog.id='weapon-trial-dialog';dialog.className='ui-panel ui-panel--fullscreen';dialog.setAttribute('aria-labelledby','weapon-trial-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><small id="weapon-trial-label">武器演练</small><h2 id="weapon-trial-title">准备场景</h2></div><button type="button" id="weapon-trial-close" class="ui-close" aria-label="退出演练，返回工坊">×</button></header><section class="weapon-trial-stage"><canvas id="weapon-trial-canvas" tabindex="0" aria-label="演练场，拖动移动，靠近目标自动攻击；也可使用方向键"></canvas><p id="weapon-trial-status" role="status">准备场景中…</p><span class="weapon-trial-move">拖动走位 · 自动攻击</span></section><div class="weapon-trial-info"><p id="weapon-trial-hint"></p><p id="weapon-trial-score"></p></div><footer class="ui-panel__footer"><button type="button" class="ui-button" id="weapon-trial-restart">重新布阵</button><button type="button" class="ui-button" id="weapon-trial-pause">暂停</button><button type="button" class="ui-button" id="weapon-trial-time" aria-pressed="false">切到夜晚</button></footer>';
 root.body.append(dialog);
 const get=id=>root.getElementById('weapon-trial-'+id),canvas=get('canvas'),keys=new Set();
 let token=0,frame=0,last=0,session=null,params=null,paused=false,night=false,stick=null,hitNotified=false,disposed=false;
 // 松手、失焦、暂停都清掉输入，避免关闭后残留方向。
 function resetInput(){keys.clear();stick=null;last=0;}
 // 只释放临时会话，正式存档从未交给演练修改。
 function release(){token++;host.cancelAnimationFrame(frame);frame=0;if(session)releaseTrialSceneGraphics(session);session=null;activeScenes.delete(dialog);resetInput();}
 // 关闭交还原工坊，保持原试装和暂停归属。
 function stop(){release();if(dialog.open)dialogs.close(dialog.id);}
 // 画布匹配实际场景尺寸并限制像素预算，横屏也不拉伸角色。
 function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(2,host.devicePixelRatio||1,Math.sqrt(1400000/Math.max(1,r.width*r.height)));const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
 // 真伤害、击破和弹匣反馈来自会话本身。
 function paint(){
  if(!session)return;resize();drawWeaponTrialScene(canvas.getContext('2d'),session,{night,reduced:reduced(),stick});
  const g=session.game,m=g.vehicle.active&&g.vehicle.module?g.vehicle.module.magazine:g.magazines[g.progress.weapon];
  get('score').textContent='击破 '+session.destroyed+' · 伤害 '+session.damage+(session.spec.trees?' · 采伐 '+session.treesCut:'')+(m&&Number.isFinite(m.ammo)?' · '+(m.remaining>0?'装填中':'余量 '+Math.ceil(m.ammo)):g.weapon().controller?' · 协同出击':'');
  if(g.weapon().attackKind==='defense'){const shield=g.magazines[g.progress.weapon];get('score').textContent=`已抵挡 ${session.absorbed} · 护盾 ${Math.ceil(shield.ammo)} / ${g.weapon().magazineSize}${shield.remaining>0?' · '+shield.remaining.toFixed(1)+'秒后恢复':''}`;}
  // 补靶提示放在场地下方，不能遮住正在播放的死亡动作与伤害数字。
  get('hint').textContent=session.refillRemaining>0?'本组靶标已击毁，稍后自动补靶。':session.spec.hint;
  get('status').hidden=!paused;get('status').textContent='已暂停';
 }
 // 后台不补跑，暂停时仍可观察昼夜，拖动与方向键驱动正式移动。
 function tick(now){
  if(!session||!dialog.open)return;
  try{
   const dt=last&&!root.hidden&&!paused?(now-last)/1000:0;last=now;
   const input=stick?{x:stick.dx/38,y:stick.dy/38}:{x:Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a')),y:Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'))};
   session.advance(dt,input);if(!hitNotified&&(session.destroyed>0||session.treesCut>0)){hitNotified=true;onHit({kind:params.kind,index:params.index});}
   paint();frame=host.requestAnimationFrame(tick);
  }catch(error){release();get('status').hidden=false;get('status').textContent='演练场运行失败，请重新布阵或返回工坊。';dialog.dataset.error=String(error.message);}
 }
 // 先显示独立场景，再加载素材；取消或新请求使旧结果失效。
 async function start(next){
  if(disposed)return;release();params=next;paused=false;hitNotified=false;get('pause').textContent='暂停';dialog.dataset.error='';
  get('title').textContent='准备演练场';get('label').textContent=next.label||'武器演练';get('hint').textContent='临时演练不消耗资源，不改变正式装备。';get('score').textContent='';
  get('status').hidden=false;get('status').textContent='准备场景中…';dialogs.open(dialog.id);
  const current=token;
  try{
   if(!await load())throw Error('角色图集加载失败');
   if(current!==token||!dialog.open||!workshop.open)return;
   session=createTrial(next.progress,next.kind,next.index,reduced(),{scene:true});activeScenes.set(dialog,session);
   get('title').textContent=session.spec.name;get('label').textContent=session.name+' · '+next.label;get('hint').textContent=session.spec.hint;
   get('status').hidden=true;canvas.focus({preventScroll:true});paint();frame=host.requestAnimationFrame(tick);
  }catch(error){if(current!==token||!dialog.open)return;release();get('status').hidden=false;get('status').textContent='场景加载失败，请重新布阵或返回工坊。';dialog.dataset.error=String(error.message);}
 }
 dialogs.register(dialog.id,{focusId:'weapon-trial-close'});
 scope.on(dialog,'close',()=>{release();if(workshop.open)root.getElementById('ws-test')?.focus({preventScroll:true});});
 scope.on(get('close'),'click',stop);
 scope.on(get('restart'),'click',()=>{if(params)start(params);});
 scope.on(get('pause'),'click',()=>{paused=!paused;get('pause').textContent=paused?'继续':'暂停';resetInput();paint();});
 scope.on(get('time'),'click',()=>{night=!night;get('time').textContent=night?'切到白天':'切到夜晚';get('time').setAttribute('aria-pressed',String(night));paint();});
 scope.on(canvas,'pointerdown',e=>{if(!session||paused||stick||e.button!==0)return;const r=canvas.getBoundingClientRect();stick={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top,dx:0,dy:0};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});e.preventDefault();});
 scope.on(canvas,'pointermove',e=>{if(stick?.id!==e.pointerId)return;const r=canvas.getBoundingClientRect(),dx=e.clientX-r.left-stick.x,dy=e.clientY-r.top-stick.y,k=Math.min(1,38/Math.max(1,Math.hypot(dx,dy)));stick.dx=dx*k;stick.dy=dy*k;e.preventDefault();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])scope.on(canvas,name,e=>{if(stick?.id===e.pointerId)stick=null;});
 const moveKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
 scope.on(dialog,'keydown',e=>{if(moveKeys.includes(e.key)){keys.add(e.key);e.preventDefault();e.stopPropagation();}});
 scope.on(dialog,'keyup',e=>{keys.delete(e.key);});
 scope.on(host,'blur',resetInput);scope.on(root,'visibilitychange',resetInput);
 // 销毁节点和事件，异步加载完成后也不能复活场景。
 function dispose(){disposed=true;stop();scope.dispose();dialog.remove();}
 return {start,stop,dispose,active:()=>session!==null};
}
