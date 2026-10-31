// 真实触屏收割与旧档刷新验收；位置仅用于到达生成田，作物和操作均由正式游戏提供。
async original=>{
 const dir='output/playwright/wild-farm-patches',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:dir+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival=null;p.farm.wildMaps=['forest','jiuzhaigou'];p.vehicleIndex=0;p.vehicleHulls[0]=1;p.campParking.owned=[];
   const g=a.game;g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=g.spawnTimer=999999;g.enemies=[];g.wildFarmRetryAt=0;
   (await import('/src/core/wild-farm.js')).ensureWildFarms(g);window.site={...g.progress.farm.plots[0]};window.plotId=site.id;
   Object.assign(g.player,(await import('/src/world/farm-land.js')).farmApproach(g,site),{vx:0,vy:0});if(!g.summonVehicle())throw Error('载具出场失败');
   await (await import('/src/rendering/farm.js')).loadFarmArt();a.renderer.camera.time=null;a.refresh();
   // 同步正式环境按钮、作物表现和夜色，保留游戏动作及镜头。
   window.light=async time=>{const e=a.environment;Object.assign(e,{livingPreview:true,autoTime:false,autoWeather:false,weather:'sun'});e.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.refresh();};await light('day');
  });
  const before=await page.evaluate(()=>({coins:a.game.progress.coins,count:a.game.progress.farm.plots.length,value:site.crop}));
  await page.waitForTimeout(300);await page.screenshot({path:dir+'/mounted-day.png'});
  const id=await page.evaluate(()=>plotId);await page.locator(`[data-farm-cell="${id}"]`).tap();
  await page.waitForFunction(()=>a.game.progress.farm.plots.find(p=>p.id===plotId)?.crop===null,null,{timeout:15000});
  const after=await page.evaluate(async()=>({coins:a.game.progress.coins,value:(await import('/src/config/farm.js')).FARM_CROPS[site.crop].value,driving:a.game.vehicle.active,dug:a.game.progress.farm.dug,planted:a.game.progress.farm.planted,unlocked:a.game.progress.farm.unlocked.some(Boolean)}));
  if(after.coins-before.coins!==after.value||after.driving||after.dug||after.planted||after.unlocked)throw Error('收获事务异常 '+JSON.stringify({before,after}));
  await page.waitForTimeout(900);await page.screenshot({path:dir+'/harvested.png'});await page.locator('#farm-exit').tap();await page.waitForFunction(()=>a.game.vehicle.active);
  // 保留一段真实载具移动和转向，再在不同视口检查同一块完整邻接田。
  for(const key of ['ArrowDown','ArrowRight','ArrowLeft','ArrowUp']){await page.keyboard.down(key);await page.waitForTimeout(180);await page.keyboard.up(key);}
  await page.evaluate(async()=>{const g=a.game;window.tick=g.update.bind(g);g.update=()=>{};const p=g.progress.farm.plots[4];window.second={...p};Object.assign(g.player,(await import('/src/world/farm-land.js')).farmApproach(g,p),{vx:0,vy:0});a.renderer.camera.time=null;});
  const views=[];
  for(const [width,height]of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(time=>light(time),time);await page.waitForTimeout(250);await page.screenshot({path:`${dir}/field-${width}-${time}.png`});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面横向溢出');views.push({width,time});
  }
  const saved=await page.evaluate(()=>structuredClone(a.game.progress.farm));
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  const restored=await page.evaluate(()=>a.game.progress.farm),facts=f=>f.plots.map(p=>[p.id,p.mapId,p.x,p.y,p.crop,p.plantedAt,p.readyAt,p.watered,p.wild]);
  if(restored.wildScatterVersion!==1||JSON.stringify(facts(restored))!==JSON.stringify(facts(saved)))throw Error('刷新重复生成或丢失作物');
  const art=await page.evaluate(async()=>(await import('/src/rendering/farm.js')).farmArtBudget());
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'wild-farmland',before,after,views,restored:restored.plots.length,scatterVersion:restored.wildScatterVersion,art,errors};
 }finally{await context.close();}
}
