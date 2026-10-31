// 正式绘制器同屏采样：施工末段、猫与独立手枪、怪物、停驻电动车和原地形共处昼夜画面。
async page=>{
 if(new URL(page.url()).port!=='4294')throw Error('仅限隔离验收端口4294');
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;const g=a.game,{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),f=TOWN_RESTORATIONS.find(f=>f.id==='cottage');
  // 交互已由连续录像覆盖；只为截图固定施工末段，保留全部正式绘制入口。
  g.update=()=>{};g.state='playing';g.progress.arrival.phase='complete';g.arrivalScene=null;
  g.progress.mainline.completed=MAINLINE_IDS.slice(0,f.order);g.progress.mainline.phase='doing';
  g.progress.restoration.repaired=['clearing'];g.progress.restoration.build={id:'cottage',elapsed:2.9,x:f.x-40,y:f.y+65};
  g.progress.weapons[0]=1;g.progress.weapon=0;g.progress.vehicleHulls[5]=1;
  g.progress.campParking.owned=[{hull:5,spot:'cottage',hp:1,ammo:0,reload:0,wheel:0,track:0}];
  Object.assign(g.player,{x:f.x-40,y:f.y+65,vx:0,vy:0,angle:.4});
  g.enemies=[];g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y+60},{ambient:true});
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
  a.renderer.camera.time=null;a.refresh();
 });
 for(const time of ['day','night']){
  await page.evaluate(async time=>{
   a.environment.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();
  },time);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:width===320?568:width===390?844:900});
   await page.screenshot({path:'docs/art-reference/wood-flow-scene-'+width+'-'+time+'.png'});
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>a.renderer.reduced.matches);await page.evaluate(()=>a.renderer.draw());
 await page.screenshot({path:'docs/art-reference/wood-flow-reduced.png'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>window.woodFlowVisual={screens:7,time:a.environment.time,elapsed:a.game.progress.restoration.build.elapsed});
}
