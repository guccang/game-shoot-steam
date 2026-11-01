// 正式击杀与伐木产生连续拾取，手机昼夜逐帧采样，隔离存档不影响用户进度。
async page=>{
 const baseURL=page.url().startsWith('http')?page.url():'http://localhost:4175';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],results=[];
 t.setDefaultTimeout(15000);t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto(baseURL);
  await t.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.coins=p.wood=1000;p.vehicleHulls[0]=1;localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
  await t.reload();await t.locator('#start').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=99999;});
  for(const [width,height]of [[320,568],[390,844],[844,390]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});
   await t.evaluate(async phase=>{
    const g=a.game;g.drops=[];g.enemies=[];g.trees=[];g.numbers=[];g.parking=null;g.vehicle.active=false;Object.assign(g.player,{x:1600,y:400});
    g.spawnEnemy(0,0,{x:1670,y:495},{ambient:true});
    const target=g.spawnEnemy(0,0,{x:1710,y:350},{ambient:true});g.hit(target,1e6);
    g.addTree(1490,370);g.hit(g.trees[0],1e6);
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    a.renderer.camera.time=null;a.refresh();a.renderer.draw();window.pickupWallet={coins:g.progress.coins,wood:g.progress.wood};
   },phase);
   let previous=0;
   for(const time of [.12,.3,.55,.65,1.1]){
    const sample=await t.evaluate(async dt=>{const g=a.game;g.player.x+=dt*25;(await import('/src/combat/transient-effects.js')).updateCombatTraces(g,dt);a.refresh();a.renderer.draw();return (await import('/src/rendering/visual-review.js')).inspectResourcePickup(g);},time-previous);previous=time;
    if((time<.6&&!sample.wood)||(time>=.6&&sample.wood))throw Error('木材未按短促节奏收束 '+JSON.stringify({time,sample}));
    if(sample.wood>3||sample.coins+sample.wood>96)throw Error('超出图标预算');
    await t.screenshot({path:`output/playwright/wood-pickup-short/${width}-${phase}-${time}.png`});
    results.push({width,phase,time,coins:sample.coins,wood:sample.wood});
   }
   const cleanup=await t.evaluate(async()=>{const g=a.game;(await import('/src/combat/transient-effects.js')).updateCombatTraces(g,1);return {empty:g.drops.length===0,wallet:g.progress.coins===pickupWallet.coins&&g.progress.wood===pickupWallet.wood};});
   if(!cleanup.empty||!cleanup.wallet)throw Error('拾取批次未清理或重复发奖');
  }
  // 骑电动车时吸附到抬高后的猫猫身上，减少动态仍有连续反馈且降低图标密度。
  await t.setViewportSize({width:390,height:844});
  for(const phase of ['day','night'])for(const reduced of [false,true]){
   await t.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   const sample=await t.evaluate(async({phase,reduced})=>{
    const g=a.game;g.drops=[];g.enemies=[];g.trees=[];Object.assign(g.player,{x:1600,y:400});g.progress.vehicleHulls[5]=1;
    g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress, 5);g.vehicle.active=true;
    const target=g.spawnEnemy(0,0,{x:1710,y:350},{ambient:true});g.hit(target,1e6);
    g.addTree(1490,370);g.hit(g.trees[0],1e6);
    (await import('/src/combat/transient-effects.js')).updateCombatTraces(g,.3);
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
    return (await import('/src/rendering/visual-review.js')).inspectResourcePickup(g,reduced);
   },{phase,reduced});
   if(!sample.wood)throw Error('骑行拾取缺失 '+JSON.stringify({phase,reduced,sample}));
   await t.screenshot({path:`output/playwright/wood-pickup-short/rider-${phase}-${reduced}.png`});
   results.push({phase,reduced,rider:true,coins:sample.coins,wood:sample.wood});
  }
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
 }finally{await context.close();}
}
