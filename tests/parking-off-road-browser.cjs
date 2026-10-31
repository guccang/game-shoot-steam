// 停车退让实机验收：真实输入与三秒倒车，正式世界绘制采样多端昼夜。
async page=>{
 if(new URL(page.url()).port!=='4284')throw Error('仅限隔离端口4284');
 const errors=[],checks=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:2,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=999;});
 // 夹具只放置起点，候停、移动、倒车和入室均由正式帧循环执行。
 const prepare=async(point)=>page.evaluate(point=>{
  const g=a.game;g.cottage=null;g.cottageEntry=null;g.cottageDoorLatch=false;g.buildingEntry=null;g.enemies=[];g.spawnTimer=g.fireClock=999;
  g.progress.campParking.owned=[];g.vehicle.active=false;g.vehicle=g.vehicles[0];g.progress.vehicleIndex=0;g.summonVehicle();g.parking=null;
  Object.assign(g.player,point,{vx:0,vy:0});a.renderer.camera.time=null;
 },point);
 await prepare({x:445,y:735});
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>a.game.player.x>535);await page.keyboard.up('ArrowRight');
 const before=await page.evaluate(()=>a.game.time);await page.waitForFunction(t=>a.game.time>t+3.5,before);
 checks.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectParkingRoadClearance(a.game,document)));
 if(checks[0].phase||!checks[0].mounted)throw Error('主路短停误触停车');
 await prepare({x:260,y:745});const garageBefore=await page.evaluate(()=>a.game.time);await page.waitForFunction(t=>a.game.time>t+3.5,garageBefore);
 if(await page.evaluate(()=>!!a.game.parking||!a.game.vehicle.active))throw Error('车库外主路误触停车');
 for(const id of ['weapons-west','weapons-east','garage','north-1-2']){
  const spot=await page.evaluate(async id=>(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id===id),id);
  await prepare({x:spot.x+20,y:spot.approachY});
  await page.waitForFunction(()=>a.game.parking?.elapsed>.4);
  if(!await page.evaluate(()=>a.game.vehicle.active))throw Error('倒计时未满即下车');
  await page.waitForFunction(id=>!a.game.vehicle.active&&a.game.progress.campParking.owned.some(s=>s.spot===id),id,{timeout:12000});
  if(spot.kind&&!await page.evaluate(kind=>a.game.cottage?.kind===kind,spot.kind))throw Error('工坊停车后未入室 '+id);
  checks.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectParkingRoadClearance(a.game,document)));
 }
 await page.evaluate(()=>{window.parkingTick=a.game.update.bind(a.game);a.game.update=()=>{};a.game.cottage=null;a.game.vehicle.active=false;a.game.cottageEntry=null;a.game.parking=null;});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night'])for(const scene of ['workshops','north']){
  await page.setViewportSize({width,height});
  await page.evaluate(async({phase,scene})=>{
   const g=a.game;g.enemies=[];g.progress.campParking.owned=[{hull:0,spot:scene==='north'?'north-1-2':'weapons-west',hp:1,ammo:0,reload:0,wheel:0,track:0}];
   Object.assign(g.player,scene==='north'?{x:440,y:430}:{x:500,y:685},{vx:0,vy:0});g.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';
   g.spawnEnemy(0,80);Object.assign(g.enemies[0],{x:g.player.x+85,y:g.player.y+25});a.renderer.camera.time=null;
  },{phase,scene});
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.refresh();});
  await page.waitForTimeout(120);
  const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectParkingRoadClearance(a.game,document));
  if(sample.overflow)throw Error('窄屏溢出');samples.push({width,phase,scene,...sample});
  await page.screenshot({path:`output/playwright/parking-off-road/${scene}-${width}-${phase}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'parking-off-road',checks,samples:samples.map(({spots,...s})=>s),errors};
}
