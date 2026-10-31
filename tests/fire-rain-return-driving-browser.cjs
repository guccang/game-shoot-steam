// 正式雨灭返站回归：隔离存档，在东岸构造起点，之后沿路网用方向输入驾驶，真实点击入库。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],dir='output/playwright/fire-return-driving';page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  const returning=await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   const g=a.game;g.progress=p;g.random=()=>.4;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;window.fireTick=g.update.bind(g);g.update=()=>{};
   Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.refresh();g.livingWeather='sun';if(!g.requestFireRescue()||!g.startFireRescue())throw Error('接警失败');
   const {updateFireRescue,fireObjective}=await import('/src/core/fire-rescue.js');for(let i=0;i<5000&&g.fireTransit;i++)updateFireRescue(g,.05);if(g.fireRescue.phase!=='active')throw Error('出库失败');
   const source=g.fireRescue.waters[0];Object.assign(g.player,{x:source.x,y:source.y,vx:0,vy:0});const from={x:g.player.x,y:g.player.y},truck=g.vehicle,hp=truck.hp,coins=g.progress.coins;
   Object.assign(a.environment,{weather:'rain'});a.refresh();g.livingWeather='rain';
   for(let i=0;i<130&&g.fireRescue.phase==='active';i++)updateFireRescue(g,.05);
   if(g.fireRescue.phase!=='returning'||g.fireTransit||g.vehicle!==truck||!truck.active||truck.hp!==hp||g.player.x!==from.x||g.player.y!==from.y||g.progress.coins!==coins||g.progress.realms.records.fire.clears)throw Error('雨灭瞬移、下车或提前结算');
   a.save();a.refresh();return {from,hp,coins,phase:g.fireRescue.phase,target:fireObjective(g).point};
  });
  const views=[];
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1100,800,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);
   await page.waitForTimeout(200);await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));
   const state=await page.evaluate(()=>({phase:a.game.fireRescue.phase,driving:a.game.vehicle.active,black:!document.getElementById('fire-town-transfer').hidden,title:document.getElementById('quest-title').textContent}));
   if(state.black||!state.driving||state.phase!=='returning')throw Error(JSON.stringify(state));views.push({width,time,...state});await page.screenshot({path:`${dir}/${width}-${time}-return.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#start').tap();
  const restored=await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;window.fireTick=g.update.bind(g);g.update=()=>{};return {x:g.player.x,y:g.player.y,hp:g.vehicle.hp,driving:g.vehicle.active,phase:g.fireRescue.phase};});
  if(restored.x!==returning.from.x||restored.y!==returning.from.y||restored.hp!==returning.hp||!restored.driving||restored.phase!=='returning')throw Error('刷新未保留驾驶返程');
  const drive=await page.evaluate(async()=>{
   const g=a.game,{fireRoute,FIRE_PARKING}=await import('/src/world/fire-navigation.js'),{worldDistance}=await import('/src/world/coordinates.js');let frames=0,maxStep=0;
   for(const point of fireRoute(g,FIRE_PARKING)){
    for(let i=0;i<240&&worldDistance(g.player,point)>7;i++){
     const old={x:g.player.x,y:g.player.y},dx=point.x-old.x,dy=point.y-old.y,d=Math.hypot(dx,dy);window.fireTick(.05,{x:dx/d,y:dy/d});frames++;maxStep=Math.max(maxStep,worldDistance(old,g.player));
     if(g.fireTransit||g.fireRescue.phase!=='returning'||!g.vehicle.active||g.progress.realms.records.fire.clears)throw Error('驾驶返程提前转场或结算');
    }
    if(worldDistance(g.player,point)>10)throw Error('返站路径受阻 '+JSON.stringify(point));
   }
   for(let i=0;i<20;i++)window.fireTick(.05);a.refresh();return {frames,maxStep,distance:worldDistance(g.player,FIRE_PARKING),clears:g.progress.realms.records.fire.clears};
  });
  if(!drive.frames||drive.maxStep>15||drive.distance>34||drive.clears)throw Error(JSON.stringify(drive));
  await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='fire-parking'&&!document.getElementById('nearby-interaction').hidden);
  await page.locator('#nearby-interaction').tap();
  const complete=await page.evaluate(async()=>{const g=a.game,{updateFireRescue}=await import('/src/core/fire-rescue.js');if(g.fireRescue.phase!=='parking')throw Error('入库点击未生效');for(let i=0;i<5000&&g.fireTransit;i++)updateFireRescue(g,.05);a.refresh();return {phase:g.fireRescue.phase,driving:g.vehicle.active,clears:g.progress.realms.records.fire.clears,xp:g.progress.campLevel.xp,coins:g.progress.coins};});
  if(complete.phase!=='won'||complete.driving||complete.clears!==1||complete.xp!==50||complete.coins<=returning.coins)throw Error(JSON.stringify(complete));
  // 结算保留任务记录与车库，但奖励面板内外都不应残留消防完成提示条。
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});
  if(await page.locator('#fire-notice').isVisible())throw Error('奖励面板打开时残留完成提示');
  await page.screenshot({path:`${dir}/390-complete.png`});await page.locator('#task-reward-close').tap();
  await page.waitForFunction(()=>!document.getElementById('task-reward-dialog').open&&a.game.state==='playing');
  const cleanup=[];
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
   await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));
   const state=await page.evaluate(()=>({notice:!document.getElementById('fire-notice').hidden,phase:a.game.fireRescue.phase,parked:a.game.fireGarageParked,active:document.getElementById('game-frame').classList.contains('fire-world-active')}));
   if(state.notice||state.active||state.phase!=='won'||!state.parked)throw Error(JSON.stringify(state));cleanup.push({width,time,...state});
   await page.screenshot({path:`${dir}/${width}-${time}-clean.png`});
  }
  await page.reload();await page.locator('#start').tap();
  await page.waitForFunction(()=>document.getElementById('fire-notice')?.hidden===true);
  const next=await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.update=()=>{};const before=g.progress.realms.records.fire.clears;if(g.fireRescue.phase!=='won'||!g.fireGarageParked)throw Error('读档丢失交接记录');if(!g.requestFireRescue())throw Error('无法再次接警');a.refresh();return {phase:g.fireRescue.phase,visible:!document.getElementById('fire-notice').hidden,clears:g.progress.realms.records.fire.clears,before};});
  if(next.phase!=='offered'||!next.visible||next.clears!==next.before)throw Error(JSON.stringify(next));
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'fire-return-driving',returning,views,restored,drive,complete,cleanup,next,errors};
 }finally{await context.close();}
}
