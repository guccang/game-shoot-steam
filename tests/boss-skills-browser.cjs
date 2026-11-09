// 正式首领绘制与战斗时钟的手机昼夜验收；默认4175，隔离工作树可从当前页面继承端口。
async page=>{
 const origin=new URL(page.url()).origin,errors=[],samples=[];
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  recordVideo:{dir:'output/playwright/boss-variety/video',size:{width:390,height:844}}});
 const t=await context.newPage();t.on('pageerror',e=>errors.push(e.message));await t.goto(origin);
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});
 await t.waitForFunction(()=>a.menu.page==='game');
 await t.evaluate(async()=>{
  const {freshProgress}=await import('/src/progression/progress.js');
  const {MAINLINE_IDS}=await import('/src/config/mainline.js');
  const {TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  const {acceptClearingPost}=await import('/src/core/story/clearing-guide.js');
  const {CLEARING_APPROACH}=await import('/src/config/clearing.js');
  const {clearingSite}=await import('/src/progression/story/clearing-site.js');
  const {waveDifficulty}=await import('/src/config/waves.js');
  const {updateBoss,updateBossHazards}=await import('/src/combat/bosses.js');
  const {updateBossSupport}=await import('/src/core/battle/boss-reinforcements.js');
  const {updateEnemies}=await import('/src/core/battle/enemy-manager.js');
  window.inspect=(await import('/src/rendering/visual-review.js')).inspectBossAttackVariety;
  // 每场重新接取真实清缴，只隔离自动攻击，保留正式领主和怪物工厂。
  window.bossScene=kind=>{
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const p=freshProgress();p.arrival=null;p.bosses=5;p.restoration.cottageRested=true;p.restoration.repaired=TOWN_RESTORATIONS.map(v=>v.id);
   p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.vehicleIndex=0;
   const g=a.game;g.random=()=>.5;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.update=()=>{};
   Object.assign(g.player,CLEARING_APPROACH);if(!acceptClearingPost(g).ok)throw Error('无法接取清缴');
   const site=clearingSite(g.progress);Object.assign(g.player,{x:site.x,y:site.y});g.bossReady=true;g.bossWave=g.wave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;
   if(!g.summonBoss())throw Error('无法生成首领');
   Object.assign(g.boss,{kind,x:g.player.x-70,y:g.player.y+60,hp:10000,maxHp:10000,attack:0,speed:0,
    arena:{x:g.player.x,y:g.player.y,radius:800}});
   g.enemies=[];g.trees=g.trees.filter(v=>Math.hypot(v.x-g.player.x,v.y-g.player.y)>380);
   g.player.invincible=999;g.summonVehicle();a.refresh();a.renderer.camera.time=null;a.renderer.draw();
  };
  // 逐小步真实推进三招、援兵及动作，采样之间不手改阶段或危险区年龄。
  window.bossTick=seconds=>{
   const g=a.game;for(let time=0;time<seconds-1e-8;time+=.02){
    updateBossSupport(g,.02);updateEnemies(g,.02,g.player);updateBoss(g,.02);updateBossHazards(g,.02);g.fx.update(.02);g.time+=.02;
   }a.refresh();a.renderer.draw();return inspect(a.renderer);
  };
  window.bossLight=async phase=>{
   a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();
  };
 });
 // 连续动作入口复用同一正式场景，按真实时间推进，保留可复查录像和逐帧状态。
 if(new URL(page.url()).searchParams.has('boss-live')){
  const runs=[];
  for(const [i,kind] of ['boar','mushroom','owl','turtle','moss','dumpling','summon'].entries()){
   await t.setViewportSize({width:i===0?1280:390,height:i===0?900:844});
   await t.evaluate(async ({kind,i})=>{
    bossScene(kind==='summon'?'moss':kind);await bossLight(i%2?'night':'day');
    const g=a.game;g.boss.skillCycle=kind==='summon'?1:2;bossTick(.02);g.attackTimer=999;g.encounterTimer=999;
    window.liveFrames=[];const original=Object.getPrototypeOf(g).update;
    g.update=(dt,input)=>{original.call(g,dt,input);liveFrames.push({phase:g.boss?.ai?.phase,elapsed:g.boss?.ai?.elapsed,
     hazards:g.hazards.map(h=>h.age),summons:g.enemies.filter(e=>e.bossSummon&&e.hp>0).length});};
   },{kind,i});
   await t.waitForFunction(()=>liveFrames.length>=8);
   await t.screenshot({path:`output/playwright/boss-variety/live-${kind}-windup.png`});
   await t.waitForFunction(()=>a.game.boss?.ai?.phase==='cast');
   await t.screenshot({path:`output/playwright/boss-variety/live-${kind}-cast.png`});
   await t.waitForFunction(()=>a.game.boss?.ai?.phase==='recover');
   const run=await t.evaluate(()=>{a.game.update=()=>{};return {frames:liveFrames.length,phases:[...new Set(liveFrames.map(f=>f.phase))],
    maxSummons:Math.max(...liveFrames.map(f=>f.summons)),...inspect(a.renderer)};});
   if(!['windup','cast','recover'].every(v=>run.phases.includes(v)))throw Error('连续阶段缺失 '+kind);
   if(kind==='summon'&&run.maxSummons!==2)throw Error('连续召唤失败');
   await t.screenshot({path:`output/playwright/boss-variety/live-${kind}-recover.png`});
   runs.push({kind,frames:run.frames,phases:run.phases,maxSummons:run.maxSummons});
  }
  const video=t.video();await context.close();if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'boss-attack-variety',runs,video:await video.path(),errors};
 }
 // 六种首领连续完成原攻击与召唤，采样专属前摇、生效和硬直。
 for(const kind of ['boar','mushroom','owl','turtle','moss','dumpling']){
  await t.evaluate(kind=>bossScene(kind),kind);await t.evaluate(()=>bossLight('day'));
  const result=await t.evaluate(()=>{
   const g=a.game,b=g.boss,seen=[];
   for(let slot=0;slot<3;slot++){
    b.x=g.player.x-70;b.y=g.player.y+60;b.attack=0;bossTick(.02);seen.push(b.ai.skill||'original');
    if(slot<2){for(let i=0;i<500&&b.ai.phase!=='chase';i++)bossTick(.02);}
   }
   if(g.enemies.filter(e=>e.bossSummon).length!==2)throw Error('没有两只实际援兵');
   return {seen,...inspect(a.renderer)};
  });
  if(result.seen[0]!=='original'||result.seen[1]!=='summon'||result.seen.length!==3)throw Error('三招顺序错误');
  await t.screenshot({path:`output/playwright/boss-variety/${kind}-windup-day.png`});
  const cast=await t.evaluate(()=>bossTick(a.game.boss.ai.timing.windup+.1));
  if(cast.phase!=='cast')throw Error('施法阶段错误');
  await t.screenshot({path:`output/playwright/boss-variety/${kind}-cast-day.png`});
  await t.evaluate(()=>bossLight('night'));await t.setViewportSize({width:320,height:640});
  await t.screenshot({path:`output/playwright/boss-variety/${kind}-cast-night-320.png`});
  const recover=await t.evaluate(()=>bossTick(a.game.boss.ai.timing.active-.1));
  if(recover.phase!=='recover')throw Error('缺少反击硬直');
  await t.screenshot({path:`output/playwright/boss-variety/${kind}-recover-night-320.png`});
  const overflow=await t.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  if(overflow)throw Error('手机页面溢出');
  samples.push({kind,seen:result.seen,windup:result.phase,cast:cast.phase,recovery:recover.phase,summons:result.summons.length,hazards:result.hazards.length});
  await t.setViewportSize({width:390,height:844});
 }
 // 召唤连续演示：蓄力不出生、两只依次入场，恢复后移动，不重复后台生成。
 await t.evaluate(()=>{bossScene('moss');a.game.boss.skillCycle=1;bossTick(.02);});await t.evaluate(()=>bossLight('day'));
 await t.screenshot({path:'output/playwright/boss-variety/summon-windup.png'});
 const before=await t.evaluate(()=>bossTick(1.8));if(before.summons.length)throw Error('预警期刷怪');
 const after=await t.evaluate(()=>bossTick(1.8));if(after.summons.length!==2)throw Error('召唤数量错误');
 await t.screenshot({path:'output/playwright/boss-variety/summon-cast.png'});
 const moved=await t.evaluate(()=>{
  a.game.boss.attack=999;a.game.boss.ai={phase:'chase',elapsed:0};const before=a.game.enemies.map(e=>({x:e.x,y:e.y}));bossTick(.5);
  return a.game.enemies.some((e,i)=>Math.hypot(e.x-before[i].x,e.y-before[i].y)>1);
 });if(!moved)throw Error('召唤物不行动');
 await t.emulateMedia({reducedMotion:'reduce'});await t.evaluate(()=>a.renderer.draw());
 await t.screenshot({path:'output/playwright/boss-variety/summon-reduced.png'});
 // 用真实方向键驱动角色离开已锁定的横扫；完整 Game.update 继续生效。
 await t.emulateMedia({reducedMotion:'no-preference'});
 await t.evaluate(()=>{
  bossScene('boar');const g=a.game;g.dismountVehicle();g.boss.skillCycle=2;bossTick(.02);
  g.player.invincible=0;g.attackTimer=999;g.waveRest=999;g.encounterTimer=999;g.update=Object.getPrototypeOf(g).update;
  window.startY=g.player.y;window.startHp=g.player.hp;
 });
 await t.keyboard.down('ArrowDown');await t.waitForTimeout(1200);await t.keyboard.up('ArrowDown');
 const dodge=await t.evaluate(()=>{a.game.update=()=>{};return {distance:a.game.player.y-startY,hp:a.game.player.hp,before:startHp};});
 if(dodge.distance<60||dodge.hp!==dodge.before)throw Error('实机移动躲避失败 '+JSON.stringify(dodge));
 await t.screenshot({path:'output/playwright/boss-variety/dodge-mobile.png'});
 const video=t.video();await context.close();if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'boss-attack-variety',samples,dodge,movingSummons:moved,video:await video.path(),errors};
}
