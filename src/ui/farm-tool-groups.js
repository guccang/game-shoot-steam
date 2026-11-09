// 同类农具在原工具栏内展开，短按直接使用、长按选择，镰刀仍可从按钮拖向田地。
const titles={hoe:'耕地农具',water:'浇灌农具',sickle:'收割农具'};

// 所有选项只创建一次，让菜单位图复用正式农具图标与画风缓存。
export function farmGroupMarkup(icon,ox,sprinkler){
 const groups={hoe:[['basic-hoe','锄头',icon('hoe')],['summon-ox','耕牛',ox]],water:[['basic-water','水壶',icon('water')],['sprinkler','洒水器',sprinkler]],sickle:[['basic-sickle','镰刀',icon('sickle')],['reaper','单行推镰',icon('reaper')]]};
 return '<small class="farm-group-tip">长按农具<br>选择同类</small>'+Object.entries(groups).map(([id,tools])=>
  `<section class="farm-tool-group" id="farm-group-${id}" hidden aria-labelledby="farm-title-${id}"><header><strong id="farm-title-${id}">${titles[id]}</strong><button type="button" data-farm-group-back aria-label="返回全部农具">返回</button></header><div>${tools.map(([key,name,art])=>`<button type="button" id="farm-${key}" data-farm-choice="${key}">${art}<span>${name}</span></button>`).join('')}</div></section>`
 ).join('');
}

// 同一指针只执行一种手势；拖动、取消或失焦及时撤销长按计时。
export function createFarmToolGroups({root,layer,toolbar,scope,onChoose,onOpen,onDrag}){
 let current=null,press=null,ignoreClick=false;
 const trigger=id=>root.getElementById('farm-'+id),panel=id=>root.getElementById('farm-group-'+id);
 for(const id of Object.keys(titles)){
  const b=trigger(id);b.dataset.farmGroup=id;b.setAttribute('aria-controls',panel(id).id);b.setAttribute('aria-expanded','false');b.setAttribute('aria-keyshortcuts','ArrowDown');
 }
 // 收起只恢复入口和焦点，保留原先选中的农具与排队农活。
 function close(focus=false){
  if(!current)return;
  const id=current;current=null;panel(id).hidden=true;delete toolbar.dataset.groupOpen;
  trigger(id).setAttribute('aria-expanded','false');if(focus)trigger(id).focus({preventScroll:true});
 }
 // 按住期间打开后保持展开，松开不会误选指尖下的新工具。
 function open(id){
  if(toolbar.hidden||trigger(id).disabled)return;
  close();current=id;onOpen();toolbar.dataset.groupOpen=id;panel(id).hidden=false;
  trigger(id).setAttribute('aria-expanded','true');panel(id).querySelector('[data-farm-choice]').focus({preventScroll:true});
 }
 // 状态失效时清掉定时器，不让之前的长按在下次打开工具栏时生效。
 function cancel(){
  if(press)clearTimeout(press.timer);press=null;
 }
 scope.on(layer,'pointerdown',e=>{
  const b=e.target.closest('[data-farm-group]');if(!b||b.disabled||e.button!==0)return;
  e.preventDefault();e.stopImmediatePropagation();if(press||!e.isPrimary)return;
  const p=press={id:b.dataset.farmGroup,pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false,opened:false};
  layer.setPointerCapture(e.pointerId);
  p.timer=setTimeout(()=>{p.opened=true;open(p.id);},450);
 });
 scope.on(layer,'pointermove',e=>{
  const p=press;if(!p||e.pointerId!==p.pointer||p.opened||p.moved||Math.hypot(e.clientX-p.x,e.clientY-p.y)<9)return;
  clearTimeout(p.timer);p.moved=true;
  if(p.id==='sickle'){cancel();onDrag(p);}
 });
 scope.on(layer,'pointerup',e=>{
  const p=press;if(!p||p.pointer!==e.pointerId)return;
  cancel();ignoreClick=true;e.stopImmediatePropagation();if(!p.opened&&!p.moved&&!trigger(p.id).disabled)onChoose(p.id);
 });
 for(const event of ['lostpointercapture','pointercancel'])scope.on(layer,event,e=>{if(press?.pointer===e.pointerId)cancel();});
 scope.on(toolbar,'contextmenu',e=>{const b=e.target.closest('[data-farm-group]');if(b){e.preventDefault();if(!press&&!current)open(b.dataset.farmGroup);}});
 scope.on(toolbar,'keydown',e=>{
  const b=e.target.closest('[data-farm-group]');
  if(b&&e.key==='ArrowDown'){e.preventDefault();open(b.dataset.farmGroup);}
  if(current&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}
 });
 scope.on(toolbar,'click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-farm-group-back'))close(true);
  else if(b.dataset.farmChoice){const key=b.dataset.farmChoice;close(true);onChoose(key.replace(/^basic-/,''),true);}
  else if(b.dataset.farmGroup&&e.detail===0)onChoose(b.dataset.farmGroup);
 });
 // 触屏松手后浏览器可能向手指下刚出现的“返回”或选项补发点击，只接受下一次独立点按。
 scope.on(root,'click',e=>{if(ignoreClick&&e.detail){ignoreClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 scope.on(root,'pointerdown',e=>{ignoreClick=false;if(current&&!toolbar.contains(e.target))close();},true);
 return {close,cancel};
}
