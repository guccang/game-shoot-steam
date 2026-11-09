// 通过浏览器触摸协议在正式工具栏长按、松开、取消和选取，不模拟按钮点击回调。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/farm-tool-groups';
 fs.mkdirSync(out,{recursive:true});
 const ctx=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await ctx.newPage(),touch=await ctx.newCDPSession(page),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const el=id=>page.locator('#farm-'+id);
 // 真实触点抵达长按阈值后再松开，检查菜单不被随后的点击吞掉。
 async function hold(id){
  const b=await el(id).boundingBox();const point={x:b.x+b.width/2,y:b.y+b.height/2};
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await el('group-'+id).waitFor({state:'visible',timeout:3000});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await el('group-'+id).isVisible());
 }
 try{
  await page.goto(original.url());await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(x=>x.id);p.farm.lessonRewarded=true;p.farm.wildMaps=['forest','jiuzhaigou'];
   g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.spawnTimer=g.mainlineTalkDelay=9999;g.livingPersist=()=>true;Object.assign(g.player,{x:730,y:2810,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
  });
  await el('menu').tap();await el('water').tap();assert.equal(await page.evaluate(()=>g.farmWork.tool),'water');
  await hold('hoe');assert.equal(await page.evaluate(()=>g.farmWork.tool),'water');
  await page.screenshot({path:out+'/tilling.png'});await el('basic-hoe').tap();assert.equal(await page.evaluate(()=>g.farmWork.tool),'hoe');
  await hold('sickle');await el('reaper').tap();assert.equal(await page.evaluate(()=>g.farmWork.tool),'reaper');await page.locator('[data-ox-park]').tap();
  await el('menu').tap();await hold('water');await el('sprinkler').tap();await page.locator('#production-dialog').waitFor({state:'visible'});await page.locator('[data-production-close]').first().tap();
  await page.waitForFunction(()=>g.state==='playing');if(!await el('water').isVisible())await el('menu').tap();
  await page.evaluate(()=>{g.progress.production.sprinklerInventory=1;});await hold('water');await el('sprinkler').tap();
  await page.locator('#production-placement').waitFor({state:'visible'});await page.locator('[data-production-cancel]').tap();assert.equal(await page.evaluate(()=>g.progress.production.sprinklerInventory),1);
  await el('menu').tap();await page.evaluate(async()=>{const {oxSiteFromFoot}=await import('/src/config/pasture.js');g.progress.farm.oxPlow=true;g.progress.farm.oxSite={...oxSiteFromFoot(g.player,0),mapId:g.mapId};a.refresh();});
  await hold('hoe');await el('summon-ox').tap();assert.equal(await page.evaluate(()=>g.farmWork.tool),'ox');await page.locator('[data-ox-park]').tap();
  await el('menu').tap();await page.setViewportSize({width:320,height:568});await page.evaluate(async()=>{g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_DAY_MS*.85;a.refresh();});
  await hold('water');const buttons=await el('group-water').locator('button').evaluateAll(nodes=>nodes.map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height,b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))]}));assert.ok(buttons.every(([w,h,hit])=>w>=44&&h>=44&&hit));await page.screenshot({path:out+'/water-short.png'});
  await el('group-water').locator('[data-farm-group-back]').tap();await el('sickle').tap();assert.equal(await page.evaluate(()=>g.farmWork.tool),'harvest');
  await el('hoe').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');assert.equal(await el('tools').isVisible(),true);
  const r=await el('water').boundingBox();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(510);assert.ok(!await el('group-water').isVisible());assert.equal(await page.evaluate(()=>g.farmWork.tool),'harvest');
  await page.screenshot({path:out+'/toolbar.png'});
  // 镰刀在计时结束前向田块拖动，仍从原入口排队收割，不展开分类。
  await el('water').tap();await page.evaluate(()=>{
   const f=g.progress.farm;f.plots.push({id:f.nextId++,mapId:g.mapId,x:g.player.x+56,y:g.player.y-52,crop:0,plantedAt:1,readyAt:2,watered:false});a.refresh();
  });
  const plotId=await page.evaluate(()=>g.progress.farm.nextId-1);
  const from=await el('sickle').boundingBox(),to=await page.locator('[data-farm-cell="'+plotId+'"]').boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x+from.width/2,y:from.y+from.height/2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to.x+to.width/2,y:to.y+to.height/2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(id=>g.progress.farm.plots.find(p=>p.id===id)?.crop===null,plotId,{timeout:15000});
  assert.ok(!await el('group-sickle').isVisible());
  await page.setViewportSize({width:1280,height:720});await page.evaluate(async()=>{
   Object.assign(a.environment,{livingPreview:true,time:'night',weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
  });
  await hold('sickle');await page.screenshot({path:out+'/harvest-night-wide.png'});
  assert.deepEqual(errors,[]);return {types:3,dragHarvest:true,errors};
 }finally{await ctx.close();}
}
