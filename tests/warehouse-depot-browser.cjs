// 从正式户外场景采样两座仓库，触控验证仍由前库办理存取。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.vehicleIndex=0;p.vehicleHulls[0]=1;
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   const g=a.game;g.progress=p;g.reset();g.start();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;
   g.spawnTimer=g.attackTimer=g.mainlineTalkDelay=g.fireClock=99999;g.enemies=[];g.boss=null;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   Object.assign(g.player,{x:315,y:190,vx:0,vy:0});
   const enemy=g.spawnEnemy(0,0,{x:392,y:240});Object.assign(enemy,{hp:9999,maxHp:9999,speed:0,damage:0});
   g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:382,y:295,hp:1,ammo:0}];
   a.renderer.camera.time=null;a.refresh();
   const check=await (await import('/src/rendering/visual-review.js')).inspectWarehouseDepot(g);
   if(Object.values(check).includes(false))throw Error(JSON.stringify(check));
  });
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[950,760,'day'],[950,760,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
    a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{time,autoTime:false,weather:'sun',autoWeather:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.refresh();
   },time);
   await page.waitForTimeout(300);await page.screenshot({path:'output/playwright/warehouse-depot/'+width+'-'+time+'.png'});
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{Object.assign(a.game.player,{x:285,y:326});a.game.enemies=[];a.renderer.camera.time=null;a.refresh();});
  await page.locator('[data-building-entry=warehouse]').tap();await page.locator('#warehouse-dialog[open]').waitFor();
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await context.close();}
}
