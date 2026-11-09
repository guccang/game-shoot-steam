// 正式修复时钟、旧施工现场和手机摇杆验证，避免只检查离线几何。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/workshop-repair-collision';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.realUpdate=g.update.bind(g);g.update=()=>{};window.site=(await import('/src/world/workshop.js')).WORKSHOP;const p=(await import('/src/progression/progress.js')).freshRangerProgress(),r=(await import('/src/config/ranger-arrival.js')).RANGER;
   Object.assign(p.arrival,{phase:'repair',keys:true,x:site.x+100,y:site.y-40});p.wood=r.repairWood;g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.encounterTimer=99999;g.vehicle.active=false;g.enemies=[];g.boss=null;g.attackTimer=99999;Object.assign(g.progress.arrival,{x:site.x+100,y:site.y-40});(await import('/src/core/camp/ranger-arrival.js')).restoreArrival(g);
   realUpdate(.01);a.renderer.camera.time=null;a.refresh();
  });
  assert.equal(await page.evaluate(()=>g.progress.arrival.phase),'repairing',JSON.stringify(await page.evaluate(async()=>({arrival:g.progress.arrival,site,player:{x:g.player.x,y:g.player.y},state:g.state,error:g.arrivalError,wood:g.progress.wood,ready:(await import('/src/core/camp/ranger-arrival.js')).arrivalWorkReady(g)}))));await page.screenshot({path:out+'/before.png'});
  const normal=await page.evaluate(()=>{const before={x:g.player.x,y:g.player.y};for(let i=0;i<70;i++)realUpdate(.05);a.refresh();return {before,after:{x:g.player.x,y:g.player.y},phase:g.progress.arrival.phase};});assert.equal(normal.phase,'craft');assert.deepEqual(normal.after,normal.before);
  // 模拟升级前已在北墙内施工的内存状态，完工必须恢复到真实可通行点。
  const recovery=await page.evaluate(async()=>{
   Object.assign(g.progress.arrival,{phase:'repairing',elapsed:2.99,x:site.x,y:site.y-60});Object.assign(g.player,{x:site.x,y:site.y-60,vx:0,vy:0});g.arrivalError=false;realUpdate(.05);a.renderer.camera.time=null;a.refresh();const {blocked}=await import('/src/physics/motion.js');return {phase:g.progress.arrival.phase,x:g.player.x,y:g.player.y,blocked:blocked(g.player.x,g.player.y,12,g.trees,g.player),saved:{x:g.progress.arrival.x,y:g.progress.arrival.y}};
  });assert.equal(recovery.phase,'craft');assert.equal(recovery.blocked,false);assert.ok(Math.hypot(recovery.x-recovery.saved.x,recovery.y-recovery.saved.y)<.001);
  // 真实触控摇杆向北走离工坊，不能只是位置修正后仍原地卡住。
  await page.evaluate(()=>{g.update=realUpdate;});const touch=await context.newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:75,y:400}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:75,y:320}]});await page.waitForFunction(y=>g.player.y<y-25,recovery.y,{timeout:5000});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.evaluate(()=>{g.update=()=>{};a.refresh();});await page.waitForTimeout(1800);
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(150);await page.screenshot({path:out+'/'+width+'-'+time+'.png'});}
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({normal,recovery,errors},null,2));return {normal,recovery,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
