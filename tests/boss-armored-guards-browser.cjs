// 正式召唤木卫验收：手机昼夜、移动盾击、受击与首领死亡撤离。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/progression/progress.js')).freshProgress();p.restoration.cottageRested=true;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';
  const g=a.game;g.random=()=>.5;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.attackTimer=999;g.player.invincible=999;g.update=()=>{};
  Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);
  if(!(await import('/src/core/story/clearing-guide.js')).acceptClearingPost(g).ok)throw Error('接单失败');
  Object.assign(g.player,(await import('/src/progression/story/clearing-site.js')).clearingSite(g.progress));g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>380);g.enemies=[];
  g.bossReady=true;g.bossWave=g.wave;g.waveKills=g.waveSpawned=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;
  if(!g.summonBoss())throw Error('领主生成失败');Object.assign(g.boss,{x:g.player.x-70,y:g.player.y-80});
  const support=await import('/src/core/battle/boss-reinforcements.js'),{updateEnemies}=await import('/src/core/battle/enemy-manager.js');
  if(!support.beginBossSupport(g))throw Error('召唤失败');for(let t=0;t<4;t+=.05)support.updateBossSupport(g,.05);
  window.adds=g.enemies.filter(e=>e.bossSummon);if(adds.length!==2||adds.some(e=>e.species!=='ironwood-bulwark'||e.name!=='铁甲木卫'))throw Error('召唤物不一致');
  const start=adds.map(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y));
  window.tick=seconds=>{for(let t=0;t<seconds-1e-8;t+=.02){updateEnemies(g,.02,{...g.player});g.fx.update(.02);g.time+=.02;}a.refresh();a.renderer.draw();};
  tick(2);if(adds.some((e,i)=>Math.hypot(e.x-g.player.x,e.y-g.player.y)>=start[i]||!(e.armoredWalk>0)))throw Error('木卫未追击或没有步行动作');
  a.renderer.camera.time=null;a.refresh();
 });
 for(const [width,height,time] of [[320,568,'night'],[390,844,'day']]){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+1000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();
  },time);await page.screenshot({path:`output/playwright/boss-armored-guards/${width}-${time}.png`});samples.push({width,time});
 }
 const combat=await page.evaluate(()=>{const g=a.game,e=adds[0];Object.assign(g.player,{x:e.x+65,y:e.y});g.vehicle.active=false;tick(.02);if(e.assault.phase!=='windup')throw Error('未进入盾击前摇');return{hp:e.hp,maxHp:e.maxHp,mass:e.mass,radius:e.radius};});
 await page.screenshot({path:'output/playwright/boss-armored-guards/shield-windup.png'});
 await page.evaluate(()=>{tick(.98);if(adds[0].assault.phase!=='lunge')throw Error('未执行盾击');const hp=adds[0].hp;a.game.hit(adds[0],10);if(adds[0].hp!==hp-10)throw Error('受击未扣血');a.renderer.draw();});
 await page.screenshot({path:'output/playwright/boss-armored-guards/shield-hit.png'});
 await page.evaluate(()=>{a.game.hit(a.game.boss,1e9);if(a.game.enemies.some(e=>e.bossSummon))throw Error('首领死亡未撤走木卫');a.refresh();});
 if(errors.length)throw Error(errors.join('\n'));return{pass:true,samples,combat,cleanup:true,errors,designCriterion:'armored-bulwark'};
 }finally{await context.close();}
}
