// 默认4175；占用时CLI连接独立工作树端口，连续清缴通过正式结算按钮续接。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),page=await context.newPage();
 try{
 await page.goto(original.url());
 const errors=[],rounds=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.setViewportSize({width:393,height:852});
 await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/game.js')).freshProgress();p.arrival={version:2,phase:"complete",keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=['clearing'];p.weapons[0]=1;
  const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.arrivalScene=null;
  Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);
  const result=(await import('/src/core/story/clearing-guide.js')).acceptClearingPost(g);if(!result.ok)throw Error(result.message);
  // 手动调度战斗，保留实时寻路时钟，避免自动攻击干扰位置和奖励断言。
  Object.assign(g.player,g.progress.living.clearingSite);g.update=dt=>{if(g.state==='playing')g.time+=dt;};a.renderer.camera.time=null;a.refresh();
 });
 for(let round=1;round<=4;round++){
  // 第二、三轮分别在场地边界外和更远处获胜；切出页面后点击续战仍须恢复。
  await page.evaluate(async round=>{const g=a.game;for(let i=0;i<1200&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}if(!g.boss)throw Error(JSON.stringify({message:'未生成领主',state:g.state,wave:g.wave,rest:g.waveRest,active:g.progress.living.patrolActive}));
   if(round===2||round===3){
    // 选真实可站立且能返回的边界外位置，不能把夹具角色放进树干再检查路点。
    const site=g.progress.living.clearingSite,distance=site.radius+(round===2?1:200),{planQuestRoute}=await import('/src/physics/quest-route.js');let position=null;
    for(let i=0;i<32&&!position;i++){const angle=i*Math.PI/16,point={x:site.x+Math.cos(angle)*distance,y:site.y+Math.sin(angle)*distance};if(planQuestRoute({...g.player,...point,mapId:g.mapId,livingCollision:true},site,g.trees).reachable)position=point;}
    if(!position)throw Error('缺少范围外可达夹具');Object.assign(g.player,position);
   }
   g.hit(g.boss,1e9);g.numbers=[];g.particles=[];if(round===2)window.dispatchEvent(new Event('blur'));a.renderer.camera.time=null;a.refresh();
  },round);
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});
  const before=await page.evaluate(()=>({bosses:a.game.progress.bosses,pending:a.game.pendingClearingRound,disabled:document.getElementById('task-reward-next-clearing').disabled,state:a.game.state,xp:a.game.progress.campLevel.xp,site:structuredClone(a.game.progress.living.clearingSite),position:{x:a.game.player.x,y:a.game.player.y}}));
  // 正式昼夜环境配合手机触控，检查结算及失败反馈仍可读。
  await page.evaluate(async round=>{const phase=round%2?'day':'night',g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);},round);
  if(round===3){
   await page.evaluate(()=>{window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});
   await page.locator('#task-reward-next-clearing').tap();
   const failure=await page.evaluate(()=>({open:document.getElementById('task-reward-dialog').open,error:document.getElementById('task-reward-error').textContent,disabled:document.getElementById('task-reward-next-clearing').disabled,pending:a.game.pendingClearingRound,active:a.game.progress.living.patrolActive}));
   if(!failure.open||!failure.error.includes('没有保存成功')||failure.disabled||failure.pending!==round||failure.active)throw Error(JSON.stringify(failure));
   await page.evaluate(()=>{a.game.livingPersist=window.persist;});
  }
  await page.screenshot({path:`output/playwright/clearing-repeat/round-${round}.png`});
  // 第四轮展示新增结束入口；实际昼夜下验证上下顺序和短屏滚动后可点击。
  if(round===4){
   for(const [width,height] of [[320,568],[393,852],[844,390]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();},time);
    await page.locator('#task-reward-next-clearing').scrollIntoViewIfNeeded();
    const end=await page.locator('#task-reward-end-clearing').boundingBox(),next=await page.locator('#task-reward-next-clearing').boundingBox();
    if(!end||!next||end.height<44||next.height<44||end.y+end.height>next.y||end.x<0||end.x+end.width>width||end.y<0||next.y+next.height>height)throw Error('结束与续战按钮布局错误');
    await page.screenshot({path:`output/playwright/clearing-repeat/end-${width}-${time}.png`});
   }
   await page.setViewportSize({width:390,height:844});await page.locator('#task-reward-end-clearing').tap();
   await page.waitForFunction(()=>a.game.state==='playing'&&!document.getElementById('task-reward-dialog').open);
   const ended=await page.evaluate(()=>({active:a.game.progress.living.patrolActive,xp:a.game.progress.campLevel.xp,bosses:a.game.progress.bosses}));
   if(ended.active||ended.xp!==before.xp||ended.bosses!==before.bosses)throw Error('结束后续接或重复奖励');rounds.push({round,before,ended});break;
  }
  await page.locator('#task-reward-next-clearing').tap();
  await page.waitForFunction(()=>a.game.state==='playing'&&!document.getElementById('task-reward-dialog').open,{},{timeout:5000}).catch(async()=>{throw Error(JSON.stringify({round,...await page.evaluate(()=>({state:a.game.state,open:document.getElementById('task-reward-dialog').open,active:a.game.progress.living.patrolActive}))}));});
  const after=await page.evaluate(()=>({open:document.getElementById('task-reward-dialog').open,error:document.getElementById('task-reward-error').textContent,active:a.game.progress.living.patrolActive,state:a.game.state,pending:a.game.pendingClearingRound}));
  rounds.push({round,before,after});
  if(after.open||!after.active||after.state!=='playing')throw Error(JSON.stringify({rounds,errors}));
  if(before.xp!==round*180||before.bosses!==round)throw Error('续接重复发放了清缴奖励');
  if(!(await page.locator('#toast').textContent()).includes(round===1?'原地继续下一轮':'返回本次清缴地点'))throw Error('缺少续战成功反馈');
  // 范围外续接只恢复任务及导航，不传送角色、不提前刷怪、不重复结算奖励。
  const resumed=await page.evaluate(async before=>{const g=a.game,site=g.progress.living.clearingSite,allowed=(await import('/src/core/camp/living-safety.js')).livingWaveAllowed(g),goal=(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(g),wave=g.wave,rest=g.waveRest;
   if(JSON.stringify(site)!==JSON.stringify(before.site)||g.player.x!==before.position.x||g.player.y!==before.position.y||g.progress.campLevel.xp!==before.xp||g.progress.bosses!==before.bosses||g.pendingClearingRound!==0)throw Error('续接改变位置、场地或奖励');
   if(!allowed){if(goal?.site.id!==site.id)throw Error('范围外没有返回导航');g.updateWaves(30);if(g.wave!==wave||g.waveRest!==rest)throw Error('范围外提前刷怪');}
   return {allowed,goal:goal?.key,position:{x:g.player.x,y:g.player.y}};
  },before);rounds.at(-1).resumed=resumed;
  if(round>1){
   await page.waitForFunction(async()=>{const nav=await import('/src/core/navigation/story-route.js');return nav.visibleRouteDots(nav.storyRouteState(a.game,a.renderer.view),a.renderer.view).length>0;});
   rounds.at(-1).dots=await page.evaluate(async()=>{const nav=await import('/src/core/navigation/story-route.js');return nav.visibleRouteDots(nav.storyRouteState(a.game,a.renderer.view),a.renderer.view).length;});
  }
  await page.screenshot({path:`output/playwright/clearing-repeat/continued-${round}.png`});
  // 测试下一轮前回到原场地，让正式调度器继续产生五波及领主。
  await page.evaluate(()=>{const g=a.game,site=g.progress.living.clearingSite;Object.assign(g.player,{x:site.x,y:site.y});a.renderer.camera.time=null;});
 }
 if(errors.length)throw Error(errors.join('\n'));return {rounds,errors};
 }finally{await context.close();}
}
