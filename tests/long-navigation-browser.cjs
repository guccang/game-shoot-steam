// 手机触控与四倍 CPU 降速下，验证远程路点及气垫船真实起步，不以状态文字代替位移。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/long-navigation';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],reports=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('启动失败');window.g=a.game;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[3]=1;
   g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.spawnTimer=g.encounterTimer=g.mainlineTalkDelay=999999;g.gameplayPreferences.targetWood=false;g.gameplayPreferences.vehicleTargetWood=false;
   window.startPoint={x:3320,y:3000};window.goal={id:1,name:'远山驿站',x:18000,y:11000,mapId:'forest'};
   const {blocked}=await import('/src/physics/motion.js'),{playerNavigationBody}=await import('/src/core/navigation/prepared-navigation.js');
   // 站点必须是正式规则允许建立的岸上空地，不把随机树干当成不可达站点。
   for(const point of [startPoint,goal]){let safe=false;for(let r=0;r<=800&&!safe;r+=32)for(let angle=0;angle<6.28;angle+=.5){const q={x:point.x+Math.cos(angle)*r,y:point.y+Math.sin(angle)*r};if(!blocked(q.x,q.y,38,g.trees,playerNavigationBody(g))){Object.assign(point,q);safe=true;break;}}if(!safe)throw Error('找不到合法站点');}g.progress.waystations.sites=[goal];
   window.routes=await import('/src/core/navigation/story-route.js');window.navigation=await import('/src/core/navigation/world-navigation.js');
  });
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  for(const phase of ['day','night']){
   await page.evaluate(async phase=>{
    g.waystationTravel=null;if(g.vehicle.active)g.dismountVehicle();Object.assign(g.player,startPoint,{vx:0,vy:0});
    const {LIVING_PHASES}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;
    navigation.requestWorldNavigation(g,goal,'远程路线验收',{direct:true});window.requestedAt=performance.now();a.refresh();
   },phase);
   await page.waitForFunction(()=>routes.storyRouteState(g)?.reachable,null,{timeout:30000});
   const task=await page.evaluate(()=>({milliseconds:performance.now()-requestedAt,distance:routes.storyRouteState(g).distance,dots:routes.visibleRouteDots(routes.storyRouteState(g),a.renderer.view).length,phase:a.environment.time,displacement:Math.hypot(g.player.x-startPoint.x,g.player.y-startPoint.y)}));assert.ok(task.distance>15000);assert.ok(task.dots>0);assert.equal(task.phase,phase);assert.equal(task.displacement,0);await page.screenshot({path:`${out}/task-${phase}.png`});
   await page.evaluate(async()=>{navigation.clearWorldNavigation(g);g.progress.campParking.owned=[{hull:3,mapId:'forest',spot:null,...startPoint,hp:1,ammo:0,wheel:0,track:0,reload:0}];g.vehicles[3].cooldown=0;if(!(await import('/src/core/vehicles/camp-parking.js')).boardParkedVehicle(g,3))throw Error('气垫船上车失败');a.refresh();});await page.waitForTimeout(350);
   await page.locator('#phone-button').tap();await page.locator('#phone-dialog').getByRole('button',{name:'驿站',exact:true}).tap();const requested=Date.now();await page.locator('[data-station-go="1"]').tap();
   await page.waitForFunction(()=>g.waystationTravel?.moving&&Math.hypot(g.player.x-startPoint.x,g.player.y-startPoint.y)>60,null,{timeout:30000});
   const travel=await page.evaluate(()=>({phase:g.waystationTravel.phase,moving:g.waystationTravel.moving,starts:g.waystationTravel.session.searchStarts,visited:g.waystationTravel.session.search.result.visited,distanceMoved:Math.hypot(g.player.x-startPoint.x,g.player.y-startPoint.y),hull:g.vehicle.index,amphibious:g.player.amphibious}));travel.milliseconds=Date.now()-requested;assert.equal(travel.hull,3);assert.equal(travel.amphibious,true);assert.equal(travel.starts,1);await page.screenshot({path:`${out}/hover-${phase}.png`});reports.push({phase,task,travel});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({reports,errors},null,2));return reports;
 }catch(e){console.error(await page.evaluate(()=>({time:g.time,frames:g.profiler?.totalFrames,route:window.routes?.storyRouteDiagnostics(g),trip:g.waystationTravel&&{phase:g.waystationTravel.phase,starts:g.waystationTravel.session?.searchStarts},errors:window.g?.waystationMessage})));fs.writeFileSync(out+'/scene.json',JSON.stringify(await page.evaluate(async()=>({body:(await import('/src/core/navigation/prepared-navigation.js')).playerNavigationBody(g),goal,trees:g.trees.map(t=>({x:t.x,y:t.y,radius:t.radius,hp:t.hp}))}))));await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}

