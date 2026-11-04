// 电梯与阳台施工共用原生触摸滚动选层，只展开附近楼层，不随建筑高度分配全部节点。
import {createEventScope} from '../platform/events.js';
const ROW=48,WINDOW=41;
// 三行窗口中央为目标层，边界留白保证首层和顶层也能对齐。
export function createHomeFloorPicker(host,{floors,current,value,onChange,id='home-lift-floor',label='目标楼层'}){
 const scope=createEventScope(),view=host.ownerDocument.defaultView;
 let selected=Math.max(0,Math.min(floors-1,value)),start=0,timer=0,frame=0,touching=false;
 host.classList.add('home-floor-picker');
 host.innerHTML='<p id="'+id+'-hint">上下滑动选择楼层，也可点选。中间高亮为目标层。</p><div class="home-floor-frame"><div id="'+id+'" class="home-floor-wheel" role="listbox" tabindex="0" aria-label="'+label+'" aria-describedby="'+id+'-hint"></div></div><div class="home-floor-shortcuts"><button type="button" class="ui-button" data-floor-first>首层</button><button type="button" class="ui-button" data-floor-last>顶层</button></div><p class="home-floor-selection" role="status" aria-live="polite"></p>';
 const wheel=host.querySelector('.home-floor-wheel'),status=host.querySelector('.home-floor-selection');
 // 同步选中语义及乘梯状态，不重新生成滚动中的列表。
 function publish(){
  for(const row of wheel.children)row.setAttribute('aria-selected',String(Number(row.dataset.floor)===selected));
  wheel.setAttribute('aria-activedescendant',id+'-option-'+selected);
  status.textContent=selected===current?'当前就在第 '+(selected+1)+' 楼':'目标：第 '+(selected+1)+' 楼';
  onChange(selected);
 }
 // 高楼只保留固定窗口，重新定位时不播放额外动画或重置游戏时钟。
 function populate(){
  start=Math.max(0,Math.min(floors-WINDOW,selected-20));
  wheel.innerHTML=Array.from({length:Math.min(WINDOW,floors)},(_,i)=>{const f=start+i;return '<div id="'+id+'-option-'+f+'" role="option" data-floor="'+f+'" aria-posinset="'+(f+1)+'" aria-setsize="'+floors+'">第 '+(f+1)+' 楼'+(f===current?' · 当前':'')+'</div>';}).join('');
  wheel.scrollTop=(selected-start)*ROW;publish();
 }
 // 点击、快捷操作和辅助键盘都选择整数层；实际操作仍由各自的确认按钮提交。
 function choose(floor){
  selected=Math.max(0,Math.min(floors-1,floor));
  if(selected<start||selected>=start+wheel.children.length)populate();
  else {wheel.scrollTop=(selected-start)*ROW;publish();}
 }
 // 原生滚动停稳后再接续附近楼层，避免拖动中替换节点造成跳动。
 function settle(){
  if(touching)return;
  const index=selected-start;
  if((index<4&&start>0)||(index>=wheel.children.length-4&&start+wheel.children.length<floors))populate();
 }
 scope.on(wheel,'scroll',()=>{
  selected=Math.min(floors-1,start+Math.round(wheel.scrollTop/ROW));publish();
  view.clearTimeout(timer);timer=view.setTimeout(settle,200);
 },{passive:true});
 scope.on(wheel,'touchstart',()=>{touching=true;},{passive:true});
 scope.on(wheel,'touchend',()=>{touching=false;view.clearTimeout(timer);timer=view.setTimeout(settle,200);},{passive:true});
 scope.on(wheel,'touchcancel',()=>{touching=false;view.clearTimeout(timer);timer=view.setTimeout(settle,200);},{passive:true});
 scope.on(wheel,'click',event=>{const row=event.target.closest('[data-floor]');if(row)choose(Number(row.dataset.floor));});
 scope.on(wheel,'keydown',event=>{
  const targets={ArrowDown:selected+1,ArrowUp:selected-1,PageDown:selected+10,PageUp:selected-10,Home:0,End:floors-1};
  if(!Object.hasOwn(targets,event.key))return;event.preventDefault();event.stopPropagation();choose(targets[event.key]);
 });
 scope.on(host.querySelector('[data-floor-first]'),'click',()=>choose(0));
 scope.on(host.querySelector('[data-floor-last]'),'click',()=>choose(floors-1));
 populate();
 // 弹窗在 onOpen 之后才显示，显示后校准首次滚动位置。
 frame=view.requestAnimationFrame(()=>{wheel.scrollTop=(selected-start)*ROW;});
 // 页面重建和应用销毁时清理定时器与监听，不保留旧窗口引用。
 function dispose(){scope.dispose();view.clearTimeout(timer);view.cancelAnimationFrame(frame);}
 return {get value(){return selected;},dispose};
}
