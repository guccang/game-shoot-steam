// 解锁后的正式同屏：玩家、电动车、怪物、两个工坊和HUD一起检查昼夜。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;if(g.arrivalPending)throw Error('Arrival incomplete');window.rangerTick=Object.getPrototypeOf(g).update.bind(g);g.update=()=>{};a.menu.enter();g.start();
  // 通过正式运动抵达两处工坊之间，沿路碰撞仍有效。
  for(const target of [{x:700,y:740},{x:415,y:740}]){let n=0;while(Math.hypot(g.player.x-target.x,g.player.y-target.y)>8&&n++<500){const dx=target.x-g.player.x,dy=target.y-g.player.y,d=Math.hypot(dx,dy);window.rangerTick(.05,{x:dx/d,y:dy/d});}if(n>=500)throw Error('Camp path blocked');}
  g.selectVehicle(5);g.summonVehicle();g.spawnEnemy(.4,125);g.spawnEnemy(2.5,150);a.refresh();
 });
 for(const [width,height,label]of [[1280,900,'desktop'],[390,844,'390'],[320,740,'320']])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;
   Object.assign(a.environment,{weather:'sun',autoSeason:false,autoTime:false,autoWeather:false});while(a.environment.forestSeason!=='summer')document.getElementById('season-picture').click();while(a.environment.time!==time)document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.renderer.draw();a.refresh();
  },time);await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/ranger-battle-${label}-${time}.png`});
 }
 // 真实上下车和键盘驾驶：有位移、有轮转，停车后轮角保持。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.update=window.rangerTick;window.scooterBefore={x:a.game.player.x,y:a.game.player.y,wheel:a.game.vehicle.wheelPhase};});
 await page.keyboard.down('s');await page.waitForTimeout(400);await page.keyboard.up('s');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.update=()=>{};if(Math.hypot(g.player.x-window.scooterBefore.x,g.player.y-window.scooterBefore.y)<15||g.vehicle.wheelPhase===window.scooterBefore.wheel)throw Error('Scooter motion failed');g.dismountVehicle();a.refresh();});
 // 远近不同的世界门牌必须分别打开对应清单。
 await page.setViewportSize({width:1280,height:900});await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.renderer.resize();a.renderer.draw();a.refresh();});
 for(const kind of ['weapons','vehicle']){
  await page.locator(`.world-workshop-entry[data-workshop-kind="${kind}"]`).click();
  if(await page.locator('#workshop-dialog').getAttribute('data-workshop-kind')!==kind)throw Error('World workshop wrong category');
  await page.screenshot({path:`output/playwright/ranger-world-door-${kind}.png`});await page.locator('#ws-close').click();
 }
 if(errors.length)throw Error(errors.join('\n'));
}
