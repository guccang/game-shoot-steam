// 正式户外同屏复核：固定昼夜目标光照，保留猫、怪物、真实停放车辆和建筑入口。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls[0]=1;p.campParking.owned=[{hull:0,spot:'cottage',hp:1}];g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.enemies=[];g.spawnTimer=g.fireClock=g.attackTimer=g.mainlineTalkDelay=999;Object.assign(g.player,{x:550,y:407,vx:0,vy:0});g.spawnEnemy(0,0,{x:635,y:400},{ambient:true});Object.assign(g.enemies[0],{speed:0,hp:1000000,maxHp:1000000});g.progress.campParking.owned=[{hull:0,spot:'cottage',hp:1}];a.renderer.camera.time=null;g.progress.living.patrolActive=false;a.refresh();
  });
  for(const time of ['day','night']){
   await page.evaluate(async time=>{const g=a.game,{LIVING_DAY_MS}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_DAY_MS*(time==='day'?.3:.85);Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
   await page.waitForTimeout(3500);
   // 截图固定同一侧的怪物与车辆，避免营地驱离规则在昼夜对照间把怪物带出画面。
   await page.evaluate(()=>{const g=a.game;g.enemies=[];g.spawnEnemy(0,0,{x:480,y:405},{ambient:true});g.update=()=>{};});await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/scene-approach/company-'+time+'.png'});await page.evaluate(()=>{delete a.game.update;});
  }
  // 邻接告示牌中央仍能点击，不因门前热点优先级而失去原服务。
  await page.evaluate(()=>{a.environment.livingPreview=false;a.game.livingPreview=false;a.game.livingBattle=null;a.game.enemies=[];Object.assign(a.game.player,{x:700,y:1045,vx:0,vy:0});a.renderer.camera.time=null;});await page.locator('#nearby-interaction[data-target="clearing"]').tap();await page.locator('#clearing-dialog').waitFor({state:'visible'});
  return {dayNight:true,clearingSign:true};
 }finally{await context.close();}
}
