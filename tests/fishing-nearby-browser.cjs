// 正式手机页面复核连续岸段入口、显隐、触控抛竿与昼夜同屏。
const {chromium}=require('D:/ChatGPT/perf-tools/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const out='output/playwright/fishing-nearby';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge'}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],screens=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
try{
 await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();});await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.outdoors.rod=true;p.outdoors.bait=20;p.living.patrolActive=false;
  const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.vehicle.active=false;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=g.attackTimer=99999;g.random=()=>.4;
  window.origin={x:22180.53247164745,y:3339.935126567};Object.assign(g.player,origin,{vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
 });await page.locator('#fishing-nearby').waitFor({state:'visible'});
 // 缺装备、远离、乘车、危险与暂停均不保留误导入口，恢复条件后自动显示。
 for(const [name,change,restore] of [
  ['离开湖岸','a.game.player.x+=3000','Object.assign(a.game.player,origin)'],
  ['鱼饵用尽','a.game.progress.outdoors.bait=0','a.game.progress.outdoors.bait=20'],
  ['未带鱼竿','a.game.progress.outdoors.rod=false','a.game.progress.outdoors.rod=true'],
  ['附近危险','a.game.spawnEnemy(0,100,{x:a.game.player.x+100,y:a.game.player.y});a.game.enemies.at(-1).speed=0','a.game.enemies=[]'],
  ['乘坐载具','a.game.vehicle.active=true','a.game.vehicle.active=false;Object.assign(a.game.player,origin,{vx:0,vy:0})'],
  ['暂停','a.game.state="paused"','a.game.state="playing"']]){
  await page.evaluate(change);await page.locator('#fishing-nearby').waitFor({state:'hidden'});await page.evaluate(restore);await page.locator('#fishing-nearby').waitFor({state:'visible'});
 }
 await page.keyboard.down('d');await page.waitForTimeout(150);await page.keyboard.up('d');assert.ok(await page.evaluate(()=>a.game.player.x>origin.x+5));await page.locator('#fishing-nearby').waitFor({state:'visible'});await page.evaluate(()=>{Object.assign(a.game.player,origin,{vx:0,vy:0});});
 // 正式渲染与按钮尺寸检查，不为桌面新增布局。
 for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,autoTime:false,weather:'sun',autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(250);
  const box=await page.locator('#fishing-nearby').boundingBox();assert.ok(box&&box.width>=44&&box.height>=44&&box.y>=0&&box.y+box.height<=height);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/'+width+'-'+time+'.png'});screens.push({width,height,time,box});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#fishing-nearby').tap();await page.waitForFunction(()=>a.game.fishing?.phase==='ready');assert.equal(await page.locator('#fishing-nearby').isVisible(),false);assert.equal(await page.evaluate(()=>a.game.progress.outdoors.bait),20);
 const cdp=await context.newCDPSession(page),box=await page.locator('#fishing-control').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>a.game.fishing?.phase==='waiting');assert.equal(await page.evaluate(()=>a.game.progress.outdoors.bait),19);await page.screenshot({path:out+'/casting.png'});
 await page.locator('#fishing-cancel').tap();await page.locator('#fishing-nearby').waitFor({state:'visible'});
 const performanceResult=await page.evaluate(async()=>{const {fishingAvailability}=await import('/src/core/activities/outdoors.js');const start=performance.now();for(let i=0;i<100;i++)fishingAvailability(a.game);return {checks:100,elapsedMs:performance.now()-start};});

 // 正式角色、停驻车、远处活怪与湖岸入口同屏，使用真实可通行岸边作视觉复核。
 await page.evaluate(async()=>{
  const g=a.game,{fishingShores}=await import('/src/world/outdoor-sites.js'),{blocked}=await import('/src/physics/motion.js');let found=null;
  for(const shore of fishingShores(g)){
   const dx=shore.x-shore.water.x,dy=shore.y-shore.water.y,n=Math.hypot(dx,dy),nx=dx/n,ny=dy/n;if(ny<.7)continue;
   const car={x:shore.x+nx*80-ny*65,y:shore.y+ny*80+nx*65},enemy={x:shore.x+nx*265+ny*135,y:shore.y+ny*265-nx*135},body={...g.player,mapId:g.mapId,campProgress:g.progress,livingCollision:true};
   if(blocked(car.x,car.y,55,g.trees,body)||blocked(enemy.x,enemy.y,22,g.trees,body))continue;found={shore,car,enemy};break;
  }if(!found)throw Error('未找到同屏复核用的宽阔湖岸');Object.assign(g.player,found.shore,{vx:0,vy:0});g.progress.vehicleHulls[0]=1;g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',...found.car,hp:1,ammo:0,reload:0,wheel:0,track:0}];g.spawnEnemy(0,300,found.enemy,{ordinaryDumpling:true});g.enemies.at(-1).speed=0;a.renderer.camera.time=null;a.refresh();
 });
 for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,autoTime:false,weather:'sun',autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;},time);await page.locator('#fishing-nearby').waitFor({state:'visible'});await page.waitForTimeout(180);await page.screenshot({path:out+'/together-'+width+'-'+time+'.png'});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({designCriterion:'camping-fishing',screens,performanceResult,bait:19,errors},null,2));console.log(JSON.stringify({screens:screens.length,performanceResult,bait:19,errors}));
}catch(e){console.error(e);await page.screenshot({path:out+'/failure.png'});console.log(await page.evaluate(()=>({state:window.a?.game.state,notice:window.a?.game.outdoorNotice,phase:window.a?.game.fishing?.phase})));process.exitCode=1;}finally{await browser.close();}})();
