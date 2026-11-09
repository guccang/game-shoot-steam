// 手机摇杆真实拖动验证首次修复期间的步行、骑车与施工完成，不替换移动实现。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL(original.url()||'http://localhost:4175').origin);
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});await page.waitForFunction(()=>a.menu.page==='game');
  await page.evaluate(async()=>{
   window.Game=(await import('/src/core/game.js')).Game;window.RANGER=(await import('/src/config/ranger-arrival.js')).RANGER;window.WORKSHOP=(await import('/src/world/workshop.js')).WORKSHOP;
   window.fresh=(await import('/src/progression/progress.js')).freshRangerProgress;
  });
  const cdp=await context.newCDPSession(page);
  for(const [mounted,width,height,time] of [[false,390,844,'day'],[true,320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async ({mounted,time})=>{
    const p=fresh();Object.assign(p.arrival,{phase:'repair',keys:true,parked:false,elapsed:0,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood;p.vehicleHulls[RANGER.scooter]=1;p.vehicleIndex=RANGER.scooter;
    const g=a.game;g.update=()=>{};g.progress=p;g.reset();(await import('/src/core/camp/ranger-arrival.js')).restoreArrival(g);g.start();g.attackTimer=999;g.enemies=[];
    if(mounted&&!g.summonVehicle())throw Error('骑乘准备失败');
    if(g.progress.arrival.phase!=='repairing'&&!g.advanceArrival())throw Error('开工失败 '+JSON.stringify({phase:g.progress.arrival.phase,state:g.state,x:g.player.x,y:g.player.y,error:g.arrivalError}));
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
   },{mounted,time});
   await page.waitForFunction(()=>!a.game.worldPending);
   const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
   const x=90,y=height-170;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+65,id:1}]});
   await page.evaluate(()=>{a.game.update=Game.prototype.update.bind(a.game);});await page.waitForTimeout(600);
   const moved=await page.evaluate(()=>{const g=a.game;g.update=()=>{};return {x:g.player.x,y:g.player.y,phase:g.progress.arrival.phase,elapsed:g.progress.arrival.elapsed,cinematic:g.arrivalCinematic,mounted:g.vehicle.active,wood:g.progress.wood};});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   if(Math.hypot(moved.x-before.x,moved.y-before.y)<20||moved.phase!=='repairing'||moved.cinematic||moved.mounted!==mounted||moved.wood!==0)throw Error('施工移动异常 '+JSON.stringify({before,moved}));
   await page.screenshot({path:`output/playwright/arrival-repair-movement/${mounted?'scooter':'walk'}-${width}-${time}.png`});
   await page.evaluate(()=>{a.game.update=Game.prototype.update.bind(a.game);});await page.waitForFunction(()=>a.game.progress.arrival.phase==='craft');
   const after=await page.evaluate(()=>({wood:a.game.progress.wood,mounted:a.game.vehicle.active}));if(after.wood!==8||after.mounted!==mounted)throw Error('完工结算或骑乘被改变');
   checks.push({mounted,width,time,before,moved,after});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
