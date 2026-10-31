// 剩余页面专项：隔离存档与触屏模拟，只检查本轮页面布局和相关交互。
async page=>{
 if(new URL(page.url()).port!=='4322')throw Error('仅使用隔离端口4322');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const p=await context.newPage(),errors=[],samples=[],failures=[];p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push(e.stack));
 // 入口沿用正式点击事件；关闭使用真实触屏，读布局时不改业务状态。
 async function click(selector){await p.locator(selector).first().evaluate(n=>n.click());}
 async function inspect(id,label=id){
  await p.locator('#'+id).waitFor({state:'visible'});
  const r=await p.evaluate(async id=>{
   const node=document.getElementById(id),r=(await import('/src/rendering/visual-review.js')).inspectMobileUiPages(document,'#'+id);
   const body=node.querySelector(':scope > .ui-panel__body'),header=node.querySelector(':scope > .ui-panel__header');
   return {...r,small:r.controls.filter(b=>b.height<43.5||b.width<43.5),header:header?.getBoundingClientRect().toJSON(),bodyHeight:body?.clientHeight};
  },id);
  if(r.overflow||r.bodyOverflow||r.sectionOverlap||r.small.length||r.bodyHeight<48)failures.push({label,...r});
  samples.push({label,width:await p.evaluate(()=>innerWidth),...r});
  await p.screenshot({path:`output/playwright/mobile-ui-pages/${label}-${await p.evaluate(()=>innerWidth)}.png`});
 }
 try{
  await p.goto('http://localhost:4322/');await p.waitForFunction(()=>!document.getElementById('start').disabled);
  await p.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();const pr=(await import('/src/progression/progress.js')).freshProgress();
   pr.arrival={version:2,phase:'complete',keys:true};pr.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];pr.mainline.phase='complete';
   pr.living.position={x:810,y:965};pr.weapons=pr.weapons.map(()=>1);pr.vehicleHulls[0]=1;pr.vehicleIndex=0;pr.coins=90000;pr.wood=90000;
   localStorage.setItem('forest-patrol-v1',JSON.stringify(pr));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await p.reload();await p.waitForFunction(()=>!document.getElementById('start').disabled);await p.locator('#start').tap();
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.refresh();});
  for(const width of [320,390]){
   await p.setViewportSize({width,height:width===320?568:844});
   for(const [entry,id,close] of [
    ['#heroes-button','camp-dialog','camp-done'],
    ['#map-button','map-dialog','map-done'],['#environment-button','environment-dialog','environment-ok'],
    ['#chronicle-button','chronicle-dialog','chronicle-ok'],['#realm-button','realm-dialog','close-realm'],
    ['#help','help-dialog','help-ok'],['#equipment-goal','equipment-goal-dialog','close-goal'],
    ['#living-menu','living-dialog','living-close'],['#mainline-info','mainline-dialog','mainline-close'],
    ['[data-challenge-catalog]','challenge-catalog-dialog','challenge-catalog-close'],
    ['[data-resource-info]','resource-help-dialog','close-resource-help'],['#wave-help','wave-help-dialog','wave-help-close']
   ]){
    try{await click(entry);await inspect(id);await p.locator('#'+close).tap();await p.waitForFunction(()=>!document.querySelector('dialog[open]'));await p.waitForFunction(()=>a.game.state==='playing');}
    catch(e){failures.push({id,error:e.message});await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(n=>n.close());a.game.state='playing';a.refresh();});}
   }
   await p.evaluate(()=>a.workshop.open('weapons',0));await inspect('workshop-dialog');
   for(const mode of ['buy','modify','unlock']){await p.locator('#ws-function-'+mode).tap();await inspect('workshop-dialog','workshop-'+mode);}
   await click('#ws-mastery-help');await inspect('ws-mastery-dialog');await p.locator('#ws-mastery-help-done').tap();
   if(await p.evaluate(()=>a.game.state)!=='paused')throw Error('说明关闭提前恢复工坊');
   await p.locator('#ws-close').tap();await p.waitForFunction(()=>a.game.state==='playing');
   // 三种配置从相应的正式工坊进入，保持手持与车载上下文独立。
   for(const [index,entry,id,close] of [[12,'ws-funnel','funnel-dialog','funnel-done'],[15,'ws-mechanical','mechanical-dialog','mechanical-done'],[16,'ws-spider','spider-dialog','spider-done']]){
    await p.evaluate(index=>a.workshop.open('weapons',index),index);await click('#'+entry);await inspect(id);await p.locator('#'+close).tap();
    await p.locator('#ws-close').tap();await p.waitForFunction(()=>a.game.state==='playing');
   }
   // 森林的载具菜单已路由综合工坊；局内收藏页仅在秘境上下文中使用。
   await click('#vehicles-button');await inspect('workshop-dialog','vehicle-workshop');await p.locator('#ws-close').tap();await p.waitForFunction(()=>a.game.state==='playing');
   // 邻里目录与NPC复用同一个面板，切换后仍是底部浅标题。
   await p.evaluate(async()=>{const r=(await import('/src/core/living-world.js')).residentFor(a.game,'cook');Object.assign(a.game.player,{x:r.x,y:r.y+40});a.living.open('cook');});
   await inspect('living-dialog','neighbor');await p.locator('#living-close').tap();await p.waitForFunction(()=>a.game.state==='playing');
   await p.evaluate(()=>a.game.onEvent('task-reward',{title:'巡林任务奖励',reward:{coins:1,wood:1}}));await inspect('task-reward-dialog');await p.locator('#task-reward-close').tap();
  }
  // 工坊部件选择会重绘报价，短屏仍保留操作栏并允许撤回草稿。
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
   await p.setViewportSize({width,height});await p.evaluate(()=>a.workshop.open('weapons',0));await inspect('workshop-dialog','workshop-final');
   await click('#ws-components button:not(:disabled)');await inspect('workshop-dialog','workshop-quote');
   await click('#ws-reset');await p.locator('#ws-close').tap();await p.waitForFunction(()=>!document.querySelector('dialog[open]'));
  }
  // 动态玩法、嵌套说明与手机横持单独覆盖，包含昼夜实际场景。
  for(const [width,height] of [[320,568],[390,844],[844,390]])for(const phase of ['day','night']){
   await p.setViewportSize({width,height});
   await p.evaluate(async phase=>{
    const g=a.game,e=a.environment;g.mainlineSpeech=null;g.enemies=[];g.vehicle.active=false;
    e.livingPreview=false;g.livingPreview=false;e.weather='sun';e.autoWeather=false;
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(s=>s.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(e,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
   },phase);
   await click('#environment-button');await p.locator('#environment-ok').tap();await p.waitForFunction(()=>a.game.state==='playing');
   await click('#map-button');await inspect('map-dialog','map-'+phase);await p.locator('#map-done').tap();await p.waitForFunction(()=>a.game.state==='playing');
   await click('#realm-button');await click('#realm-help');await inspect('realm-help-dialog','realm-help-'+phase);await p.locator('#realm-help-done').tap();
   if(await p.evaluate(()=>a.game.state)!=='paused')throw Error('嵌套说明提前恢复玩法');
   await click('[data-enter-realm="race"]');await inspect('realm-dialog','race-'+phase);
   await p.locator('[data-realm-exit]').tap();await p.waitForFunction(()=>!a.game.realm);await p.locator('#resume').tap();await p.waitForFunction(()=>a.game.state==='playing');
   await click('#realm-button');await click('[data-enter-realm="fire"]');await inspect('fire-dialog','fire-'+phase);
   await p.locator('#fire-content [data-fire-dismiss]').tap();await p.waitForFunction(()=>!document.querySelector('dialog[open]'));await p.waitForFunction(()=>a.game.state==='playing');
   await p.evaluate(async()=>{const g=a.game;g.state='playing';Object.assign(g.player,(await import('/src/config/camp-defense.js')).CAMP_GATES[0]);a.refresh();});
   await click('[data-camp-gate]');await inspect('camp-defense-dialog','camp-defense-'+phase);await p.locator('#camp-close').tap();await p.waitForFunction(()=>a.game.state==='playing');
   await p.evaluate(async()=>{
    const g=a.game,c=(await import('/src/config/cottage.js')).COTTAGE;Object.assign(g.player,c.door);
    if(!(await import('/src/core/cottage.js')).enterCottage(g))throw Error('入屋失败');
    Object.assign(g.player,c.bed);g.cottage.restOpen=true;a.refresh();
   });
   await inspect('cottage-rest-dialog','rest-'+phase);await p.locator('#cottage-rest-cancel').tap();await p.locator('#cottage-exit').tap();
   await p.waitForFunction(()=>!a.game.cottage);
   await p.evaluate(()=>a.workshop.open('weapons',0));await inspect('workshop-dialog','workshop-'+phase);await p.locator('#ws-close').tap();await p.waitForFunction(()=>a.game.state==='playing');
  }
  // 秘境收藏页使用正式领取后的局内装备，防止用森林工坊代替该页面的验收。
  await p.setViewportSize({width:320,height:568});
  await click('#realm-button');await click('[data-enter-realm="tower"]');
  await p.evaluate(()=>{for(const kind of ['weapon','vehicle','turret'])a.game.rollRealmEquipment(kind);a.game.readyRealm();a.refresh();});
  await click('#vehicles-button');await inspect('vehicle-collection-dialog');if(!await p.locator('[data-vehicle-preview]').count())throw Error('载具目录为空');
  await p.locator('#vehicle-tab-turrets').tap();await inspect('vehicle-collection-dialog','vehicle-turrets');await p.locator('#vehicle-collection-done').tap();
  await p.evaluate(()=>{a.game.leaveRealm();a.refresh();});
  // 入职工坊、常规与大屏尺寸补检；原按钮取消不扣除材料。
  for(const [width,height] of [[320,568],[360,640],[430,932]]){
   await p.setViewportSize({width,height});
   await p.evaluate(async()=>{const g=a.game,w=(await import('/src/world/workshop.js')).WORKSHOP;g.progress.arrival={version:2,phase:'repair',keys:true,elapsed:0,wood:300};g.state='playing';g.vehicle.active=false;Object.assign(g.player,{x:w.x,y:w.y+25});a.refresh();});
   await click('.world-workshop-entry[data-workshop-kind="weapons"]');await inspect('arrival-workshop-dialog');
   await p.locator('#arrival-workshop-close').tap();await p.waitForFunction(()=>a.game.state==='playing');
   await p.evaluate(()=>{a.game.progress.arrival.phase='complete';a.refresh();});
   await click('#map-button');await inspect('map-dialog','map-extra');await p.locator('#map-done').tap();await p.waitForFunction(()=>a.game.state==='playing');
  }
  // 注册的全部旧页必须具有明确层级，重复组装不丢失原节点和监听。
  const coverage=await p.evaluate(async()=>{
   const {MOBILE_PANEL_CONTRACTS,prepareMobilePanel}=await import('/src/ui/mobile-panels.js');
   return Object.keys(MOBILE_PANEL_CONTRACTS).map(id=>{const n=document.getElementById(id),before=n?.querySelector('h2');prepareMobilePanel(n);return {id,kind:n.dataset.mobilePanel,sameHeading:before===n.querySelector('h2'),headers:n.querySelectorAll(':scope > .ui-panel__header').length};});
  });
  if(coverage.some(n=>!n.kind||!n.sameHeading||n.headers!==1))throw Error('页面结构重复或缺失');
  if(failures.length||errors.length)throw Error(JSON.stringify({failures,errors}));
  return {designCriterion:'mobile-ui-pages',count:samples.length,coverage,failures,errors};
 }catch(e){throw Error(JSON.stringify({message:e.message,last:samples.at(-1)?.label,width:await p.evaluate(()=>innerWidth),state:await p.evaluate(()=>({state:a.game.state,realm:a.game.realm?.phase,open:[...document.querySelectorAll('dialog[open]')].map(n=>n.id)})),failures,errors}));}finally{await context.close();}
}
