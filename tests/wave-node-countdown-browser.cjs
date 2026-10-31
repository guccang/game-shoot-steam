// 清缴节奏浏览器回归：正式出生和击杀、单次圆环、暂停交互与昼夜同屏。
async page=>{
 if(new URL(page.url()).port!=='4248')throw Error('仅允许隔离验收端口4248');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.waveApp=(await import('/src/main.js')).application;const a=waveApp;if(!await a.ready)throw Error('资源未就绪');
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=['first-map'];p.mainline.phase='doing';p.living.patrolActive=true;p.living.position={x:1600,y:400};
  a.game.progress=p;a.game.arrivalScene=null;a.game.reset();a.menu.enter();a.game.start();const g=a.game;
  g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.attack=()=>{};g.updateWeaponAbility=()=>{};g.enemies=[];g.trees=[];g.player.hp=1e6;g.player.invincible=999;
  Object.assign(g.player,{x:1600,y:400});Object.assign(g,{wave:2,waveGroupStart:1,bossWave:5,waveKills:0,waveSpawned:0,waveRest:0,waveWarning:0,spawnTimer:0});
  window.births=[];const spawn=g.spawnEnemy.bind(g);g.spawnEnemy=(...args)=>{const e=spawn(...args);e.speed=0;births.push({wave:g.wave,at:g.time,id:e.id});return e;};
  Object.assign(a.environment,{weather:'sun',autoWeather:false,autoTime:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.refresh();
 });
 await page.setViewportSize({width:390,height:844});
 // 一出生就击败，观察下一只继续按波内间隔出现，而不是等待击杀冷却。
 for(let i=1;i<=8;i++){
  await page.waitForFunction(n=>waveApp.game.waveSpawned>=n,i,{timeout:10000});
  await page.evaluate(()=>{const g=waveApp.game;for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);});
 }
 await page.waitForFunction(()=>waveApp.game.waveRest>0);
 const initial=await page.evaluate(()=>({time:waveApp.game.time,births:births.filter(b=>b.wave===2),wave:waveApp.game.wave,rest:waveApp.game.waveRest}));
 if(initial.births.length!==8||initial.births.some((b,i)=>i&&b.at-initial.births[i-1].at>.3))throw Error('击杀中断波内出怪');
 await page.evaluate(()=>{waveApp.game.pause();waveApp.refresh();});
 const paused=await page.evaluate(async()=>({rest:waveApp.game.waveRest,...(await import('/src/rendering/visual-review.js')).inspectWaveProgress(document)}));
 await page.waitForTimeout(250);const still=await page.evaluate(()=>waveApp.game.waveRest);
 if(paused.rest!==still)throw Error('暂停期间倒计时推进');await page.locator('#resume').click();
 const trace=[];
 for(let i=0;i<70;i++){
  await page.waitForTimeout(80);const s=await page.evaluate(async()=>({time:waveApp.game.time,wave:waveApp.game.wave,rest:waveApp.game.waveRest,warning:waveApp.game.waveWarning,...(await import('/src/rendering/visual-review.js')).inspectWaveProgress(document)}));trace.push(s);if(s.wave===3&&!s.countdowns.length)break;
 }
 const end=trace.at(-1),values=[paused,...trace].flatMap(s=>s.countdowns.map(c=>c.progress));
 if(end.wave!==3||end.warning!==0||end.countdowns.length||values.some((v,i)=>i&&v<values[i-1]-.001))throw Error('波间重复预警或圆环回零 '+JSON.stringify({initial,paused,trace,values}));
 await page.waitForFunction(()=>births.some(b=>b.wave===3));
 const transition=await page.evaluate(()=>births.find(b=>b.wave===3).at);
 if(transition-initial.time>3.2)throw Error('三秒结束仍未开始入场');
 // HUD刷新与逻辑更新可能跨一帧，等待节点完成；入场时长以正式出生时间校验。
 // 定格正式计时的半程状态检查原HUD布局，不新增替代画面。
 await page.evaluate(()=>{const g=waveApp.game;g.update=()=>{};g.enemies=g.enemies.filter(e=>e.hp>0).slice(0,3);g.enemyBolts=[];g.numbers=[];g.fx.items=[];g.player.invincible=g.player.flash=0;g.enemies.forEach((e,i)=>{e.x=1670+i*50;e.y=500;e.flash=0;});
  Object.assign(g,{wave:2,waveKills:8,waveSpawned:8,waveRest:1.5,waveWarning:0});g.progress.vehicleHulls[0]=1;g.progress.vehicle=0;g.summonVehicle();});
 const scenes=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{
   const a=waveApp;const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};a.environment.time=time;a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();document.querySelector('#toast')?.classList.remove('visible');
  },time);await page.waitForTimeout(300);
  const s=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWaveProgress(document));
  if(s.countdowns.length!==1||s.countdowns[0].index!==2||Math.abs(s.countdowns[0].progress-.5)>.01||s.overflow||!s.contained)throw Error('半程节点不正确 '+JSON.stringify(s));
  scenes.push({width,time,...s});await page.screenshot({path:`output/playwright/clearing-continuous-waves/ring-${width}-${time}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'wave-node-countdown',births:initial.births,betweenWaves:transition-initial.time,paused:paused.rest===still,scenes,errors};
}
