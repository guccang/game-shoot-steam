// 随机清缴实机验收：正式告示牌接取、存档恢复、地图标记和昼夜到场画面。
async page=>{
 if(new URL(page.url()).port!=='4278')throw Error('仅限隔离验收端口4278');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.living.position={x:810,y:965};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.renderer.camera.time=null;a.refresh();});
 await page.locator('#clearing-marker').click();
 if(!(await page.locator('#clearing-status').innerText()).includes('营地草甸 600–1300'))throw Error('未显示首轮安全范围');
 await page.locator('#clearing-accept').click();
 const accepted=await page.evaluate(async()=>{const s=a.game.progress.living.clearingSite,d=(await import('/src/world/coordinates.js')).worldDistance(a.game.player,s);if(d<600||d>1300||(await import('/src/world/biomes.js')).biomeAt(s.x,s.y).id!=='meadow')throw Error('首轮安全范围错误');return s;});
 await page.locator('#clearing-marker').click();await page.locator('#clearing-accept').click();
 if(JSON.stringify(await page.evaluate(()=>a.game.progress.living.clearingSite))!==JSON.stringify(accepted))throw Error('重复确认换点');
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.renderer.camera.time=null;});
 if(JSON.stringify(await page.evaluate(()=>a.game.progress.living.clearingSite))!==JSON.stringify(accepted))throw Error('刷新换点');
 // 沿正式步行路线逐段调用碰撞移动，到场后通过真实刷怪调度开始战斗。
 const travel=await page.evaluate(async()=>{
  const g=a.game,s=g.progress.living.clearingSite,{planQuestRoute}=await import('/src/physics/quest-route.js'),{moveBody}=await import('/src/physics/motion.js'),{worldDistance,WORLD}=await import('/src/world/coordinates.js');
  const route=planQuestRoute({...g.player,mapId:'forest',livingCollision:true,flying:false,amphibious:false},s,g.trees,16000);if(!route.reachable)throw Error('不可步行到达');
  for(const p of route.points.slice(1)){const dx=p.x-g.player.x,dy=p.y-g.player.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));for(let i=0;i<n;i++)moveBody(g.player,dx/n,dy/n,WORLD,12,g.trees);if(worldDistance(g.player,p)>1)throw Error('路径碰撞阻断');}
  if(!(await import('/src/core/living-safety.js')).livingWaveAllowed(g))throw Error('到场未启动');g.updateWaves(4);g.updateWaves(1);if(!g.enemies.some(e=>e.wave===g.wave))throw Error('没有入场怪物');return {points:route.points.length,distance:worldDistance(s,s.origin),spawned:g.enemies.length};
 });
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const g=a.game;g.start();g.enemies=[];g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.environment.weather='sun';a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);Object.assign(g.player,{x:810,y:965});a.renderer.camera.time=null;a.refresh();a.renderer.draw();},phase);
  await page.locator('#clearing-marker').click();
  const status=await page.locator('#clearing-status').innerText();if(!status.includes('距地点')||status.includes('东林'))throw Error('地点文案错误');
  if(await page.locator('#clearing-dialog').evaluate(n=>n.scrollWidth>n.clientWidth+1))throw Error('清缴面板溢出');
  await page.screenshot({path:`output/playwright/random-clearing-site/post-${width}-${phase}.png`});await page.locator('#clearing-close').click();
  if(!await page.locator('#map-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#map-button').click();if(!await page.locator('#map-clearing-site').count())throw Error('地图缺少清缴地点');
  if(await page.locator('#map-dialog').evaluate(n=>n.scrollWidth>n.clientWidth+1))throw Error('地图横向溢出');
  await page.screenshot({path:`output/playwright/random-clearing-site/map-${width}-${phase}.png`});await page.locator('#close-map').click();
  const state=await page.evaluate(async()=>{const g=a.game,s=g.progress.living.clearingSite;Object.assign(g.player,{x:s.x-70,y:s.y+80});g.selectVehicle(0);g.summonVehicle();g.vehicle.active=false;g.player.flying=false;g.enemies=[];g.spawnEnemy(0,0,{x:s.x+120,y:s.y+90},{ambient:true});a.renderer.camera.time=null;a.refresh();a.renderer.draw();return (await import('/src/rendering/visual-review.js')).inspectRandomClearing(g,document);});
  if(state.stage!=='waves'||state.target!==null||state.overflow)throw Error('到场显示错误:'+JSON.stringify(state));
  await page.screenshot({path:`output/playwright/random-clearing-site/field-${width}-${phase}.png`});checks.push({width,phase,status,state});
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'random-clearing-site',accepted,travel,checks,errors};
}
