// 实机验证清缴后等级分区、购买门槛与详情，包含手机及桌面昼夜。
async page=>{
 if(new URL(page.url()).port!=='4289')throw Error('仅允许隔离验收端口');const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,night] of [[320,false],[390,true],[1280,false],[1280,true]]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async({night})=>{
   (window.qApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');const p=freshProgress();p.bosses=1;p.coins=p.wood=999999;for(const key in p.materials)p.materials[key]=9999;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.equipmentGoal={kind:'weapons',index:1};p.living.position={x:1600,y:400};const {LIVING_PHASES}=await import('/src/config/living-world.js');p.living.calendar={day:1,elapsed:LIVING_PHASES.find(p=>p.id===(night?'night':'day')).start+1000};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:night?'night':'day',autoTime:false,autoWeather:false}));
   window.qApp=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
  },{night});
  await page.locator('#start').click();await page.waitForFunction(()=>qApp.menu.page==='game');
  await page.waitForFunction(n=>n?qApp.renderer.tone.sample(performance.now()).night>.99:qApp.renderer.tone.sample(performance.now()).night<.01,night);
  await page.evaluate(async()=>{
   const g=qApp.game,{CLEARING_APPROACH}=await import('/src/config/clearing.js'),{clearingSite}=await import('/src/progression/clearing-site.js'),{acceptClearingPost}=await import('/src/core/clearing-guide.js'),{waveDifficulty}=await import('/src/config/waves.js');
   Object.assign(g.player,CLEARING_APPROACH);if(!acceptClearingPost(g).ok)throw Error('接取失败');Object.assign(g.player,((s)=>({x:s.x,y:s.y}))(clearingSite(g.progress)));g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.bossReady=true;if(!g.summonBoss())throw Error('召唤失败');g.hit(g.boss,1e9);g.update=()=>{};qApp.refresh();
  });
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('2/3 胜')&&Number(getComputedStyle(document.querySelector('#toast')).opacity)>.99);
  await page.screenshot({path:`output/playwright/challenge-level-ui/victory-${width}-${night}.png`});
  await page.locator('#equipment-goal').click();
  const text=await page.locator('#goal-details .challenge-level').textContent();if(!text.includes('1 阶')||!text.includes('距 2 阶还差 1 次清缴')||!text.includes('购买需要 2 阶 · 未达到'))throw Error(text);
  if(await page.locator('[data-resource-info="bosses"]').count())throw Error('等级混入资源');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')).bosses);if(saved!==2)throw Error('胜场未保存');
  await page.screenshot({path:`output/playwright/challenge-level-ui/details-${width}-${night}.png`});
  await page.locator('#goal-workshop').click();await page.waitForSelector('#workshop-dialog[open]');
  const level=await page.locator('#ws-challenge-level').textContent();if(!level.includes('购买需要 2 阶 · 未达到'))throw Error(level);
  if(!await page.locator('#ws-purchase').isDisabled())throw Error('未达等级仍可购买');
  if(await page.locator('#ws-resources [data-resource-info="bosses"]').count())throw Error('工坊等级混入消耗');
  const bounds=await page.locator('#ws-challenge-level').boundingBox();if(bounds.x<0||bounds.x+bounds.width>width+1)throw Error('等级区域溢出屏幕');
  await page.screenshot({path:`output/playwright/challenge-level-ui/workshop-${width}-${night}.png`});
  await page.evaluate(()=>{qApp.game.progress.bosses=3;qApp.workshop.render();});
  if(await page.locator('#ws-purchase').isDisabled())throw Error('升阶后不能购买');
  await page.locator('#ws-purchase').click();
  const purchased=await page.evaluate(()=>({owned:qApp.game.progress.weapons[1],wins:qApp.game.progress.bosses}));
  if(purchased.owned!==1||purchased.wins!==3)throw Error(JSON.stringify(purchased));
  checks.push({width,night,saved,level,purchased});
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,checks,errors};
}
