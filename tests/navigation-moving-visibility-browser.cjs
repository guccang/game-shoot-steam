// 手机沿路移动专项：正式物理与绘制循环逐帧采样，覆盖身后停车变化和昼夜显示。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('导航验收必须使用4175端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/game.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.bosses=1;
  const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);localStorage.setItem(STORAGE_KEYS.progress,JSON.stringify(p));localStorage.setItem(STORAGE_KEYS.audio,JSON.stringify({enabled:false}));localStorage.setItem(STORAGE_KEYS.gameplay,JSON.stringify({pauseOnBlur:false}));
  let seed=6;window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)});
 });
 await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{
  const g=a.game,{CLEARING_APPROACH}=await import('/src/config/clearing.js');window.nav=await import('/src/core/story-route.js');
  Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});g.mainlineSpeech=null;g.encounterTimer=999;g.mainlineTalkDelay=999;g.parkingVisitTimer=999;g.attack=()=>false;
  if(!(await import('/src/core/clearing-guide.js')).acceptClearingPost(g).ok)throw Error('未能接取验收路线');a.refresh();
 });
 await page.waitForFunction(()=>nav.storyRouteState(a.game)?.reachable);
 await page.evaluate(()=>{
  const g=a.game,route=nav.storyRouteState(g),update=g.update.bind(g);window.moving={path:route.points,next:1,frames:0,empty:0,restarts:0,initialSearches:route.searchStarts,parking:false,recording:true};
  // 只提供摇杆同源的移动向量，位移、加速度、碰撞及游戏时间都由正式更新循环推进。
  g.update=function(dt,input){
   if(moving.recording){const target=moving.path[moving.next],dx=target.x-g.player.x,dy=target.y-g.player.y,d=Math.hypot(dx,dy);if(d<7&&moving.next<moving.path.length-1)moving.next++;input={x:dx/Math.max(1,d),y:dy/Math.max(1,d)};}
   const result=update(dt,input);
   if(moving.next>=9){moving.parking=true;g.player.parkingBarriers=[{...moving.path[2],width:72,height:60}];}
   return result;
  };
  // 每个真实动画帧读取正式路点，不通过额外更新推进搜索或玩家位置。
  function sample(){if(!moving.recording)return;const r=nav.storyRouteState(g,a.renderer.view);moving.frames++;if(!nav.visibleRouteDots(r,a.renderer.view).length)moving.empty++;moving.restarts=Math.max(moving.restarts,(r?.searchStarts||0)-moving.initialSearches);requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 const samples=[];
 for(const [phase,next] of [['day',12],['night',20]]){
  await page.evaluate(async phase=>{const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);},phase);
  await page.waitForFunction(next=>moving.next>=next,next,{timeout:30000});
  const result=await page.evaluate(()=>({frames:moving.frames,empty:moving.empty,restarts:moving.restarts,parking:moving.parking,x:a.game.player.x,y:a.game.player.y,dots:nav.visibleRouteDots(nav.storyRouteState(a.game,a.renderer.view),a.renderer.view).length,overflow:document.documentElement.scrollWidth>innerWidth}));
  if(result.empty||result.restarts||!result.parking||!result.dots||result.overflow)throw Error(JSON.stringify(result));
  await page.screenshot({path:'output/playwright/navigation-moving-visibility/'+phase+'.png'});samples.push({phase,...result});
 }
 await page.evaluate(()=>{moving.recording=false;});if(errors.length)throw Error(errors.join(';'));return {pass:true,samples,errors};
}
