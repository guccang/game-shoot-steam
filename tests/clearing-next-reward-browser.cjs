// 清缴结算正式实机验收：昼夜窄屏、回营接取及普通奖励计时。
async page=>{
 if(new URL(page.url()).port!=='4279')throw Error('仅限隔离验收端口4279');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.living.position={x:810,y:965};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.renderer.camera.time=null;a.refresh();});
 await page.locator('#clearing-marker').click();await page.locator('#clearing-accept').click();await page.waitForFunction(()=>a.game.state==='playing');
 // 真实调度五波及领主，奖励收据通过应用事件装配，未直接构造清缴弹窗。
 await page.evaluate(()=>{const g=a.game,s=g.progress.living.clearingSite;Object.assign(g.player,{x:s.x,y:s.y});for(let i=0;i<600&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}if(!g.boss)throw Error('未产生领主');g.hit(g.boss,1e9);a.renderer.camera.time=null;a.refresh();});
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});
 // 清缴结算保留阅读时间，下一次任务必须回营地接取。
 await page.waitForTimeout(3300);if(!await page.locator('#task-reward-return-camp').isVisible())throw Error('清缴结算提前关闭');
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.selectVehicle(0);g.summonVehicle();g.vehicle.active=false;g.player.flying=false;Object.assign(g.player,{x:g.progress.living.clearingSite.x,y:g.progress.living.clearingSite.y});Object.assign(g.vehicle,{x:g.player.x+70,y:g.player.y+70});g.numbers=[];g.particles=[];g.enemies=[];g.spawnEnemy(0,0,{x:g.player.x+130,y:g.player.y+90},{ambient:true});a.renderer.camera.time=null;a.refresh();a.renderer.draw();},phase);
  await page.locator('#task-reward-return-camp').scrollIntoViewIfNeeded();
  const state=await page.evaluate(async()=>{const state=(await import('/src/rendering/visual-review.js')).inspectTaskReward(a.game,document),panel=document.querySelector('.task-reward-panel');return {...state,horizontalOverflow:panel.scrollWidth>panel.clientWidth+1,nextButton:state.nextClearing};});
  if(!state.returnCamp||state.overflow||state.horizontalOverflow||state.nextButton)throw Error(JSON.stringify(state));
  await page.screenshot({path:`output/playwright/clearing-return-camp/reward-${width}-${phase}.png`});checks.push({width,phase,state});
 }
 // 关闭结算恢复游戏，野外拒绝接取；回到告示牌后通过正式按钮接取。
 await page.locator('#task-reward-close').click();await page.waitForFunction(()=>a.game.state==='playing');
 await page.evaluate(async()=>{const {acceptClearingPost}=await import('/src/core/clearing-guide.js');const g=a.game,before=JSON.stringify(g.progress);if(acceptClearingPost(g).ok||JSON.stringify(g.progress)!==before)throw Error('野外仍能领取');Object.assign(g.player,{x:810,y:965});g.mainlineSpeech=null;a.renderer.camera.time=null;a.refresh();});
 await page.locator('#clearing-marker').click();await page.locator('#clearing-accept').click();await page.waitForFunction(()=>a.game.state==='playing');
 const accepted=await page.evaluate(async()=>{const g=a.game,s=g.progress.living.clearingSite,origin={x:810,y:965},d=(await import('/src/world/coordinates.js')).worldDistance(origin,s),goal=(await import('/src/core/world-navigation.js')).worldNavigationObjective(g);if((await import('/src/world/coordinates.js')).worldDistance(s.origin,origin)>1e-6||d<1000||d>3000||goal.site.x!==s.x||goal.site.y!==s.y||g.progress.campLevel.xp!==180||g.progress.bosses!==1)throw Error('营地接取、导航或奖励不一致');return {site:s,distance:d};});
 await page.screenshot({path:'output/playwright/clearing-return-camp/accepted-320.png'});
 // 普通收据不显示续接入口并仍按三秒关闭。
 await page.evaluate(()=>a.game.onEvent('task-reward',{title:'普通任务奖励',reward:{coins:1}}));await page.locator('#task-reward-dialog').waitFor({state:'visible'});if(await page.locator('#task-reward-return-camp').isVisible()||await page.locator('#task-reward-next-clearing').count())throw Error('普通奖励泄漏清缴提示');await page.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});
 await page.reload();await page.locator('#start').click();const saved=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return a.game.progress.living.clearingSite;});if(JSON.stringify(saved)!==JSON.stringify(accepted.site))throw Error('刷新改变新地点');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'task-reward-popup',checks,accepted,errors};
}
