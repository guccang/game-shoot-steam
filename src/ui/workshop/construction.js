import { i18nText } from "../../i18n/index.js";
// 工具施工会话把触控按住区移至工作台下方，动画仍发生在真实连接点。
import { drawWorkshopTool } from '../../rendering/workshop-tools.js';

// 创建单一工具会话，拖入就位与按住施工共享进度和原子提交入口。
export function createWorkshopConstruction({ root, scope, canStart, complete, reduced }) {
  const host=root.defaultView, $=id=>root.getElementById(id), button=$('ws-tool'), hold=$('ws-hold'), socket=$('ws-socket');
  const overlay=$('ws-construction'), context=overlay.getContext('2d');
  let selected=false, placed=false, pointer=null, capture=null, source=null, over=false, enabled=false;
  let actionLabel='升级';
  let automatic=false; // 武器与载具点选试装后自动就位，共用长按施工流程。
  let progress=0, active=false, frame=0, last=0, tool='wrench', position=null, finishing=false, suppressClickUntil=0;
  // 热点使用页面坐标，滚动与手机缩放不改变施工判定。
  function socketPoint() { const r=socket.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}; }
  // 下方按钮同步就位状态与进度，不另建画布或缓存。
  function status() {
    hold.disabled=!enabled||!placed||finishing||!canStart();
    hold.setAttribute('aria-pressed',String(active));
    hold.style.setProperty('--work-progress',`${progress*100}%`);
    if(automatic){$('ws-work-progress').textContent=progress?`${Math.round(progress*100)}% · ${active?'施工中':'已暂停，继续长按'}`:!enabled?`暂不可${actionLabel}`:!canStart()?'部件正在就位':'松手暂停 · 完成后扣费';return;}
    $('ws-work-progress').textContent=progress?`${Math.round(progress*100)}% · ${active?(tool==='welder'?i18nText("ui.workshop.construction.d46d49bbfa"):i18nText("ui.workshop.construction.2af836c056")):i18nText("ui.panels.environment.eb0c326b60")}`:placed?i18nText("ui.workshop.construction.166851be77"):i18nText("ui.workshop.construction.fe61bd3677");
  }
  // 工具头留在连接点，触控按钮上的手指不会把工具拉出工作台。
  function paint() {
    $('ws-bench').dataset.toolVisible=String(!!position||(placed&&(!automatic||active||progress>0)));
    if(automatic&&$('ws-bench').dataset.replacing==='true')return;
    // 已提交结果由完成会话持有，迟到的松键/失焦不能擦掉静态高亮。
    if($('ws-bench').dataset.completed==='true'&&!position&&!placed)return;
    context.resetTransform();context.clearRect(0,0,overlay.width,overlay.height);
    if(!position&&(!placed||(automatic&&!active&&!progress)))return;
    const r=overlay.getBoundingClientRect(), p=position||socketPoint();
    // 以屏幕像素保持工具大小，手机高密度内部画布不能把动作缩小。
    context.save();context.translate((p.x-r.left)*overlay.width/r.width,(p.y-r.top)*overlay.height/r.height);
    const flipX=p.x-r.left>r.width-70?-1:1,flipY=p.y-r.top>r.height-60?-1:1;
    context.scale(overlay.width/r.width*1.25*flipX,overlay.height/r.height*1.25*flipY);
    drawWorkshopTool(context,tool,0,0,progress,active,reduced());context.restore();
  }
  // 先清除指针身份，再释放捕获，避免失去捕获事件取消已就位工具。
  function release() {
    const id=pointer,node=capture;pointer=null;capture=null;source=null;
    if(id!==null&&node?.hasPointerCapture(id))node.releasePointerCapture(id);
  }
  // 达到时长后停表并交给原子提交，重复帧不能二次结算。
  function tick(now) {
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    if(active&&!root.hidden&&!root.querySelector('dialog[open]:not(#workshop-dialog)'))progress=Math.min(1,progress+dt/1.5);
    paint();status();
    if(progress>=1&&!finishing) {
      finishing=true;active=false;release();frame=0;suppressClickUntil=now+350;status();complete();return;
    }
    frame=host.requestAnimationFrame(tick);
  }
  // 选择不扣费；键盘选工具后直接就位，仍需按住空格完成。
  function select() {
    if(finishing||!canStart())return false;
    selected=true;button.setAttribute('aria-pressed','true');
    if(!frame)frame=host.requestAnimationFrame(tick);
    return true;
  }
  // 松开或失焦只暂停，已就位工具与完成进度保留。
  function pause() { host.cancelAnimationFrame(frame);frame=0;active=false;release();position=null;last=0;paint();status(); }
  // 取消清除进度与就位状态，异步帧不能作用于下一件装备。
  function cancel() {
    host.cancelAnimationFrame(frame);frame=0;last=0;active=false;release();
    selected=false;placed=false;over=false;progress=0;position=null;finishing=false;
    if(automatic){context.resetTransform();context.clearRect(0,0,overlay.width,overlay.height);}
    button.setAttribute('aria-pressed','false');paint();status();
  }
  // 鼠标在连接点可直接施工；触摸仅对准工具，松手就位后改用下方按钮。
  function move(event) {
    if(pointer!==event.pointerId)return;
    if(source==='hold') {
      const r=hold.getBoundingClientRect();
      active=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
    } else {
      position={x:event.clientX,y:event.clientY};const p=socketPoint();
      over=Math.hypot(position.x-p.x,position.y-p.y)<=30;
      active=event.pointerType!=='touch'&&over;
      if(active)placed=true;
    }
    paint();status();
  }
  // 每次只接受一根手指；下方按住区必须先有就位工具且报价有效。
  function begin(event,kind) {
    if(pointer!==null||event.button!==0||finishing||(automatic&&kind!=='hold'))return;
    if(kind==='hold'?(!placed||!canStart()):kind==='socket'?(!selected||!canStart()):!select())return;
    event.preventDefault();pointer=event.pointerId;source=kind;capture=event.currentTarget;
    capture.setPointerCapture(pointer);last=0;move(event);
    if(!frame)frame=host.requestAnimationFrame(tick);
  }
  // 有效触摸放下工具后才启用下方按钮；无效放置不自动吸附。
  function end(event) {
    if(pointer!==event.pointerId)return;
    if(source!=='hold'&&over)placed=true;
    pause();
  }
  for(const [node,kind] of [[button,'tool'],[socket,'socket'],[hold,'hold']]) {
    scope.on(node,'pointerdown',e=>begin(e,kind));scope.on(node,'pointermove',move);scope.on(node,'pointerup',end);
    scope.on(node,'pointercancel',e=>{if(pointer===e.pointerId)(automatic?pause:cancel)();});
    scope.on(node,'lostpointercapture',e=>{if(pointer===e.pointerId)(automatic?pause:cancel)();});
    scope.on(node,'contextmenu',e=>e.preventDefault());
  }
  scope.on(button,'click',e=>{if(e.detail===0&&select()){placed=true;paint();status();socket.focus({preventScroll:true});}});
  for(const node of [socket,hold]) {
    scope.on(node,'keydown',e=>{if(e.code==='Space'&&selected&&(!automatic||node===hold)){e.preventDefault();if(!e.repeat&&pointer===null&&placed&&!finishing&&canStart()){active=true;last=0;if(!frame)frame=host.requestAnimationFrame(tick);}}});
    scope.on(node,'keyup',e=>{if(e.code==='Space'){e.preventDefault();pause();}});
    scope.on(node,'blur',pause);
  }
  scope.on(host,'blur',pause);
  scope.on(root,'visibilitychange',()=>{if(root.hidden)pause();});
  // 报价失效停止施工，保留试装供查看；升级、改装与挂载共用长按确认区。
  function configure(spec,allowed,auto=false,label='升级') {
    automatic=auto;actionLabel=label;
    if(automatic){selected=placed=!!spec;button.setAttribute('aria-pressed',String(selected));}
    button.hidden=automatic;
    hold.textContent=automatic?`长按确认${actionLabel}`:i18nText("ui.workshop.markup.97425ee342");
    hold.setAttribute('aria-label',automatic?`长按确认${actionLabel}，松手暂停，完成后扣费`:i18nText("ui.workshop.markup.1ed8ec7117"));
    enabled=allowed;tool=spec?.tool||'wrench';$('ws-construction-tools').hidden=!spec;
    button.disabled=!enabled;button.setAttribute('aria-label',tool==='welder'?i18nText("ui.workshop.construction.4708646ce1"):i18nText("ui.workshop.construction.35219c1b89"));
    const c=$('ws-tool-icon').getContext('2d');c.clearRect(0,0,64,52);drawWorkshopTool(c,tool,22,16);
    if(!enabled)pause();status();
  }
  // 指引只读取实际工具阶段，不写入施工时间或代替完成提交。
  function guideState(){return {selected,placed,active,progress,tool,pointer:pointer!==null};}
  return {cancel,configure,selected:()=>selected||host.performance.now()<suppressClickUntil,select,guideState};
}
