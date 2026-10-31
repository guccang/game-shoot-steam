// 手机三层专项验收：正式游戏、隔离存档、触屏输入及昼夜同屏截图。
async page => {
 if(new URL(page.url()).port!=='4320')throw Error('仅限隔离端口4320');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const p=await context.newPage(),errors=[],samples=[];
 p.on('pageerror',e=>errors.push(e.message));
 // 读取实际布局，同时检查正文横溢出和触控高度。
 async function inspect(selector){
  const result=await p.evaluate(async selector=>(await import('/src/rendering/visual-review.js')).inspectMobileUiHierarchy(document,selector),selector);
  if(result.overflow||result.bodyOverflow||result.controls.some(c=>c.height<43.5))throw Error(JSON.stringify(result));
  samples.push(result);return result;
 }
 // 原生关闭回调异步恢复暂停归属，等待正式状态再继续触控。
 async function playing(){await p.waitForFunction(()=>a.game.state==='playing');}
 try{
  await p.goto('http://localhost:4320/');
  await p.waitForFunction(()=>!document.getElementById('start').disabled);
  await p.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();
   const progress=(await import('/src/progression/progress.js')).freshProgress();
   progress.arrival={version:2,phase:'complete',keys:true};
   progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];progress.mainline.phase='complete';
   progress.living.position={x:810,y:965};progress.vehicleHulls[0]=1;progress.vehicleIndex=0;
   localStorage.setItem('forest-patrol-v1',JSON.stringify(progress));
   localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await p.reload();await p.waitForFunction(()=>!document.getElementById('start').disabled);await p.locator('#start').tap();
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.refresh();});
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390]])for(const phase of ['day','night']){
   await p.setViewportSize({width,height});
   await p.evaluate(async phase=>{
    const g=a.game,e=a.environment;e.livingPreview=false;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(s=>s.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(e,g.progress.living.calendar);
    e.weather='sun';e.autoWeather=false;
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;
    Object.assign(g.player,{x:810,y:965});a.refresh();a.renderer.draw();if(e.time!==phase)throw Error('昼夜状态错误');
   },phase);
   // 功能页用正式控制器打开，再以真实触控验证关闭与操作。
   await p.locator('#story-button').evaluate(n=>n.click());
   await inspect('#story-dialog');
   await p.locator('#story-content').evaluate(n=>n.scrollTop=n.scrollHeight);
   for(const id of ['story-close','story-done']){
    const box=await p.locator('#'+id).boundingBox();if(!box||box.y<0||box.y+box.height>height)throw Error('任务簿固定操作不可达');
   }
   await p.locator('#story-content').evaluate(n=>n.scrollTop=0);
   await p.screenshot({path:`output/playwright/mobile-ui-hierarchy/story-${width}-${phase}.png`});
   await p.locator('#story-done').tap();await playing();
   await p.locator('#clearing-marker').evaluate(n=>n.click());await inspect('#clearing-dialog');
   await p.screenshot({path:`output/playwright/mobile-ui-hierarchy/clearing-${width}-${phase}.png`});
   await p.locator('#clearing-accept').tap();await playing();
   await p.locator('#clearing-marker').evaluate(n=>n.click());await p.locator('#clearing-stop').tap();await playing();
   if(await p.evaluate(()=>a.game.progress.living.patrolActive))throw Error('暂停清缴未生效');
   await p.evaluate(()=>{a.game.pause();a.refresh();});await inspect('#overlay .ui-pause');
   await p.screenshot({path:`output/playwright/mobile-ui-hierarchy/pause-${width}-${phase}.png`});
   await p.locator('#resume').tap();await playing();
  }
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>{a.game.pause();a.refresh();});
  if(await p.locator('#overlay button').count()!==1||await p.locator('#overlay-settings,#overlay-help').count())throw Error('暂停面板应仅保留继续巡游');
  await p.locator('#resume').tap();await playing();
  // 清缴现场同时检查角色、载具、怪物和波次HUD，余额使用最大值压力样本。
  for(const width of [320,390])for(const phase of ['day','night']){
   await p.setViewportSize({width,height:width===320?568:844});
   await p.evaluate(async phase=>{
    const g=a.game,e=a.environment;Object.assign(g.player,{x:810,y:965});
    (await import('/src/core/clearing-guide.js')).acceptClearingPost(g);
    Object.assign(g.player,(await import('/src/progression/clearing-site.js')).clearingSite(g.progress));
    g.vehicle.active=true;g.progress.coins=99999999;g.progress.wood=99999999;
    g.spawnEnemy(0,0,{x:g.player.x+110,y:g.player.y+45},{ambient:true});
    e.livingPreview=true;e.time=phase;e.weather='sun';document.querySelector('[data-weather=sun]').click();document.querySelector('[data-time='+phase+']').click();
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
   },phase);
   await inspect('.hud-resources');await inspect('.player-hud');await inspect('#quest');
   const clipped=await p.locator('.resource-pill b').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth||n.getBoundingClientRect().right>n.parentElement.getBoundingClientRect().right));
   if(clipped)throw Error('余额显示被裁剪');
   await p.screenshot({path:`output/playwright/mobile-ui-hierarchy/field-${width}-${phase}.png`});
  }
  for(const width of [320,390]){
   await p.setViewportSize({width,height:width===320?568:844});
   await p.evaluate(async()=>{
    const g=a.game,c=await import('/src/config/mainline.js'),m=await import('/src/core/mainline-manager.js');
    g.progress.living.patrolActive=false;g.enemies=[];g.vehicle.active=false;g.mainlineSpeech=null;
    g.progress.mainline=(await import('/src/progression/progress.js')).freshProgress().mainline;g.progress.taskTracking={kind:'mainline'};
    Object.assign(g.player,c.MAINLINE_SITES[m.mainlineTask(g).site]);g.mainlineTalkDelay=0;m.updateMainline(g,.1);a.refresh();
   });
   await p.locator('#mainline-speech').waitFor({state:'visible'});await inspect('#mainline-speech');
   await p.locator('#mainline-speech-pause').tap();if(await p.locator('#mainline-speech-pause').getAttribute('aria-pressed')!=='true')throw Error('暂停讲述失效');
   await p.screenshot({path:`output/playwright/mobile-ui-hierarchy/dialogue-${width}.png`});
   await p.locator('#mainline-speech-pause').tap();await p.locator('#mainline-speech-skip').tap();
   await p.locator('#map-dialog').waitFor({state:'visible'});await p.locator('#close-map').tap();await playing();
  }
  // 邻里对白与任务切页直接受本次结构调整影响，补查滚动和暂停归属。
  for(const width of [320,390]){
   await p.setViewportSize({width,height:width===320?568:844});
   await p.evaluate(async()=>{
    const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;
    const resident=(await import('/src/core/living-world.js')).residentFor(g,'cook');
    Object.assign(g.player,{x:resident.x,y:resident.y+40});a.refresh();a.living.open('cook');
   });
   await inspect('#living-dialog');await p.screenshot({path:`output/playwright/mobile-ui-hierarchy/neighbor-${width}.png`});
   await p.locator('#living-close').tap();await playing();
   await p.locator('#story-button').evaluate(n=>n.click());
   await p.locator('#story-content').evaluate(n=>n.scrollTop=100);
   const scroll=await p.locator('#story-content').evaluate(n=>n.scrollTop);await p.evaluate(()=>a.refresh());
   if(await p.locator('#story-content').evaluate(n=>n.scrollTop)!==scroll)throw Error('任务簿刷新跳动');
   await p.locator('[data-task-panel="mainline"]').first().tap();await p.locator('#mainline-dialog').waitFor({state:'visible'});
   if(await p.locator('#story-dialog').isVisible())throw Error('任务簿切页没有关闭');
   await p.locator('#mainline-close').tap();await playing();
  }
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:'mobile-ui-hierarchy',samples,errors};
 }finally{await context.close();}
}
