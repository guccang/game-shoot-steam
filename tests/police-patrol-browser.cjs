// 警车与警察猫使用正式场景进行昼夜、窄屏、连续动作与工坊验收。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#start').click();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/game.js')).freshProgress();
  g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.progress.arrival=null;
  g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  g.progress.coins=g.progress.wood=100000;g.progress.materials.parts=1000;
  g.progress.weapons[0]=1;g.progress.heroes[6]=1;g.progress.hero=6;g.progress.vehicleHulls[8]=1;g.progress.vehicleIndex=8;
  g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.arrivalScene=null;g.update=()=>{};
  Object.assign(g.player,{x:1650,y:450,vx:0,vy:0,angle:0});g.vehicle.active=true;g.enemies=[];g.boss=null;
  g.spawnEnemy(0,0,{x:1780,y:510});g.trees=g.trees.filter(t=>Math.hypot(t.x-1650,t.y-450)>100);
  if(!await (await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('猫真实帧加载失败');
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,forestSeason:'summer'});
 });
 for(const [width,height] of [[320,568],[390,844],[1100,844]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   Object.assign(a.environment,{time});const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.refresh();
  },time);
  await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/police-patrol/${width}-${time}.png`});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面溢出');
 }
 await page.setViewportSize({width:390,height:844});
 for(let frame=0;frame<6;frame++){
  await page.evaluate(frame=>{const g=a.game;g.vehicle.active=false;g.player.bodyAnimation={moveWeight:1,moveTime:frame/12,idleTime:0};g.player.angle=frame*.3;g.player.recoil.flash=frame===2?.1:0;a.refresh();},frame);
  await page.waitForTimeout(60);await page.screenshot({path:`output/playwright/police-patrol/cat-${frame}.png`});
 }
 await page.evaluate(()=>a.workshop.open('vehicle',8));
 await page.screenshot({path:'output/playwright/police-patrol/workshop.png'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({screenshots:13,errors}));
}
