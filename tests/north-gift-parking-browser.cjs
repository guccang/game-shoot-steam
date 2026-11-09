// 北广场赠车在交接、停车接管、昼夜和点击上车后共用正式车体与泊位。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game,{freshRangerProgress}=await import('/src/progression/progress.js'),{skipArrivalJourney}=await import('/src/core/camp/ranger-arrival.js');
  g.progress=freshRangerProgress();skipArrivalJourney(g);
  g.update=()=>{};g.enemies=[];g.attackTimer=g.fireClock=999;
  const {RANGER}=await import('/src/config/ranger-arrival.js');window.gift=RANGER.parking;
  Object.assign(g.player,{x:gift.x+90,y:gift.y-30,vx:0,vy:0});a.renderer.camera.time=null;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,forestSeason:'summer'});
 });
 for(const time of ['day','night']){
  await page.evaluate(async time=>{
   const {LIVING_PHASES}=await import('/src/config/living-world.js');
   a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start;
   a.environment.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.refresh();a.renderer.draw();
  },time);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:width===320?568:width===390?844:900});await page.waitForTimeout(120);
   await page.screenshot({path:'output/playwright/north-gift-'+width+'-'+time+'.png'});
  }
 }
 await page.evaluate(async()=>{
  const g=a.game,{adoptArrivalParking}=await import('/src/core/vehicles/camp-parking.js');
  g.progress.arrival.phase='complete';adoptArrivalParking(g);g.arrivalScene=null;g.progress.restoration.repaired=['garage'];
  Object.assign(g.player,{x:gift.x+90,y:gift.y+18});a.renderer.camera.time=null;a.refresh();
 });
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);
 await page.locator('[data-parked-hull="5"]').evaluate(n=>n.click());
 if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.progress.campParking.owned.length===0))throw Error('北广场点击上车失败');
 if(errors.length)throw Error(JSON.stringify(errors));
 await page.evaluate(result=>window.northGiftResult=result,{errors,shots:6,boarded:true});
}
