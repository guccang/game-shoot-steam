// 实际浏览器验证停步观察、重获目标、键盘追赶和触摸急转，留存正式昼夜画面。
async page=>{
 if(new URL(page.url()).port!=='4210')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式素材加载失败');window.recoveryApp=a;});
 const results=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async({time})=>{
   const a=recoveryApp,g=a.game,{freshProgress,validateProgress}=await import('/src/progression/progress.js'),{updateMechanical}=await import('/src/combat/mechanical.js');
   const p=freshProgress();p.weapons.fill(1);p.vehicleHulls.fill(1);p.weapon=15;p.weaponParts[15].coordination=8;p.mechanicalLoadout=0;g.progress=validateProgress(p);g.reset();g.start();g.updateWaves=()=>{};g.waveWarning=0;
   g.enemies=[];g.boss=null;Object.assign(g.player,{x:900,y:850,invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-900,t.y-850)>490);
   if(time==='night')g.summonVehicle();
   for(let i=0;i<1500;i++)updateMechanical(g,1/60);
   Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.refresh();
  },{time});
  await page.waitForTimeout(300);
  await page.evaluate(()=>{const g=recoveryApp.game,e=g.spawnEnemy(0,0,{x:1000,y:850});Object.assign(e,{hp:1e7,maxHp:1e7,speed:0,damage:0,flying:false,football:true,mass:10000});window.recoveryEnemy=e;});
  await page.waitForTimeout(650);
  const locked=await page.evaluate(()=>recoveryApp.game.mechanical.nodes.filter(n=>n.targetId===recoveryEnemy.id).length);if(!locked)throw Error('未锁定可见目标');
  await page.screenshot({path:`output/summon-observe/before-${width}-${time}.png`});
  await page.evaluate(()=>{const g=recoveryApp.game;recoveryEnemy.x=g.player.x+g.arrivalView.right+80;recoveryEnemy.vx=recoveryEnemy.vy=0;});
  await page.waitForTimeout(90);
  const observe=await page.evaluate(()=>recoveryApp.game.mechanical.nodes.filter(n=>n.observation).length);if(!observe)throw Error('目标出屏没有观察');
  await page.screenshot({path:`output/summon-observe/observe-${width}-${time}.png`});
  await page.waitForTimeout(950);
  if(await page.evaluate(()=>recoveryApp.game.mechanical.nodes.some(n=>n.observation)))throw Error('观察没有结束');
  await page.screenshot({path:`output/summon-observe/return-${width}-${time}.png`});
  const start=await page.evaluate(()=>({x:recoveryApp.game.player.x,y:recoveryApp.game.player.y}));
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1400);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowDown');await page.waitForTimeout(500);await page.keyboard.up('ArrowDown');
  const motion=await page.evaluate(async start=>{const g=recoveryApp.game,{worldDistance}=await import('/src/world/coordinates.js');return {distance:worldDistance(start,g.player),maxGap:Math.max(...g.mechanical.nodes.filter(n=>n.ready&&n.active&&n.hp>0).map(n=>worldDistance(n,g.player)))};},start);
  if(motion.distance<30||motion.maxGap>420)throw Error(JSON.stringify(motion));
  await page.screenshot({path:`output/summon-observe/catchup-${width}-${time}.png`});await page.waitForTimeout(900);
  results.push({width,time,observe,...motion,...await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectSummonRecovery(recoveryApp.game))});
 }
 // 其余召唤物在手机实际视野中停留并重获目标；不替换正式更新或绘制器。
 for(const index of [12,13,16]){
  await page.evaluate(async index=>{const g=recoveryApp.game;g.progress.weapon=index;g.reset();g.start();g.updateWaves=()=>{};g.waveWarning=0;g.enemies=[];g.trees=[];g.boss=null;Object.assign(g.player,{x:900,y:850});const update=index===16?(await import('/src/combat/spider.js')).updateSpider:(await import('/src/combat/funnel.js')).updateFunnel;for(let i=0;i<1500;i++)update(g,1/60);recoveryApp.refresh();},index);await page.waitForTimeout(250);
  await page.evaluate(()=>{const g=recoveryApp.game,e=g.spawnEnemy(0,0,{x:1000,y:850});Object.assign(e,{hp:1e7,maxHp:1e7,speed:0,damage:0,flying:false,football:true,mass:10000});window.recoveryEnemy=e;});await page.waitForTimeout(120);
  await page.evaluate(()=>{const g=recoveryApp.game;recoveryEnemy.x=g.player.x+g.arrivalView.right+80;recoveryEnemy.vx=recoveryEnemy.vy=0;});await page.waitForTimeout(90);
  const observing=await page.evaluate(()=>{const g=recoveryApp.game,s=g[g.weapon().controller];return [...s.nodes,...(s.mother?[s.mother]:[])].some(n=>n.observation);});if(!observing)throw Error(`武器${index}未观察`);
  await page.screenshot({path:`output/summon-observe/observe-weapon-${index}.png`});
  await page.evaluate(()=>{recoveryEnemy.x=recoveryApp.game.player.x+90;recoveryEnemy.y=recoveryApp.game.player.y+20;});await page.waitForTimeout(120);
  const reacquired=await page.evaluate(()=>{const g=recoveryApp.game,s=g[g.weapon().controller];return [...s.nodes,...(s.mother?[s.mother]:[])].some(n=>n.targetId===recoveryEnemy.id&&!n.observation);});if(!reacquired)throw Error(`武器${index}未重获目标`);
 }
 const box=await page.locator('canvas').first().boundingBox(),cdp=await page.context().newCDPSession(page),x=box.x+box.width*.35,y=box.y+box.height*.7;
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-45,y:y+25}]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/summon-observe/reduced-touch.png'});
 if(errors.length)throw Error(errors.join('\n'));return {results,errors,keyboard:true,touch:true};
}
