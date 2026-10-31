// 正式设置点击、存档恢复与死亡逐帧验收，使用隔离浏览器存档和4175测试端口。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('游戏测试使用4175端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/monster-death/video',size:{width:390,height:844}}}),t=await context.newPage(),errors=[],results=[];
 t.setDefaultTimeout(15000);t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto('http://localhost:4175');
  await t.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'gather',keys:true};p.restoration.build={id:'cottage',elapsed:1,x:10,y:20};localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
  await t.reload();await t.locator('#start').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;});
  await t.locator('#settings-button').tap();await t.locator('#settings-advanced>summary').tap();await t.locator('#debug-toggle').tap();
  // 真实按钮先经历写盘失败，再重试成功，保证没有部分开放或假成功提示。
  await t.evaluate(()=>{window.oldSet=Storage.prototype.setItem;window.before=structuredClone(a.game.progress);Storage.prototype.setItem=function(){throw Error('验收写入失败');};});
  await t.locator('#unlock-buildings').tap();
  if(!await t.evaluate(()=>JSON.stringify(before)===JSON.stringify(a.game.progress)))throw Error('保存失败仍改变建筑');
  await t.evaluate(()=>{Storage.prototype.setItem=oldSet;});await t.locator('#unlock-buildings').tap();
  if(!await t.locator('#unlock-buildings').isDisabled())throw Error('解锁后按钮没有禁用');
  await t.locator('#unlock-feedback').scrollIntoViewIfNeeded();await t.screenshot({path:'output/playwright/monster-death/debug-success.png'});
  await t.locator('#settings-done').tap();await t.reload();await t.locator('#start').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const {debugBuildingsUnlocked}=await import('/src/progression/debug-grants.js');if(!debugBuildingsUnlocked(a.game.progress)||a.game.progress.restoration.build)throw Error('刷新丢失解锁');a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=99999;});
  // 每帧保持原生绘制入口；角色、载具、活怪、死亡怪、场景及UI实际同屏。
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});
   await t.evaluate(async phase=>{
    const g=a.game;g.drops=[];g.remnants=[];g.enemies=[];g.trees=[];g.numbers=[];g.parking=null;Object.assign(g.player,{x:1600,y:400});g.progress.vehicleHulls[5]=1;g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,120,5);g.vehicle.active=true;
    g.spawnEnemy(0,0,{x:1630,y:490},{ambient:true});
    const armored=(await import('/src/config/armored-enemies.js')).ARMORED.id;
    for(const [x,y,species,ember] of [[1510,345,'slime',false],[1600,290,armored,false],[1690,345,'leaf-bat',false]]){
     const e=g.spawnEnemy(0,0,{x,y},{ambient:true});Object.assign(e,{species,ember});g.hit(e,e.hp+1);
    }
    (await import('/src/core/enemy-manager.js')).recycleEnemies(g);g.numbers=[];g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();window.deathCopies=structuredClone(g.remnants);window.deathFx=structuredClone(g.fx.items);
   },phase);
   for(const time of [.04,.14,.3,.5,.65]){
    const sample=await t.evaluate(async time=>{const g=a.game;g.remnants=deathCopies.map(e=>({...e,life:e.duration-time})).filter(e=>e.life>0);g.fx.items=structuredClone(deathFx);g.fx.update(time);a.renderer.draw();return (await import('/src/rendering/visual-review.js')).inspectMonsterDeath(g);},time);
    if(time<.6&&!sample.poses.some(p=>p.active))throw Error('缺失死亡特效');if(time>.6&&sample.remnants)throw Error('死亡特效未清理');
    await t.screenshot({path:`output/playwright/monster-death/${width}-${phase}-${time}.png`});results.push({width,phase,time,...sample});
   }
   await t.locator('#settings-button').tap();await t.locator('#settings-advanced>summary').tap();await t.locator('#debug-toggle').tap();await t.locator('#unlock-buildings').scrollIntoViewIfNeeded();
   const rect=await t.locator('#unlock-buildings').boundingBox();if(rect.height<44||rect.x<0||rect.x+rect.width>width)throw Error('建筑按钮溢出或触控区不足');
   await t.screenshot({path:`output/playwright/monster-death/settings-${width}-${phase}.png`});await t.locator('#settings-done').tap();
  }
  await t.setViewportSize({width:390,height:844});
  // 实际逐帧播放三次供录制检查，保留先扩散后收束，不以静态帧替代动态验收。
  await t.evaluate(async()=>{for(let cycle=0;cycle<3;cycle++)await new Promise(resolve=>{let start;function frame(now){start??=now;const age=(now-start)/1000;a.game.remnants=deathCopies.map(e=>({...e,life:e.duration-age})).filter(e=>e.life>0);a.game.fx.items=structuredClone(deathFx);a.game.fx.update(age);a.renderer.draw();if(age<.9)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});});
  await t.emulateMedia({reducedMotion:'reduce'});
  const reduced=await t.evaluate(async()=>{a.game.remnants=deathCopies.map(e=>({...e,life:e.duration-.14}));a.renderer.draw();return (await import('/src/rendering/visual-review.js')).inspectMonsterDeath(a.game,true);});
  if(reduced.poses.some(p=>p.chips||p.arcs||p.flash))throw Error('减少动态仍有飞散闪光');await t.screenshot({path:'output/playwright/monster-death/reduced-night.png'});
  if(errors.length)throw Error(errors.join('\n'));return {results,reduced,errors};
 }finally{await context.close();}
}
