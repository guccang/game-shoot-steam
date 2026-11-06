// 正式树木、建筑、角色、怪物和停靠载具同屏对照，测试摆位不改变运行时绘制器。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,recordVideo:{dir:'output/house-depth/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.enemies=[];g.boss=null;g.updateWaves=()=>{};g.mainlineSpeech=null;g.mainlineTalkDelay=g.fireClock=999999;g.vehicle.active=false;g.player.invincible=0;
   window.site=(await import('/src/config/world-buildings.js')).WORLD_BUILDINGS.find(b=>b.id==='cat-home');
   // 用正式树木实体在测试营地旁摆一棵参照树，保留风摆、树冠和脚底绘制。
   g.trees.push({...g.trees[0],id:g.nextId++,x:site.x+130,y:site.y+5,variant:'round',palette:0,size:1});
  });
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const g=a.game;g.cottage=null;g.state='playing';g.cottageDoorLatch=true;g.vehicle.active=false;g.enemies=[];Object.assign(g.player,{x:site.x+30,y:site.y+100,vx:0,vy:0});
    g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:site.x+130,y:site.y+125,hp:1,ammo:0}];const e=g.spawnEnemy(0,0,{x:site.x-85,y:site.y+80});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0});
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },time);
   await page.waitForTimeout(400);await page.screenshot({path:`output/house-depth/same-screen-${width}-${time}.png`});
   // 从正式游戏画布所在视口直接截图，便于比较相邻房屋和树木，不另画预览素材。
   if(width===390)await page.screenshot({path:`output/house-depth/house-tree-${time}-detail.png`,clip:{x:0,y:175,width:390,height:300}});
   const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampHouseDepth(a.game,a.renderer));
   if(review.overflow||!review.actors.trees||!review.actors.enemies||!review.visible||!review.parked||review.cache.bytes>review.cache.maxBytes)throw Error('同屏证据缺失 '+JSON.stringify(review));checks.push({width,height,...review});
  }
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'camp-house-depth',checks,video:await page.video().path(),errors};
 }finally{await context.close();}
}
