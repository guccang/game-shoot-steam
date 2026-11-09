// 工厂页面以可拖放机器为中心，材料托盘和实际库存共用事务，关闭备料不会丢失物品。
import {createEventScope} from '../platform/events.js';
import {INDUSTRY_SITES,industryDoor,canUseIndustry,industryVehicles,industryMaterialSources,transferIndustry,updateIndustry} from '../core/industry/industry.js';
import {createIndustryDraft,stageIndustryMaterial,startIndustryDraft,industryMachineState} from '../core/industry/industry-draft.js';
import {INDUSTRY_GOODS,INDUSTRY_RECIPES} from '../config/industry.js';
import {drawIndustryMachineScene,INDUSTRY_SCENE} from '../rendering/industry-machine-scene.js';
import {resourceIcon} from '../rendering/resource-icons.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {vehicleModel} from '../config/vehicles.js';
import {productionAvailable} from '../core/farming/farm-production.js';
import {industryStore} from '../progression/industry/industry.js';

// 两厂共用一张限分辨率画布和应用帧循环，不创建独立动画定时器。
export function createIndustryPanel({game,root,renderer,dialogs,input,onChange,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog'),menu=root.createElement('button'),host=root.defaultView;
 let siteId='refinery',draft=createIndustryDraft('refine-copper'),selected=null,drag=null,signature='',nextRender=0,nextPaint=0,hover=false,lastPhase=0,observedJob=null;
 panel.id='industry-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','industry-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="industry-title">矿产提炼厂</h2></div><button class="ui-close" data-industry-close aria-label="关闭工厂">×</button></header><div class="ui-panel__body"><nav class="industry-tabs" aria-label="生产环节"><button class="ui-button" data-industry-site="refinery">提炼厂</button><button class="ui-button" data-industry-site="factory">加工厂</button></nav><div class="industry-recipe-bar"><span data-industry-product aria-hidden="true"></span><select data-industry-recipe aria-label="选择产物配方"></select><output data-industry-count-label aria-live="polite">×1</output></div><div class="industry-count"><input data-industry-count aria-label="本批生产份数" type="range" min="1" max="99" step="1" value="1"><div class="industry-presets" role="group" aria-label="快捷生产份数"><button type="button" data-industry-preset="1">1份</button><button type="button" data-industry-preset="5">5份</button><button type="button" data-industry-preset="10">10份</button><button type="button" data-industry-preset="max">最多</button></div></div><div class="industry-machine-stage"><canvas width="720" height="560" aria-label="工业机器生产场景"></canvas><button type="button" class="industry-hopper" data-industry-hopper aria-label="投料口，选中材料后点击投料"></button><button type="button" class="ui-button ui-button--primary industry-start" data-industry-start>启动</button><button type="button" class="industry-output" data-industry-output aria-label="产物自动存入小屋仓库"></button><span class="industry-drop-hint" aria-hidden="true">拖到这里</span></div><div class="industry-progress"><span data-industry-phase></span><span data-industry-duration></span></div><div class="industry-materials" aria-label="可拖入机器的材料"></div><div class="industry-finished" aria-label="等待入库的成品"></div><button class="ui-button" data-industry-route>前往工厂</button><details class="industry-help"><summary>配方 · 帮助</summary><p data-industry-formula></p><p data-industry-docked></p><p>拖材料或点选 → 投料 → 启动</p><p>取料：厂内 → 载具 → 仓库</p><p>启动才扣料 · 关页继续生产 · 成品自动存入小屋仓库</p><div data-industry-return-list></div></details></div><footer class="ui-panel__footer"><p id="industry-message" role="status"></p><button type="button" class="ui-button" data-industry-clear aria-label="清空备料">↺ 重置</button></footer>';
 root.body.append(panel);const find=s=>panel.querySelector(s),canvas=find('canvas'),ctx=canvas.getContext('2d'),hopper=find('[data-industry-hopper]'),start=find('[data-industry-start]'),tray=find('.industry-materials'),quantity=find('[data-industry-count]'),choice=find('select'),message=find('#industry-message');
 menu.type='button';menu.className='field-menu-item';menu.textContent='矿产制造';menu.setAttribute('aria-label','矿产提炼与加工');root.getElementById('field-menu-items').append(menu);
 // 所有热点使用正式场景的逻辑矩形，布局缩放后仍落在同一个料斗和出料台。
 for(const [key,node]of [['hopper',hopper],['start',start],['output',find('[data-industry-output]')]]){const r=INDUSTRY_SCENE[key];Object.assign(node.style,{left:r.x/3.6+'%',top:r.y/2.8+'%',width:r.w/3.6+'%',height:r.h/2.8+'%'});}
 // 草稿只存在页面会话内，不把材料提前转进隐藏仓位。
 function choose(recipe,count=1){cancelDrag();draft=createIndustryDraft(recipe,count);selected=null;quantity.value=count;signature='';observedJob=null;}
 // 菜单预览与实际管理员入口一致，旧批次直接恢复到正在生产的配方。
 function open(id=INDUSTRY_SITES[game.cottage?.kind]?game.cottage.kind:'refinery'){if(!productionAvailable(game)||!INDUSTRY_SITES[id])return;siteId=id;const job=game.progress.industry.sites[id].job;choose(job?.recipe||INDUSTRY_RECIPES.find(r=>r.site===id).id,job?.count||1);message.textContent='';dialogs.open(panel.id);render();}
 // 取消或捕获丢失只清理拖动图标，不触及游戏库存。
 function cancelDrag(){const d=drag;drag=null;if(d){d.ghost?.remove();if(d.node.hasPointerCapture?.(d.id))d.node.releasePointerCapture(d.id);}hover=false;panel.classList.remove('industry-is-dragging');}
 dialogs.register(panel.id,{focusId:'industry-title'});scope.on(panel,'close',()=>{if(!panel.open){cancelDrag();draft.loaded=[];selected=null;}});
 // 同一份提示同时供读屏和底部视觉反馈使用。
 function report(result,short){message.textContent=result.ok&&short?short:result.message;signature='';render();onChange();}
 // 投料不自动开机，玩家可先检查批次；保存失败时草稿保留以便重试。
 function stage(key){report(stageIndustryMaterial(game,siteId,draft,key),'✓ 已备料');selected=null;signature='';render();}
 // 完成回执区分已入库和真实满额暂存，不把等待中的产物报告为已经到账。
 function completionMessage(){return Object.values(game.progress.industry.sites[siteId].output).some(n=>n>0)?'✓ 生产完成 · 仓库已满，等待自动入库':'✓ 生产完成 · 已自动存入小屋仓库';}
 // 库存或配方变化才重建托盘，倒计时刷新不夺走焦点或打断拖拽。
 function content(){
  const site=game.progress.industry.sites[siteId],job=site.job,inside=canUseIndustry(game,siteId),cars=inside?industryVehicles(game,siteId):[];
  if(job&&(draft.recipe!==job.recipe||draft.count!==job.count))choose(job.recipe,job.count);
  const recipes=INDUSTRY_RECIPES.filter(r=>r.site===siteId),recipe=recipes.find(r=>r.id===draft.recipe)||recipes[0];
  if(choice.dataset.site!==siteId){choice.replaceChildren();for(const r of recipes){const o=root.createElement('option');o.value=r.id;o.textContent=INDUSTRY_GOODS[r.output].name;choice.append(o);}choice.dataset.site=siteId;}
  choice.value=recipe.id;choice.disabled=!!job;quantity.disabled=!!job;quantity.value=draft.count;quantity.setAttribute('aria-valuetext',draft.count+'份');find('[data-industry-count-label]').textContent='×'+draft.count;find('[data-industry-product]').innerHTML=resourceIcon(recipe.output);const maximum=Math.max(0,Math.min(99,...Object.entries(recipe.input).map(([key,n])=>Math.floor(industryMaterialSources(game,siteId,key).total/n))));for(const b of panel.querySelectorAll('[data-industry-preset]')){b.disabled=!!job||(b.dataset.industryPreset==='max'&&!maximum);b.setAttribute('aria-pressed',String(b.dataset.industryPreset!=='max'&&Number(b.dataset.industryPreset)===draft.count));if(b.dataset.industryPreset==='max'){b.textContent='最多 '+maximum;b.dataset.maximum=maximum;}}
  find('#industry-title').textContent=INDUSTRY_SITES[siteId].name;for(const b of panel.querySelectorAll('[data-industry-site]'))b.setAttribute('aria-pressed',String(b.dataset.industrySite===siteId));
  const valid=Number.isSafeInteger(draft.count)&&draft.count>0&&draft.count<=99,keys=Object.keys(recipe.input),complete=valid&&keys.every(k=>draft.loaded.includes(k));
  start.disabled=!inside||!!job||!complete;start.textContent=job?'运转中':complete?'启动':'待投料';
  find('[data-industry-clear]').disabled=!!job||!draft.loaded.length;hopper.disabled=!inside||!!job;hopper.setAttribute('aria-label',selected?'将'+INDUSTRY_GOODS[selected].name+'投入机器':'投料口，先选择一种材料');
  tray.replaceChildren();for(const key of keys){const stock=industryMaterialSources(game,siteId,key),n=recipe.input[key]*(valid?draft.count:1),b=root.createElement('button'),loaded=draft.loaded.includes(key)||!!job;b.type='button';b.className='industry-material';b.dataset.industryMaterial=key;b.disabled=!inside||!!job;b.setAttribute('aria-pressed',String(selected===key));b.dataset.loaded=String(loaded);b.setAttribute('aria-label',INDUSTRY_GOODS[key].name+'，本批需要'+n+'，可用'+stock.total+(loaded?'，已备料':''));b.innerHTML=resourceIcon(key)+'<span><b>'+INDUSTRY_GOODS[key].name+'</b><small>'+ (loaded?'✓ ×'+n:'需'+n+' · 库'+stock.total)+'</small></span><i aria-hidden="true">'+(loaded?'✓':'↗')+'</i>';tray.append(b);}
  const stock=site.output[recipe.output],collect=find('[data-industry-output]');collect.disabled=true;collect.textContent=stock?'待入库 ×'+stock:'自动入库';collect.setAttribute('aria-label',stock?'小屋仓库已满，产物等待自动入库':'产物自动存入小屋仓库');
  const finished=find('.industry-finished');finished.replaceChildren();for(const [key,n]of Object.entries(site.output)){if(!n||key===recipe.output)continue;const text=root.createElement('p');text.className='industry-finished-item';text.innerHTML=resourceIcon(key)+'<span>'+INDUSTRY_GOODS[key].name+' ×'+n+' · 等待自动入库</span>';finished.append(text);}
  const route=find('[data-industry-route]');route.hidden=inside;route.textContent=(game.cottage?'出门后前往':'前往')+INDUSTRY_SITES[siteId].name;
  const formula=find('[data-industry-formula]');formula.innerHTML=Object.entries(recipe.input).map(([k,n])=>'<span title="'+INDUSTRY_GOODS[k].name+'">'+resourceIcon(k)+'×'+n+'</span>').join(' + ')+' → <span>'+resourceIcon(recipe.output)+'×'+recipe.count+'</span>';formula.setAttribute('aria-label',Object.entries(recipe.input).map(([k,n])=>INDUSTRY_GOODS[k].name+'×'+n).join('加')+'生成'+INDUSTRY_GOODS[recipe.output].name+'×'+recipe.count);
  find('[data-industry-docked]').textContent=(cars.length?'原料停靠：'+cars.map(i=>vehicleModel(i).name).join('、'):inside?'仓库供料':'仅预览 · 请进厂')+' · 成品自动存入小屋仓库';
  const returns=find('[data-industry-return-list]');returns.replaceChildren();for(const [key,n]of Object.entries(site.input))if(n){const b=root.createElement('button');b.type='button';b.className='ui-button';b.dataset.industryReturn=key;b.textContent='取回厂内'+INDUSTRY_GOODS[key].name+' ×'+Math.min(n,valid?draft.count:1);b.disabled=!inside||!cars.length;returns.append(b);}
 }
 // 手势通过指针捕获跨越托盘与画布；浏览器取消、落在外面均不算投料。
 scope.on(tray,'pointerdown',e=>{const b=e.target.closest('[data-industry-material]');if(!b||b.disabled||e.button!==0||drag)return;drag={node:b,id:e.pointerId,key:b.dataset.industryMaterial,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture(e.pointerId);});
 scope.on(tray,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;e.preventDefault();d.moved=true;d.clientX=e.clientX;d.clientY=e.clientY;if(!d.ghost){d.ghost=root.createElement('div');d.ghost.className='industry-drag-ghost';d.ghost.innerHTML=resourceIcon(d.key);panel.append(d.ghost);panel.classList.add('industry-is-dragging');}d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';const r=hopper.getBoundingClientRect();hover=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});
 scope.on(tray,'pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag,drop=hover;cancelDrag();if(d.moved){e.preventDefault();if(drop)stage(d.key);else{message.textContent='已取消';signature='';}}else{selected=d.key;signature='';}render();});
 scope.on(tray,'pointercancel',()=>{cancelDrag();message.textContent='已取消';signature='';});scope.on(tray,'lostpointercapture',cancelDrag);
 // 键盘或辅助技术可点选材料，再点击同一个料斗完成投料。
 scope.on(tray,'click',e=>{if(e.detail!==0)return;const b=e.target.closest('[data-industry-material]');if(b&&!b.disabled){selected=b.dataset.industryMaterial;signature='';render();}});
 scope.on(panel,'keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();cancelDrag();}});
 scope.on(choice,'change',()=>{choose(choice.value,Number(quantity.value));message.textContent='请重新投料';render();});
 scope.on(quantity,'input',()=>{cancelDrag();draft=createIndustryDraft(draft.recipe,Number(quantity.value));selected=null;signature='';message.textContent='请重新投料';render();});
 scope.on(menu,'click',()=>open());
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-industry-close')){dialogs.close(panel.id);return;}
  if(b.dataset.industrySite){siteId=b.dataset.industrySite;const job=game.progress.industry.sites[siteId].job;choose(job?.recipe||INDUSTRY_RECIPES.find(r=>r.site===siteId).id,job?.count||1);message.textContent='';render();return;}
  if(b.dataset.industryPreset){choose(draft.recipe,b.dataset.industryPreset==='max'?Number(b.dataset.maximum):Number(b.dataset.industryPreset));message.textContent='请重新投料';render();return;}
  if(b.hasAttribute('data-industry-hopper')){if(selected)stage(selected);else message.textContent='拖入或点选材料';return;}
  if(b.hasAttribute('data-industry-clear')){choose(draft.recipe,draft.count);message.textContent='已重置';render();return;}
  if(b.hasAttribute('data-industry-start')){const result=startIndustryDraft(game,siteId,draft);if(result.ok){draft.loaded=[];selected=null;}report(result,'已开工');return;}
  if(b.hasAttribute('data-industry-route')){requestWorldNavigation(game,industryDoor(INDUSTRY_SITES[siteId]),INDUSTRY_SITES[siteId].name,{direct:true});dialogs.close(panel.id);onNotice('已标记厂门，进屋后即可使用机器。');return;}
  const recipe=INDUSTRY_RECIPES.find(r=>r.id===draft.recipe),key=b.dataset.industryCollect||(b.hasAttribute('data-industry-output')?recipe.output:null),raw=b.dataset.industryReturn;
  if(key||raw){const stock=game.progress.industry.sites[siteId][raw?'input':'output'][key||raw],n=Math.min(stock,Number(quantity.value));report(transferIndustry(game,siteId,key||raw,n,raw?'return':'collect'),'✓ 已装车');}
 });
 // 每帧只画一张小画布，库存DOM最多每250ms检查且不在拖动期间替换。
 function render(){menu.hidden=!productionAvailable(game);if(!panel.open||root.hidden)return;const now=Date.now(),frame=host.performance.now();
  // 游戏主循环也能完成批次，观察上次批次以便同步按钮与完成反馈。
  if(observedJob?.site===siteId&&!game.progress.industry.sites[siteId].job){draft.loaded=[];selected=null;message.textContent=completionMessage();signature='';observedJob=null;}
  if(!drag&&(!signature||frame>=nextRender)){nextRender=frame+250;const previous=game.progress.industry.sites[siteId].job;updateIndustry(game,now);if(previous&&!game.progress.industry.sites[siteId].job){draft.loaded=[];selected=null;message.textContent=completionMessage();}
   const recipe=INDUSTRY_RECIPES.find(r=>r.id===draft.recipe),key=JSON.stringify([siteId,game.cottage?.kind,draft,selected,game.progress.industry.sites[siteId],industryVehicles(game,siteId),Object.keys(recipe.input).map(k=>industryMaterialSources(game,siteId,k))]);if(key!==signature){signature=key;content();}}
  const site=game.progress.industry.sites[siteId],recipe=INDUSTRY_RECIPES.find(r=>r.id===draft.recipe),motion=industryMachineState(site.job,now);if(site.job){lastPhase=motion.phase;observedJob={site:siteId};}else observedJob=null;
  const [homeStock,homeKey]=industryStore(game.progress,recipe.output,'home');
  find('[data-industry-phase]').textContent=site.job?(motion.remaining?'正在'+recipe.name:'产物待保存'):site.output[recipe.output]?'仓库已满 · 等待入库':'小屋库存 '+INDUSTRY_GOODS[recipe.output].name+' ×'+(homeStock[homeKey]||0);
  find('[data-industry-duration]').textContent=site.job?Math.round(motion.ratio*100)+'% · '+motion.remaining+'秒':Number.isSafeInteger(draft.count)&&draft.count>0&&draft.count<=99?recipe.seconds*draft.count+'秒 / 批':'请输入1–99份';
  panel.dataset.machineState=site.job?'running':site.output[recipe.output]?'waiting':draft.loaded.length?'loaded':'idle';
  if(frame<nextPaint)return;nextPaint=frame+1000/30;
  // 短屏拖到内容边缘时自动滚动，料斗与托盘不必同时位于可视范围。
  if(drag?.moved){const body=find('.ui-panel__body'),r=body.getBoundingClientRect(),y=drag.clientY;if(y<r.top+30)body.scrollTop-=7;else if(y>r.bottom-30)body.scrollTop+=7;const h=hopper.getBoundingClientRect();hover=drag.clientX>=h.left&&drag.clientX<=h.right&&y>=h.top&&y<=h.bottom;}
  panel.dataset.sceneNight=String(renderer?.environment?.time==='night');ctx.setTransform(2,0,0,2,0,0);drawIndustryMachineScene(ctx,{site:siteId,recipe,count:draft.count,loaded:draft.loaded,job:site.job,motion,output:site.output[recipe.output],night:renderer?.environment?.time==='night',reduced:!!renderer?.reduced?.matches,hover,phase:lastPhase});
 }
 // 释放拖动捕获、节点和页面暂停归属，无遗留帧任务。
 function dispose(){cancelDrag();if(panel.open)dialogs.close(panel.id);scope.dispose();panel.remove();menu.remove();input.reset();}
 return {open,render,dispose};
}
