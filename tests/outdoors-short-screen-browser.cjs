// 用已购装备检查点复核短屏、昼夜及九寨沟；实际抛竿与扬竿继续通过界面输入。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.outdoors.rod=true;p.outdoors.bait=20;
  const g=a.game;g.progress=p;g.reset();g.state='playing';g.random=()=>.4;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=99999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.progress.living.patrolActive=false;g.cottage=null;
  window.setLake=async map=>{g.fishing=null;g.mapId=g.player.mapId=map;const shore=(await import('/src/world/outdoor-sites.js')).fishingShores(g)[0];g.player.x=shore.x;g.player.y=shore.y;a.renderer.camera.time=null;a.refresh();};
  Object.assign(a.environment,{autoTime:false,autoWeather:false,weather:'sun',livingPreview:true});
 });
 // 显示阶段采样检查鱼竿、水面落点及完整操作条的实际屏幕关系。
 async function shot(name){await page.waitForTimeout(120);const info=await page.evaluate(()=>{const g=a.game,f=g.fishing,v=a.renderer.view,r=document.getElementById('fishing-hud').getBoundingClientRect();return {phase:f.phase,waterY:((f.water||f.shore.water).y-v.y)*v.zoom,hudTop:r.top,overflow:document.documentElement.scrollWidth>innerWidth||r.left<0||r.right>innerWidth||r.bottom>innerHeight};});if(info.overflow||info.waterY>info.hudTop-10)throw Error('浮漂或操作条被遮挡 '+JSON.stringify(info));await page.screenshot({path:'output/playwright/camping-fishing/'+name+'.png'});}
 for(const [width,height,map,time] of [[320,568,'forest','day'],[320,568,'forest','night'],[390,844,'jiuzhaigou','day'],[390,844,'jiuzhaigou','night']]){
  await page.setViewportSize({width,height});await page.evaluate(async({map,time})=>{await setLake(map);a.environment.time=time;a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.refresh();},{map,time});
  await page.locator('#field-menu-toggle').tap();await page.locator('#outdoor-menu').tap();await page.locator('[data-outdoor-action=fish]').tap();await page.waitForFunction(()=>a.game.fishing?.phase==='ready');
  const button=page.locator('#fishing-control');await button.focus();await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('Space');await page.waitForFunction(()=>a.game.fishing?.phase==='waiting');
  await shot('lake-'+map+'-'+width+'-'+time);await page.waitForFunction(()=>a.game.fishing?.phase==='bite');await button.tap();await page.waitForFunction(()=>a.game.fishing?.phase==='fight');await shot('fight-'+map+'-'+width+'-'+time);await page.locator('#fishing-cancel').tap();
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {ok:true,checks:'320短屏与390长屏昼夜，森林与九寨沟湖岸，真实黑漂扬竿，浮漂不被操作条遮挡',errors};
}
