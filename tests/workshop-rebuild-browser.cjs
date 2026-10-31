// 武器工坊实机验收：正式建筑点击、五秒施工、造枪衔接及昼夜手机截图。
async page=>{
 if(new URL(page.url()).port!=='4277')throw Error('仅限隔离验收端口4277');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshRangerProgress();
  const {RANGER}=await import('/src/config/ranger-arrival.js'),{WORKSHOP}=await import('/src/world/workshop.js');
  p.wood=RANGER.repairWood+RANGER.pistolWood;p.weapons[14]=1;p.vehicleHulls[5]=1;p.vehicleIndex=5;
  Object.assign(p.arrival,{phase:'repair',wood:p.wood,keys:true,x:WORKSHOP.x,y:WORKSHOP.y+35});
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.attackTimer=999;});
 await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();
 if(await page.locator('#arrival-workshop-state').innerText()!=='重建武器工坊')throw Error('重建页面缺失');
 await page.locator('#arrival-workshop-action').click();await page.waitForFunction(()=>a.game.progress.arrival.phase==='repairing'&&a.game.progress.arrival.elapsed>.2);
 await page.evaluate(()=>{window.buildTick=a.game.update.bind(a.game);window.buildElapsed=a.game.progress.arrival.elapsed;a.game.update=()=>{};});
 // 固定正式状态采样三种造型，恢复后继续实际施工，不用展示用替代图。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night'])for(const stage of ['ruined','rebuilding','ready']){
  await page.setViewportSize({width,height});
  const view=await page.evaluate(async({phase,stage})=>{
   const g=a.game;Object.assign(g.progress.arrival,{phase:stage==='ruined'?'repair':stage==='ready'?'craft':'repairing',elapsed:stage==='rebuilding'?2.6:0});
   g.progress.living.calendar.elapsed=phase==='night'?260000:75000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
   Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.renderer.draw();a.refresh();
   const {WORKSHOP}=await import('/src/world/workshop.js'),v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();
   const roof={x:r.left+(WORKSHOP.x-v.x)*v.zoom,y:r.top+(WORKSHOP.y-133-v.y)*v.zoom};
   const result=(await import('/src/rendering/visual-review.js')).inspectWorkshopRebuild(g,document);
   if(stage==='rebuilding'&&(roof.x<55||roof.x>innerWidth-55||roof.y<16||roof.y>innerHeight-16))throw Error('屋顶计时不在可见区');
   // 屋顶提示不能被入职任务卡或操作指引盖住，特别检查320宽窄屏。
   if(stage!=='ruined')for(const id of ['ranger-arrival','operation-guide']){
    const node=document.getElementById(id);if(!node||node.hidden||getComputedStyle(node).display==='none')continue;
    const b=node.getBoundingClientRect();if(b.left<roof.x+53&&b.right>roof.x-53&&b.top<roof.y+16&&b.bottom>roof.y-16)throw Error('屋顶提示被'+id+'遮挡');
   }
   return {...result,roof};
  },{phase,stage});
  if(view.state!==stage||view.overflow)throw Error('状态或布局错误');samples.push({width,lighting:phase,stage,...view});
  await page.screenshot({path:`output/playwright/workshop-rebuild/${stage}-${width}-${phase}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{Object.assign(a.game.progress.arrival,{phase:'repairing',elapsed:window.buildElapsed});a.game.update=window.buildTick;a.refresh();});
 await page.waitForFunction(()=>a.game.progress.arrival.phase==='craft',null,{timeout:10000});
 if(!await page.evaluate(()=>a.game.progress.wood===8&&!document.querySelector('#arrival-workshop-dialog').open))throw Error('成功费用或建成展示时段错误');
 await page.screenshot({path:'output/playwright/workshop-rebuild/success-live.png'});
 await page.locator('#arrival-workshop-dialog').waitFor({state:'visible'});
 if(await page.locator('#arrival-workshop-state').innerText()!=='制作松果手枪')throw Error('未衔接首枪制作');
 await page.locator('#arrival-workshop-action').click();await page.waitForFunction(()=>a.game.progress.arrival.phase==='complete',null,{timeout:8000});
 if(!await page.evaluate(()=>a.game.progress.wood===0&&a.game.progress.weapons[0]===1))throw Error('造枪结算错误');
 // 完成后真实步行穿过门前，检查正式车位附近；复核建筑改形不改变通行。
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(600);await page.keyboard.up('ArrowLeft');
 const moved=await page.evaluate(()=>a.game.player.x);if(moved>=490)throw Error('门前步行受阻');
 await page.evaluate(async()=>{
  const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.spawnTimer=999;g.attackTimer=999;g.update=()=>{};
  Object.assign(g.player,{x:540,y:680,vx:0,vy:0});g.vehicle.active=false;g.progress.vehicleHulls[0]=1;
  g.progress.campParking.owned=[{hull:0,spot:'weapons-west',hp:.8,ammo:10,reload:0,wheel:1,track:0}];
  g.enemies=[];const e=g.spawnEnemy(0,0,{x:640,y:680},{ambient:true});Object.assign(e,{x:640,y:680,speed:0,damage:0});a.renderer.camera.time=null;
 });
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.refresh();},phase);
  await page.screenshot({path:`output/playwright/workshop-rebuild/camp-context-${phase}.png`});
 }
 const atlas=await page.evaluate(async()=>{
  const m=await import('/src/rendering/scenery.js'),canvas=document.createElement('canvas');canvas.width=400;canvas.height=340;const c=canvas.getContext('2d');
  // 四季中的雪屋也走同一正式图集，连续施工不产生逐帧缓存。
  for(const state of ['ruined','ready'])for(const night of [0,1])m.drawScenery(c,{x:190,y:160,kind:'cottage',workshop:true,workshopState:state},night,null,true);
  const before=m.sceneryAtlasStats();for(let i=0;i<100;i++)m.drawScenery(c,{x:190,y:160,kind:'cottage',workshop:true,workshopState:'rebuilding',rebuildProgress:i/100},0,null,true);
  const after=m.sceneryAtlasStats();if(after.count!==before.count||after.bytes!==before.bytes)throw Error('施工图集持续增长');return after;
 });
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'weapon-workshop-rebuild',samples,flow:'重建与制作通过',walk:'通过',atlas,errors};
}
