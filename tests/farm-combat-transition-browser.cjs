// 真实弹道击杀后的持枪警戒验收，记录有效游玩时间及连续画面，复用正式农活队列。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-combat-transition/video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.lessonRewarded=true;
   p.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:893+id*56,y:2752,crop:0,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=2;
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.trees=[];g.vehicle.active=false;g.updateWaves=()=>{};
   Object.assign(g.player,{x:893,y:2814,invincible:99999});window.realUpdate=g.update.bind(g);g.update=()=>{};
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  const cdp=await context.newCDPSession(page);
  // 使用实际工具与田块触点排入两格收割任务。
  async function touch(type,selector){const r=selector?await page.locator(selector).boundingBox():null;await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:r?[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]:[]});}
  for(const [width,time] of [[320,'day'],[390,'night']]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(async time=>{
    const g=a.game;g.update=()=>{};g.enemies=[];g.bullets=[];
    for(const p of g.progress.farm.plots.filter(p=>p.id<2))Object.assign(p,{crop:0,plantedAt:0,readyAt:0});
    Object.assign(g.player,{x:893,y:2814});(await import('/src/core/farm.js')).setFarmTool(g,'harvest');
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },time);
   await touch('touchStart','#farm-sickle');for(const id of [0,1])await touch('touchMove',`[data-farm-cell="${id}"]`);await touch('touchEnd');
   await page.evaluate(()=>{
    const g=a.game;if(g.farmWork.queue.length!==2)throw Error('触摸排队失败');
    g.spawnEnemy(0,80,{x:g.player.x+80,y:g.player.y});window.target=g.enemies.at(-1);Object.assign(target,{hp:100000,maxHp:100000,speed:0,mass:1000000,damage:0});g.attackTimer=0;
    window.timing={clock:0,death:null,resume:null,coins:g.progress.coins,frames:0};
    // 包裹真实更新只做观测，不替换寻敌、弹道、命中、农活或渲染。
    g.update=(dt,input)=>{realUpdate(dt,input);if(g.state==='playing')timing.clock+=dt;if(target.hp<=0&&timing.death===null)timing.death=timing.clock;
     if(timing.death!==null&&timing.resume===null){if(!g.farmWork.autoCombat)timing.resume=timing.clock;else{timing.frames++;if(g.progress.coins!==timing.coins||g.farmWork.queue.length!==2||g.farmWork.job)throw Error('警戒期间农活提前推进');}}};
   });
   await page.waitForFunction(()=>target.hp<100000&&a.game.farmWork.autoCombat);
   await page.screenshot({path:`output/playwright/farm-combat-transition/attack-${width}-${time}.png`});
   // 只缩短敌人剩余生命，由原子弹完成最后一次命中。
   await page.evaluate(()=>{target.hp=1;});await page.waitForFunction(()=>a.game.farmWork.combatRecovery>.2);
   if(await page.locator('#farm-combat span').textContent()!=='警戒')throw Error('未显示警戒状态');
   await page.screenshot({path:`output/playwright/farm-combat-transition/guard-${width}-${time}.png`});
   await page.waitForFunction(()=>timing.resume!==null);
   const result=await page.evaluate(()=>({delay:timing.resume-timing.death,frames:timing.frames}));
   if(result.delay<1.0||result.delay>1.2||result.frames<10)throw Error('切换时间异常 '+JSON.stringify(result));
   await page.waitForFunction(()=>a.game.progress.farm.plots.filter(p=>p.id<2).every(p=>p.crop===null)&&!a.game.farmWork.job&&!a.game.farmWork.queue.length);
   const final=await page.evaluate(async()=>({gain:a.game.progress.coins-timing.coins,expected:2*(await import('/src/config/farm.js')).FARM_CROPS[0].value,auto:a.game.farmWork.autoCombat,tool:a.game.farmWork.tool,overflow:document.documentElement.scrollWidth>innerWidth}));
   if(final.gain!==final.expected||final.auto||final.tool!=='harvest'||final.overflow)throw Error('续作或显示错误 '+JSON.stringify(final));
   await page.screenshot({path:`output/playwright/farm-combat-transition/resume-${width}-${time}.png`});results.push({width,time,...result,...final});
  }
  await cdp.detach();await page.locator('#farm-exit').tap();if(await page.evaluate(()=>!!a.game.farmWork))throw Error('手动退出未清理');
  if(errors.length)throw Error(errors.join('\n'));return {results,errors,video:await page.video().path()};
 }finally{await context.close();}
}
