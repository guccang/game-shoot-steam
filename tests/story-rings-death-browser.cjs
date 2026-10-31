// 战斗圈与冰冻死亡专项：正式场景昼夜采样，真实致命命中与逐像素绘制比对。
async(page)=>{
 if(new URL(page.url()).port!=='4231')throw Error('仅允许隔离端口4231');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();
 await page.evaluate(async()=>{window.ringApp=(await import('/src/main.js')).application;await ringApp.ready;});
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  const a=ringApp,g=a.game;g.enterStory();g.advanceStoryDialogue(true);g.chooseStoryLoadout('frost-guard');g.startStoryStage();
  Object.assign(g.player,{x:780,y:900,invincible:0});const {beginStoryWave,spawnStoryEnemy}=await import('/src/core/story-encounters.js');
  beginStoryWave(g,'SIGN',6,4);spawnStoryEnemy(g,g.player.arena,0);spawnStoryEnemy(g,g.player.arena,1);
  g.story.combat.spawned=2;g.story.combat.timer=999;g.enemies.forEach(e=>{e.hp=e.maxHp=1000;e.speed=0;});g.state='story';a.renderer.draw();a.refresh();
 });
 // 圈半径保持330，沿用地图镜头；不为显示整圈而强制拉远。
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{const a=ringApp;Object.assign(a.environment,{time,season:'spring',weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},time);
  await page.waitForTimeout(1600);
  const sample=await page.evaluate(async()=>{const a=ringApp,v=a.renderer.view,review=(await import('/src/rendering/visual-review.js')).inspectStoryBattleRing(a.game,v),ring=review.arena;
   return {radius:ring.radius,sameArena:review.enemies.every(e=>e.sameArena),zoom:v.zoom,width:v.width,overflow:document.documentElement.scrollWidth>innerWidth};});
  if(sample.radius!==330||!sample.sameArena||sample.zoom!==(sample.width<500?.85:1.05)||sample.overflow)throw Error('战斗圈或地图倍率不一致 '+JSON.stringify(sample));
  samples.push({width,time,...sample});await page.screenshot({path:'output/playwright/story-rings-death/ring-'+width+'-'+time+'.png'});
 }
 await page.setViewportSize({width:390,height:844});
 // 使用正式冰晶命中产生状态，再致命命中；测试不手造死亡残影。
 await page.evaluate(()=>{const a=ringApp,g=a.game,e=g.enemies[0];Object.assign(e,{x:950,y:950});g.hit(e,1,false,{impulse:0,chillDuration:3,chillFactor:.6,weaponIndex:11});a.renderer.draw();a.refresh();});
 await page.waitForTimeout(800);await page.screenshot({path:'output/playwright/story-rings-death/chilled-alive.png'});
 const pixels=await page.evaluate(async()=>{
  const g=ringApp.game,e=g.enemies[0],{drawSlime}=await import('/src/rendering/enemies.js');
  // 两个真实Canvas按同一帧绘制，仅切换chill；死后应像素相同，活体必须保留差异。
  function pixelsFor(target,chill,reduced){const c=document.createElement('canvas');c.width=160;c.height=170;const ctx=c.getContext('2d');drawSlime(ctx,{...target,x:80,y:110,chill},g.time,reduced);return ctx.getImageData(0,0,160,170).data;}
  function difference(target,reduced){const a=pixelsFor(target,3,reduced),b=pixelsFor(target,0,reduced);return a.reduce((n,v,i)=>n+(v!==b[i]),0);}
  const alive=[difference(e,false),difference(e,true)];g.hit(e,99999,false,{impulse:0,weaponIndex:11});
  const corpse=g.remnants.at(-1),dead=[];if(!corpse?.burst)throw Error('死亡动画丢失');
  for(const life of [.6,.35,.08])for(const reduced of [false,true])dead.push(difference({...corpse,life},reduced));
  if(alive.some(n=>n===0)||dead.some(n=>n!==0))throw Error('冰冻白圈生命周期错误 '+JSON.stringify({alive,dead}));
  const {updateEnemies,recycleEnemies}=await import('/src/core/enemy-manager.js');g.state='playing';
  for(let i=0;i<10;i++)updateEnemies(g,.05,g.player);recycleEnemies(g);g.state='story';ringApp.renderer.draw();ringApp.refresh();
  return {alive,dead,deathAnimationPreserved:!!g.remnants.length};
 });
 await page.screenshot({path:'output/playwright/story-rings-death/chilled-dead.png'});
 await page.evaluate(async()=>{const g=ringApp.game,{updateEnemies}=await import('/src/core/enemy-manager.js');g.state='playing';for(let i=0;i<4;i++)updateEnemies(g,.05,g.player);g.state='story';ringApp.renderer.draw();});
 if(await page.evaluate(()=>ringApp.game.remnants.length))throw Error('死亡残影未按寿命回收');
 // 真实键盘移动进入旧圈之外，确认扩大的是可用空间而不仅是描边。
 await page.evaluate(()=>{const g=ringApp.game;Object.assign(g.player,{x:780,y:900,invincible:999});g.state='playing';g.attackTimer=999;g.enemies=[];g.story.combat.timer=999;});
 await page.keyboard.down('w');await page.waitForTimeout(2400);await page.keyboard.up('w');
 const moved=await page.evaluate(()=>{const g=ringApp.game;return Math.hypot(g.player.x-g.player.arena.x,g.player.y-g.player.arena.y);});
 if(moved<=220||moved>330)throw Error('扩大区域不能实际移动 '+moved);
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'story-rings-death-cleanup',passed:true,samples,pixels,moved,errors};
}
