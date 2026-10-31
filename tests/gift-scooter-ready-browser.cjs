// 手机真实触控检查：正常开场和跳过开场都能在工坊仍破败时使用北广场赠车。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 // 从屏幕实际命中点发送触控，覆盖统一场景输入，不用程序点击绕过车体交互。
 async function tap(locator){
  const b=await locator.boundingBox();if(!b)throw Error('触控目标不可见');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 const results=[];
 for(const [width,height,time,skip] of [[320,568,'day',false],[390,844,'night',true]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  if(skip)await page.locator('#arrival-skip').click();
  await page.waitForFunction(()=>a.game.progress.arrival?.phase==='letter',{},{timeout:30000});
  await page.evaluate(async time=>{
   const g=a.game,{RANGER}=await import('/src/config/ranger-arrival.js');
   if(g.progress.restoration.repaired.length||g.progress.weapons[0])throw Error('必须在尚未修复建筑、尚未买枪的新档验收');
   Object.assign(g.player,{x:1100,y:900,vx:0,vy:0});a.renderer.camera.time=null;
   Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,forestSeason:'summer'});
   const {LIVING_PHASES}=await import('/src/config/living-world.js');
   g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start;
   a.environment.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.refresh();
  },time);
  if(!await page.locator('#vehicle-button').isDisabled())throw Error('远处不能召走北广场赠车');
  await page.evaluate(async()=>{
   const {RANGER}=await import('/src/config/ranger-arrival.js');
   Object.assign(a.game.player,{x:RANGER.parking.x+80,y:RANGER.parking.y-90});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('[data-parked-hull="5"]').waitFor({state:'visible'});
  await page.screenshot({path:'output/playwright/gift-ready-'+width+'-'+time+'-parked.png'});
  await tap(page.locator('[data-parked-hull="5"]'));
  await page.waitForFunction(()=>a.game.vehicle.active);
  await page.screenshot({path:'output/playwright/gift-ready-'+width+'-'+time+'-riding.png'});
  if(await page.locator('dialog[open]').count())throw Error('上车不能打开工坊解锁弹窗');
  await tap(page.locator('#vehicle-button'));await page.waitForFunction(()=>!a.game.vehicle.active);
  await tap(page.locator('#vehicle-button'));await page.waitForFunction(()=>a.game.vehicle.active);
  results.push(await page.evaluate(()=>({phase:a.game.progress.arrival.phase,active:a.game.vehicle.active,garage:a.game.progress.restoration.repaired.includes('garage'),parked:a.game.progress.campParking.owned.length})));
 }
 if(errors.length)throw Error(JSON.stringify(errors));
 console.log(JSON.stringify({results,errors}));
}
