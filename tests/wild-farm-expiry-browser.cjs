// 在正式游戏更新入口跨过一年，复核田块、点击层、农活队列与读档一致性。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,weather:'sun'});
   const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival=null;p.farm.wildMaps=['forest','jiuzhaigou'];
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=g.spawnTimer=999999;g.enemies=[];
   window.tick=g.update.bind(g);g.update=()=>{};
   (await import('/src/core/wild-farm.js')).ensureWildFarms(g);window.site={...g.progress.farm.plots[0]};window.keep={...g.progress.farm.plots[1]};window.initial=g.progress.farm.plots.length;
   Object.assign(g.player,(await import('/src/world/farm-land.js')).farmApproach(g,site),{vx:0,vy:0});
   await (await import('/src/rendering/farm.js')).loadFarmArt();a.renderer.camera.time=null;a.refresh();
   // 游戏历法跳转用于边界验证，环境预览只固定截图光照。
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,weather:'sun'});
  });
  const before=await page.evaluate(async()=>{
   const g=a.game,{advanceLivingCalendar}=await import('/src/world/living-calendar.js'),{wildFarmYear}=await import('/src/progression/wild-farm-age.js'),{farmAction}=await import('/src/core/farm.js');
   advanceLivingCalendar(g.progress.living.calendar,wildFarmYear()/2);
   Object.assign(g.player,{x:keep.x,y:keep.y});if(!farmAction(g,'harvest',{plot:keep.id}).ok)throw Error('收获失败');
   g.progress.farm.seeds[0]=1;if(!farmAction(g,'plant',{plot:keep.id,crop:0}).ok)throw Error('播种失败');
   advanceLivingCalendar(g.progress.living.calendar,wildFarmYear()/2-1);tick(.04);a.refresh();
   return {initial,count:g.progress.farm.plots.length};
  });
  if(before.count!==before.initial)throw Error('到期前提前清理 '+JSON.stringify(before));
  await page.screenshot({path:'output/playwright/wild-farm-expiry/before.png'});
  const after=await page.evaluate(async()=>{
   const g=a.game,{setFarmTool,queueFarmWork}=await import('/src/core/farm.js');setFarmTool(g,'hoe');
   if(!queueFarmWork(g,'harvest',{plot:site.id}).ok)throw Error('安排收割失败');g.farmWork.job=g.farmWork.queue.shift();
   (await import('/src/world/living-calendar.js')).advanceLivingCalendar(g.progress.living.calendar,1);tick(.04);a.refresh();
   return {ids:g.progress.farm.plots.map(p=>p.id),job:g.farmWork?.job,queue:g.farmWork?.queue};
  });
  const kept=await page.evaluate(()=>keep.id);
  if(JSON.stringify(after.ids)!==JSON.stringify([kept])||after.job||after.queue?.length)throw Error('清理或队列异常 '+JSON.stringify(after));
  await page.waitForFunction(()=>!document.querySelector(`[data-farm-cell="${site.id}"]`));
  for(const time of ['day','night']){
   await page.evaluate(async time=>{const e=a.environment;e.time=time;a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.refresh();},time);
   await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/wild-farm-expiry/after-${time}.png`});
  }
  const restored=await page.evaluate(async()=>{
   const {validateProgress}=await import('/src/progression/progress.js'),{ensureWildFarms}=await import('/src/core/wild-farm.js');
   a.game.progress=validateProgress(JSON.parse(JSON.stringify(a.game.progress)));ensureWildFarms(a.game);a.refresh();return a.game.progress.farm.plots.map(p=>p.id);
  });
  if(JSON.stringify(restored)!==JSON.stringify(after.ids)||errors.length)throw Error(JSON.stringify({restored,errors}));
  return {designCriterion:'wild-farmland',before,after,restored,errors};
 }finally{await context.close();}
}
