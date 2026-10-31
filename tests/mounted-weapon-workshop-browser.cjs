// 骑乘工坊回归：真实手机短按、关闭后驾驶、距离限制及首枪任务入口。
async page=>{
 if(new URL(page.url()).port!=='4301')throw Error('仅允许隔离端口 4301');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],results=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4301');await t.evaluate(()=>localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false})));await t.reload();
 await t.locator('#start').tap();await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 // 仅设置场景前置与随机事件时钟，入口、暂停、触摸和驾驶均走正式运行逻辑。
 async function scene(hull,phase,time){
  await t.evaluate(async({hull,phase,time})=>{
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{WORKSHOP}=await import('/src/world/workshop.js');
   const p=freshProgress();p.arrival={version:2,phase,keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[hull]=1;p.vehicleIndex=hull;p.weapon=phase==='complete'?0:14;p.weapons[0]=phase==='complete'?1:0;p.weapons[p.weapon]=1;p.wood=8;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=true;g.enemies=[];g.spawnTimer=g.fireClock=99999;g.mainlineSpeech=null;
   Object.assign(g.player,{x:WORKSHOP.x+90,y:WORKSHOP.y+60,vx:0,vy:0});g.progress.living.calendar.elapsed=time==='night'?260000:75000;
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,weather:'sun',forestSeason:'summer',time:time==='day'?'night':'dusk'});document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  },{hull,phase,time});
  await t.waitForFunction(()=>!a.game.arrivalCinematic&&a.game.state==='playing');
 }
 const entry=t.locator('.world-workshop-entry[data-workshop-kind="weapons"]');
 for(const [hull,width,height,time]of [[5,390,844,'day'],[0,320,568,'night'],[2,390,844,'night']]){
  await t.setViewportSize({width,height});await scene(hull,'complete',time);
  await entry.waitFor({state:'visible'});await t.screenshot({path:`output/playwright/mounted-workshop/scene-${hull}-${time}.png`});
  const before=await t.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,hp:a.game.vehicle.hp}));
  await entry.tap();await t.locator('#workshop-dialog').waitFor({state:'visible'});
  if(!await t.evaluate(hull=>a.game.state==='paused'&&a.game.vehicle.active&&a.game.vehicle.index===hull&&!a.game.cottage,hull))throw Error('骑乘打开工坊改变载具或进入室内');
  await t.screenshot({path:`output/playwright/mounted-workshop/panel-${hull}-${time}.png`});
  await t.locator('#ws-close').tap();await t.waitForFunction(()=>a.game.state==='playing');
  if(!await t.evaluate(p=>a.game.vehicle.active&&a.game.player.x===p.x&&a.game.player.y===p.y&&a.game.vehicle.hp===p.hp,before))throw Error('关闭工坊未保留驾驶现场');
  // 从战场空白处拖动，关闭面板后应继续驾驶且不残留弹窗输入。
  const cdp=await context.newCDPSession(t),x=width/2,y=height*.7;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});await t.waitForTimeout(400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  if(!await t.evaluate(p=>a.game.vehicle.active&&Math.hypot(a.game.player.x-p.x,a.game.player.y-p.y)>2,before))throw Error('关闭后无法继续驾驶');
  results.push({hull,width,time,open:true,resumeDriving:true});
 }
 // 远处不能打开；步行入口保持可用。
 await scene(5,'complete','day');await t.evaluate(()=>{a.game.player.x+=500;a.refresh();});await entry.waitFor({state:'hidden'});
 await scene(5,'complete','day');await t.evaluate(()=>{a.game.vehicle.active=false;a.refresh();});await entry.tap();await t.locator('#workshop-dialog').waitFor({state:'visible'});await t.locator('#ws-close').tap();await t.waitForFunction(()=>a.game.state==='playing');
 // 修好工坊后的首枪任务在赠车上也能查看；未修复时仍只能查看修复说明。
 await scene(5,'craft','day');await entry.tap();await t.locator('#workshop-dialog').waitFor({state:'visible'});if(!await t.evaluate(()=>a.game.vehicle.active))throw Error('首枪入口强制下车');await t.locator('#ws-close').tap();await t.waitForFunction(()=>a.game.state==='playing');
 await scene(5,'gather','day');await entry.tap();await t.locator('#arrival-workshop-dialog').waitFor({state:'visible'});if(await t.locator('#workshop-dialog').isVisible())throw Error('未修复建筑越过解锁');
 if(errors.length)throw Error(errors.join('\n'));await context.close();await page.evaluate(r=>window.mountedWorkshopResult=r,{results,distance:true,onFoot:true,firstGun:true,ruinedLocked:true,errors});
}
