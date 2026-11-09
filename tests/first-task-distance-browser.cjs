// 首篇落点实机：正式场景、运行时绕路、真实输入和手机昼夜同屏。
async page=>{
 if(new URL(page.url()).port!=='4311')throw Error('仅允许隔离端口4311');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4311');await t.locator('#start').tap();
 await t.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=g.progress;
  p.arrival.phase='complete';g.arrivalScene=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.start();a.menu.enter();
  const {storyPostForChapter,storyPostApproach}=await import('/src/core/story/story-posts.js');Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));
  if(!g.enterStory('sunleaf-01'))throw Error('首篇进入失败');g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();a.refresh();
 });
 const routes=await t.evaluate(async()=>{
  const g=a.game,def=(await import('/src/config/story.js')).STORY_CHAPTER,{planQuestRoute}=await import('/src/physics/quest-route.js'),{SpatialGrid}=await import('/src/world/spatial-grid.js'),trees=new SpatialGrid(g.trees),rows=[];
  for(const keys of [['CAMP','SIGN','ROAD1','ROAD2','MINT','RELAY','BOSS','RELAY','CAMP'],['SIGN','SHORT1','MINT']])for(let i=1;i<keys.length;i++){
   const body={...g.player,...def.world.sites[keys[i-1]]};delete body.arena;
   const route=planQuestRoute(body,def.world.sites[keys[i]],trees,16000),distance=route.points.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p.x-route.points[j].x,p.y-route.points[j].y),0);
   if(!route.reachable||distance<1000||distance>1500)throw Error(keys[i-1]+'→'+keys[i]+': '+distance);rows.push({from:keys[i-1],to:keys[i],distance:Math.round(distance)});
  }return rows;
 });
 // 阶段夹具只定位新场地；使用正式怪物和载具绘制，不作为整章通关证据。
 for(const [site,stage]of [['RELAY','Q50'],['BOSS','Q60']])for(const [width,height]of [[320,568],[390,844],[1280,900]]){
  await t.setViewportSize({width,height});await t.evaluate(async({site,stage})=>{
   const g=a.game,s=(await import('/src/config/story.js')).STORY_SITES[site],{beginStoryWave,spawnStoryEnemy,spawnStoryBoss}=await import('/src/core/story/story-encounters.js');
   g.enemies=[];g.boss=null;g.projectiles=[];g.enemyBolts=[];g.hazards=[];delete g.player.arena;Object.assign(g.player,{x:s.x,y:s.y+80,invincible:999});Object.assign(g.story,{stageId:stage,phase:'active',dialogue:null,combat:null,group:0});
   if(site==='RELAY'){beginStoryWave(g,site,10,6);for(let i=0;i<2;i++)if(spawnStoryEnemy(g,s,i))g.story.combat.spawned++;}
   else spawnStoryBoss(g,'boar');
   if(!g.vehicle.active)g.summonVehicle();g.state='playing';for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  },{site,stage});
  const before=await t.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await t.keyboard.down('KeyD');await t.waitForTimeout(180);await t.keyboard.up('KeyD');
  const moved=await t.evaluate(p=>Math.hypot(a.game.player.x-p.x,a.game.player.y-p.y),before);if(moved<1)throw Error(site+'落点无法移动');
  for(const time of ['day','night']){
   await t.evaluate(async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();},time);
   await t.waitForTimeout(80);const sample=await t.evaluate(async()=>({...((await import('/src/rendering/visual-review.js')).inspectStoryCampaign(a.game,document)),time:a.environment.time,position:{x:a.game.player.x,y:a.game.player.y}}));
   if(sample.overflow)throw Error('手机横向溢出');samples.push({site,width,moved,...sample});await t.screenshot({path:`output/playwright/first-task-distance/${site}-${width}-${time}.png`});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {routes,samples,errors};
}
