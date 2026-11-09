// 通过当前运行游戏的模块和真实触控入口验收水袋补水。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/water-bag';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.restoration.cottageRested=true;
   window.wi=(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.id==='water');p.weapon=wi;p.weapons[wi]=1;p.coins=99999;p.wood=99999;
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.encounterTimer=99999;g.vehicle.active=false;g.enemies=[];g.boss=null;
   const r=await import('/src/world/river-geometry.js');Object.assign(g.player,{x:r.riverXAt(1800)+r.riverHalfWidth(1800,1)+25,y:1800,vx:0,vy:0});
   window.realUpdate=g.update.bind(g);g.update=()=>{};window.mag=g.magazines[wi];a.renderer.camera.time=null;a.refresh();
   window.check=()=>import('/src/rendering/visual-review.js').then(m=>m.inspectWaterBag(g,a.renderer));
   // 通过正式更新入口推进，确认没有仅在测试直接调用补水函数才有效。
   for(let i=0;i<40;i++)realUpdate(.05);a.refresh();
  });
  const mid=await page.evaluate(()=>check());assert.equal(mid.ammo,20,JSON.stringify(mid));assert.ok(mid.filling);assert.equal(mid.icon,'waterbag');
  // 长短手机及既有桌面竖版容器，补水中让原角色和环境实际同屏。
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();},time);await page.waitForTimeout(200);
   const sample=await page.evaluate(()=>check());assert.ok(sample.touch&&!sample.overflow,JSON.stringify(sample));assert.equal(sample.indicator?.percent,50);samples.push({width,height,time,...sample});
   await page.screenshot({path:`${out}/refill-${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{g.vehicle.active=true;g.spawnEnemy(0,0,{x:g.player.x+100,y:g.player.y+400});a.renderer.camera.time=null;a.refresh();});
  for(const time of ['day','night']){await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);await page.waitForTimeout(200);await page.screenshot({path:`${out}/rider-enemy-${time}.png`});}
  await page.evaluate(()=>{g.vehicle.active=false;g.enemies=[];a.renderer.camera.time=null;a.refresh();});
  await page.locator('#magazine-hud').tap();await page.locator('#field-equipment-dialog').waitFor({state:'visible'});
  assert.match(await page.locator('#field-equipment-body').innerText(),/水袋 20 \/ 40/);assert.ok(await page.locator('[data-ammo-icon="waterbag"]').count());await page.screenshot({path:out+'/details-390.png'});
  const paused=await page.evaluate(()=>{for(let i=0;i<80;i++)realUpdate(.05);return mag.ammo;});assert.equal(paused,20);
  await page.keyboard.press('Escape');await page.locator('#field-equipment-dialog').waitFor({state:'hidden'});
  await page.evaluate(()=>{for(let i=0;i<40;i++)realUpdate(.05);a.refresh();});assert.equal(await page.evaluate(()=>mag.ammo),40);await page.waitForTimeout(100);await page.screenshot({path:out+'/full-390.png'});
  await page.evaluate(async()=>{Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).interiorLayout({kind:'weapons'}).door);(await import('/src/core/home/cottage.js')).enterWorkshop(g,'weapons');a.workshop.open('weapons',wi);});await page.locator('#workshop-dialog').waitFor({state:'visible'});
  assert.match(await page.locator('#ws-stats').innerText(),/水袋容量/);assert.match(await page.locator('#ws-stats').innerText(),/补满用时/);
  await page.screenshot({path:out+'/workshop-390.png'});
  await page.locator('[data-ws-upgrade="capacity"]').tap();await page.waitForTimeout(1200);assert.match(await page.locator('#ws-stats').innerText(),/40 → 44/);await page.locator('#ws-upgrade-preview').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/capacity-preview.png'});
  await page.locator('#ws-change-part').tap();
  await page.locator('[data-ws-upgrade="reload"]').tap();await page.waitForTimeout(1200);assert.match(await page.locator('#ws-stats').innerText(),/补满用时/);await page.locator('#ws-upgrade-preview').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/pump-preview.png'});
  await page.setViewportSize({width:320,height:568});await page.screenshot({path:out+'/workshop-320.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({samples,errors},null,2));return {designCriterion:'water-bag-refill',samples:samples.length,errors};
 }finally{await context.close();}
}
