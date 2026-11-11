// 手机触控检验大地图选址、现场点地及刷新后的建筑位置。
const {chromium}=require('D:/ChatGPT/perf-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],out='output/playwright/free-construction';fs.mkdirSync(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(process.env.CAMP_TEST_URL||'http://localhost:4175');
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,keys:true,phase:'complete'};p.mainline.trackingPaused=true;p.coins=5000;p.wood=5000;
   g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=99999;g.parkingVisitors=[];g.vehicle.active=false;
   Object.assign(g.player,{x:4000,y:8000});g.trees=[];a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#local-minimap').dispatchEvent('click');
  const kind=page.locator('[data-construction-kind]'),map=page.locator('#region-map');
  await kind.selectOption('cottage');await map.waitFor({state:'visible'});await map.scrollIntoViewIfNeeded();
  const r=await map.boundingBox();await map.tap({position:{x:r.width/8,y:r.height*2/9}});
  await page.waitForFunction(()=>!!g.progress.campLand.sites.cottage);assert.ok(await page.evaluate(()=>g.progress.campLand.sites.cottage.x>5000));
  await kind.selectOption('fence-h');await page.locator('[data-build-world]').tap();
  const canvas=page.locator('#game-frame canvas').first();const box=await canvas.boundingBox();await canvas.tap({position:{x:box.width*.35,y:box.height*.5}});
  await page.waitForFunction(()=>g.progress.campLand.fences.length===1);await page.locator('.camp-placement-hint button').tap();
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:width===390?844:900});
   for(const time of ['day','night']){
    await page.evaluate(async time=>{
     Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false});
     a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
     a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);
    },time);
    await page.waitForTimeout(250);await page.screenshot({path:out+'/现场-'+width+'-'+time+'.png'});
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#local-minimap').dispatchEvent('click');await kind.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/地图建造.png'});
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')).campLand.fences),await page.evaluate(()=>g.progress.campLand.fences));
  assert.deepEqual(errors,[]);console.log('大地图建房、现场摆栏及存档通过');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
