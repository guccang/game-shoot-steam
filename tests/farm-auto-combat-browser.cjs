// 正式触控与弹道验收：排队收割时发现敌人自动迎敌，击杀后继续原队列，手动退出仍可取消。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-auto-combat/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(18000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const p=(await import('/src/progression/progress.js')).freshProgress(),g=a.game;
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;
   p.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:893+id*56,y:2752,crop:0,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=2;
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.trees=[];g.vehicle.active=false;g.updateWaves=()=>{};
   Object.assign(g.player,{x:893,y:2814,vx:0,vy:0,invincible:99999});window.realUpdate=g.update.bind(g);g.update=()=>{};
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  const cdp=await context.newCDPSession(page);
  // 原生触点从镰刀按钮拖过两块田，释放后保持正式队列，随后交还真实游戏更新。
  async function touch(type,selector){const r=selector?await page.locator(selector).boundingBox():null;await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:r?[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]:[]});}
  await touch('touchStart','#farm-sickle');for(const id of [0,1])await touch('touchMove',`[data-farm-cell="${id}"]`);await touch('touchEnd');
  const before=await page.evaluate(()=>({coins:a.game.progress.coins,queue:structuredClone(a.game.farmWork.queue)}));if(before.queue.length!==2)throw Error('未排入两块田');
  await page.evaluate(()=>{const g=a.game;g.spawnEnemy(0,80,{x:g.player.x+80,y:g.player.y});window.target=g.enemies.at(-1);Object.assign(target,{hp:1000000,maxHp:1000000,speed:0,mass:1000000,damage:0});g.attackTimer=0;g.update=realUpdate;});
  await page.waitForFunction(()=>target.hp<1000000&&a.game.farmWork?.autoCombat);
  await page.waitForFunction(()=>document.querySelector('#farm-combat span').textContent==='迎敌');
  if(await page.evaluate(before=>a.game.progress.coins!==before.coins||a.game.farmWork.queue.length!==2||a.game.farmWork.job||a.game.progress.farm.plots.some(p=>p.crop===null),before))throw Error('自动迎敌没有冻结原队列');
  await page.evaluate(()=>{a.game.player.hp-=1;});await page.waitForTimeout(150);
  if(await page.evaluate(()=>a.game.farmWork?.queue.length!==2))throw Error('受伤清空了农活');
  // 用正式命中入口施加击退，持续观察逻辑帧，不能只在截图瞬间碰巧处于迎敌。
  await page.evaluate(()=>{window.combatDrops=0;const update=a.game.update.bind(a.game);a.game.update=(dt,input)=>{update(dt,input);if(target.hp>0&&!a.game.farmWork?.autoCombat)combatDrops++;};});
  for(const time of ['day','night']){
   await page.evaluate(async time=>{
    const g=a.game;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    Object.assign(target,{x:g.player.x+g.weapon().range-8,y:g.player.y,pushX:0,pushY:0,knockTime:0,z:0,vz:0,mass:1,speed:40});
    g.hit(target,1,false,{direction:{x:1,y:0},impulse:700,pushLimit:700});
   },time);
   await page.waitForFunction(async()=>{const {worldDistance}=await import('/src/world/coordinates.js');return worldDistance(target,a.game.player)>a.game.weapon().range+target.radius;});
   await page.waitForTimeout(800);
   if(await page.evaluate(()=>combatDrops||!a.game.farmWork.autoCombat||a.game.farmWork.queue.length!==2||a.game.farmWork.job))throw Error('击退出射程切回农具或推进了队列');
   await page.screenshot({path:`output/playwright/farm-auto-combat/knockback-${time}.png`});
   // 保留正式追击，恢复大质量仅抑制下一发子弹再次击退，以便验证同一目标回到射程。
   await page.evaluate(()=>{target.mass=1000000;});
   await page.waitForFunction(async()=>{const {worldDistance}=await import('/src/world/coordinates.js');return worldDistance(target,a.game.player)<a.game.weapon().range+target.radius;},null,{timeout:15000});
   if(await page.evaluate(()=>combatDrops||a.game.farmWork.queue.length!==2))throw Error('怪物回返时队列或模式发生抖动');
  }
  await page.evaluate(()=>{a.game.update=realUpdate;});
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(350);
   await page.screenshot({path:`output/playwright/farm-auto-combat/${width}-${time}.png`});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||!a.game.farmWork?.autoCombat||document.querySelector('#farm-combat').getAttribute('aria-pressed')!=='true'))throw Error('迎敌状态或小屏布局不正确');
  }
  await page.setViewportSize({width:390,height:844});
  // 只降低剩余生命，击杀仍由正式子弹完成；随后不再点农具或地块，等待原队列自动完成。
  await page.evaluate(()=>{target.hp=1;});await page.waitForFunction(()=>target.hp<=0);
  await page.waitForFunction(()=>a.game.progress.farm.plots.every(p=>p.crop===null)&&!a.game.farmWork.job&&!a.game.farmWork.queue.length,null,{timeout:25000});
  const result=await page.evaluate(()=>({coins:a.game.progress.coins,tool:a.game.farmWork.tool,auto:a.game.farmWork.autoCombat,label:document.querySelector('#farm-combat span').textContent}));
  if(result.coins!==before.coins+120||result.tool!=='harvest'||result.auto)throw Error('续作结算或原工具丢失 '+JSON.stringify(result));
  await page.screenshot({path:'output/playwright/farm-auto-combat/resumed.png'});
  await page.locator('#farm-exit').tap();if(await page.evaluate(()=>a.game.farmWork||!document.querySelector('#farm-tools').hidden))throw Error('无法退出种田');
  if(errors.length)throw Error(errors.join('\n'));return {before,result,knockbackSwitches:await page.evaluate(()=>combatDrops),errors,video:await page.video().path()};
 }finally{await context.close();}
}
