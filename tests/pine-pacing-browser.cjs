// 任务文字沿用正式手册、头顶气泡和任务HUD；夹具仅准备已购车检查点。
async page=>{
 if(new URL(page.url()).port!=='4237')throw Error('仅限隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('场景资源未就绪');
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js'),{grantVehicleArmament}=await import('/src/config/vehicle-armaments.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.vehicleHulls[0]=1;p.vehicleIndex=0;grantVehicleArmament(p,0);
  p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pine-patrol'));p.mainline.phase='meet';
  const g=a.game;g.progress=p;g.arrivalScene=null;g.reset();a.menu.enter();g.start();g.enemies=[];g.boss=null;g.encounterTimer=999;Object.assign(g.player,MAINLINE_SITES.garage);
  Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
  a.renderer.camera.time=null;a.refresh();
 });
 await page.locator('#mainline-speech').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/pine-pacing/intro-390.png'});
 await page.locator('.mainline-begin').click();
 if(!await page.evaluate(()=>a.game.progress.mainline.phase==='doing'))throw Error('未接取任务');
 const samples=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{a.environment.time=time;a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();},time);
  await page.locator('#mainline-info').click();
  const sample=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectMainline(a.game,document,a.renderer));
  if(!sample.book.open||sample.book.overflow||sample.overflow)throw Error('任务簿溢出');
  const checklist=await page.locator('.mainline-checklist').innerText();
  if(!checklist.includes('12')||!checklist.includes('清完一波'))throw Error('任务条件不可见');
  await page.screenshot({path:`output/playwright/pine-pacing/book-${width}-${time}.png`});samples.push({width,time,overflow:sample.overflow,book:sample.book});
  await page.locator('#mainline-close').click();
 }
 // 在真实告示牌位置点击接取，并用真实载具按钮上车。
 await page.evaluate(async()=>{const {CLEARING_APPROACH}=await import('/src/config/clearing.js');Object.assign(a.game.player,CLEARING_APPROACH);a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
 await page.locator('#clearing-marker').click();await page.locator('#clearing-accept').click();
 if(!await page.evaluate(()=>a.game.progress.living.patrolActive))throw Error('接取清缴失败');
 await page.locator('#vehicle-button').click();
 if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.vehicle.index===0))throw Error('松果战车未出场');
 // 受控敌群只验证正式机枪与任务链；不将此夹具冒充从新档自然游玩的难度验收。
 await page.evaluate(async()=>{
  const g=a.game;Object.assign(g.player,{x:1600,y:400});g.enemies=[];g.boss=null;g.wave=1;g.waveKills=0;g.waveSpawned=0;g.bossWave=5;g.bossReady=false;g.waveWarning=g.waveRest=0;
  g.updateWaves=()=>{};g.attack=()=>false;g.encounterTimer=999;g.random=()=>.5;
  for(let i=0;i<12;i++){const theta=i*Math.PI/6;const e=g.spawnEnemy(theta,120,{x:1600+Math.cos(theta)*120,y:400+Math.sin(theta)*120});if(!e)throw Error('敌群生成失败');e.hp=e.maxHp=18;e.damage=1;}
  g.update=()=>{};a.renderer.camera.time=null;a.refresh();a.renderer.draw();
 });
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});await page.evaluate(async time=>{a.environment.time=time;a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();},time);
  await page.screenshot({path:`output/playwright/pine-pacing/battle-${width}-${time}.png`});
 }
 await page.evaluate(()=>{delete a.game.update;});
 await page.waitForFunction(()=>a.game.progress.mainline.seen.pineKills>=12,null,{timeout:30000});
 await page.evaluate(()=>{delete a.game.updateWaves;delete a.game.attack;});
 await page.waitForFunction(()=>a.game.progress.mainline.phase==='report');
 await page.evaluate(async()=>{const {MAINLINE_SITES}=await import('/src/config/mainline.js');Object.assign(a.game.player,MAINLINE_SITES.garage);a.game.enemies=[];a.game.mainlineTalkDelay=0;a.renderer.camera.time=null;a.refresh();});
 await page.locator('#mainline-speech').waitFor({state:'visible'});
 const coins=await page.evaluate(()=>a.game.progress.coins);
 await page.screenshot({path:'output/playwright/pine-pacing/report-320.png'});
 await page.locator('.mainline-begin').click();
 const result=await page.evaluate(async()=>({task:(await import('/src/core/story/mainline-manager.js')).mainlineTask(a.game).id,coins:a.game.progress.coins,kills:a.game.progress.mainline.seen.pineKills,waves:a.game.progress.mainline.seen.pineWaves}));
 if(result.task!=='vehicle-service'||result.coins!==coins+180)throw Error('领奖未衔接整备');
 if(errors.length)throw Error(errors.join('\n'));
 return {result,samples,errors};
}
