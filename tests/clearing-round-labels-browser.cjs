// 清缴轮次实机检查：正式批次推进、Boss 结算、死亡刷新与多尺寸昼夜共用生产界面。
async page=>{
 if(new URL(page.url()).port!=='4279')throw Error('仅限隔离验收端口4279');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 // 冻结自动模拟以逐个检查节点，推进和结算由正式方法完成。
 async function attach(){await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.update=()=>{};g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.spawnTimer=g.fireClock=999;});}
 await attach();
 // 通过正式告示牌核心接取并移动到实际清缴场，禁止绕过接取门槛。
 async function accept(){await page.evaluate(async()=>{const g=a.game;Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);if(!(await import('/src/core/story/clearing-guide.js')).acceptClearingPost(g).ok)throw Error('正式接取失败');Object.assign(g.player,((s)=>({x:s.x,y:s.y}))((await import('/src/progression/story/clearing-site.js')).clearingSite(g.progress)));if(g.waveRest>0)g.updateWaves(3);g.waveWarning=0;a.refresh();});}
 // 只略过小怪耗时，自动 Boss 登场和致命结算仍走正式路径。
 async function finishRound(round){
  for(let batch=1;batch<=5;batch++){
   const s=await page.evaluate(async()=>{const g=a.game;g.waveWarning=0;a.refresh();const state=(await import('/src/rendering/visual-review.js')).inspectWaveProgress(document);g.enemies=[];g.waveKills=g.waveSpawned=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;g.updateWaves(.01);a.refresh();return {wave:g.wave,round:(await import('/src/ui/clearing-round.js')).clearingRound(g),...state};});
   if(s.round!==round||!s.title.includes(`第 ${round} 轮`)||!s.roundLabel.includes(`第 ${round} 轮`))throw Error('内部批次污染轮次');
   if(s.nodes.some(n=>!/^第 [1-5] 批/.test(n.label)))throw Error('节点不是轮内批次');checks.push({round,batch,wave:s.wave,title:s.title});
   if(batch<5)await page.evaluate(()=>{a.game.updateWaves(3);a.game.waveWarning=0;a.refresh();});
  }
  if(!await page.evaluate(()=>!!a.game.boss))throw Error('五批后未自动召唤Boss');
  if(!(await page.locator('#boss-hud .clearing-objective').innerText()).includes(`第 ${round} 轮`))throw Error('Boss轮次错误');
  await page.screenshot({path:`output/playwright/clearing-round-labels/boss-${round}.png`});
  await page.evaluate(()=>a.game.hit(a.game.boss,1e9));await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();
  if(await page.evaluate(async()=>(await import('/src/ui/clearing-round.js')).clearingRound(a.game))!==round+1)throw Error('击败Boss未进入下一轮');
 }
 await accept();await finishRound(1);await accept();
 // 第二轮中途死亡、首页读档和续战仍保持第2轮，不显示内部第6波。
 await page.evaluate(()=>{a.game.waveKills=2;a.game.hurt(1e9);a.refresh();});
 if(!(await page.locator('#overlay-text').innerText()).includes('第 2 轮清缴'))throw Error('死亡提示错误');
 await page.screenshot({path:'output/playwright/clearing-round-labels/death-round-2.png'});
 await page.reload();await page.waitForFunction(()=>document.querySelector('#title-summary').textContent.includes('第 2 轮清缴'));
 await page.locator('#start').click();await attach();await page.locator('#resume').click();
 await page.evaluate(async()=>{const g=a.game;Object.assign(g.player,((s)=>({x:s.x,y:s.y}))((await import('/src/progression/story/clearing-site.js')).clearingSite(g.progress)));g.waveWarning=0;g.mainlineSpeech=null;a.refresh();});
 const resumed=await page.evaluate(()=>({bosses:a.game.progress.bosses,wave:a.game.wave,kills:a.game.waveKills}));if(resumed.wave!==6||resumed.kills!==2)throw Error('续战进度回退');checks.push({resumed});
 await finishRound(2);await accept();
 // 三种尺寸的昼夜实机同时包含角色、载具、怪物、场景与正式轮次HUD。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;g.waveWarning=0;g.waveRest=0;g.vehicle.active=true;g.enemies=[];g.numbers=[];g.particles=[];g.drops=[];const e=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y+60},{ambient:true});Object.assign(e,{speed:0,damage:0});g.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);await page.waitForTimeout(200);
  const s=await page.evaluate(async()=>{const state=(await import('/src/rendering/visual-review.js')).inspectWaveProgress(document);const r=document.querySelector('#quest').getBoundingClientRect();return {...state,fit:r.left>=0&&r.right<=innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});
  if(!s.fit||s.overflow||!s.title.includes('第 3 轮')||!s.objective.includes('第 3 轮清缴'))throw Error('HUD布局或轮次错误');
  await page.screenshot({path:`output/playwright/clearing-round-labels/hud-${width}-${phase}.png`});
  await page.locator('#wave-help').click();await page.locator('#wave-help-dialog').waitFor({state:'visible'});
  const text=await page.locator('#wave-help-dialog').innerText();if(!text.includes('第 3 轮清缴')||!text.includes('0 / 5 批'))throw Error('详情混用批次');
  const fit=await page.locator('#wave-help-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth;});if(!fit)throw Error('详情溢出');
  await page.screenshot({path:`output/playwright/clearing-round-labels/help-${width}-${phase}.png`});await page.locator('#wave-help-close').click();checks.push({width,phase,title:s.title,text});
 }
 // 轮次不随暂停接取改变，告示牌也显示同一编号。
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);a.game.vehicle.active=false;a.renderer.camera.time=null;a.renderer.draw();a.refresh();document.querySelector('#clearing-marker').click();});
 if(!(await page.locator('#clearing-status').innerText()).includes('第 3 轮清缴'))throw Error('告示牌轮次不同步');await page.screenshot({path:'output/playwright/clearing-round-labels/board-round-3.png'});await page.locator('#clearing-close').click();
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'wave-progress-track',checks,errors};
}
