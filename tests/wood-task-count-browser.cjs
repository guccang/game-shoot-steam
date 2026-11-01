// 木材计数手机回归：真实拾取更新任务卡，查看修复页仍要求入库。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});
  await page.waitForFunction(()=>a.menu.page==='game');
  for(const [arrival,width,height,time] of [[true,390,844,'day'],[false,320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async({arrival,time})=>{
    const {freshProgress,freshRangerProgress}=await import('/src/progression/progress.js'),{RANGER}=await import('/src/config/ranger-arrival.js');
    const p=arrival?freshRangerProgress():freshProgress();p.wood=0;p.vehicleHulls[0]=1;p.vehicleIndex=0;
    if(arrival)Object.assign(p.arrival,{phase:'gather',keys:true,parked:false});
    else{const f=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.find(f=>f.id==='clearing'),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.currentId=f.before;p.mainline.completed=ids.slice(0,ids.indexOf(f.before));p.mainline.phase='doing';p.restoration.cottageRested=true;}
    const g=a.game;g.update=()=>{};g.progress=p;g.reset();if(arrival)(await import('/src/core/ranger-arrival.js')).restoreArrival(g);g.start();g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.vehicle.active=false;Object.assign(g.player,{x:2600,y:1800});
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    window.pickWood=(await import('/src/core/wood-pickup.js')).collectAutomaticWood;
    if(!pickWood(g,{type:'tree',x:2680,y:1800},8))throw Error('背包拾取失败');a.refresh();
   },{arrival,time});
   const selector=arrival?'#arrival-body':'#mainline-hud .mainline-objective',required=arrival?80:40;
   await page.waitForFunction(({selector,required})=>document.querySelector(selector)?.textContent.includes('8/'+required),{selector,required});
   const bagText=await page.locator(selector).textContent();
   await page.evaluate(()=>{const g=a.game;g.vehicle.active=true;if(!pickWood(g,{type:'tree',x:2680,y:1800},8))throw Error('货舱拾取失败');a.refresh();});
   await page.waitForFunction(({selector,required})=>document.querySelector(selector)?.textContent.includes('16/'+required),{selector,required});
   await page.screenshot({path:`output/playwright/wood-task-count/${arrival?'arrival':'mainline'}-${width}-${time}.png`});
   const cargoText=await page.locator(selector).textContent();
   if(arrival)await page.locator('#arrival-goal').click();else await page.locator('#mainline-hud').click();
   const summary=await page.locator(arrival?'#arrival-workshop-cost':'#restoration-summary').textContent();
   if(!summary.includes('16/'+required)||!summary.includes('背包 8')||!summary.includes('载具 8'))throw Error('详情库存不一致 '+summary);
   if(!await page.locator(arrival?'#arrival-workshop-action':'#restoration-repair').isDisabled())throw Error('未入库提前允许施工');
   await page.locator(arrival?'#arrival-workshop-close':'#restoration-close').click();
   await page.evaluate(required=>{const g=a.game;if(!pickWood(g,{type:'tree',x:2680,y:1800},required-16))throw Error('补齐采集失败');a.refresh();},required);
   await page.waitForFunction(({selector,required})=>document.querySelector(selector)?.textContent.includes(required+'/'+required),{selector,required});
   const complete=await page.locator(selector).textContent();
   const inventory=await page.evaluate(async()=>{const g=a.game;return {bank:g.progress.wood,status:(await import('/src/core/wood-task-status.js')).woodTaskStatus(g,40).total};});
   if(inventory.bank!==0||inventory.status!==required)throw Error('库存凭空入库');
   await page.screenshot({path:`output/playwright/wood-task-count/collected-${width}-${time}.png`});
   checks.push({arrival,width,time,bagText,cargoText,summary,complete});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
