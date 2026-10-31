// 收尾检查修复底板、门前通行以及正式角色、车辆和建筑的昼夜同屏。
async page=>{
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;
  g.update=()=>{};g.enemies=[];g.attackTimer=g.fireClock=999;
  window.fs=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
  g.progress.restoration.repaired=['clearing'];g.progress.restoration.build=null;
  g.requestFacility('garage');a.refresh();
 });
 await page.setViewportSize({width:320,height:568});await page.waitForTimeout(120);
 const tip=await page.locator('#operation-guide').count();
 if(tip&&await page.locator('#operation-guide').isVisible())throw Error('修复页仍显示操作提示');
 await page.screenshot({path:'output/playwright/restoration-panel-320.png'});
 await page.locator('#restoration-close').click();
 const access=await page.evaluate(async()=>{
  const {moveBody,blocked}=await import('/src/physics/motion.js'),g=a.game;
  return fs.map(f=>{
   const body={...g.player,x:f.site.x,y:f.site.y+90,vx:0,vy:0,parkingBarriers:[]};
   for(let i=0;i<25;i++)moveBody(body,0,-3,g.bounds,12,g.trees);
   return {id:f.id,near:Math.hypot(body.x-f.site.x,body.y-f.site.y)<=55,blocked:blocked(body.x,body.y,12,g.trees,body)};
  });
 });if(access.some(r=>!r.near||r.blocked))throw Error('门前通行失败 '+JSON.stringify(access));
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{
  const g=a.game,{RANGER}=await import('/src/config/ranger-arrival.js');
  g.progress.vehicleHulls[RANGER.scooter]=1;
  g.progress.campParking.owned=[{hull:RANGER.scooter,spot:RANGER.parkingId,hp:1,ammo:0,reload:0,wheel:0,track:0}];
  g.progress.restoration.repaired=['clearing'];g.progress.restoration.build=null;
  Object.assign(g.player,{x:560,y:1030,vx:0,vy:0});a.renderer.camera.time=null;
  g.spawnEnemy(0,0,{x:665,y:1105},{ambient:true});
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
  await page.waitForTimeout(180);await page.screenshot({path:'output/playwright/restoration-ensemble-'+time+'.png'});
 }
 await page.evaluate(result=>window.restorationFinishResult=result,{access});
}
