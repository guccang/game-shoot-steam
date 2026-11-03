// 使用正式手机游戏验证两格预览、真实放置、暂停与昼夜旋转喷水，不读写玩家存档。
async original=>{
 const base=new URL(original.url()).origin,dir='output/playwright/sprinkler-rotation/';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:dir+'video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 保存正式画面及同一运行时的检查结果。
 async function shot(name){await page.screenshot({path:dir+name+'.png'});const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectSprinklerRotation(a.game));if(r.overflow||r.coverageCells!==20)throw Error('视口或覆盖异常');reviews.push({name,...r});}
 // 改变真实历法，不用独立预览或合成图替代场景。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(150);}

 try{
  await page.goto(base);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(x=>x.id);p.wood=1000;p.mining.ore=100;p.production.minedOre=12;p.production.returned=true;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.trees=[];g.enemies=[];g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=999999;g.livingPersist=()=>true;g.livingWeather='sun';Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});
   const land=await import('/src/world/farm-land.js'),{SPRINKLER_OFFSETS}=await import('/src/config/farm-production.js');const offsets=[[0,0],...SPRINKLER_OFFSETS,[168,52],[112,104]];let point=null;
   for(let y=2000;y<5000&&!point;y+=104)for(let x=2000;x<5000&&!point;x+=112){const q={x,y,mapId:'forest'};Object.assign(g.player,q);if(offsets.every(([dx,dy])=>!land.farmLandReason(g,{...q,x:x+dx,y:y+dy})))point=q;}
   if(!point)throw Error('无合法二格区域');window.site=point;const now=Date.now();g.progress.farm.plots=offsets.slice(1).map(([dx,dy],i)=>({id:i+1,mapId:'forest',x:point.x+dx,y:point.y+dy,crop:i%3===0?3:1,plantedAt:now,readyAt:now+120000,watered:false}));g.progress.farm.nextId=23;g.progress.farm.dug=g.progress.farm.planted=22;Object.assign(g.player,{x:point.x-60,y:point.y});a.renderer.camera.time=null;a.refresh();
  });
  await phase('day');await page.locator('#production-menu').tap();await page.locator('[data-production-tab="build"]').tap();await shot('build-description');
  await page.locator('[data-production-build="sprinkler"]').tap();await page.waitForFunction(()=>a.game.productionCursor);await shot('coverage-preview');
  await page.locator('[data-production-place]').tap();await page.waitForFunction(()=>a.game.productionSpray?.devices?.length);
  for(let i=0;i<3;i++){await shot('live-'+i);await page.waitForTimeout(120);}
  const angles=reviews.filter(r=>r.name.startsWith('live-')).map(r=>r.devices[0].angle);if(new Set(angles).size<2)throw Error('喷头没有随时钟转动');
  const watered=await page.evaluate(()=>a.game.progress.farm.plots.map(p=>!!p.sprinklerWatered));if(!watered.slice(0,20).every(Boolean)||watered.slice(20).some(Boolean))throw Error('浇水范围错误：'+watered);
  await page.locator('#production-menu').tap();const paused=await page.evaluate(()=>a.game.time);await page.waitForTimeout(250);if(await page.evaluate(()=>a.game.time)!==paused)throw Error('暂停时钟仍在前进');await page.locator('[data-production-close]').first().tap();
  await page.waitForFunction(async()=>!(await import('/src/rendering/farm-production.js')).sprinklerPose(a.game.progress.production.sprinklers[0],a.game.time,a.game.productionSpray).active);await shot('finished');
  for(const time of ['day','night']){
   await page.evaluate(()=>a.game.state='playing');await phase(time);
   await page.evaluate(async()=>{
    const c=await import('/src/core/farm-production.js'),g=a.game;g.productionSpray=null;g.livingWeather='sun';for(const p of g.progress.farm.plots){p.watered=false;p.sprinklerWatered=false;p.plantedAt=Date.now();p.readyAt=Date.now()+120000;}
    if(!c.updateProduction(g))throw Error('浇水事件未生成');
    // 连续游玩已录像；固定模拟时刻采样正式绘制器，避免暂停底板遮住喷头。
    window.simulationUpdate??=g.update;g.update=()=>{};g.state='playing';Object.assign(g.player,{x:site.x-10,y:site.y+80});g.enemies=[];g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:site.x+100,y:site.y+90,hp:1,ammo:0}];g.spawnEnemy(0,150,{x:site.x+125,y:site.y-90},{ambient:true});a.renderer.camera.time=null;
   });
   for(const t of [.35,.75,1.15]){await page.evaluate(t=>{a.game.time=a.game.productionSpray.devices[0].time+t;a.refresh();},t);await page.waitForTimeout(120);await shot('spray-'+time+'-'+t);}
  }
  for(const size of [{width:320,height:568},{width:844,height:390},{width:1280,height:900}]){await page.setViewportSize(size);await shot('layout-'+size.width);}
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);await shot('reduced-motion');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{const g=a.game;g.update=window.simulationUpdate;g.state='playing';g.enemies=[];Object.assign(g.player,{x:site.x-48,y:site.y});});const start=await page.evaluate(()=>a.game.player.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(600);await page.keyboard.up('ArrowRight');if(await page.evaluate(()=>a.game.player.x)<start+45)throw Error('洒水器阻碍通行');
  if(errors.length)throw Error(errors.join('\n'));return {base,scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:dir+'failure.png'});throw Error(e.message+' | '+JSON.stringify(await page.evaluate(()=>({state:a.game.state,time:a.game.time,spray:a.game.productionSpray,devices:a.game.progress.production.sprinklers,plots:a.game.progress.farm.plots})))+' | '+errors.join(';'));}finally{await context.close();}
}
