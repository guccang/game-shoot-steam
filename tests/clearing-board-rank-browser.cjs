// 地图告示牌实机验收：正式地图、实时战绩、导航与接取交互共用生产入口。
async page=>{
 if(new URL(page.url()).port!=='4278')throw Error('仅限隔离验收端口4278');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};const tasks=(await import('/src/config/mainline.js')).MAINLINE_TASKS;p.mainline.completed=tasks.slice(0,tasks.findIndex(t=>t.id==='first-patrol')).map(t=>t.id);p.mainline.phase='doing';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;window.boardTick=g.update.bind(g);g.update=()=>{};g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.spawnTimer=g.fireClock=999;Object.assign(g.player,{x:855,y:965,vx:0,vy:0});g.vehicle.active=false;g.enemies=[];const e=g.spawnEnemy(0,0,{x:995,y:1000},{ambient:true});Object.assign(e,{x:995,y:1000,speed:0,damage:0});g.progress.vehicleHulls[0]=1;g.progress.campParking.owned=[{hull:0,spot:'weapons-west',hp:.8,ammo:10,reload:0,wheel:1,track:0}];});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const g=a.game;g.progress.bosses=2;Object.assign(g.player,{x:855,y:965});g.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);
  await page.waitForTimeout(600);
  const state=await page.evaluate(async()=>{const s=(await import('/src/rendering/visual-review.js')).inspectChallengeRank(a.game,document),v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {...s,view:v,boardRect:{x:r.left+(810-55-v.x)*v.zoom,y:r.top+(920-91-v.y)*v.zoom,width:110*v.zoom,height:76*v.zoom},label:document.querySelector('#clearing-marker').getAttribute('aria-label'),overflow:document.documentElement.scrollWidth>innerWidth};});
  if(state.board.tier!==1||state.board.bosses!==2||state.board.nextForest!==3||state.overflow)throw Error('地图战绩或布局错误');
  if(!state.label.includes('2 / 3'))throw Error('无障碍进度未更新');
  await page.screenshot({path:`output/playwright/clearing-board-rank/board-${width}-${phase}.png`});checks.push({width,phase,...state});
 }
 // 连续改变胜场，核对新手零进度、跨阶和满阶都使用正式计算器。
 for(const bosses of [0,3,18]){
  const result=await page.evaluate(async bosses=>{a.game.progress.bosses=bosses;a.refresh();a.renderer.draw();return (await import('/src/rendering/visual-review.js')).inspectChallengeRank(a.game,document).board;},bosses);
  if(result.bosses!==bosses||bosses===0&&result.tier!==0||bosses===3&&result.tier!==2||bosses===18&&result.nextForest!==null)throw Error('实时阶级错误');
  await page.screenshot({path:`output/playwright/clearing-board-rank/progress-${bosses}.png`});checks.push(result);
 }
 // 身体分别在牌前、牌后和侧面采样，使用原脚底排序与半透明遮挡。
 for(const [side,x,y] of [['behind',810,870],['side',745,920]]){
  await page.evaluate(({x,y})=>{a.game.progress.bosses=2;Object.assign(a.game.player,{x,y});a.renderer.camera.time=null;a.renderer.draw();a.refresh();},{x,y});await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/clearing-board-rank/${side}.png`});
 }
 // 真实鼠标点击牌面，仍打开清缴面板；确认接取后正式任务进入前往清缴场。
 await page.evaluate(()=>{Object.assign(a.game.player,{x:855,y:965});a.renderer.camera.time=null;a.renderer.draw();a.refresh();});await page.waitForTimeout(200);
 const point=await page.evaluate(()=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.left+(810-v.x)*v.zoom,y:r.top+(920-50-v.y)*v.zoom};});
 await page.mouse.click(point.x,point.y);await page.locator('#clearing-dialog').waitFor({state:'visible'});
 if(!(await page.locator('#clearing-challenge-level').innerText()).includes('2 / 3 次'))throw Error('地图和面板战绩不一致');
 await page.locator('#clearing-accept').click();await page.locator('#clearing-dialog').waitFor({state:'hidden'});
 if(!await page.evaluate(()=>a.game.progress.living.patrolActive))throw Error('实际接取失败');
 checks.push({clickAndAccept:true});
 // 载具与角色、怪物、地形同屏检查，随后恢复真实更新验证牌前通行。
 await page.setViewportSize({width:390,height:844});
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const g=a.game;g.progress.living.patrolActive=false;g.vehicle.active=true;Object.assign(g.player,{x:870,y:965});g.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);
  await page.waitForTimeout(200);await page.screenshot({path:`output/playwright/clearing-board-rank/vehicle-${phase}.png`});
 }
 await page.evaluate(()=>{a.game.vehicle.active=false;Object.assign(a.game.player,{x:745,y:965});a.game.update=window.boardTick;a.game.enemies=[];});
 await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');
 const movement=await page.evaluate(()=>{a.game.update=()=>{};return {x:a.game.player.x,y:a.game.player.y};});
 if(movement.x<=755)throw Error('牌前通行失败');checks.push({movement});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'challenge-rank-display',checks,errors};
}
