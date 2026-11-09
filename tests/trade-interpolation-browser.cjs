// 隔离手机页面通过4175加载正式游戏，覆盖worktree模块并记录真实护送与触控移动。
async original=>{
 const fs=require('node:fs'),assert=require('node:assert/strict'),out='output/playwright/trade-interpolation';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],reports=[];
 for(const file of ['src/rendering/render-interpolation.js','src/rendering/camp-trade.js'])await page.route('**/'+file,route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file,'utf8')}));
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.spawnTimer=g.encounterTimer=g.mainlineTalkDelay=999999;g.gameplayPreferences.targetWood=false;
   window.frames=[];const draw=a.renderer.draw.bind(a.renderer),{tradeObjects}=await import('/src/rendering/camp-trade.js');
   a.renderer.draw=function(view){draw(view);const cart=tradeObjects(view).find(o=>o.type==='trade-cart');if(cart)frames.push({at:performance.now(),x:cart.x,y:cart.y,rawX:g.progress.trade.escort.x,rawY:g.progress.trade.escort.y,playerX:view.player.x,cameraX:this.view.x,steps:this.frameTiming.steps,horse:g.tradeMotion?.horseFrame,wheel:view.tradeMotion?.wheelPhase});};
  });
  for(const [width,height,time]of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(g.player,{x:3320,y:3000,vx:0,vy:0});g.state='playing';g.tradeMotion=null;const station=(await import('/src/config/camp-trade.js')).TRADE_STATIONS[0];g.progress.trade.escort={station:station.id,x:3260,y:3000,hp:97,ambush:false,cleared:0};
    const {LIVING_PHASES}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);
   await page.waitForTimeout(1500);await page.evaluate(()=>frames.length=0);
   const cdp=await context.newCDPSession(page),box=await page.locator('#game-frame').boundingBox(),x=box.x+80,y=box.y+height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});
   await page.waitForTimeout(1800);for(let i=0;i<3;i++){await page.screenshot({path:`${out}/${time}-${i}.png`});await page.waitForTimeout(60);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   const result=await page.evaluate(()=>({frames:frames.slice(),hp:g.progress.trade.escort.hp,errors:g.profiler.events.filter(e=>e.type==='frame-error')}));
   const moving=result.frames.filter((f,i)=>i&&Math.hypot(f.rawX-result.frames[i-1].rawX,f.rawY-result.frames[i-1].rawY)>0);
   const between=result.frames.filter((f,i)=>i&&f.steps===0&&Math.hypot(f.x-result.frames[i-1].x,f.y-result.frames[i-1].y)>.001);
   assert.ok(moving.length>10);assert.ok(between.length>10,'逻辑未推进的渲染帧也必须平滑移动');assert.ok(new Set(result.frames.map(f=>f.horse)).size>2);assert.deepEqual(result.errors,[]);
   reports.push({width,height,time,between:between.length,...result});
   await page.evaluate(()=>g.state='paused');await page.waitForTimeout(100);const frozen=await page.evaluate(()=>frames.at(-1));await page.waitForTimeout(150);const held=await page.evaluate(()=>frames.at(-1));assert.equal(held.x,frozen.x);assert.equal(held.y,frozen.y);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({reports,errors},null,2));return reports.map(r=>({time:r.time,frames:r.frames.length,between:r.between}));
 }finally{await context.close();}
}
