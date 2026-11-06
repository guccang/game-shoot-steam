// 手机邻居任务聚焦验收：真实提交、奖励、导航及暂停恢复；使用隔离存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   // 批量切换测试存档时暂停自动到点弹窗，避免重置事件提前打开上一份任务。
   window.renderNeighbors=a.living.renderFrame.bind(a.living);a.living.renderFrame=()=>{};});
  // 准备当前任务节点，其余委托同时存在，交互和奖励仍走生产事务。
  async function scene(id,stage,time='day'){
   await page.evaluate(()=>{a.game.livingPreview=true;a.game.state='paused';});
   if(await page.locator('#task-reward-dialog').isVisible())await page.locator('#task-reward-close').tap();
   if(await page.locator('#living-dialog').isVisible())await page.locator('#living-close').tap();
   await page.waitForTimeout(40);
   await page.evaluate(async({id,stage,time})=>{
    const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),{LIVING_REQUESTS,LIVING_PHASES}=await import('/src/config/living-world.js'),core=await import('/src/core/living-world.js');
    const p=freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
    p.living.requests[id].stage=stage;p.taskTracking={kind:'living',id};
    if(id==='neighbors-market')for(const key of ['neighbors-lunch','neighbors-night'])Object.assign(p.living.requests[key],{stage:99,completed:true});
    else p.living.requests[id==='neighbors-lunch'?'neighbors-night':'neighbors-lunch'].stage=0;
    p.living.calendar.elapsed=LIVING_PHASES.find(v=>v.id===time).start+1000;
    const g=a.game;g.progress=validateProgress(p);g.reset();g.state='playing';g.update=()=>{};g.enemies=[];g.mainlineSpeech=null;g.livingPreview=false;
    Object.assign(a.environment,{livingPreview:false,autoTime:false,autoWeather:false,weather:'sun'});(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    const spec=LIVING_REQUESTS.find(q=>q.id===id),target=core.livingRequestTarget(g,spec);Object.assign(g.player,{x:target.x,y:target.y});a.renderer.camera.time=null;a.refresh();a.living.open(core.residentFor(g,target.step.resident||spec.host).id);
   },{id,stage,time});
  }
  // 正式验收入口测量可见目标、行动数和手机边界，长内容只滚正文。
  async function inspect(label,id,completed=false){
   const r=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectNeighborTaskFocus(document);return {...r,modal:document.querySelector('#living-dialog').matches(':modal'),state:a.game.state,width:innerWidth,height:innerHeight};});
   if(!r.visible||!r.modal||r.state!=='paused'||r.tasks.length!==1||r.tasks[0]!==id||r.chatter||r.duplicateConfirm||r.overflow||r.box.left<0||r.box.top<0||r.box.right>r.width+1||r.box.bottom>r.height+1||r.actions.length!==(completed?0:1)||r.actions.some(b=>b.height<44)||(!completed&&!r.goal))throw Error(label+JSON.stringify(r));samples.push({label,...r});
  }
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await scene('neighbors-lunch',2,time);await inspect(`${width}-${time}`,'neighbors-lunch');
   if((await page.locator('#living-content').innerText()).includes('陶作'))throw Error('午餐出现无关陶作');
   await page.screenshot({path:`output/playwright/neighbor-task-focus/${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  for(const [id,count] of [['neighbors-lunch',4],['neighbors-night',6],['neighbors-market',5]])for(let stage=0;stage<count;stage++){
   await scene(id,stage);await inspect(`${id}-${stage}`,id);
   if(id==='neighbors-night'&&stage===4)await page.evaluate(()=>{a.game.progress.living.requests['neighbors-night'].battleKills=5;});
   await page.locator(`[data-living-do="${id}"]`).tap();
   const q=await page.evaluate(id=>a.game.progress.living.requests[id],id);if(q.stage!==stage+1)throw Error('单次点击未正确推进 '+id+stage+JSON.stringify(q));
   if(await page.locator('#task-reward-dialog').isVisible())await page.locator('#task-reward-close').tap();
   await inspect(`提交-${id}-${stage}`,id,q.completed);
   if(!await page.locator('.living-notice').isVisible()||await page.locator('#living-page details').count())throw Error('回应与奖励必须直接可读');
   if(id==='neighbors-lunch'&&stage===2){await page.screenshot({path:'output/playwright/neighbor-task-focus/next-step.png'});}
  }
  await scene('neighbors-lunch',2);await page.evaluate(()=>a.game.livingPersist=()=>false);await page.locator('[data-living-do="neighbors-lunch"]').tap();
  if(await page.evaluate(()=>a.game.progress.living.requests['neighbors-lunch'].stage)!==2||!await page.locator('.living-notice').isVisible())throw Error('失败丢失进度或提示');await page.evaluate(()=>a.game.livingPersist=()=>true);
  await scene('neighbors-lunch',2);await page.locator('[data-living-do="neighbors-lunch"]').tap();await page.locator('[data-living-track="neighbors-lunch"]').tap();await page.waitForFunction(()=>a.game.state==='playing');
  if(await page.evaluate(()=>a.game.progress.taskTracking.id)!=='neighbors-lunch')throw Error('导航切换了任务');
  await page.evaluate(()=>a.living.open('bat'));if(await page.locator('[data-living-request]').count()||!await page.locator('.living-conversation').isVisible())throw Error('其他居民主动插入无关任务');await page.locator('#living-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(()=>a.living.open());await page.locator('[data-living-tab="board"]').tap();if(await page.locator('[data-living-item]').count()<2)throw Error('目录丢失其他任务');await page.locator('#living-close').tap();
  await page.evaluate(()=>a.living.open('mint'));if(!await page.locator('.living-conversation').isVisible()||await page.locator('#living-dialog').evaluate(n=>n.matches(':modal')))throw Error('闲聊未保留');await page.locator('#living-close').tap();
  // 恢复真实自动到点入口，检查其暂停归属与关闭后的单次展示。
  await scene('neighbors-lunch',2);await page.locator('#living-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(()=>{a.living.renderFrame=window.renderNeighbors;a.living.renderFrame();});await inspect('自动到点交接','neighbors-lunch');
  await page.locator('#living-close').tap();await page.waitForFunction(()=>a.game.state==='playing');await page.waitForTimeout(120);if(await page.locator('#living-dialog').isVisible())throw Error('关闭后反复自动打开');
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'neighbor-task-focus',samples,steps:15,saveFailure:true,navigation:true,errors};
 }finally{await context.close();}
}
