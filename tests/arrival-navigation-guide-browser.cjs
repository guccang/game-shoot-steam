// 手机触控验收：使用正式读信、上车入口，检查猫爪与静止采木路点的昼夜显示。
async page=>{
 const origin=new URL(page.url()).origin;
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],checks=[];t.on('pageerror',e=>errors.push(e.message));
 // 固定环境时刻只供昼夜截图，仍使用正式场景绘制与光照。
 async function environment(phase){await t.evaluate(async phase=>{
  a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
  (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
  a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
  a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();
 },phase);}
 try{
  await t.goto(origin);await t.locator('#start').tap();await t.locator('#arrival-skip').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.arrivalTick=a.game.update.bind(a.game);a.game.update=()=>{};});
  for(const [width,height]of [[320,568],[390,844]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});await environment(phase);
   await t.locator('#operation-guide[data-stage="arrival-letter"] .operation-paw').waitFor({state:'visible'});
   for(const selector of ['#arrival-goal','#operation-guide .operation-paw','#operation-guide .operation-tip']){
    const box=await t.locator(selector).boundingBox();if(!box||box.x<0||box.y<0||box.x+box.width>width+1||box.y+box.height>height+1)throw Error('来信指引越界：'+selector+JSON.stringify(box));
   }
   await t.screenshot({path:`output/playwright/beginner-guide/letter-${width}-${phase}.png`});
  }
  await t.locator('#arrival-goal').tap();await t.locator('#arrival-letter-dialog').waitFor({state:'visible'});
  await t.locator('#operation-guide').waitFor({state:'hidden'});
  await t.locator('#arrival-letter-close').tap();await t.locator('#operation-guide[data-stage="arrival-letter"]').waitFor({state:'visible'});
  await t.locator('#arrival-goal').tap();await t.locator('#arrival-letter-done').tap();
  await t.evaluate(async()=>{const {RANGER}=await import('/src/config/ranger-arrival.js');Object.assign(a.game.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
  await t.locator('#vehicle-button').tap();
  const route=await t.evaluate(async()=>{
   arrivalTick(.05);a.game.attackTimer=999;
   const start={x:a.game.player.x,y:a.game.player.y},{storyRouteState,visibleRouteDots}=await import('/src/core/navigation/story-route.js');
   let state,dots=[];for(let i=0;i<60;i++){arrivalTick(.05);a.refresh();a.renderer.draw();state=storyRouteState(a.game);dots=visibleRouteDots(state,a.renderer.view);if(dots.length)break;}
   if(a.game.progress.arrival.phase!=='gather'||!state?.reachable||!dots.length)throw Error('静止时没有采木路点');
   if(start.x!==a.game.player.x||start.y!==a.game.player.y)throw Error('观察期间玩家发生移动');
   return {phase:a.game.progress.arrival.phase,dots:dots.length};
  });checks.push(route);
  if(await t.locator('#arrival-goal').isDisabled())throw Error('采木任务按钮未启用');
  await t.locator('#arrival-goal').tap();
  for(const phase of ['day','night']){await environment(phase);await t.screenshot({path:`output/playwright/beginner-guide/gather-${phase}.png`});}
  if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({checks,errors}));
 }finally{await context.close();}
}
