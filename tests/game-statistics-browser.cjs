// 正式设置入口的累计档案验收：事件更新、六种视口昼夜、持久化、关闭及键盘操作。
async page=>{
 if(new URL(page.url()).port!=='4290')throw Error('仅限隔离验收端口4290');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:1600,y:400};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.refresh();});
 // 首次打开真实零记录，然后在后台模拟正式击杀和采集，验证再次打开读取最新进度。
 await page.locator('#settings-button').focus();await page.keyboard.press('Enter');await page.locator('#chronicle-button').click();
 if(await page.locator('#chronicle-combat strong').allTextContents().then(v=>v.some(s=>s!=='0')))throw Error('新档应显示零');
 await page.locator('#close-chronicle').click();
 if(!await page.locator('#settings-dialog').isVisible())throw Error('关闭没有回到设置');
 await page.locator('#settings-done').click();await page.waitForFunction(()=>a.game.state==='playing');
 const eventTotals=await page.evaluate(()=>{
  const g=a.game;g.trees=[];g.enemies=[];g.addTree(g.player.x+50,g.player.y);g.hit(g.trees[0],1e9);
  const e=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y});g.hit(e,1e9);g.hit(e,1e9);
  if(g.progress.statistics.kills!==1||g.progress.statistics.trees!==1)throw Error('真实事件计数错误');
  return structuredClone(g.progress.statistics);
 });
 await page.locator('#settings-button').focus();await page.keyboard.press('Enter');await page.locator('#chronicle-button').click();
 if((await page.locator('#chronicle-combat strong').allTextContents()).join(',')!=='1,1')throw Error('再次打开没有更新');
 await page.locator('#close-chronicle').click();await page.locator('#settings-done').click();
 // 大数与多玩法仅作视觉夹具，计数语义由上方真实事件和专项规则测试验证。
 await page.evaluate(async()=>{
  const {recordResourceGain,recordActivity,STAT_ACTIVITIES}=await import('/src/progression/game-statistics.js');
  const g=a.game;recordResourceGain(g.progress,'coins',123456789);recordResourceGain(g.progress,'wood',115122);
  for(const key of Object.keys(STAT_ACTIVITIES))recordActivity(g.progress,key);
  g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicle=g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicle.active=true;g.numbers=[];g.remnants=[];g.drops=[];
  g.spawnEnemy(0,0,{x:g.player.x+130,y:g.player.y+55},{ambient:true});a.save();
 });
 for(const [width,height] of [[1280,900],[390,844],[320,740]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.environment.livingPreview=true;a.environment.time=phase;a.environment.weather='sun';a.environment.autoWeather=false;
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  },phase);
  await page.screenshot({path:`output/playwright/game-profile-statistics/field-${width}-${phase}.png`});
  await page.locator('#settings-button').focus();await page.keyboard.press('Enter');await page.locator('#chronicle-button').click();
  const state=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectGameStatistics(a.game,document));
  if(state.overflow||state.resources!==5||state.activities!==10)throw Error('档案布局或目录不完整');
  if(await page.locator('[data-stat-resource="coins"] strong').innerText()!=='1Y')throw Error('累计收入被钱包上限截断');
  if(await page.locator('[data-stat-resource="wood"] strong').innerText()!=='11w')throw Error('资源显示出现小数');
  if(await page.locator('#chronicle-legacy').isVisible())throw Error('新档不应标记历史缺失');
  await page.locator('.chronicle-scroll').evaluate(n=>n.scrollTop=0);
  await page.screenshot({path:`output/playwright/game-profile-statistics/top-${width}-${phase}.png`});
  await page.locator('#chronicle-plays').scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/playwright/game-profile-statistics/plays-${width}-${phase}.png`});
  if(!await page.locator('.chronicle-rules[open]').filter({hasText:'试射靶标不计入'}).count()){await page.locator('.chronicle-rules summary').filter({hasText:'统计说明'}).focus();await page.keyboard.press('Enter');}
  if(!await page.locator('.chronicle-rules[open]').filter({hasText:'试射靶标不计入'}).count())throw Error('键盘无法展开说明');
  await page.locator('#chronicle-ok').click();
  if(!await page.locator('#settings-dialog').isVisible()||await page.evaluate(()=>a.game.state)==='playing')throw Error('返回设置错误恢复战斗');
  await page.locator('#settings-done').click();checks.push({width,phase,...state});
 }
 const saved=await page.evaluate(()=>{a.save();return structuredClone(a.game.progress.statistics);});
 await page.reload();await page.locator('#start').click();
 const restored=await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};return a.game.progress.statistics;});
 if(JSON.stringify(saved)!==JSON.stringify(restored))throw Error('刷新丢失累计统计');
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'game-profile-statistics',eventTotals,checks,restored,errors};
}
