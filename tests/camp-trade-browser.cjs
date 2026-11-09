// 手机触控走正式订单板和手机入口，复核昼夜世界画面与沿途车马动作。
async original=>{
 const recordVideo=process.env.CAMP_TRADE_RECORD?{dir:'output/playwright/camp-trade',size:{width:390,height:844}}:undefined;
 const context=await original.context().browser().newContext({recordVideo,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));page.setDefaultTimeout(12000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:90000});
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.keepsakes.items=['elder-letter','house-key','patrol-phone'];p.farm.inventory[0]=5;
   const g=a.game;g.progress=p;g.reset();g.start();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;
   g.spawnTimer=g.mainlineTalkDelay=g.fireClock=99999;g.enemies=[];
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   Object.assign(g.player,{x:596,y:727,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
  });
  const trade=page.locator('#camp-trade-dialog'),action=name=>trade.locator('[data-trade-action="'+name+'"]').first();
  await page.getByRole('button',{name:'营地订单板',exact:true}).tap();await trade.waitFor();
  if(!(await trade.locator('[data-trade-summary]').innerText()).includes('共 4 项任务 · 已完成 0 项'))throw Error('初始订单进度错误');
  await action('take-crop').tap();await action('give-crop').tap();
  if(!(await trade.locator('[data-trade-summary]').innerText()).includes('已完成 1 项'))throw Error('订单进度未刷新');
  if(!(await trade.locator('[role=status]').innerText()).includes('117'))throw Error('订单交付金额错误');
  await action('take-relic').tap();await action('escort').tap();await trade.locator('[data-keep]').check();
  await trade.locator('.ui-panel__body').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'output/playwright/camp-trade/phone-orders.png'});
  await trade.locator('.ui-close').tap();
  await page.evaluate(()=>{
   const g=a.game;Object.assign(g.player,{x:650,y:727,vx:0,vy:0});g.spawnTimer=g.fireClock=99999;
   const enemy=g.spawnEnemy(0,0,{x:712,y:660},{ambient:true,ordinaryDumpling:true});Object.assign(enemy,{speed:0,damage:0,hp:9999,maxHp:9999});
   a.renderer.camera.time=null;a.refresh();
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
   await page.waitForTimeout(250);await page.screenshot({path:'output/playwright/camp-trade/'+width+'-'+time+'.png'});
  }
  const visual=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampTrade(a.game));
  if(visual.sites!==3||!visual.outpost||!visual.cart||!visual.boardTouch||!Number.isFinite(visual.horseFrame)||!visual.wheelPhase)throw Error(JSON.stringify(visual));
  await page.setViewportSize({width:320,height:568});
  const phone=page.locator('#phone-button');if(!await phone.isVisible())await page.locator('#field-menu-toggle').tap();
  await phone.tap();await page.locator('[data-pack-action=trade]').tap();await trade.waitFor();
  if(await trade.evaluate(el=>el.scrollWidth>el.clientWidth+1))throw Error('订单板横向溢出');
  await trade.locator('[data-trade-action=route][data-id=trade-amber]').tap();await trade.waitFor({state:'hidden'});
  // 由正式路线和护送逻辑带车到近站，再用短屏真实触控领取佣金。
  await page.evaluate(async()=>{
   const g=a.game,site=(await import('/src/config/camp-trade.js')).TRADE_STATIONS[0];
   const {planQuestRoute}=await import('/src/physics/quest-route.js'),{updateTradeEscort}=await import('/src/core/camp/camp-trade.js');
   const route=planQuestRoute({...g.player,mapId:'forest',livingCollision:true},site,g.trees);
   if(!route.reachable)throw Error('旧哨驿站无法抵达');
   for(const point of route.points){
    let length;
    while((length=Math.hypot(point.x-g.player.x,point.y-g.player.y))>.01){
     const k=Math.min(1,3/length);g.player.x+=(point.x-g.player.x)*k;g.player.y+=(point.y-g.player.y)*k;updateTradeEscort(g,.05);
    }
   }
   a.renderer.camera.time=null;a.refresh();
  });
  await page.getByRole('button',{name:'旧哨驿站',exact:true}).tap();await action('finish-escort').tap();
  if(!(await trade.locator('[role=status]').innerText()).includes('120'))throw Error('近站护送佣金错误');
  await trade.locator('.ui-close').tap();
  // 手机只导航；移动到远站以实际场景命中区交货，余下两份雏菊在远站收九十金币。
  await page.evaluate(async()=>{
   const site=(await import('/src/config/camp-trade.js')).TRADE_STATIONS[1];
   Object.assign(a.game.player,{x:site.x+55,y:site.y+38,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
  });
  const remote=page.getByRole('button',{name:'琥珀林驿站',exact:true});
  await remote.waitFor();await page.screenshot({path:'output/playwright/camp-trade/outpost.png'});await remote.tap();
  await action('sell').tap();
  if(!(await trade.locator('[role=status]').innerText()).includes('90'))throw Error('远站交货金额错误');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{
  const video=page.video();await context.close();
  if(video){await video.saveAs('output/playwright/camp-trade/trade-interaction.webm');await video.delete();}
 }
}
