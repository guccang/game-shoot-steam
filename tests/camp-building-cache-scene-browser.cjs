// 正式营地昼夜同屏、触控进屋与缓存命中复核，保留原手机竖版容器。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,recordVideo:{dir:'output/camp-performance/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;p.vehicleHulls[0]=1;p.vehicleIndex=0;
   const g=a.game;g.progress=p;g.reset();g.start();g.arrivalScene=null;g.enemies=[];g.boss=null;g.updateWaves=()=>{};g.mainlineSpeech=null;g.mainlineTalkDelay=g.fireClock=999999;g.vehicle.active=false;
   window.cache=(await import('/src/rendering/camp-building-cache.js')).campBuildingCache;
  });
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const g=a.game,b=(await import('/src/config/world-buildings.js')).WORLD_BUILDINGS.find(b=>b.id==='warehouse');g.cottage=null;g.state='playing';g.cottageDoorLatch=true;g.enemies=[];Object.assign(g.player,{x:b.x+95,y:b.y+85,vx:0,vy:0});
    g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:b.x+110,y:b.y+150,hp:1,ammo:0}];const e=g.spawnEnemy(0,0,{x:b.x-100,y:b.y+85});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0});
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },time);
   await page.waitForTimeout(700);await page.screenshot({path:`output/camp-performance/scene-${width}-${time}.png`});
   checks.push(await page.evaluate(()=>({phase:a.environment.time,visible:a.renderer.visibleStats,budget:cache.stats(),overflow:document.documentElement.scrollWidth>innerWidth})));
  }
  // 沿原墙体行走，缓存不参与碰撞或入口判定。
  await page.setViewportSize({width:390,height:844});await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');
  // 每个新接入入口单独入镜，避免只检查同一种建筑。
  for(const id of ['cat-home','furniture','seed','ammo','construction']){
   await page.evaluate(async id=>{const b=(await import('/src/config/world-buildings.js')).WORLD_BUILDINGS.find(b=>b.id===id),g=a.game;g.enemies=[];g.cottage=null;g.state='playing';Object.assign(g.player,{x:b.x+45,y:b.y+80,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();},id);
   await page.waitForTimeout(450);await page.screenshot({path:`output/camp-performance/building-${id}.png`});
  }
  // 同一营地镜头的四倍CPU降速对照，仅临时绕过缓存，不替换正式画笔。
  await page.evaluate(async()=>{const b=(await import('/src/config/world-buildings.js')).WORLD_BUILDINGS.find(b=>b.id==='warehouse');Object.assign(a.game.player,{x:b.x+65,y:b.y+90});a.game.enemies=[];a.renderer.camera.time=null;window.cachedDraw=cache.draw;});
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});const timings=[];
  for(const mode of ['raw','cached']){
   await page.evaluate(mode=>{cache.draw=mode==='raw'?function(c,key,bounds,paint){paint(c);}:window.cachedDraw;},mode);await page.waitForTimeout(1000);await page.evaluate(()=>{a.diagnostics.monitor.frames=[];});await page.waitForTimeout(2200);
   timings.push(await page.evaluate(mode=>{const f=a.diagnostics.monitor.frames.filter(f=>f.state==='playing'),mean=key=>f.reduce((sum,v)=>sum+(v.sections[key]||0),0)/Math.max(1,f.length);return {mode,frames:f.length,buildingsMs:mean('render.campBuildings'),canvasMs:mean('render.canvas'),panelsMs:mean('render.panels'),budget:cache.stats()};},mode));
  }
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await cdp.detach();
  // 正式手机点击建筑，验证缓存位置仍对应原触控热点。
  await page.evaluate(async()=>{const g=a.game;g.cottage=null;g.enemies=[];g.state='playing';g.cottageDoorLatch=false;const door=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.seed.door;Object.assign(g.player,{x:door.x+25,y:door.y+30,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
  await page.waitForTimeout(400);await page.locator('[data-building-entry="seed"]').tap();await page.waitForFunction(()=>a.game.cottage?.kind==='seed',null,{timeout:15000});await page.screenshot({path:'output/camp-performance/seed-inside.png'});
  if(errors.length||checks.some(c=>c.overflow||c.budget.bytes>c.budget.maxBytes||c.visible.campBuildings===0))throw Error(JSON.stringify({errors,checks}));
  return {designCriterion:'camp-building-static-cache',checks,timings,touchEntry:true,video:await page.video().path(),errors};
 }finally{await context.close();}
}
