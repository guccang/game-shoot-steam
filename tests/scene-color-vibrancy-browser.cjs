// 固定正式场景、角色与环境，记录调色前后实际画布；不另绘预览。
async page=>{
 if(new URL(page.url()).port!=='4272')throw Error('仅允许隔离端口4272');
 const label=new URL(page.url()).searchParams.get('color')||'before',errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.requestAnimationFrame=()=>0;window.colorPanel=(await import('/src/ui/panels/environment.js')).createEnvironmentPanel({environment:a.environment,root:document,dialogs:{register(){},open(){},close(){}},onSave(){}});const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.arrival=null;g.arrivalScene=null;g.random=()=>.42;g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;g.progress.mainline.phase='complete';g.progress.vehicleHulls[1]=3;g.progress.vehicleIndex=1;g.reset();g.state='playing';g.time=5;g.progress.vehicleHulls[1]=3;g.progress.vehicleIndex=1;g.selectVehicle(1);g.summonVehicle();g.enemies=[];for(const [dx,dy] of [[-115,50],[100,70],[55,-110]])g.spawnEnemy(0,0,{x:850+dx,y:800+dy},{ambient:true});});
 for(const width of [320,390,1280])for(const [season,weather,time] of [['summer','sun','day'],['summer','sun','night'],['spring','rain','day'],['autumn','cloud','dusk'],['winter','snow','night']]){
  if(new URL(page.url()).searchParams.has('nightOnly')&&time!=='night')continue;
  if(width!==390&&season!=='summer')continue;await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
  const stats=await page.evaluate(async({season,weather,time})=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{forestSeason:season,weather,time,autoTime:false,autoWeather:false});const g=a.game,r=a.renderer;Object.assign(g.player,{x:850,y:800});r.seasons.reset(season);r.light=new EnvironmentTransition(a.environment,0);r.tone=new SceneTone(a.environment,0);r.camera.time=null;r.resize();a.refresh();colorPanel.render();r.draw();return {view:r.view,...(await import('/src/rendering/visual-review.js')).inspectSceneColor(r,document)};},{season,weather,time});
  if(stats.overflow)throw Error('横向溢出');samples.push({width,season,weather,time,...stats});await page.waitForTimeout(100);await page.evaluate(()=>a.renderer.draw());await page.screenshot({path:`output/playwright/scene-color-vibrancy/${label}-${width}-${season}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:900});await page.evaluate(async()=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{forestSeason:'summer',weather:'sun',time:'day'});Object.assign(a.game.player,{x:1210,y:700});const r=a.renderer;r.seasons.reset('summer');r.light=new EnvironmentTransition(a.environment,0);r.tone=new SceneTone(a.environment,0);r.camera.time=null;r.resize();colorPanel.render();r.draw();});await page.waitForTimeout(100);await page.evaluate(()=>a.renderer.draw());await page.screenshot({path:`output/playwright/scene-color-vibrancy/${label}-river.png`});
 if(errors.length)throw Error(errors.join(';'));return {label,samples,errors};
}




