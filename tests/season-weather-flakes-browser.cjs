// 真实触屏切换、昼夜雪花与秋叶连续录制，另验收粒子预算和减少动态。
async (page) => {
 if(new URL(page.url()).port!=='4174')throw Error('仅使用隔离端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:'output/playwright/season-weather-flakes/video',size:{width:390,height:844}}});
 try {
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:4174/');await p.locator('#start').tap();
 await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await (await import('/src/rendering/cat-animation.js')).catSprites.load();a.game.spawnTimer=999;a.game.enemies=[];a.environment.autoWeather=false;a.environment.autoTime=false;});
 // 人为固定抽签值，验证图片按钮真正采用季节权重，并且保持当前战斗。
 const clicks=[];
 for(const season of ['spring','summer','winter']) {
  await p.evaluate(season=>{Object.assign(a.environment,{forestSeason:season,weather:'cloud'});window.oldRandom=Math.random;Math.random=()=>.8;},season);
  try{await p.locator('#weather-picture').tap();clicks.push(await p.evaluate(()=>({season:a.environment.forestSeason,weather:a.environment.weather,state:a.game.state})));}
  finally{await p.evaluate(()=>{Math.random=oldRandom;});}
 }
 if(clicks.map(x=>x.weather).join(',')!=='rain,rain,snow'||clicks.some(x=>x.state!=='playing'))throw Error('图片季节随机或战斗状态错误');
 // 用真实设置同步图片和存档，录制不得留下与场景不符的季节标签。
 async function selectEnvironment(season,weather) {
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();
  await p.locator(`[data-forest-season="${season}"]`).tap();await p.locator(`button[data-weather="${weather}"]`).tap();await p.locator('button[data-time="day"]').tap();
  await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
 }
 await selectEnvironment('winter','snow');
 await p.evaluate(async()=>{
  const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
  Object.assign(a.environment,{forestSeason:'winter',weather:'snow',time:'day'});Object.assign(a.game.player,{x:900,y:800,invincible:99});
  a.game.progress.vehicleHulls[0]=1;a.game.summonVehicle();a.game.spawnEnemy(0,0,{x:820,y:870});
  a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.refresh();
 });
 await p.waitForTimeout(400);await p.screenshot({path:'output/playwright/season-weather-flakes/snow-motion-0.png'});
 await p.waitForTimeout(1400);await p.screenshot({path:'output/playwright/season-weather-flakes/snow-motion-1.png'});
 await p.keyboard.down('ArrowRight');try{await p.waitForFunction(()=>a.game.player.x>945);}finally{await p.keyboard.up('ArrowRight');}
 await selectEnvironment('autumn','sun');
 await p.evaluate(async()=>{
  const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
  Object.assign(a.environment,{forestSeason:'autumn',weather:'sun',time:'day'});Object.assign(a.game.player,{x:900,y:1120,invincible:99});
  a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.refresh();
 });
 await p.waitForTimeout(400);await p.screenshot({path:'output/playwright/season-weather-flakes/leaves-motion-0.png'});
 await p.waitForTimeout(2000);await p.screenshot({path:'output/playwright/season-weather-flakes/leaves-motion-1.png'});
 const graphics=await p.evaluate(async()=>{
  const {SnowRenderer}=await import('/src/rendering/snow.js'),{FallingLeavesRenderer}=await import('/src/rendering/falling-leaves.js');
  const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;const c=canvas.getContext('2d');
  const snow=new SnowRenderer(),leaf=new FallingLeavesRenderer(),trees=Array.from({length:6},(_,id)=>({x:50+id*45,y:400,size:1,id,hp:55,variant:'round'}));
  const hashes={snow:[],leaves:[]};
  for(const t of [0,1,2,3]) {
   c.clearRect(0,0,390,844);snow.draw(c,t,390,844,{x:0,y:0},1);hashes.snow.push(canvas.toDataURL());
   c.clearRect(0,0,390,844);leaf.draw(c,t,trees,'autumn');hashes.leaves.push(canvas.toDataURL());
  }
  if(new Set(hashes.snow).size!==4||new Set(hashes.leaves).size!==4)throw Error('连续帧未变化');
  for(const effect of ['snow','leaves']) {
   const frames=[];
   for(const t of [3,7]){c.clearRect(0,0,390,844);if(effect==='snow')snow.draw(c,t,390,844,{x:0,y:0},1,0,true);else leaf.draw(c,t,trees,'autumn',0,true);frames.push(canvas.toDataURL());}
   if(frames[0]!==frames[1])throw Error('减少动态未冻结');
  }
  let maxSnow=0,maxLarge=0,maxLeaves=0,largePresent=false,largeAbsent=false;
  for(let t=0;t<40;t+=.5) {
   snow.draw(c,t,5000,5000,{x:0,y:0},1);maxSnow=Math.max(maxSnow,snow.count);maxLarge=Math.max(maxLarge,snow.largeCount);
   largePresent ||= snow.largeCount>0;largeAbsent ||= snow.largeCount===0;
   leaf.draw(c,t,Array.from({length:50},(_,id)=>({...trees[0],id})),'autumn');maxLeaves=Math.max(maxLeaves,leaf.count);
  }
  if(maxSnow>167||maxLarge>3||maxLeaves>18||!largePresent||!largeAbsent)throw Error('预算或大雪花间歇异常');
  for(const season of ['spring','summer','winter']){leaf.draw(c,2,trees,season);if(leaf.count)throw Error('非秋季有落叶');}
  leaf.draw(c,2,[{...trees[0],variant:'pine'}],'autumn');if(leaf.count)throw Error('松树产生阔叶');
  snow.draw(c,2,390,844,{x:0,y:0},0);if(snow.count)throw Error('非雪天仍绘制雪花');
  const {renderVisualCase}=await import('/src/rendering/visual-review.js');
  for(const id of ['weather-snow','weather-snow-night','weather-autumn-leaves','weather-autumn-leaves-night']) {
   await renderVisualCase(c,id,1);const first=canvas.toDataURL();await renderVisualCase(c,id,2);
   if(first===canvas.toDataURL())throw Error('工作台连续帧无变化 '+id);
  }
  return {frames:4,reducedFrozen:true,maxSnow,maxLarge,maxLeaves,largePresent,largeAbsent,seasonGating:true,workbenchCases:4};
 });
 const video=p.video();await context.close();if(errors.length)throw Error(errors.join(';'));
 return {designCriterion:['season-weather-balance','snowflake-readability','autumn-leaf-motion'],clicks,graphics,video:await video.path(),errors};
 } catch(error) {await context.close();throw error;}
}
