// 正式浏览器验收：默认4175，端口被既有服务占用时允许4176隔离运行，禁止操作线上存档。
async page=>{
 const url=new URL(page.url());if(url.hostname!=='localhost'||!['4175','4176'].includes(url.port))throw Error('仅允许本地导航验收端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  const {CLEARING_APPROACH}=await import('/src/config/clearing.js'),p=freshProgress();
  const {WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem('forest-patrol-world-revision',WORLD_SAVE_REVISION);
  p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.bosses=1;p.living.position={x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y};p.vehicleHulls[0]=1;p.vehicleIndex=0;
  (await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  let seed=6;window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)});
  window.nav=await import('/src/core/story-route.js');window.review=await import('/src/rendering/visual-review.js');
 });
 await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{
  const {CLEARING_APPROACH}=await import('/src/config/clearing.js'),g=a.game;Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y,invincible:999});
  g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.encounterTimer=999;g.attack=()=>false;g.enemies=[];a.renderer.camera.time=null;a.refresh();
  window.navFrames=[];window.navRecording=true;
  // 每个真实动画帧取正式显示数据；不手动推进搜索时钟或预先等待路径完成。
  function record(){if(!navRecording)return;const g=a.game,r=nav.storyRouteState(g,a.renderer.view);if(g.progress.living.patrolActive&&g.state==='playing')navFrames.push({dots:nav.visibleRouteDots(r,a.renderer.view).length,searchStarts:r?.searchStarts,planning:r?.planning});requestAnimationFrame(record);}requestAnimationFrame(record);
 });
 await page.locator('#clearing-marker').click();await page.locator('#clearing-accept').click();
 await page.waitForFunction(()=>navFrames.length>=20);
 const accepted=await page.evaluate(()=>({first:navFrames[0],empty:navFrames.filter(r=>!r.dots).length,frames:navFrames.length}));
 if(!accepted.first.dots||accepted.first.searchStarts!==0||accepted.empty)throw Error('清缴首帧未复用路线 '+JSON.stringify(accepted));
 await page.locator('#settings-button').click();
 if(await page.evaluate(()=>nav.storyRouteState(a.game,a.renderer.view))!==null)throw Error('暂停仍显示路线');
 await page.locator('#settings-done').click();
 const resumed=await page.evaluate(()=>{const r=nav.storyRouteState(a.game,a.renderer.view);return {dots:nav.visibleRouteDots(r,a.renderer.view).length,searchStarts:r.searchStarts,planning:r.planning};});
 if(!resumed.dots||resumed.searchStarts!==0||resumed.planning)throw Error('恢复重新搜索 '+JSON.stringify(resumed));
 // 使用浏览器触摸输入驱动正式摇杆和真实位移，不直接写入角色坐标。
 const client=await page.context().newCDPSession(page),box=await page.locator('#game-frame').boundingBox(),x=box.x+65,y=box.y+box.height-120;
 const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+42,y}]});
 await page.waitForTimeout(650);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
 const movement=await page.evaluate(before=>({distance:Math.hypot(a.game.player.x-before.x,a.game.player.y-before.y),empty:navFrames.filter(r=>!r.dots).length}),before);
 if(movement.distance<10||movement.empty)throw Error('触控移动光点异常 '+JSON.stringify(movement));
 await page.evaluate(()=>{
  // 同屏夹具移到已验证路线的开阔路段，避免告示牌遮住短屏光点；真实触控位移已在上段独立验收。
  navRecording=false;const g=a.game,r=nav.storyRouteState(g,a.renderer.view),at=r.points.find(p=>Math.hypot(p.x-g.player.x,p.y-g.player.y)>900);
  if(!at)throw Error('缺少开阔路段夹具');Object.assign(g.player,{x:at.x,y:at.y,invincible:0});
  if(!g.summonVehicle()||!g.vehicle.module)throw Error('正式载具未能上车');g.vehicle.module.cooldown=999;
  const e=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y+60});Object.assign(e,{hp:1000000,maxHp:1000000,damage:0,speed:0});a.renderer.camera.time=null;a.refresh();
 });
 await page.waitForTimeout(3500);
 for(const [width,height] of [[320,568],[390,844],[1100,844]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;
   Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();
  },phase);
  await page.waitForTimeout(150);
  const state=await page.evaluate(async()=>{
   const r=review.inspectNavigationClarity(a.game,a.renderer.view),{questLineClear}=await import('/src/physics/quest-route.js');
   return {dots:r.dots.length,searchStarts:r.route.searchStarts,night:a.renderer.light.sample(performance.now()).night,clear:r.route.points.every((p,i,ps)=>!i||questLineClear(ps[i-1],p,{...a.game.player,mapId:a.game.mapId,livingCollision:true},a.game.trees)),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if(!state.dots||state.dots>96||!state.clear||state.overflow)throw Error('同屏导航异常 '+JSON.stringify(state));
  await page.screenshot({path:`output/playwright/navigation-route-resume/route-${width}-${phase}.png`});samples.push({width,height,phase,...state});
 }
 if(errors.length)throw Error(errors.join(';'));
 return {designCriterion:'navigation-path-cache',pass:true,accepted,resumed,movement,samples,errors};
}
