// 手机入职全流程：靠近赠车上车、正式电锯采集及修复，保持骑乘购买手枪。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('游戏测试使用4175端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));
 // 固定逻辑帧只用于稳定观察任务节点，所有按钮仍走真实触摸输入。
 // 同一正式场景切换手机尺寸与环境，检查任务文字、引导及真实按钮没有越界。
 async function pictures(name,expected){
  for(const [width,height]of [[320,568],[390,844],[844,390]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});await t.evaluate(async phase=>{
    a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();
   },phase);
   const hint=name==='mounted-purchase'?'#nearby-interaction':'#operation-guide .operation-tip';
   await t.locator(hint).filter({hasText:expected}).waitFor({state:'visible'});
   for(const selector of ['#arrival-goal','#vehicle-button',hint]){
    const box=await t.locator(selector).boundingBox();if(!box||box.x<0||box.y<0||box.x+box.width>width+1||box.y+box.height>height+1)throw Error(name+' 越界：'+selector+JSON.stringify(box));
    if(selector==='#vehicle-button'&&(box.width<44||box.height<44))throw Error('上下车按钮太小');
   }
   await t.screenshot({path:`output/playwright/arrival-scooter/${name}-${width}-${phase}.png`});
  }
 }
 try{
  await t.goto('http://localhost:4175');await t.locator('#start').tap();await t.locator('#arrival-skip').tap();
  await t.locator('#arrival-goal').tap();await t.locator('#arrival-letter-done').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.arrivalTick=a.game.update.bind(a.game);a.game.update=()=>{};});
  if(await t.locator('#arrival-title').textContent()!=='骑上木制自行车')throw Error('读信后没有上车任务');
  const route=await t.evaluate(async()=>(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game));
  if(route?.task.id!=='arrival-scooter')throw Error('没有赠车路线');
  await t.evaluate(async()=>{const {RANGER}=await import('/src/config/ranger-arrival.js');Object.assign(a.game.player,{x:RANGER.parking.x+12,y:RANGER.parking.y+18});a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
  await pictures('board','靠近木制自行车');await t.setViewportSize({width:390,height:844});
  await t.evaluate(()=>{for(let i=0;i<32&&!a.game.vehicle.active;i++)arrivalTick(.05);arrivalTick(.05);a.refresh();});
  if(!await t.evaluate(()=>a.game.vehicle.active&&a.game.progress.arrival.phase==='gather'))throw Error('实际上车未推进采集');checks.push('读信、路线及靠近上车');
  await t.evaluate(async()=>{
   const {woodPickupCapacity}=await import('/src/core/inventory/wood-pickup.js'),{TREE_REWARD}=await import('/src/config/rewards.js'),{CAMP_WAREHOUSE}=await import('/src/config/wood-storage.js'),{storeWood}=await import('/src/core/inventory/wood-storage.js');
   const g=a.game;for(let n=0;n<40&&g.progress.arrival.phase==='gather';n++){
    const tree=g.trees.find(t=>t.hp>0);Object.assign(g.player,{x:tree.x-50,y:tree.y});g.player.angle=0;
    for(let i=0;i<120&&tree.hp>0&&g.progress.arrival.phase==='gather';i++)arrivalTick(.05);
    if(woodPickupCapacity(g)<TREE_REWARD.wood){Object.assign(g.player,CAMP_WAREHOUSE);if(!storeWood(g).ok)throw Error('木材入库失败');}
   }
   if(g.progress.arrival.phase!=='repair'||!g.vehicle.active)throw Error('骑车采集失败');a.refresh();
  });
  await t.evaluate(async()=>{const {WORKSHOP}=await import('/src/world/workshop.js');Object.assign(a.game.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});arrivalTick(.05);a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
  await t.locator('#nearby-interaction').tap();
  await t.evaluate(()=>{if(a.game.progress.arrival.phase!=='repairing')throw Error('点击修复未投料');for(let i=0;i<180;i++)arrivalTick(.05);a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
  if(!await t.evaluate(()=>a.game.vehicle.active&&a.game.progress.arrival.phase==='craft'))throw Error('修复后未直接引导购枪');
  await pictures('mounted-purchase','购买手枪');checks.push('骑车正式采木、点击修复、直接引导购枪');
  await t.setViewportSize({width:390,height:844});
  if((await t.locator('#arrival-title').textContent()).includes('下车'))throw Error('仍显示下车任务');
  await t.locator('#nearby-interaction').tap();await t.locator('#ws-purchase').tap();
  if(!await t.evaluate(()=>a.game.progress.arrival.phase==='complete'&&a.game.progress.weapons[0]===1&&a.game.vehicle.active))throw Error('骑乘购枪未完成入职或被下车');
  checks.push('保持骑乘通过正式工坊购买手枪');if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(result=>window.arrivalScooterResult=result,{checks,errors});
 }finally{await context.close();}
}
