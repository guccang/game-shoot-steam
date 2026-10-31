// 桥岸补验：驾驶正式松果车沿桥板边缘往返，角色、车、敌人、场景及 UI 同屏。
async page=>{
 if(new URL(page.url()).port!=='4289')throw Error('仅限隔离端口4289');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bridge=await page.evaluate(async()=>{const g=a.game;g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicles[0]=g.vehicle;g.vehicle.active=true;g.enemies=[];return (await import('/src/world/river-geometry.js')).BRIDGE;});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(160);
 for(const sign of [1,-1]){
  const x=sign===1?bridge.x-32:bridge.x+bridge.width+32,y=sign===1?bridge.y+6:bridge.y+bridge.height-6;
  await page.evaluate(({x,y})=>{Object.assign(a.game.player,{x,y,vx:0,vy:0,pushX:0,pushY:0});a.renderer.camera.time=null;},{x,y});await page.waitForTimeout(80);const key=sign===1?'ArrowRight':'ArrowLeft';
  await page.keyboard.down(key);await page.waitForFunction(({sign,bridge})=>sign===1?a.game.player.x>bridge.x+bridge.width+25:a.game.player.x<bridge.x-25,{sign,bridge},{timeout:6500});await page.keyboard.up(key);
 }
 await page.evaluate(b=>{window.vehicleBridgeTick=a.game.update.bind(a.game);a.game.update=()=>{};Object.assign(a.game.player,{x:b.x+100,y:b.y+39,vx:0,vy:0});a.game.spawnEnemy(0,100);Object.assign(a.game.enemies[0],{x:b.x-50,y:b.y+105});},bridge);
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';a.renderer.camera.time=null;},phase);await page.waitForFunction(phase=>a.environment.time===phase,phase);await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);});await page.waitForTimeout(90);await page.screenshot({path:`output/playwright/exhibit-countdown-bridge/bridge-vehicle-${width}-${phase}.png`});
 }
 await page.evaluate(()=>{a.game.update=window.vehicleBridgeTick;a.game.enemies=[];});if(errors.length)throw Error(errors.join(' / '));return {designCriterion:'exhibit-countdown-bridge',vehicleCrossings:2,errors};
}
