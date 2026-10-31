// 方向爆裂实机验收：正式致命命中、四向逐帧、昼夜小屏及减少动态，共用4175端口。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/directional-death/video',size:{width:390,height:844}}}),t=await context.newPage(),errors=[],results=[];
 t.on('pageerror',e=>errors.push(e.message));t.setDefaultTimeout(15000);
 try{
  await t.goto('http://localhost:4175');await t.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/game.js')).freshProgress();localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
  await t.reload();await t.locator('#start').tap();await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=99999;});
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});
   await t.evaluate(async phase=>{
    const g=a.game;g.trees=[];g.enemies=[];g.remnants=[];g.drops=[];g.numbers=[];g.fx.items=[];g.parking=null;Object.assign(g.player,{x:1600,y:400});g.progress.vehicleHulls[5]=1;g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,120,5);g.vehicle.active=true;
    g.spawnEnemy(0,0,{x:1500,y:470},{ambient:true});
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },phase);
   for(const [name,angle] of [['right',0],['down',Math.PI/2],['left',Math.PI],['up',-Math.PI/2]]){
    await t.evaluate(async angle=>{
     const g=a.game;g.remnants=[];g.drops=[];g.numbers=[];g.fx.items=[];
     const e=g.spawnEnemy(0,0,{x:1600,y:470},{ambient:true});Object.assign(e,{species:'slime',rank:0,tough:false});
     g.hit(e,e.hp+1,false,{direction:{x:Math.cos(angle),y:Math.sin(angle)},power:1});(await import('/src/core/enemy-manager.js')).recycleEnemies(g);g.numbers=[];
     window.corpse=structuredClone(g.remnants[0]);window.impactFx=structuredClone(g.fx.items);g.player.angle=angle+Math.PI;
    },angle);
    for(const age of [.06,.16,.4]){
     const sample=await t.evaluate(async age=>{const g=a.game;g.remnants=[{...corpse,life:corpse.duration-age}];g.fx.items=structuredClone(impactFx);g.fx.update(age);a.renderer.draw();const {monsterDeathPose,monsterDeathFragments}=await import('/src/config/monster-death.js');return {pose:monsterDeathPose(g.remnants[0]),chips:monsterDeathFragments(g.remnants[0])};},age);
     if(Math.abs(sample.pose.angle-angle)>1e-6)throw Error('爆裂方向偏离致命弹道');if(sample.chips.length!==10)throw Error('碎屑缺失');
     await t.screenshot({path:`output/playwright/directional-death/${width}-${phase}-${name}-${age}.png`});results.push({width,phase,name,age,angle:sample.pose.angle});
    }
   }
  }
  await t.setViewportSize({width:390,height:844});
  // 斜向重击保留延迟和翻滚；播放三轮记录真实时间上的爆裂节奏。
  await t.evaluate(async()=>{const g=a.game;g.remnants=[];const e=g.spawnEnemy(0,0,{x:1600,y:470},{ambient:true});g.hit(e,e.hp+1,false,{direction:{x:.707,y:-.707},power:3,impulse:30});(await import('/src/core/enemy-manager.js')).recycleEnemies(g);g.numbers=[];g.fx.items=[];window.corpse=structuredClone(g.remnants[0]);
   for(let cycle=0;cycle<3;cycle++)await new Promise(resolve=>{let start;function frame(now){start??=now;const age=(now-start)/1000;g.remnants=age<corpse.duration?[{...corpse,life:corpse.duration-age}]:[];a.renderer.draw();if(age<1.3)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  });
  await t.evaluate(()=>{a.game.remnants=[{...corpse,life:corpse.duration-.3}];a.renderer.draw();});await t.screenshot({path:'output/playwright/directional-death/heavy-night.png'});
  await t.emulateMedia({reducedMotion:'reduce'});const reduced=await t.evaluate(async()=>{a.renderer.draw();return (await import('/src/config/monster-death.js')).monsterDeathFragments(a.game.remnants[0],true);});if(reduced.length)throw Error('低动态仍有飞散');await t.screenshot({path:'output/playwright/directional-death/reduced-night.png'});
  if(errors.length)throw Error(errors.join('\n'));return {frames:results.length,directions:4,sizes:3,phases:2,errors};
 }finally{await context.close();}
}
