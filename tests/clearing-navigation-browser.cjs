// 隔离存档夹具使用正式游戏更新、键盘、怪物工厂与昼夜绘制，留存真实帧预算。
async page=>{
 if(new URL(page.url()).port!=='4239')throw Error('仅限隔离端口4239');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源加载失败');
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
  p.vehicleHulls[0]=1;p.vehicleIndex=0;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);
  const g=a.game;g.progress=p;g.arrivalScene=null;g.reset();a.menu.enter();g.start();g.enemies=[];g.encounterTimer=999;g.mainlineTalkDelay=999;
  Object.assign(g.player,{x:1600,y:400});g.attack=()=>{};
  window.navTrees=g.trees;window.navUpdate=g.update;
  Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();
 });
 // 在页面主世界等待同一导航模块，避免隔离执行环境创建另一份模块缓存。
 async function waitForRoute(){
  for(let i=0;i<200;i++){
   if(await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectQuestLightPath(a.game,document).route?.reachable))return;
   await page.waitForTimeout(100);
  }
  throw Error('正式路线未完成');
 }
 // 在真实动画帧中逐片计算1500单位路径，记录单片耗时，工作量仍由正式生成器限制。
 const performanceResult=await page.evaluate(async()=>{
  const {createQuestRouteSearch}=await import('/src/physics/quest-route.js');
  const search=createQuestRouteSearch({x:1600,y:400,mapId:'forest',livingCollision:true},{x:700,y:1600},[],16000),durations=[];
  let result;
  for(let frame=0;frame<2000&&!result;frame++){
   await new Promise(requestAnimationFrame);const start=performance.now();result=search.advance(frame);durations.push(performance.now()-start);
  }
  if(!result?.reachable)throw Error('长途搜索失败');durations.sort((a,b)=>a-b);
  return {slices:durations.length,steps:search.steps,visited:result.visited,max:durations.at(-1),p95:durations[Math.floor(durations.length*.95)],total:durations.reduce((a,b)=>a+b,0)};
 });
 // 真实战场保持逐帧更新；主动导航不依赖强制任务，连续移动不能让缓存每帧重建。
 await page.evaluate(async()=>{
  const g=a.game;g.trees=[];Object.assign(g.player,{x:1600,y:400});
  (await import('/src/core/world-navigation.js')).requestWorldNavigation(g,{id:'long-navigation-check',x:700,y:1600},'路线验收',{direct:true});
 });
 await waitForRoute();
 const start=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,time:a.game.time}));
 await page.keyboard.down('s');await page.waitForTimeout(400);await page.keyboard.up('s');
 const movement=await page.evaluate(async()=>({x:a.game.player.x,y:a.game.player.y,time:a.game.time,route:(await import('/src/core/story-route.js')).storyRouteState(a.game)}));
 if(movement.y<=start.y||movement.time<=start.time||movement.route.searchStarts!==1)throw Error('真实移动未连续推进或反复重算');
 const samples=[];
 // 同屏夹具恢复正式森林树与载具，用现有工厂固定出生位置，仅冻结移动以比较布局。
 await page.evaluate(async()=>{
  const g=a.game;g.trees=navTrees;Object.assign(g.player,{x:1600,y:400});g.progress.living.patrolActive=true;
  g.wave=3;g.bossWave=5;g.waveGroupStart=1;g.waveSpawned=g.waveKills=0;g.enemies=[];g.summonVehicle();
  const total=(await import('/src/config/waves.js')).waveDifficulty(3).total;
  for(let i=0;i<total;i++){const angle=i*Math.PI*2/total;g.spawnEnemy(0,0,{x:1600+Math.cos(angle)*155,y:400+Math.sin(angle)*150});}
  g.update=()=>{};a.renderer.camera.time=null;a.refresh();
 });
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{
   a.environment.time=time;a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
  },time);
  const state=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectClearingNavigation(a.game,document));
  if(state.overflow||state.slime<state.special*3||state.special!==4)throw Error('编成或布局错误 '+JSON.stringify(state));
  await page.screenshot({path:`output/playwright/clearing-navigation/wave-${width}-${time}.png`});samples.push({width,time,slime:state.slime,special:state.special});
 }
 // 恢复实时更新和步行，使用完整正式树集合验证绕行；昼夜光点数量及每一段都复核碰撞。
 await page.evaluate(async()=>{
  const g=a.game;g.update=navUpdate;g.dismountVehicle();g.progress.living.patrolActive=false;g.enemies=[];
  Object.assign(g.player,{x:1600,y:400});g.encounterTimer=999;
  (await import('/src/core/world-navigation.js')).requestWorldNavigation(g,{id:'long-navigation-check',x:700,y:1600},'路线验收',{direct:true});
 });
 await waitForRoute();
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{
   a.environment.time=time;a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
   },time);
  await waitForRoute();
  const state=await page.evaluate(async()=>{
   const r=(await import('/src/rendering/visual-review.js')).inspectQuestLightPath(a.game,document),{questLineClear}=await import('/src/physics/quest-route.js');
   return {reachable:r.route?.reachable,dots:r.dots.length,clear:r.route.points.every((p,i,ps)=>!i||questLineClear(ps[i-1],p,{...a.game.player,mapId:'forest',livingCollision:true},a.game.trees)),searchStarts:r.route.searchStarts};
  });
  if(!state.reachable||!state.clear||!state.dots||state.dots>24)throw Error('正式长途路线不正确 '+JSON.stringify(state));
  await page.screenshot({path:`output/playwright/clearing-navigation/route-${width}-${time}.png`});samples.push({width,time,...state});
 }
 // 真实点击设置暂停，再关闭恢复；旧目标切换时不残留路径。
 await page.locator('#settings-button').click();
 if(await page.evaluate(async()=> (await import('/src/core/story-route.js')).storyRouteState(a.game))!==null)throw Error('暂停残留路线');
 await page.locator('#settings-done').click();
 await waitForRoute();
 await page.evaluate(async()=>{
  const g=a.game,{requestWorldNavigation}=await import('/src/core/world-navigation.js'),{storyRouteState}=await import('/src/core/story-route.js');
  requestWorldNavigation(g,{id:'other-target',x:2100,y:1300},'切换目标',{direct:true});
  const r=storyRouteState(g);if(r.reachable||r.points.length)throw Error('目标切换残留旧路线');
 });
 if(errors.length)throw Error(errors.join(';'));
 return {pass:true,designCriterion:'clearing-mix-long-navigation',performance:performanceResult,movement:{dy:movement.y-start.y,elapsed:movement.time-start.time,searchStarts:movement.route.searchStarts},samples,errors};
}
