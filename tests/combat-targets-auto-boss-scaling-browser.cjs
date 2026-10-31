// 自动领主与召唤物边界的正式浏览器检查，独立存档避免污染玩家进度。
async page=>{
 if(new URL(page.url()).port!=='4282')throw Error('仅允许隔离端口');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 async function mount(width,night=false,gate=false){
  await page.setViewportSize({width,height:width===390?844:800});
  await page.evaluate(async({night,gate})=>{
   (window.hudApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const p=freshProgress();p.weapons.fill(1);p.weapon=15;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position=gate?{x:120,y:729}:{x:635,y:700};p.living.calendar={day:1,elapsed:night?1100000:400000};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:night?'night':'day',autoTime:false,autoWeather:false}));
   const {createApplication}=await import('/src/app/create-app.js');window.hudApp=createApplication();
  },{night,gate});
  await page.locator('#start').click();await page.waitForFunction(()=>hudApp.menu.page==='game');
  await page.evaluate(()=>{hudApp.game.update=()=>{};});
 }

 for(const [width,night] of [[1280,false],[390,true]]){
  await mount(width,night,true);
  await page.evaluate(()=>document.querySelector('[data-camp-gate="left"]').click());await page.locator('#camp-primary').click();
  const result=await page.evaluate(async()=>{
   const g=hudApp.game,r=g.campDefense,{updateCampDefense}=await import('/src/core/camp-defense.js'),{updateMechanical}=await import('/src/combat/mechanical.js'),{summonTargetPool}=await import('/src/combat/summons/targets.js'),{worldDistance}=await import('/src/world/coordinates.js');
   r.timer=999;const outside={id:999999,type:'tree',x:r.arena.x,y:r.arena.y+430,radius:18,hp:100,maxHp:100};g.trees.push(outside);
   const before=performance.now();for(let i=0;i<120;i++){g.time+=1/60;updateMechanical(g,1/60);}const cost=performance.now()-before;
   if(summonTargetPool(g,g.player,1000).includes(outside)||g.mechanical.nodes.some(n=>n.targetId===outside.id))throw Error('锁定圈外树');
   if(g.mechanical.nodes.filter(n=>n.ready).some(n=>worldDistance(n,r.arena)>r.arena.radius))throw Error('召唤物离开战斗圈');
   Object.assign(r,{wave:10,cleared:9,waveKills:86,spawned:86,timer:0});g.enemies=[];updateCampDefense(g,.01);
   if(r.phase!=='boss'||!g.boss)throw Error('兽潮未自动生成领主');hudApp.refresh();return {cost,nodes:g.mechanical.nodes.filter(n=>n.ready).length};
  });checks.push({mode:'兽潮自动领主、圈外目标与伙伴位置',width,...result});
  if(!await page.locator('#camp-defense-hud').isVisible())throw Error('兽潮 HUD 缺失');
  await page.screenshot({path:`output/playwright/combat-targets-auto-boss-scaling/horde-${width}-${night?'night':'day'}.png`});
  await page.locator('#camp-help').click();await page.locator('#camp-leave').click();
  await page.evaluate(async()=>{
   const g=hudApp.game,{waveDifficulty}=await import('/src/config/waves.js');g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});g.wave=5;g.bossWave=5;g.waveGroupStart=1;g.waveRest=0;g.waveKills=g.waveSpawned=waveDifficulty(5).total;g.updateWaves(.01);if(!g.boss)throw Error('清缴未自动生成领主');hudApp.refresh();
  });
  if(!await page.locator('#boss-hud').isVisible())throw Error('清缴 Boss 血条缺失');
  await page.screenshot({path:`output/playwright/combat-targets-auto-boss-scaling/clearing-${width}-${night?'night':'day'}.png`});
  await page.evaluate(()=>{const g=hudApp.game;g.hit(g.boss,999999);g.updateWaves(30);if(g.progress.living.patrolActive||g.boss||g.wave!==5)throw Error('自动接取了下一组');hudApp.refresh();});
  checks.push({mode:'清缴自动领主、结束不自动接取下一组',width});
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,checks,errors};
}
