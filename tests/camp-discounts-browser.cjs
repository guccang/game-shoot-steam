// 实际界面验收：六档营地优惠、交易、清缴收据及桌面手机昼夜。
async page=>{
 if(new URL(page.url()).port!=='4276')throw Error('仅限隔离验收端口4276');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.coins=p.wood=999999;p.materials={parts:99999,crystal:99999,core:99999};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.spawnTimer=999;a.game.fireClock=999;a.game.mainlineTalkDelay=999;});
 // 不完成任何主线和清缴，直接通过正式工坊购买最高级控制器。
 await page.evaluate(()=>{a.workshop.open('weapons',16);});
 await page.locator('#ws-purchase').waitFor({state:'visible'});
 if(await page.locator('#ws-purchase').isDisabled())throw Error('一级营地仍锁购买');
 const price=await page.locator('#ws-resources').innerText();if(!price.includes('33320')||!price.includes('12662'))throw Error('一级营地折后价错误:'+price);
 await page.locator('#ws-purchase').click();await page.waitForFunction(()=>a.game.progress.weapons[16]===1);
 if(await page.evaluate(()=>a.game.progress.coins)!==999999-33320)throw Error('界面与扣费不一致');
 await page.locator('#ws-close').click();
 // 各尺寸同屏保留猫猫、怪物、载具与营地；仅冻结刷怪用于读图。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const g=a.game;g.progress.campLevel.xp=720;g.progress.living.patrolActive=false;Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH,{vx:0,vy:0});g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.attackTimer=g.spawnTimer=g.fireClock=999;g.progress.living.calendar.elapsed=phase==='night'?220000:1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.enemies=[];g.spawnEnemy(0,0,{x:g.player.x+100,y:g.player.y+50},{ambient:true});g.enemies.at(-1).speed=0;g.progress.vehicleHulls[0]=1;g.vehicles[0].x=g.player.x-80;g.vehicles[0].y=g.player.y+60;a.renderer.camera.time=null;a.refresh();},phase);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:`output/playwright/camp-discounts/scene-${width}-${phase}.png`});
  for(const panel of ['hero','weapons','vehicle','clearing']){
   await page.evaluate(panel=>{if(panel==='hero')document.querySelector('#heroes-button').click();else if(panel==='clearing')document.querySelector('#clearing-marker').click();else a.workshop.open(panel,panel==='vehicle'?4:12);},panel);
   const selector=panel==='hero'?'#camp-dialog [data-challenge-level]':panel==='clearing'?'#clearing-challenge-level':'#ws-buy-camp';
   await page.locator(selector+' .challenge-rank-icon').waitFor({state:'visible'});
   const text=await page.locator(selector).innerText();if(!text.includes('2 级')||!text.includes('9.5折')||text.includes('挑战等级'))throw Error(panel+'营地显示不一致');
   await page.locator(selector).scrollIntoViewIfNeeded();
   const fit=await page.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth+1;});if(!fit)throw Error(panel+'营地面板溢出');
   await page.screenshot({path:`output/playwright/camp-discounts/${panel}-${width}-${phase}.png`});
   if(panel==='weapons'){
    await page.locator(selector+' [data-challenge-catalog]').click();await page.locator('#challenge-catalog-dialog').waitFor({state:'visible'});
    for(let level=1;level<=6;level++){await page.locator(`[data-challenge-tier="${level}"]`).click();if(!(await page.locator('#challenge-tier-title').innerText()).includes(`${level} 级`))throw Error('等级切换错误');}
    await page.screenshot({path:`output/playwright/camp-discounts/discounts-${width}-${phase}.png`});
    if(await page.locator('#challenge-catalog-body').evaluate(n=>n.scrollWidth>n.clientWidth+1))throw Error('营地说明横向溢出');
    await page.keyboard.press('Escape');if(!await page.locator('#workshop-dialog').evaluate(d=>d.open))throw Error('嵌套关闭丢失工坊');
   }
   await page.locator(panel==='hero'?'#close-camp':panel==='clearing'?'#clearing-close':'#ws-close').click();
  }
  checks.push({width,phase,panels:4});
 }
 // 通过正式接取、召唤和致命命中验证清缴只发整次经验。
 await page.evaluate(async()=>{const g=a.game;g.progress.campLevel.xp=500;g.enemies=[];g.state='playing';Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);if(!(await import('/src/core/clearing-guide.js')).acceptClearingPost(g).ok)throw Error('接取失败');Object.assign(g.player,((s)=>({x:s.x,y:s.y}))((await import('/src/progression/clearing-site.js')).clearingSite(g.progress)));g.wave=g.bossWave;g.waveKills=g.waveSpawned=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;g.bossReady=true;if(!g.summonBoss())throw Error('召唤失败');const boss=g.boss;g.hit(boss,1e9);g.hit(boss,1e9);});
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});const receipt=await page.locator('#task-reward-challenge').innerText();if(!receipt.includes('1 级 → 2 级')||!receipt.includes('9.5折'))throw Error('升级结算缺失');
 if(await page.evaluate(()=>a.game.progress.campLevel.xp)!==680)throw Error('清缴经验重复');
 await page.screenshot({path:'output/playwright/camp-discounts/level-up-320.png'});
 const inspection=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectChallengeRank(a.game,document));
 await page.locator('#task-reward-close').click();
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'camp-level-discount',checks,price,receipt,inspection,errors};
}
