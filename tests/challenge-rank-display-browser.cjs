// 挑战等级实机专项：真实告示牌接取与领主致命命中，面板与昼夜窄屏共用正式入口。
async page=>{
 if(new URL(page.url()).port!=='4272')throw Error('仅限隔离验收端口4272');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.spawnTimer=999;a.game.fireClock=999;});
 // 略过怪潮耗时，接取、召唤、命中和重复死亡保护仍走实际游戏逻辑。
 async function win(){
  await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));
  await page.evaluate(async()=>{const g=a.game,{CLEARING_APPROACH}=await import('/src/config/clearing.js'),{clearingSite}=await import('/src/progression/story/clearing-site.js');Object.assign(g.player,CLEARING_APPROACH);g.mainlineSpeech=null;if(!(await import('/src/core/story/clearing-guide.js')).acceptClearingPost(g).ok)throw Error('接取失败');Object.assign(g.player,((s)=>({x:s.x,y:s.y}))(clearingSite(g.progress)));g.wave=g.bossWave;g.waveKills=g.waveSpawned=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;g.bossReady=true;if(!g.summonBoss())throw Error('领主未入场');const boss=g.boss;g.hit(boss,1e9);g.hit(boss,1e9);});
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});
 }
 for(let count=1;count<=3;count++){
  await win();const text=await page.locator('#task-reward-challenge').innerText(),heading=await page.locator('#task-reward-heading').innerText();
  if(await page.evaluate(()=>a.game.progress.bosses)!==count)throw Error('胜场重复增加');
  if(heading!==(count===2?'挑战进度增加':'挑战等级提升'))throw Error('升阶标题错误');
  if(count===2&&!text.includes('2 / 3 次')||count===3&&!text.includes('1 阶 → 2 阶'))throw Error('进度或等级变化缺失');
  await page.screenshot({path:`output/playwright/challenge-rank-display/clear-${count}.png`});
  if(count===1){await page.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});await page.waitForFunction(()=>a.game.state==='playing');}
  else await page.locator('#task-reward-close').click();
  checks.push({count,heading,text});
 }
 // 满阶仍记录本次胜场；之后普通装备奖励必须恢复原标题与图片区域。
 await page.evaluate(()=>a.game.progress.bosses=18);await win();
 if(!(await page.locator('#task-reward-challenge').innerText()).includes('已达最高阶'))throw Error('满阶提示错误');
 if(await page.locator('#task-reward-challenge [role="progressbar"]').getAttribute('aria-valuenow')!=='1')throw Error('满阶进度不完整');
 await page.evaluate(()=>a.game.onEvent('task-reward',{title:'装备谢礼',equipment:[{kind:'vehicle',index:3}]}));
 await page.locator('#task-reward-close').click();await page.waitForFunction(()=>document.querySelector('#task-reward-heading').textContent==='获得奖励'&&document.querySelector('#task-reward-dialog').open);
 if(!await page.locator('#task-reward-challenge').isHidden()||await page.locator('#task-reward-items canvas').count()!==1)throw Error('清缴信息残留在装备奖励');
 await page.locator('#task-reward-close').click();
 await page.waitForFunction(()=>a.game.state==='playing');
 // 页面入口与各工坊购买缺口实机检查；每种尺寸均检查昼夜。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const g=a.game;g.progress.bosses=2;g.progress.coins=g.progress.wood=99999;for(const key in g.progress.materials)g.progress.materials[key]=9999;g.progress.living.patrolActive=false;Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH,{vx:0,vy:0});g.progress.living.calendar.elapsed=phase==='night'?220000:1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.enemies=[];a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);
  for(const panel of ['hero','weapons','vehicle','clearing']){
   await page.evaluate(panel=>{if(panel==='hero')document.querySelector('#heroes-button').click();else if(panel==='clearing')document.querySelector('#clearing-marker').click();else a.workshop.open(panel,panel==='vehicle'?1:1);},panel);
   const selector=panel==='hero'?'#camp-dialog [data-challenge-level]':panel==='clearing'?'#clearing-challenge-level':'#ws-challenge-level';
   await page.locator(selector+' .challenge-rank-icon').waitFor({state:'visible'});
   const text=await page.locator(selector).innerText();
   if(!text.includes('1 阶')||!text.includes('2 / 3 次'))throw Error(panel+'等级与进度不一致');
   if(['weapons','vehicle'].includes(panel)){
    if(!text.includes('挑战等级不足')||await page.locator('#ws-feedback .challenge-rank-icon').count()!==1)throw Error(panel+'门槛缺少徽章');
    if(!await page.locator('#ws-purchase').isDisabled())throw Error('展示改动绕过等级限制');
   }
   await page.locator(selector).scrollIntoViewIfNeeded();
   const layout=await page.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect();return {width:r.width,x:r.x,right:r.right,bottom:r.bottom,height:innerHeight};});
   if(layout.x<0||layout.right>width||layout.bottom>height)throw Error(panel+'等级区溢出');
   await page.screenshot({path:`output/playwright/challenge-rank-display/${panel}-${width}-${phase}.png`});
   // 原等级图鉴可正常打开、返回，底层面板和暂停归属保留。
   await page.locator(selector+' [data-challenge-catalog]').click();await page.locator('#challenge-catalog-dialog').waitFor({state:'visible'});await page.locator('#challenge-catalog-close').click();
   if(!await page.evaluate(()=>a.game.state==='paused'))throw Error('关闭图鉴提前恢复战斗');
   await page.locator(panel==='hero'?'#close-camp':panel==='clearing'?'#clearing-close':'#ws-close').click();
   await page.waitForFunction(()=>a.game.state==='playing');
  }
  await win();await page.screenshot({path:`output/playwright/challenge-rank-display/result-${width}-${phase}.png`});
  const fits=await page.locator('#task-reward-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth;});
  if(!fits)throw Error('清缴弹窗溢出');await page.locator('#task-reward-close').click();await page.waitForFunction(()=>a.game.state==='playing');
  checks.push({width,phase,panels:4,result:true});
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'challenge-rank-display',checks,errors};
}
