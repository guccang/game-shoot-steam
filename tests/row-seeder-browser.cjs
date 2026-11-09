// 在隔离存档中点选正式农具、田格和种子，记录昼夜、短屏和宽屏下的实际播种。
async original=>{
 const fs=require('fs'),assert=require('node:assert/strict'),out='output/playwright/row-seeder';
 fs.mkdirSync(out,{recursive:true});
 const ctx=await original.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url());
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;
   window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(v=>v.id);
   p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.wildScatterVersion=(await import('/src/config/wild-farm.js')).WILD_FARM_SCATTER.version;
   p.farm.lessonRewarded=true;p.farm.seeds.fill(0);p.farm.seeds[0]=3;
   p.farm.plots=Array.from({length:8},(_,id)=>({id,mapId:'forest',x:720+id%4*56,y:2752+Math.floor(id/4)*52,crop:id===1?1:null,plantedAt:id===1?Date.now()-999999:0,readyAt:id===1?Date.now()-1:0,watered:false}));p.farm.nextId=8;
   g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.vehicle.active=false;g.fireClock=g.spawnTimer=g.mainlineTalkDelay=99999;g.enemies=[];g.livingPersist=()=>true;
   Object.assign(g.player,{x:730,y:2817,vx:0,vy:0});a.renderer.camera.time=null;
   window.light=async night=>{
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_DAY_MS*(night?.85:.3);
    Object.assign(a.environment,{livingPreview:true,time:night?'night':'day',weather:'sun',autoTime:false,autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   };
   await light(false);
  });
  const menu=page.locator('#farm-menu'),seeder=page.locator('#farm-seeder'),cell=page.locator('[data-farm-cell="1"]'),seed=page.locator('[data-farm-seed="0"]');
  if(!await menu.isVisible())await page.locator('#field-menu-toggle').tap();
  await menu.tap();await seeder.tap();await cell.tap();await seed.waitFor({state:'visible'});
  await page.screenshot({path:out+'/choose.png'});await seed.tap();
  await page.waitForFunction(()=>g.progress.farm.seeds[0]===2,undefined,{timeout:16000});
  const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectRowSeeder(a.renderer));
  assert.ok(sample.active&&sample.travel>0);
  await page.screenshot({path:out+'/sowing.png'});
  await page.waitForFunction(()=>g.progress.farm.seeds[0]===0&&!g.farmWork.job&&!g.farmWork.queue.length,undefined,{timeout:22000});
  assert.deepEqual(await page.evaluate(()=>g.progress.farm.plots.slice(0,8).map(p=>p.crop)),[0,1,0,0,null,null,null,null]);
  await page.screenshot({path:out+'/result.png'});
  await page.evaluate(()=>light(true));await page.waitForTimeout(350);await page.screenshot({path:out+'/night.png'});
  await page.setViewportSize({width:320,height:568});await page.waitForTimeout(250);
  const bounds=await seeder.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44);await page.screenshot({path:out+'/short.png'});
  await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(250);await page.screenshot({path:out+'/wide.png'});
  assert.deepEqual(errors,[]);return {planted:3,preserved:1};
 }finally{const video=page.video();await ctx.close();fs.copyFileSync(await video.path(),out+'/demo.webm');}
}
