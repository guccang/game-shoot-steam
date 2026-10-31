// 新手数值验收使用正式森林与真实自动射击；截图切光照不替换绘制器。
async page=>{
 if(new URL(page.url()).port!=='4293')throw Error('仅限隔离验收端口4293');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=['clearing'];
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await page.waitForFunction(()=>a.menu.page==='game'&&a.game.state==='playing');
 await page.evaluate(async()=>{
  const {acceptClearingPost}=await import('/src/core/clearing-guide.js'),{CLEARING_APPROACH}=await import('/src/config/clearing.js');
  const g=a.game;g.mainlineSpeech=null;Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});
  const accepted=acceptClearingPost(g);if(!accepted.ok)throw Error(JSON.stringify({accepted,state:g.state,x:g.player.x,y:g.player.y,arrival:g.arrivalPending,map:g.mapId,arena:g.player.arena}));
  const site=g.progress.living.clearingSite;Object.assign(g.player,{x:site.x,y:site.y});g.random=()=>.5;
  // 只记录出生属性，不暂停攻击；避免一枪击倒后已看不到完整首批实体。
  window.openingRows=[];const spawn=g.spawnEnemy.bind(g);g.spawnEnemy=(...args)=>{const e=spawn(...args);if(e.wave===1)openingRows.push({hp:e.hp,maxHp:e.maxHp,level:e.level});return e;};
  a.refresh();
 });
 await page.waitForFunction(()=>openingRows.length===2);
 const opening=await page.evaluate(()=>openingRows);
 if(opening.length!==2||opening.some(e=>e.maxHp!==14))throw Error('首批实际血量错误 '+JSON.stringify(opening));
 await page.waitForFunction(()=>a.game.waveKills>0);
 const armor=await page.evaluate(()=>{
  const g=a.game;g.enemies=[];g.wave=4;g.bossWave=5;g.waveGroupStart=1;g.waveKills=3;g.waveSpawned=3;g.waveRest=g.waveWarning=0;
  const e=g.spawnEnemy(0,0,{x:g.player.x+110,y:g.player.y});g.waveSpawned=8;window.armorId=e.id;g.attackTimer=0;return {hp:e.maxHp,species:e.species};
 });
 if(armor.hp!==100||armor.species!=='ironwood-bulwark')throw Error('重装实际血量错误');
 await page.waitForFunction(()=>!a.game.enemies.some(e=>e.id===armorId&&e.hp>0));
 await page.evaluate(()=>{
  const g=a.game;g.enemies=[];g.wave=5;g.waveKills=g.waveSpawned=10;g.waveRest=g.waveWarning=0;g.bossReady=true;
  if(!g.summonBoss()||g.boss.maxHp!==900)throw Error('领主预算错误');g.attackTimer=999;a.refresh();
 });
 for(const width of [320,390,1280])for(const time of ['day','night']){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time,weather:'sun',autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();
  },time);
  await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/early-combat/${width}-${time}.png`});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||a.game.state!=='playing'))throw Error('战场显示异常');
 }
 if(errors.length)throw Error(errors.join('\n'));
 await page.evaluate(result=>window.earlyCombatResult=result,{opening,armor,boss:900,errors});
}
