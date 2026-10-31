// 专项同屏复核：真实残骸、猫、怪物、维修中心和手机UI；默认端口4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.vehicleHulls[0]=1;p.vehicleIndex=0;p.coins=100000;g.progress=p;g.reset();g.state='playing';g.mainlineTalkDelay=999;g.spawnTimer=999;g.fireClock=999;Object.assign(g.player,{x:180,y:850});g.progress.campParking.owned=[];g.summonVehicle();(await import('/src/combat/vehicle.js')).absorbVehicleHit(g,999999);Object.assign(g.player,{x:70,y:850});g.enemies=[];Object.assign(g.spawnEnemy(0,0,{x:230,y:835}),{hp:1000000,maxHp:1000000,speed:0,damage:0});a.refresh();});
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(250);
   const data=await page.evaluate(async()=>({review:await(await import('/src/rendering/visual-review.js')).inspectVehicleRepair(a.game,document),night:a.renderer.light.sample(performance.now()).night,enemies:a.game.enemies.filter(e=>e.hp>0).length}));if(data.review.overflow||!data.enemies||time==='night'&&data.night<.9)throw Error(JSON.stringify(data));results.push({width,time,night:data.night});await page.screenshot({path:`output/playwright/vehicle-repair/same-screen-${width}-${time}.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
 }finally{await context.close();}
}
