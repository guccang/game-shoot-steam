// 清缴显示半径扩大后的真实页面边界、昼夜布局与材料联动验收。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[],dir='output/playwright/clearing-hud-range';page.on('pageerror',e=>errors.push(e.message));
 // 从正式绘制器审核入口读取UI，检查与波次、领主栏和设置的空间关系。
 async function inspect(label){const r=await page.evaluate(async()=>{
  const r=(await import('/src/rendering/visual-review.js')).inspectClearingMaterialTracking(a.game,document),frame=document.getElementById('game-frame').getBoundingClientRect();
  const cards=['quest','boss-hud'].map(id=>document.getElementById(id)).filter(n=>!n.hidden&&n.offsetHeight),bottom=Math.max(...cards.map(n=>n.getBoundingClientRect().bottom));
  return {...r,bottom,frame:{left:frame.left,right:frame.right},clipped:[...document.querySelectorAll('.clearing-goal-resource')].some(n=>n.scrollWidth>n.clientWidth+1)};
 });if(!r.visible||!r.clearing||r.box.height<44||r.box.top<r.bottom+5||r.box.left<r.frame.left||r.box.right>r.frame.right||r.overflow||r.clipped)throw Error(label+JSON.stringify(r));samples.push({label,...r});return r;}
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.bosses=4;p.living.patrolActive=true;p.equipmentGoal={kind:'weapons',index:6};p.weapons[6]=0;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.wildScatterVersion=1;p.vehicleHulls[0]=1;p.vehicleIndex=0;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.update=()=>{};g.spawnTimer=999;g.enemies=[];
   const site=(await import('/src/progression/story/clearing-site.js')).clearingSite(p);Object.assign(g.player,site);g.wave=21;g.summonVehicle();a.renderer.camera.time=null;a.refresh();
  });
  // 沿同一场地边缘往返，检查波次、标题、材料样式同步保留或退出。
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{const e=a.environment;Object.assign(e,{time,autoTime:false,autoWeather:false,weather:'sun',livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);},time);
   for(const distance of [300,301,375,450,451,375]){
    await page.evaluate(async distance=>{const s=(await import('/src/progression/story/clearing-site.js')).clearingSite(a.game.progress);Object.assign(a.game.player,{x:s.x+distance,y:s.y});a.refresh();},distance);
    await page.waitForTimeout(100);
    const r=await page.evaluate(()=>({quest:!document.getElementById('quest').hidden,track:!document.getElementById('wave-track').hidden,focused:document.getElementById('quest').classList.contains('clearing-focused'),material:document.getElementById('equipment-goal').classList.contains('clearing-material-goal')}));
    for(const [key,value] of Object.entries(r))if(value!==(distance<=450))throw Error(`${width}-${time}-${distance}-${key}: ${value}`);
    if(distance<=450)await inspect(`${width}-${time}-${distance}`);
   }
   await page.screenshot({path:`${dir}/${width}-${time}.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'clearing-material-tracking',samples:samples.length,boundaryChecks:36,errors};
 }finally{await context.close();}
}
