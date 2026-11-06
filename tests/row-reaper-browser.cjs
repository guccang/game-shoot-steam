// 正式手机入口实按推镰，检查行向、松手和刀口前的作物，并保存昼夜同屏证据。
async original=>{
 const context=await original.context().browser().newContext({isMobile:true,hasTouch:true,viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[],out='output/playwright/row-reaper/';
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.vehicleHulls.fill(0);p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.wildScatterVersion=1;p.farm.lessonRewarded=true;
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.fireClock=g.spawnTimer=999999;g.enemies=[];g.boss=null;
   g.progress.campParking.owned=[];g.vehicle.active=false;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const {farmLandReason}=await import('/src/world/farm-land.js');
   let point;
   for(let y=350;y<1300&&!point;y+=52)for(let x=1300;x<2400&&!point;x+=56){
    if([-1,0,1,2,3].every(i=>[0,52].every(d=>!farmLandReason(g,{x:x+i*56,y:y+d,mapId:g.mapId}))))point={x,y};
   }
   if(!point)throw Error('找不到相邻两行田地');
   const now=Date.now(),farm=g.progress.farm;
   farm.plots=Array.from({length:6},(_,id)=>({id,mapId:g.mapId,x:point.x+56*(id%3),y:point.y+52*Math.floor(id/3),crop:0,plantedAt:id===1?now:1,readyAt:id===1?now+60000:2,watered:false}));
   farm.nextId=6;Object.assign(g.player,{x:point.x-48,y:point.y+8});a.renderer.camera.time=null;a.refresh();
  });
  if(!await page.locator('#farm-menu').isVisible())await page.locator('#field-menu-toggle').tap();
  await page.locator('#farm-menu').tap();await page.locator('#farm-reaper').tap();
  const hold=page.getByRole('button',{name:'按住收割'}),touch=await context.newCDPSession(page);
  await hold.waitFor();await page.locator('[data-ox-turn]').tap();await page.waitForFunction(()=>a.game.farmWork.reaper.facing===-1);
  await page.locator('[data-ox-turn]').tap();
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1280,900,'day'],[1280,900,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
    a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{time,autoTime:false,livingPreview:false,weather:'sun',autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();
   },time);
   await page.waitForTimeout(300);
   const box=await hold.boundingBox();if(!box||box.height<44||box.x<0||box.x+box.width>width)throw Error('收割触控区超出视口');
   await page.screenshot({path:out+'field-'+width+'-'+time+'.png'});
  }
  await page.setViewportSize({width:390,height:844});
  const box=await hold.boundingBox(),tip=[{x:box.x+box.width/2,y:box.y+box.height/2}];
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tip});
  await page.waitForFunction(()=>a.game.progress.farm.harvested===1);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>!a.game.farmWork.reaper.held);
  const x=await page.evaluate(()=>a.game.player.x);await page.waitForTimeout(400);
  if(await page.evaluate(x=>Math.abs(a.game.player.x-x)>1||a.game.progress.farm.harvested!==1,x))throw Error('松手后继续作业');
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tip});
  await page.waitForFunction(()=>a.game.progress.farm.harvested===2&&!a.game.farmWork.reaper.held);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectRowReaper(a.renderer));
  if(review.travel<80||review.held||errors.length)throw Error(JSON.stringify({review,errors}));
  await page.getByRole('button',{name:'收起推镰'}).tap();await page.waitForFunction(()=>!a.game.farmWork);
 }finally{await context.close();}
}
