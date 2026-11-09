import {setHidden} from './shared/dom-state.js';
import { i18nText } from "../i18n/index.js";
// 地面方格的可访问点击层与底部建造栏；只操作 UI 选择，不持有战斗资源副本。
import { GUARDIAN_PADS, GUARDIAN_ECONOMY, guardianPads } from '../config/guardian.js';
import { guardianMarkup, guardianPlacementMarkup, guardianStatusMarkup } from './panels/guardian.js';
import { drawExpeditionSlot } from '../rendering/expedition.js';
import { createEventScope } from '../platform/events.js';
import { createDragScroll } from '../platform/drag-scroll.js';

// 每个点击区跟随正式镜头投影，保留触摸拖动取消、键盘操作与应用卸载清理。
export function createGuardianBuild({game,renderer,root,onChange}) {
  const scope=createEventScope(), layer=root.createElement('div'), panel=root.createElement('section');
  const status=root.createElement('div');status.className='guardian-live-status';setHidden(status,true);
  root.getElementById('quest').append(status);
  const frame=root.getElementById('game-frame'), dock=root.createElement('section');
  dock.className='guardian-wave-controls';dock.setAttribute('aria-label',i18nText("ui.guardian-build.e31dcb7326"));
  const nextWave=root.createElement('button'), placement=root.createElement('div');
  nextWave.className='guardian-next-wave';nextWave.setAttribute('data-realm-next','');
  dock.append(nextWave,placement);
  layer.className='guardian-ground-controls'; panel.className='guardian-build-panel';
  panel.setAttribute('aria-label',i18nText("ui.guardian-build.c9d4ec0524"));
  const catalogDrag=createDragScroll({root,container:panel,selector:'.guardian-catalog'});
  let slot=-1, selection=null, message='', lastMarkup='', run=null, expanded=false, phase=null;
  const buttons=GUARDIAN_PADS.map((pad,index)=>{
    const b=root.createElement('button'); b.className='guardian-ground-pad';b.dataset.guardianSlot=index;
    b.setAttribute('aria-label',i18nText("ui.guardian-build.39518fdcb5", { p0: (index+1), p1: (pad.name) }));
    let pressed=null;
    scope.on(b,'pointerdown',e=>{if(e.button===0){pressed={x:e.clientX,y:e.clientY,time:e.timeStamp};b.setPointerCapture(e.pointerId);}});
    scope.on(b,'pointermove',e=>{if(pressed&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)>10)pressed=null;});
    scope.on(b,'pointercancel',()=>{pressed=null;});
    scope.on(b,'click',e=>{
      if(e.detail===0 || pressed&&e.timeStamp-pressed.time<550&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)<=10)choosePad(e.detail===0?index:nearestPad(e.clientX,e.clientY));
      pressed=null;
    });
    layer.append(b);return b;
  });
  root.getElementById('game').after(layer);frame.append(panel,dock);

  // 全景缩小时触摸区域可能重叠，按实际点击位置选最近格位；键盘仍使用聚焦按钮。
  function nearestPad(x,y) {
    let selected=0,distance=Infinity;
    buttons.forEach((button,index)=>{
      if(button.hidden)return;
      const box=button.getBoundingClientRect(),d=Math.hypot(x-box.x-box.width/2,y-box.y-box.height/2);
      if(d<distance){distance=d;selected=index;}
    });
    return selected;
  }

  // 暂停与任意弹窗期间关闭地面交互，避免点击穿透到战场事务。
  function available() {
    return game.realm?.mode==='guardian'&&['build','rest','combat'].includes(game.realm.phase)&&
      game.state!=='paused'&&!root.querySelector('dialog[open]');
  }
  // 空格位需要先选择装备；已有格位始终打开详情，不被当前放置选择覆盖。
  function choosePad(index) {
    if(!available())return;
    slot=index;message='';expanded=true;
    const r=game.realm;
    if(!r.defenses.some(t=>t.slot===slot)&&selection&&['build','rest','combat'].includes(r.phase)) {
      const [kind,rawIndex]=selection.split(':'), index=Number(rawIndex);
      if(game.guardianDefense('deploy',slot,kind,index,index)) {
        collapse();onChange();
      } else message=r.realmCoins<GUARDIAN_ECONOMY[kind]?i18nText("ui.guardian-build.bb408e09bd"):i18nText("ui.guardian-build.b15cd1a40f");
    }
    render();
  }
  // 原生选择完成后走正式挂载事务，再刷新属性；不与角色的挂载配置共享数组。
  scope.on(panel,'change',e=>{
    if(e.target.dataset.guardianModule===undefined||!available())return;
    const success=game.guardianDefense('mount',slot,'weapon',Number(e.target.dataset.guardianModule),Number(e.target.value));
    message=success?i18nText("ui.guardian-build.0af77f97e3"):i18nText("ui.guardian-build.c26418c929");
    e.target.blur();render();if(success)onChange();
  });
  // 两种面板共用操作分发，收起状态不复制交易与开波逻辑。
  function handleAction(e) {
    const b=e.target.closest('button');if(!b||!available())return;
    message='';
    if(b.hasAttribute('data-guardian-close'))collapse();
    if(b.dataset.guardianEquipment){
      const pending=slot;selection=b.dataset.guardianEquipment;slot=-1;
      if(pending>=0)choosePad(pending);else expanded=false;
    }
    if(b.hasAttribute('data-guardian-cancel'))collapse();
    if(b.dataset.guardianAction&&game.guardianDefense(b.dataset.guardianAction,slot,b.dataset.guardianStat)) {
      if(b.dataset.guardianAction==='remove')collapse();
      onChange();
    }
    if(b.hasAttribute('data-realm-next')&&game.continueRealm()){collapse();onChange();}
    render();
  }
  scope.on(panel,'click',handleAction);scope.on(dock,'click',handleAction);

  // 收起时一并清除选择，移动、点击空地或下次刷新都不会继续误放置。
  function collapse() { expanded=false;slot=-1;selection=null;message=''; }

  // 只在内容变化时重建目录；地面按钮保留 DOM 与焦点，位置逐帧更新。
  function render() {
    const active=game.realm?.mode==='guardian';frame.classList.toggle('guardian-active',active);
    setHidden(status,!active);
    if(active){
      setHidden(root.getElementById('quest'),false);
      const markup=guardianStatusMarkup(game);if(status.innerHTML!==markup)status.innerHTML=markup;
    }
    const shown=available()&&!!renderer.view;
    setHidden(layer,!shown);
    if(!active){run=null;setHidden(panel,setHidden(dock,true));catalogDrag.reset();return;}
    if(run!==game.realm){run=game.realm;collapse();lastMarkup='';phase=game.realm.phase;}
    if(phase!==game.realm.phase){phase=game.realm.phase;collapse();}
    setHidden(panel,!shown||!expanded);
    if(panel.hidden)catalogDrag.reset();
    const canStart=['build','rest'].includes(game.realm.phase);
    setHidden(dock,!shown||expanded||(!canStart&&!selection));
    setHidden(nextWave,!canStart);
    // 按钮节点保持不变，倒计时刷新不打断触摸按下或键盘焦点。
    nextWave.textContent=game.realm.phase==='build'?i18nText("ui.guardian-build.ff17673be2"):i18nText("ui.guardian-build.ef0eb3dc3e", { p0: (Math.ceil(game.realm.restRemaining)) });
    nextWave.setAttribute('aria-label',game.realm.phase==='build'?i18nText("ui.guardian-build.931b6f330a"):i18nText("ui.guardian-build.f69ff249e5", { p0: (Math.ceil(game.realm.restRemaining)) }));
    const placementMarkup=guardianPlacementMarkup(game,selection);
    if(placement.innerHTML!==placementMarkup)placement.innerHTML=placementMarkup;
    if(!shown)return;
    const markup=expanded?guardianMarkup(game,{slot,selection,message}):'';
    // 拖动或按住卡片期间保留节点，战斗数值刷新不能打断捕获或点选。
    if(markup!==lastMarkup&&!catalogDrag.interacting&&!panel.querySelector('select:focus')){
      const scroll=panel.querySelector('.guardian-catalog')?.scrollLeft||0;
      const focused=panel.contains(root.activeElement)?root.activeElement:null;
      const action=focused?.dataset.guardianAction;
      const stat=focused?.dataset.guardianStat, module=focused?.closest('.guardian-module')?.querySelector('select')?.dataset.guardianModule;
      const openModules=[...panel.querySelectorAll('.guardian-module')].map(d=>d.open);
      const panelScroll=panel.scrollTop;
      panel.innerHTML=markup;lastMarkup=markup;
      panel.querySelectorAll('.guardian-module').forEach((d,i)=>{if(openModules[i]!==undefined)d.open=openModules[i];});
      panel.scrollTop=panelScroll;
      const catalog=panel.querySelector('.guardian-catalog');
      if(catalog)catalog.scrollLeft=scroll;
      for(const canvas of panel.querySelectorAll('canvas'))drawExpeditionSlot(canvas.getContext('2d'),canvas.dataset.kind,Number(canvas.dataset.index));
      if(action){
        const container=module===undefined?panel:panel.querySelectorAll('.guardian-module')[Number(module)];
        container?.querySelector(`[data-guardian-action="${action}"]${stat?`[data-guardian-stat="${stat}"]`:''}:not(:disabled)`)?.focus({preventScroll:true});
      }
    }
    const v=renderer.view, pads=guardianPads(game.realm.arena);
    buttons.forEach((b,i)=>{
      const x=(pads[i].x-v.x)*v.zoom, y=(pads[i].y-v.y)*v.zoom;
      setHidden(b,x<0||x>v.width||y<0||y>v.height);
      b.style.left=`${(pads[i].x-v.x)*v.zoom}px`;
      b.style.top=`${(pads[i].y-v.y)*v.zoom}px`;
      b.style.width=b.style.height=`${Math.max(44,68*v.zoom)}px`;
      b.classList.toggle('ready',!!selection&&!game.realm.defenses.some(t=>t.slot===i));
      b.setAttribute('aria-pressed',String(slot===i));
    });
  }
  // 释放动态 DOM 和事件，重载应用不会产生重复建造栏。
  function dispose(){catalogDrag.dispose();scope.dispose();layer.remove();panel.remove();dock.remove();status.remove();frame.classList.remove('guardian-active');}
  return {render,dispose};
}
