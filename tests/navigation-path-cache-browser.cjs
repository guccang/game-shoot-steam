// 隔离存档中的真实移动和昼夜同屏验收，使用正式路线、键盘及绘制器。
async page=>{
 if(new URL(page.url()).port!=='4294')throw Error('仅允许隔离验收端口4294');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const main=await import('/src/main.js');main.application.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.vehicleIndex=0;p.living.position={x:1600,y:400};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
 });
 await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{
  window.nav=await import('/src/core/navigation/story-route.js');window.review=await import('/src/rendering/visual-review.js');window.request=(await import('/src/core/navigation/world-navigation.js')).requestWorldNavigation;
  const g=a.game;window.trees=g.trees;g.trees=[];g.enemies=[];g.encounterTimer=999;g.mainlineTalkDelay=999;g.mainlineSpeech=null;g.attack=()=>false;g.progress.living.patrolActive=false;
  Object.assign(g.player,{x:1600,y:400,invincible:999});request(g,{id:'cache-long',x:700,y:1600},'路线验收',{direct:true});
  Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();
 });
 await page.waitForFunction(()=>nav.storyRouteState(a.game)?.reachable,null,{timeout:30000});
 await page.evaluate(()=>{
  window.trace=[];window.recording=true;
  // 只记录真实动画帧结果，不推进额外游戏时间或注入位置。
  function sample(){if(!recording)return;const r=nav.storyRouteState(a.game,a.renderer.view);trace.push({x:a.game.player.x,y:a.game.player.y,dots:nav.visibleRouteDots(r,a.renderer.view).length,full:r?.searchStarts,local:r?.localSearchStarts,joining:r?.joining});requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1600);await page.keyboard.up('ArrowRight');
 await page.waitForFunction(()=>nav.storyRouteState(a.game)?.reachable,null,{timeout:15000});
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(850);await page.keyboard.up('ArrowLeft');
 const movement=await page.evaluate(()=>{recording=false;return {frames:trace.length,start:trace[0],end:trace.at(-1),empty:trace.filter(s=>!s.dots).length,full:Math.max(...trace.map(s=>s.full)),local:Math.max(...trace.map(s=>s.local))};});
 if(movement.empty||movement.full!==1||movement.local<1||movement.end.x<=movement.start.x+50)throw Error('连续移动导航异常 '+JSON.stringify(movement));
 // 回到真实地形，保留角色、树木、怪物和载具，昼夜与尺寸只改变正式镜头。
 await page.evaluate(()=>{
  const g=a.game;g.trees=trees;Object.assign(g.player,{x:1600,y:400});g.summonVehicle();g.vehicle.module.cooldown=999;
  const e=g.spawnEnemy(0,0,{x:1770,y:520});Object.assign(e,{hp:1000000,maxHp:1000000,damage:0,speed:0});
  request(g,{id:'cache-visual',x:700,y:1600},'路线验收',{direct:true});a.refresh();
 });
 for(const width of [320,390,1280])for(const phase of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async phase=>{
   const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;
   Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();
  },phase);
  await page.waitForFunction(()=>nav.storyRouteState(a.game)?.reachable,null,{timeout:30000});
  const state=await page.evaluate(async()=>{
   const r=review.inspectNavigationClarity(a.game,a.renderer.view),{questLineClear}=await import('/src/physics/quest-route.js');
   return {dots:r.dots.length,full:r.route.searchStarts,local:r.route.localSearchStarts,clear:r.route.points.every((p,i,ps)=>!i||questLineClear(ps[i-1],p,{...a.game.player,mapId:'forest',livingCollision:true},a.game.trees)),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if(!state.dots||state.dots>96||!state.clear||state.overflow)throw Error('同屏路线异常 '+JSON.stringify(state));
  await page.screenshot({path:`output/playwright/navigation-path-cache/route-${width}-${phase}.png`});samples.push({width,phase,...state});
 }
 await page.locator('#settings-button').click();if(await page.evaluate(()=>nav.storyRouteState(a.game))!==null)throw Error('暂停未隐藏路线');await page.locator('#settings-done').click();
 await page.waitForFunction(()=>nav.storyRouteState(a.game)?.reachable,null,{timeout:30000});
 if(errors.length)throw Error(errors.join(';'));return {pass:true,designCriterion:'navigation-clarity',movement,samples,errors};
}
