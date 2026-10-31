// 正式主循环验证近敌战斗暂停预热，像素释放另由原浏览器对照与生命周期测试验证。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;
   a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;Object.assign(a.game.player,{x:1400,y:1400,invincible:1e6});
   Object.assign(a.environment,{livingPreview:true,forestSeason:a.renderer.ground.season,seasonAt:Date.now(),time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();
  });
  await page.waitForTimeout(1500);
  const before=await page.evaluate(()=>{
   const g=a.renderer.ground;window.oldSeason=g.season;a.environment.forestSeason=g.season==='winter'?'spring':'winter';
   g.setPrewarmPolicy(true);g.update(a.environment,a.renderer.view);g.staged.advance(1,()=>performance.now(),1);
   window.targetPool=g.staged;window.oldPool=g.current;window.oldTiles=[...g.tiles.values()];
   // 正式生成的近敌用于实战门禁，巨量血量只避免自动攻击提前结束测试。
   window.enemy=a.game.spawnEnemy(0,0,{x:a.game.player.x+100,y:a.game.player.y-65},{ambient:true});Object.assign(enemy,{hp:1e9,maxHp:1e9,damage:0,speed:0,livingRequest:'prewarm-check'});a.game.livingBattle='prewarm-check';
   window.frames=[];const advance=g.advance.bind(g);
   // 记录真实传入的预算，不篡改绘制、调度或构建器。
   g.advance=(...args)=>{advance(...args);frames.push({budget:args[2],backgroundMs:g.backgroundMs,reason:g.prewarmReason});};
   return {slices:targetPool.slices,bytes:targetPool.stats().bytes,pendingBytes:targetPool.stats().pendingBytes};
  });
  await page.waitForTimeout(1600);await page.screenshot({path:'output/playwright/season-priority/combat-day.png'});
  await page.evaluate(()=>{a.environment.time='night';a.renderer.light.set(a.environment,performance.now());for(const key in a.renderer.light.started)a.renderer.light.started[key]=performance.now()-20000;});
  await page.waitForTimeout(800);await page.screenshot({path:'output/playwright/season-priority/combat-night.png'});
  const battle=await page.evaluate(before=>{
   const g=a.renderer.ground,stats=targetPool.stats();if(frames.length<10||frames.some(f=>f.budget!==0||f.backgroundMs!==0)||g.current!==oldPool||g.season!==oldSeason||targetPool!==g.staged||stats.slices!==before.slices||stats.bytes!==before.bytes||stats.pendingBytes!==before.pendingBytes)throw Error('战斗预热未完全让出预算：'+JSON.stringify({frames,before,stats}));
   return {frames:frames.length,backgroundMs:frames.reduce((s,f)=>s+f.backgroundMs,0),slices:stats.slices,bytes:stats.bytes,pendingBytes:stats.pendingBytes,stage:g.stats().seasonStaging};
  },before);
  // 移除测试近敌后以主循环真实空闲帧观察恢复；慢设备可以继续保留旧季节。
  await page.evaluate(()=>{a.game.enemies=[];a.game.livingBattle=null;a.game.state='paused';frames.length=0;});
  await page.waitForTimeout(3500);
  const idle=await page.evaluate(()=>({frames:frames.length,allowed:frames.filter(f=>f.budget>0).length,backgroundMs:frames.reduce((s,f)=>s+f.backgroundMs,0),stage:a.renderer.ground.stats().seasonStaging}));
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'season-cache-staging',before,battle,idle,errors};
 }finally{await context.close();}
}
