// 小屋东侧车位实机验收：点击入位、既有存档取车和正式手机昼夜绘制。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.setViewportSize({width:390,height:844});
 const spot=await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game;g.enemies=[];g.spawnTimer=g.fireClock=999;g.progress.campParking.owned=[];
  g.summonVehicle();const s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id==='cottage');
  Object.assign(g.player,{x:s.x+20,y:s.approachY,vx:0,vy:0});g.parking=null;a.renderer.camera.time=null;return s;
 });
 await page.locator('#nearby-interaction').waitFor({state:'visible'});
 await page.locator('#nearby-interaction').click();
 await page.waitForFunction(()=>!a.game.vehicle.active&&a.game.progress.campParking.owned.some(s=>s.spot==='cottage'),null,{timeout:12000});
 const transfer=await page.evaluate(async()=>{
  const {parkedOwned,vehicleParkingSite,boardParkedVehicle}=await import('/src/core/vehicles/camp-parking.js');
  const g=a.game;g.progress.campParking=JSON.parse(JSON.stringify(g.progress.campParking));
  const parked=parkedOwned(g)[0],site=vehicleParkingSite(g,0);
  if(site.x!==parked.x||site.y!==parked.y)throw Error('取车导航未使用新位置');
  if(!boardParkedVehicle(g,0)||Math.hypot(g.player.x-parked.x,g.player.y-parked.y)>.001)throw Error('旧记录无法从新车位取回');
  return {x:parked.x,y:parked.y,boarded:g.vehicle.active};
 });
 // 交互结束后冻结世界更新，用正式绘制器采集空车位及停驻状态。
 await page.evaluate(()=>{a.game.update=()=>{};a.game.vehicle.active=false;a.game.parking=null;a.game.cottage=null;});
 for(const [width,height] of [[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   const g=a.game;g.enemies=[];g.progress.campParking.owned=phase==='night'?[{hull:0,spot:'cottage',hp:1,ammo:0,reload:0,wheel:0,track:0}]:[];
   Object.assign(g.player,{x:630,y:360,vx:0,vy:0});g.progress.living.calendar.elapsed=phase==='night'?260000:75000;
   a.environment.time=phase==='day'?'night':'day';g.spawnEnemy(0,80);Object.assign(g.enemies[0],{x:660,y:420});a.renderer.camera.time=null;
  },phase);
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.refresh();});
  await page.waitForTimeout(150);
  await page.screenshot({path:`output/playwright/cottage-parking-east/${width}-${phase}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'parking-off-road',spot,transfer,errors};
}
