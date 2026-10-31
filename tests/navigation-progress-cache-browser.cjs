// 独立服务检查正式移动与接入等待：旧路点不能闪回，地面表现按手机昼夜同屏复核。
async page=>{
 if(new URL(page.url()).port!=='4176')throw Error('仅允许隔离验收端口 4176');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const {application:a}=await import('/src/main.js');a.menu.enter();await a.ready;window.a=a;
  const {freshProgress}=await import('/src/game.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  const p=freshProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.bosses=1;
  const g=a.game;g.progress=p;g.reset();g.state='playing';document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const {CLEARING_APPROACH}=await import('/src/config/clearing.js');Object.assign(g.player,CLEARING_APPROACH);
  g.mainlineSpeech=null;g.encounterTimer=999;g.parkingVisitTimer=999;g.attack=()=>false;
  if(!(await import('/src/core/clearing-guide.js')).acceptClearingPost(g).ok)throw Error('清缴接取失败');
  window.nav=await import('/src/core/story-route.js');a.refresh();
 });
 await page.waitForFunction(()=>nav.storyRouteState(a.game)?.reachable);
 await page.evaluate(()=>{
  const g=a.game,r=nav.storyRouteState(g),update=g.update.bind(g);
  window.movement={path:r.points,next:1,frames:0,waiting:0,old:0,last:r.points,active:true};window.originalUpdate=update;
  // 按正式路线提供摇杆同源方向，角色移动、碰撞和动作仍由原更新执行。
  g.update=function(dt,input){
   if(movement.active){const p=movement.path[movement.next],dx=p.x-g.player.x,dy=p.y-g.player.y,d=Math.hypot(dx,dy);if(d<8&&movement.next<movement.path.length-1)movement.next++;input={x:dx/Math.max(1,d),y:dy/Math.max(1,d)};}
   const result=update(dt,input),r=nav.storyRouteState(g,a.renderer.view);movement.frames++;
   if(r?.points.length)movement.last=r.points;
   else if(r?.routePoints?.length){movement.waiting++;if(r.routePoints.length!==movement.last.length||r.routePoints.some((p,i)=>Math.hypot(p.x-movement.last[i].x,p.y-movement.last[i].y)>.001))movement.old++;}
   return result;
  };
 });
 await page.waitForFunction(()=>movement.next>=Math.min(10,movement.path.length-2),null,{timeout:30000});
 const sample=await page.evaluate(async()=>{
  movement.active=false;const g=a.game;g.update=()=>{};
  const {questLineClear}=await import('/src/physics/quest-route.js'),{createPlayerNavigationIndex,playerNavigationBody}=await import('/src/core/prepared-navigation.js');
  const index=createPlayerNavigationIndex(g.trees),at={x:g.player.x,y:g.player.y};window.routeAt=at;
  // 选择真实可站立的偏离位置，冻结时钟保留搜索等待帧，检查正式绘制读取的缓存。
  for(const distance of [180,240,300,360])for(let n=0;n<16;n++){
   Object.assign(g.player,at);g.time+=.02;const before=nav.storyRouteState(g,a.renderer.view);if(!before?.reachable)continue;
   const p={x:at.x+Math.cos(n*Math.PI/8)*distance,y:at.y+Math.sin(n*Math.PI/8)*distance};
   if(!questLineClear(p,p,playerNavigationBody(g),index))continue;
   Object.assign(g.player,p);const pending=nav.storyRouteState(g,a.renderer.view);
   if(!pending?.planning||pending.points.length)continue;
   if(pending.routePoints.length!==before.points.length||pending.routePoints.some((p,i)=>Math.hypot(p.x-before.points[i].x,p.y-before.points[i].y)>.001))throw Error('等待帧重新显示了历史路线');
   window.pendingPosition=p;window.expectedRemaining=before.points;a.renderer.camera.time=null;a.refresh();a.renderer.draw();
   return {frames:movement.frames,old:movement.old,waiting:movement.waiting,remaining:pending.routePoints.length,initial:movement.path.length};
  }
  throw Error('未找到接入等待的可通行场景');
 });
 if(sample.old||sample.remaining>=sample.initial)throw Error(JSON.stringify(sample));
 for(const width of [320,390])for(const phase of ['day','night']){
  await page.setViewportSize({width,height:width===320?568:844});
  await page.evaluate(async phase=>{
   const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;
   Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
  },phase);
  const visible=await page.evaluate(()=>nav.visibleRouteDots(nav.storyRouteState(a.game,a.renderer.view),a.renderer.view).length);
  if(!visible)throw Error('等待帧没有可见剩余路点');
  await page.screenshot({path:`docs/art-reference/navigation-progress-cache/pending-${width}-${phase}.png`});
 }
 const recovered=await page.evaluate(()=>{
  const g=a.game;Object.assign(g.player,routeAt);g.time+=.02;const r=nav.storyRouteState(g,a.renderer.view);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  return r.reachable&&r.points.length<=expectedRemaining.length;
 });
 if(!recovered)throw Error('移动回路线后未正常恢复');
 await page.screenshot({path:'docs/art-reference/navigation-progress-cache/recovered-390.png'});
 await page.evaluate(()=>{a.game.update=originalUpdate;});
 if(errors.length)throw Error(errors.join(';'));return {pass:true,sample,recovered,errors};
}
