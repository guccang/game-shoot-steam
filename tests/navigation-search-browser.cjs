// 手机导航专项：真实按钮上下车、昼夜光点和树木变化不重算；使用4175端口。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('导航验收必须使用4175端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:4175');
 await page.evaluate(async()=>{
  const main=await import('/src/main.js');main.application.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/game.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.bosses=1;p.vehicleHulls[2]=1;p.vehicleIndex=2;
  const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  let seed=6;window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)});
 });
 await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{
  const g=a.game;window.nav=await import('/src/core/story-route.js');window.routePhysics=await import('/src/physics/quest-route.js');
  const {CLEARING_APPROACH}=await import('/src/config/clearing.js');Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y,flying:false,amphibious:false,treePass:false});g.vehicle.active=false;g.mainlineSpeech=null;g.encounterTimer=999;g.mainlineTalkDelay=999;
  const result=(await import('/src/core/clearing-guide.js')).acceptClearingPost(g);if(!result.ok)throw Error(JSON.stringify(result));a.refresh();
 });
 await page.waitForFunction(()=>nav.storyRouteState(a.game)?.reachable);
 const samples=[];
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{
   const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;
   Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
  },phase);
  for(const action of ['mount','dismount']){
   await page.evaluate(()=>{
    window.trace=[];window.recording=true;const started=performance.now();
    // 仅记录真实动画帧，不手动推进游戏时间或移动角色。
    function sample(){if(!recording)return;const r=nav.storyRouteState(a.game,a.renderer.view);trace.push({elapsed:performance.now()-started,active:a.game.vehicle.active,reachable:!!r?.reachable,planning:!!r?.planning,dots:nav.visibleRouteDots(r,a.renderer.view).length});requestAnimationFrame(sample);}requestAnimationFrame(sample);
   });
   await page.locator('#vehicle-button').click();
   await page.waitForFunction(active=>a.game.vehicle.active===active&&nav.storyRouteState(a.game)?.reachable,action==='mount',{timeout:10000});
   const result=await page.evaluate(()=>{
    recording=false;const g=a.game,r=nav.storyRouteState(g,a.renderer.view),body={...g.player,mapId:g.mapId,livingCollision:true};
    return {trace,points:r.points.length,dots:nav.visibleRouteDots(r,a.renderer.view).length,clear:r.points.every((p,i,ps)=>!i||routePhysics.questLineClear(ps[i-1],p,body,g.trees)),overflow:document.documentElement.scrollWidth>innerWidth,x:g.player.x,y:g.player.y};
   });
   if(!result.clear||!result.dots||result.overflow)throw Error(JSON.stringify(result));
   await page.screenshot({path:'output/playwright/navigation-search-performance/'+phase+'-'+action+'.png'});samples.push({phase,action,...result});
  }
 }
 // 已算路线中插入新树，正式显示不得消失或增加全程搜索次数。
 const treeChange=await page.evaluate(()=>{const g=a.game,before=nav.storyRouteState(g),p=before.points[3];g.trees=[...g.trees,{...p,type:'tree',radius:25,hp:100}];const after=nav.storyRouteState(g);return {before:before.searchStarts,after:after.searchStarts,equal:JSON.stringify(before.points)===JSON.stringify(after.points),reachable:after.reachable};});
 if(!treeChange.equal||!treeChange.reachable||treeChange.before!==treeChange.after)throw Error(JSON.stringify(treeChange));
 await page.setViewportSize({width:320,height:640});await page.screenshot({path:'output/playwright/navigation-search-performance/short-phone.png'});
 if(errors.length)throw Error(errors.join(';'));
 return {pass:true,samples,treeChange,errors};
}
