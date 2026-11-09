// 正式坦克试射、移动、昼夜同屏与低动态验收，保留连续帧及性能记录。
async page=>{
 if(new URL(page.url()).port!=='4213')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:960});await page.reload();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源缺失');window.tankApp=a;
  const {freshProgress,validateProgress}=await import('/src/progression/progress.js');const p=freshProgress();p.vehicleHulls[1]=1;p.vehicleIndex=1;p.vehicleLoadouts[1]=18;
  a.game.progress=validateProgress(p);a.game.reset();a.game.state='ready';a.refresh();a.workshop.open('vehicle',1);
 });
 await page.locator('#ws-kits-tab').click();await page.locator('#ws-test').click();await page.waitForTimeout(2600);
 await page.screenshot({path:'output/playwright/tank-recoil/workshop-trial.png'});await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
 const scenes=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async time=>{
   const a=tankApp,g=a.game,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   g.reset();g.start();g.summonVehicle();g.updateWaves=()=>{};g.attack=()=>false;g.updateWeaponAbility=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;
   Object.assign(g.player,{x:900,y:850,invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-920,t.y-850)>250);
   const e=g.spawnEnemy(0,0,{x:1030,y:865});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0,mass:10,flying:false});
   Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
  },time);
  // 命中正式帧后只冻结模拟以留存截图，防止截图编码耗时错过后坐峰值。
  await page.waitForFunction(()=>{const g=tankApp.game,r=g.vehicle.recoil;if(r.tankAge>.04&&r.tankAge<.12){g.reviewUpdate=g.update;g.update=()=>{};return true;}return false;});
  await page.screenshot({path:`output/playwright/tank-recoil/field-${width}-${time}.png`});
  scenes.push(await page.evaluate(({width,time})=>({width,time,kick:tankApp.game.vehicle.recoil.kick,age:tankApp.game.vehicle.recoil.tankAge,particles:tankApp.game.fx.items.length,canvasCount:document.querySelectorAll('canvas').length}),{width,time}));
  await page.evaluate(()=>{const g=tankApp.game;g.update=g.reviewUpdate;delete g.reviewUpdate;});
 }
 // 真实循环观察多个开炮周期，以及行走、停止与换方向后的受力方向。
 await page.waitForTimeout(4500);
 const start=await page.evaluate(()=>({x:tankApp.game.player.x,y:tankApp.game.player.y}));
 for(const key of ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown']){await page.keyboard.down(key);await page.waitForTimeout(240);await page.keyboard.up(key);}
 await page.evaluate(()=>{const g=tankApp.game;g.enemies=[];const e=g.spawnEnemy(0,0,{x:g.player.x-150,y:g.player.y+20});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0,mass:10,flying:false});});
 await page.waitForTimeout(2700);
 const end=await page.evaluate(()=>({x:tankApp.game.player.x,y:tankApp.game.player.y,angle:tankApp.game.vehicle.angle}));
 const frozen=await page.evaluate(()=>{tankApp.game.state='paused';return JSON.stringify(tankApp.game.vehicle.recoil);});await page.waitForTimeout(200);
 if(await page.evaluate(()=>JSON.stringify(tankApp.game.vehicle.recoil))!==frozen)throw Error('暂停仍推进后坐');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{tankApp.game.state='playing';tankApp.refresh();});
 await page.waitForFunction(()=>tankApp.game.reducedMotion&&tankApp.game.vehicle.recoil.tankAge<.15);
 await page.screenshot({path:'output/playwright/tank-recoil/reduced-320.png'});await page.evaluate(()=>{tankApp.game.state='paused';});await page.emulateMedia({reducedMotion:'no-preference'});
 // 正式试射与正式分层坦克同源连续帧；底部显示满级部件的连接关系。
 await page.setViewportSize({width:1280,height:960});
 await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{drawVehicleTracks,drawVehicleArmor}=await import('/src/rendering/vehicle.js'),{createWorkshopTrial}=await import('/src/core/workshop/workshop-trial.js');
  const canvas=document.createElement('canvas');canvas.id='tank-frames';canvas.width=1200;canvas.height=570;canvas.style.cssText='position:fixed;z-index:9999;left:0;top:0;background:#eee8c8';document.body.append(canvas);
  const c=canvas.getContext('2d'),tile=document.createElement('canvas');tile.width=300;tile.height=250;
  for(const [i,phase] of [.02,.10,.3,.8].entries()){
   await renderVisualCase(tile.getContext('2d'),'tank-recoil',phase);c.drawImage(tile,i*300,0);
   const p=structuredClone(tankApp.game.progress);p.vehicleWeapons[18]=20;p.turretParts[18]={rate:5,range:5,capacity:5,reload:5};
   const trial=createWorkshopTrial(p,'vehicle',1);for(let t=0;t<phase;t+=1/120)trial.advance(Math.min(1/120,phase-t));
   const g=trial.game;c.save();c.translate(i*300+130,400);c.scale(1.8,1.8);const player={...g.player,x:0,y:0};drawVehicleTracks(c,player,g.vehicle);drawVehicleArmor(c,player,g.vehicle,g.progress,g.time);c.restore();
  }
 });
 await page.locator('#tank-frames').screenshot({path:'output/playwright/tank-recoil/continuous-frames.png'});await page.evaluate(()=>document.getElementById('tank-frames').remove());
 if(errors.length)throw Error(errors.join('\n'));return {scenes,start,end,errors};
}
