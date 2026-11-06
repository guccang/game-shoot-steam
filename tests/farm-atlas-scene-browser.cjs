// 新旧作物混排，核对加载期转换后的手机昼夜、走位、触控与连续弯曲。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];
   const g=a.game;g.progress=p;g.reset();g.start();g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;
   const now=Date.now();p.farm.plots=Array.from({length:24},(_,id)=>({id,mapId:'forest',x:1537+id%4*62,y:464+Math.floor(id/4)*62,crop:[0,8,17,28,39,56][id%6],plantedAt:now-120000,readyAt:now-60000}));p.farm.nextId=24;
   Object.assign(g.player,{x:1630,y:740,invincible:9999});a.renderer.camera.time=null;await(await import('/src/rendering/farm.js')).loadFarmArt();a.farm.open();
  });
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1280,900,'day'],[1280,900,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,livingPreview:true,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
   await page.waitForTimeout(400);await page.screenshot({path:`output/farm-performance/mixed-${width}-${time}.png`});
   checks.push(await page.evaluate(()=>({phase:a.environment.time,light:a.renderer.light.sample(performance.now()).night,crops:a.renderer.visibleStats.crops,budget:a.renderer.diagnosticInfo().farmArt})));
  }
  await page.setViewportSize({width:390,height:844});
  // 正式输入走动，投影逐帧跟随；点击SVG作物验证仍可收割入库。
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');
  await page.evaluate(()=>{Object.assign(a.game.player,{x:1599,y:530});a.renderer.camera.time=null;a.farm.open();});await page.waitForTimeout(400);
  await page.locator('[data-farm-cell="1"]').tap();await page.waitForFunction(()=>a.game.progress.farm.plots[1].crop===null&&!a.game.farmWork.job);
  if(errors.length||checks.some(c=>c.crops===0))throw Error(JSON.stringify({errors,checks}));return {checks,svgHarvest:true,errors};
 }finally{await context.close();}
}
