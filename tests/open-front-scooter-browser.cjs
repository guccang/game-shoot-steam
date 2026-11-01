// 无风挡摩托专项：双人接送、库内空车、单人战斗和满级结构共用正式绘制入口。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.menu.enter();a.game.resetProgress();a.game.start();window.scooterTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};window.openScooterSamples=[];for(let i=0;i<880;i++)window.scooterTick(.05);});
 for(const mode of ['double','parked','single','upgraded']){
  await page.evaluate(async mode=>{const a=(await import('/src/main.js')).application,g=a.game;
   if(mode==='parked'){let n=0;while(g.progress.arrival.phase!=='gather'&&n++<1000)window.scooterTick(.05);if(n>=1000)throw Error('Parking flow stalled');g.progress.arrival.phase='complete';g.arrivalScene=null;Object.assign(g.player,{x:265,y:710});}
   if(mode==='single'){Object.assign(g.player,{x:350,y:735});g.selectVehicle(5);g.summonVehicle();g.spawnEnemy(.4,125);g.spawnEnemy(2.5,150);}
   if(mode==='upgraded'){g.progress.vehicleHulls[5]=20;g.progress.vehicleParts[5].engine=5;const {createVehicle}=await import('/src/combat/vehicle.js');g.vehicle=g.vehicles[5]=createVehicle(g.progress, 5);g.vehicle.active=true;}
   a.refresh();a.renderer.draw();},mode);
  for(const [width,height,size] of [[1280,900,'desktop'],[390,844,'390'],[320,740,'320']])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;Object.assign(a.environment,{weather:'sun',autoSeason:false,autoTime:false,autoWeather:false});while(a.environment.forestSeason!=='summer')document.getElementById('season-picture').click();while(a.environment.time!==time)document.getElementById('time-picture').click();const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.renderer.draw();a.refresh();},time);
   await page.waitForTimeout(100);await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.openScooterSamples.push((await import('/src/rendering/visual-review.js')).inspectOpenScooter(a.game,document));});await page.screenshot({path:`output/playwright/open-scooter-${mode}-${size}-${time}.png`});
  }
 }
 // 真实键盘驾驶、停车、下车；轮纹随位移变化，停稳时冻结。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.scooterBefore={x:a.game.player.x,y:a.game.player.y,wheel:a.game.vehicle.wheelPhase};a.game.update=window.scooterTick;});await page.keyboard.down('s');await page.waitForTimeout(450);await page.keyboard.up('s');await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.update=()=>{};if(Math.hypot(g.player.x-window.scooterBefore.x,g.player.y-window.scooterBefore.y)<15||g.vehicle.wheelPhase===window.scooterBefore.wheel)throw Error('Wheel motion failed');g.dismountVehicle();a.refresh();});
 for(const level of [1,20]){
  await page.evaluate(async level=>{const a=(await import('/src/main.js')).application;a.game.progress.vehicleHulls[5]=level;a.game.progress.vehicleParts[5].engine=level===1?1:5;a.workshop.open('vehicle',5);},level);
  for(const [width,height,size] of [[1280,900,'desktop'],[390,844,'390'],[320,740,'320']]){await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/open-scooter-workshop-${level}-${size}.png`});if(size==='390')await page.locator('#ws-stage').screenshot({path:`output/playwright/open-scooter-detail-${level}.png`});}
  if(!await page.locator('#ws-kits-tab').isDisabled())throw Error('Scooter mount exposed');await page.locator('#ws-close').click();
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.renderer.diagnosticInfo().catAnimation.status!=='ready')throw Error('Missing real cat frames');});if(errors.length)throw Error(errors.join('\n'));
}
