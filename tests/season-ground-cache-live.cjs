// 正式主循环与设置点击验收：自动提前预制、就绪热切换、渐变中移动及昼夜同屏。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  recordVideo:{dir:'output/playwright/season-staging/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(90000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;
   p.restoration.repaired=['cottage','neighbors'];a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;
   Object.assign(a.game.player,{x:400,y:280,invincible:1e6});a.game.vehicle.active=true;
   Object.assign(a.environment,{livingPreview:true,forestSeason:a.renderer.ground.season,seasonAt:Date.now(),time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();
   window.phaseFrames=[];const draw=a.renderer.draw.bind(a.renderer);
   // 仅记录现有绘制调用，不另开循环或读回画布；事件状态与真实主循环同行。
   a.renderer.draw=(...args)=>{const start=performance.now();draw(...args);phaseFrames.push({at:start,ms:performance.now()-start,phase:a.renderer.ground.source?'fade':a.renderer.ground.staged?'prepare':'stable'});if(phaseFrames.length>6000)phaseFrames.shift();};
  });
  await page.waitForFunction(()=>a.renderer.ground.fullyReady(a.renderer.ground.current));
  const start=await page.evaluate(async()=>{
   const {nextSeason}=await import('/src/world/seasons.js'),{durationFor}=await import('/src/world/environment-timing.js');
   const g=a.renderer.ground;window.expectedSeason=nextSeason(g.season);window.baseMisses=g.syncMisses;window.baseSeason=g.season;window.baseTiles=[...g.tiles.values()];
   // 将正式环境计时推进到预热窗口，逻辑日期与战斗状态不变。
   a.environment.seasonAt=Date.now()-durationFor(a.environment,'season')+45000;
   return {season:g.season,target:expectedSeason,misses:g.syncMisses};
  });
  await page.waitForFunction(()=>a.renderer.ground.staged?.season===expectedSeason);
  await page.screenshot({path:'output/playwright/season-staging/preparing-day.png'});
  // 忙设备允许延后换季；明确返回延后结果，不能把强行完成预热作为性能验收条件。
  const completed=await page.waitForFunction(()=>a.renderer.ground.fullyReady(a.renderer.ground.staged)||!!a.renderer.ground.source,null,{timeout:45000}).then(()=>true,()=>false);
  if(!completed){
   const deferred=await page.evaluate(()=>{const g=a.renderer.ground;if(g.season!==baseSeason||g.syncMisses!==baseMisses||g.stats().seasonStaging.pools>2)throw Error('等待换季时破坏当前缓存');return g.stats();});
   if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'season-cache-staging',mode:'deferred-for-frame-budget',start,deferred,errors};
  }
  const ready=await page.evaluate(()=>{
   const g=a.renderer.ground;if(g.season!==baseSeason&&!g.source||baseTiles.some(t=>t.day.width===1))throw Error('自动预制提前切季或释放');return g.stats();
  });
  await page.locator('#settings-button').tap();await page.locator('#environment-button').tap();
  await page.locator(`[data-forest-season="${start.target}"]`).tap();await page.locator('#environment-ok').tap();await page.locator('#settings-done').tap();
  await page.waitForFunction(()=>a.renderer.ground.season===expectedSeason&&!!a.renderer.ground.source);
  await page.evaluate(()=>{const e=a.game.spawnEnemy(0,0,{x:a.game.player.x+100,y:a.game.player.y-65},{ambient:true});Object.assign(e,{hp:1e6,maxHp:1e6,damage:0,speed:0});});
  const from=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await page.keyboard.down('KeyD');await page.waitForTimeout(900);await page.keyboard.up('KeyD');
  const moved=await page.evaluate(from=>Math.hypot(a.game.player.x-from.x,a.game.player.y-from.y),from);if(moved<30)throw Error('渐变中移动未生效');
  await page.waitForFunction(()=>a.renderer.seasonVisual.progress>.25);
  await page.screenshot({path:'output/playwright/season-staging/fade-day.png'});
  await page.evaluate(()=>{a.environment.time='night';a.renderer.light.set(a.environment,performance.now());for(const key in a.renderer.light.started)a.renderer.light.started[key]=performance.now()-20000;a.refresh();});
  await page.waitForTimeout(300);await page.screenshot({path:'output/playwright/season-staging/fade-night.png'});
  await page.waitForFunction(()=>!a.renderer.ground.source);
  const after=await page.evaluate(()=>{
   const g=a.renderer.ground;if(g.syncMisses!==baseMisses)throw Error('预热后换季或移动发生同步补建：'+JSON.stringify(g.stats().missSamples));
   const samples=phaseFrames.filter(f=>f.phase!=='stable'),groups={};for(const phase of ['prepare','fade']){const ms=samples.filter(f=>f.phase===phase).map(f=>f.ms).sort((a,b)=>a-b);groups[phase]={frames:ms.length,p95:ms[Math.floor(ms.length*.95)],max:ms.at(-1)};}
   return {ground:g.stats(),groups,season:a.renderer.seasonVisual};
  });
  for(const size of [{width:320,height:568},{width:1280,height:900}]){await page.setViewportSize(size);await page.waitForTimeout(300);await page.screenshot({path:`output/playwright/season-staging/complete-${size.width}-night.png`});}
  if(errors.length)throw Error(errors.join('\n'));const video=await page.video().path();return {designCriterion:'season-cache-staging',start,ready,after,moved,video,errors};
 }catch(error){await page.screenshot({path:'output/playwright/season-staging/live-failure.png'});throw error;}
 finally{await context.close();}
}
