// 正式工坊与森林同屏验收，手机/桌面、昼夜、暂停和连续喷口时序共同复核。
async page=>{
 if(new URL(page.url()).port!=='4212')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:960});await page.reload();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源缺失');window.tideApp=a;
  const {freshProgress,validateProgress}=await import('/src/progression/progress.js');const p=freshProgress();p.vehicleHulls[3]=1;p.vehicleIndex=3;p.vehicleLoadouts[3]=20;
  a.game.progress=validateProgress(p);a.game.reset();a.game.state='ready';a.refresh();a.workshop.open('vehicle',3);
 });
 await page.locator('#ws-kits-tab').click();await page.locator('#ws-test').click();await page.waitForTimeout(900);
 await page.screenshot({path:'output/playwright/hover-tide/workshop-trial.png'});await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
 const scenes=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async time=>{
   const a=tideApp,g=a.game,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   g.reset();g.start();g.summonVehicle();g.updateWaves=()=>{};g.attack=()=>false;g.updateWeaponAbility=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;
   Object.assign(g.player,{x:900,y:850,invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-920,t.y-850)>200);
   for(const [dx,dy] of [[100,35],[140,-5]]){const e=g.spawnEnemy(0,0,{x:900+dx,y:850+dy});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0,mass:2.7,flying:false});}
   Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
  },time);
  await page.waitForFunction(()=>tideApp.game.fx.items.some(p=>p.kind==='tide-splash'&&p.life>.24));
  await page.screenshot({path:`output/playwright/hover-tide/field-${width}-${time}.png`});
  scenes.push(await page.evaluate(({width,time})=>({width,time,ammo:tideApp.game.vehicle.module.magazine.ammo,ages:tideApp.game.vehicle.module.magazine.tide.ages,particles:tideApp.game.fx.items.length,hitX:tideApp.game.enemies[0].x,push:tideApp.game.enemies[0].pushX,canvasCount:document.querySelectorAll('canvas').length}),{width,time}));
 }
 // 保持真实帧循环录制连续双发、受力后滑与收炮，暂停不能推进后一喷口。
 const start=await page.evaluate(()=>{const g=tideApp.game;g.enemies=[];g.vehicle.module.magazine.ammo=18;g.vehicle.module.magazine.remaining=0;g.vehicle.module.cooldown=0;const e=g.spawnEnemy(0,0,{x:g.player.x+110,y:g.player.y+15});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0,mass:1,flying:false});return {id:e.id,x:e.x};});
 await page.waitForTimeout(1900);
 const end=await page.evaluate(id=>{const g=tideApp.game,e=g.enemies.find(e=>e.id===id);return {x:e.x,hp:e.hp,ammo:g.vehicle.module.magazine.ammo,particles:g.fx.items.length};},start.id);
 if(end.x<=start.x+20||end.hp>=10000)throw Error('命中没有真实后滑');
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');
 const frozen=await page.evaluate(()=>{tideApp.game.state='paused';return JSON.stringify(tideApp.game.vehicle.module.magazine.tide);});await page.waitForTimeout(220);
 if(await page.evaluate(()=>JSON.stringify(tideApp.game.vehicle.module.magazine.tide))!==frozen)throw Error('暂停仍推进炮管');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{const a=tideApp,g=a.game;g.state='playing';g.enemies=[];const e=g.spawnEnemy(0,0,{x:g.player.x+110,y:g.player.y+15});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0,mass:2.7,flying:false});a.refresh();});
 await page.waitForFunction(()=>tideApp.game.reducedMotion&&tideApp.game.fx.items.some(p=>p.kind==='tide-splash'&&p.life>.24));
 await page.screenshot({path:'output/playwright/hover-tide/reduced-320.png'});
 await page.evaluate(()=>{tideApp.game.state='paused';});await page.emulateMedia({reducedMotion:'no-preference'});
 // 连续帧通过正式试射会话复核，另放大同源喷口以检查前后伸缩差。
 await page.setViewportSize({width:1280,height:960});
 await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{drawVehicleArmament}=await import('/src/rendering/vehicle-armaments.js'),{createWorkshopTrial}=await import('/src/core/workshop-trial.js'),{vehicleWeapon}=await import('/src/config/vehicles.js');
  const canvas=document.createElement('canvas');canvas.id='tide-frames';canvas.width=1200;canvas.height=520;canvas.style.cssText='position:fixed;z-index:9999;left:0;top:0;background:#eee8c8';document.body.append(canvas);
  const c=canvas.getContext('2d'),tile=document.createElement('canvas');tile.width=300;tile.height=260;
  for(const [i,phase] of [.025,.085,.15,.27].entries()){
   await renderVisualCase(tile.getContext('2d'),'hover-tide-impact',phase);c.drawImage(tile,i*300,0);
   const trial=createWorkshopTrial(tideApp.game.progress,'vehicle',3);for(let t=0;t<phase;t+=1/120)trial.advance(Math.min(1/120,phase-t));
   c.save();c.translate(i*300+100,390);c.scale(3,3);drawVehicleArmament(c,vehicleWeapon(trial.game.progress,20),{tide:trial.game.vehicle.module.magazine.tide});c.restore();
  }
 });
 await page.locator('#tide-frames').screenshot({path:'output/playwright/hover-tide/continuous-frames.png'});await page.evaluate(()=>document.getElementById('tide-frames').remove());
 if(errors.length)throw Error(errors.join('\n'));return {scenes,start,end,errors};
}
