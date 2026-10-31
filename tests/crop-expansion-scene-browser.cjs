// 新作物与猫猫、怪物、载具同屏的昼夜视觉验收；使用正式世界绘制器。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.mainline.currentId=null;p.farm.wildMaps=['forest'];p.farm.lessonRewarded=true;p.vehicleHulls[0]=1;p.vehicleIndex=0;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.update=()=>{};g.mainlineSpeech=null;g.arrivalScene=null;g.enemies=[];g.boss=null;
   Object.assign(g.player,{x:921,y:2855});g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicles[0]=g.vehicle;g.vehicle.active=true;
   for(const [dx,dy] of [[-130,100],[130,140]]){const e=g.spawnEnemy(0,0,{x:g.player.x+dx,y:g.player.y+dy});Object.assign(e,{hp:500,maxHp:500,speed:0,damage:0});}
   const now=Date.now();g.progress.farm.plots=[17,18,21,27,31,32,37,41,46,47,52,55].map((crop,id)=>({id,mapId:'forest',x:846+id%3*75,y:2670+Math.floor(id/3)*90,crop,plantedAt:now-100000,readyAt:now-1000,watered:true}));a.renderer.camera.time=null;a.refresh();await(await import('/src/rendering/farm.js')).loadFarmArt();
  });
  for(const phase of ['day','night']){
   await page.evaluate(async phase=>{Object.assign(a.environment,{time:phase,livingPreview:true,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);
   await page.waitForTimeout(300);await page.screenshot({path:`output/playwright/crop-expansion/combined-${phase}.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {dayNight:true,errors};
 }finally{await context.close();}
}
