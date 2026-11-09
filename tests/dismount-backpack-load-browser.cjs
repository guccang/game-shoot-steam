// 手机隔离存档：真实点击下车、按键行走和查看背包，核对昼夜与短屏提示。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  for(const [hull,width,height,time] of [[5,390,844,'day'],[6,320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async({hull,time})=>{
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[hull]=1;p.vehicleIndex=hull;p.logistics.bagWood=300;
    const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=g.fireClock=999999;g.updateWaves=()=>{};g.enemies=[];g.trees=[];g.boss=null;Object.assign(g.player,{x:893,y:2814,invincible:9999});if(!g.summonVehicle())throw Error('无法准备驾驶状态');
    const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);g.progress.living.calendar.elapsed=phase.start+phase.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();
   },{hull,time});
   await page.locator('#vehicle-button').tap();await page.waitForFunction(()=>!a.game.vehicle.active);
   const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');
   const result=await page.evaluate(async before=>{const g=a.game,{catLoad,movementLoadFactor}=await import('/src/progression/inventory/load-weight.js');return {distance:Math.hypot(g.player.x-before.x,g.player.y-before.y),factor:movementLoadFactor(g),load:catLoad(g).weight,wood:g.progress.logistics.bagWood,mounted:g.vehicle.active};},before);
   if(result.distance<4||result.factor!==.35||result.wood!==300||result.mounted)throw Error('下车后未正常缓行 '+JSON.stringify(result));checks.push({hull,time,...result});
   await page.screenshot({path:`output/playwright/dismount-backpack-load/walking-${width}-${time}.png`});
   if(!await page.locator('#heroes-button').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#heroes-button').tap();await page.locator('[data-cat-tab="items"]').tap();
   const text=await page.locator('#current-cat-items').innerText();if(!text.includes('缓慢行走')||text.includes('无法移动'))throw Error('背包提示与实际步速不一致');await page.screenshot({path:`output/playwright/dismount-backpack-load/backpack-${width}.png`});await page.locator('#current-cat-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
   // 省略长途返仓行程，使用正式仓库事务存放物品，避免用丢弃代替安全减负。
   await page.evaluate(async()=>{const [{WAREHOUSE:w},{transferWarehouse},{movementLoadFactor}]=await Promise.all([import('/src/config/warehouse.js'),import('/src/core/inventory/warehouse.js'),import('/src/progression/inventory/load-weight.js')]);const g=a.game;Object.assign(g.player,{x:w.x,y:w.y+22,vx:0,vy:0});const r=transferWarehouse(g,'bag','material:wood',300,'deposit');if(!r.ok)throw Error(r.message);if(movementLoadFactor(g)!==1)throw Error('存仓后没有恢复正常速度');});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,warehouseRecovery:true,errors};
 }finally{await context.close();}
}
