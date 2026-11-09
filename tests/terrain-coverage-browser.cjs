// 正式手机场景检查山湖边界、林地密度、昼夜、独立角色与地图资源；使用隔离浏览器存档。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/terrain-coverage';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  const sites=await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error(JSON.stringify(a.game.profiler.events.filter(e=>e.type==='frame-error')));window.g=a.game;window.updateGame=g.update.bind(g);g.update=()=>{};
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(r=>r.id);p.vehicleHulls[5]=1;g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.arrivalScene=null;g.vehicle.active=false;g.boss=null;g.enemies=[];g.spawnTimer=g.encounterTimer=g.mainlineTalkDelay=999999;
   const {NATURAL_TERRAIN:t}=await import('/src/world/natural-terrain.js'),{nearestDryTerrain}=await import('/src/physics/terrain-navigation.js'),{forestCoverAt}=await import('/src/world/forest-cover.js');
   const lake=t.lakes.find(i=>i.regional&&i.rx>900),{mountainPeaks}=await import('/src/world/mountain-peaks.js'),mountain=t.mountains.find(i=>i.regional&&mountainPeaks(i).length>12),peak=mountainPeaks(mountain)[4];
   const forest=g.trees.find(t=>t.x>10800&&forestCoverAt(t.x,t.y)==='forest');
   return [{id:'lake',...nearestDryTerrain({x:lake.x+lake.bounds.x-55,y:lake.y})},{id:'mountain',x:peak.x-110,y:peak.y+95},{id:'forest',...nearestDryTerrain({x:forest.x+80,y:forest.y+70})}];
  });
  const reports=[];
  for(const [width,height] of [[390,844],[320,568],[580,844]])for(const time of ['day','night'])for(const site of width===390?sites:[sites[0]]){
   await page.setViewportSize({width,height});
   await page.evaluate(async({site,time})=>{
    Object.assign(g.player,{x:site.x,y:site.y,vx:0,vy:0});g.enemies=[];g.spawnEnemy(.4,160);g.progress.campParking.owned=[{hull:5,mapId:'forest',spot:null,x:site.x-70,y:site.y+90,hp:1,ammo:0}];
    Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;g.time=12;g.previewTime=12;a.refresh();a.renderer.draw();
   },{site,time});
   await page.waitForFunction(()=>a.renderer.ground.ready(a.renderer.view),null,{timeout:30000});await page.waitForTimeout(200);
   const report=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectTerrainCoverage(a.renderer);return {...r,natural:(await import('/src/rendering/natural-terrain.js')).naturalAtlasStats()};});
   assert.equal(report.overflow,false);assert.ok(report.natural.bytes<32*1024*1024);assert.ok(report.cache.count<=report.cache.limit);reports.push({width,time,site:site.id,...report});
   await page.screenshot({path:`${out}/${site.id}-${width}-${time}.png`});
  }
  // 正式运动函数验证在岸边仍能走动；两栖越水由同源物理入口处理。
  const motion=await page.evaluate(async()=>{const {moveBody}=await import('/src/physics/motion.js'),{NATURAL_TERRAIN:t,isLakeWater}=await import('/src/world/natural-terrain.js');const lake=t.lakes.find(i=>i.regional&&i.rx>900);let edge=lake.x+lake.bounds.x-20;while(!isLakeWater(edge,lake.y))edge+=2;const body={x:edge-30,y:lake.y,amphibious:true},walker={x:edge-30,y:lake.y},start={...body};moveBody(body,80,0,{width:48000,height:36000});moveBody(walker,80,0,{width:48000,height:36000});return {start,end:body,moved:Math.hypot(body.x-start.x,body.y-start.y),water:isLakeWater(body.x,body.y),walkerWater:isLakeWater(walker.x,walker.y)};});assert.ok(motion.moved>70);assert.equal(motion.water,true);assert.equal(motion.walkerWater,false);
  // 山地内以正式触控输入前进，验证开放的不只是绘制或静态碰撞接口。
  await page.setViewportSize({width:390,height:844});const start=sites.find(i=>i.id==='mountain');
  await page.evaluate(start=>{Object.assign(g.player,{x:start.x,y:start.y,vx:0,vy:0});g.enemies=[];g.progress.campParking.owned=[];g.state='playing';g.update=updateGame;a.renderer.camera.time=null;},start);
  const touch=await context.newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:75,y:400}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:155,y:400}]});
  await page.waitForFunction(start=>g.player.x-start.x>100,start,{timeout:8000});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const mountainMove=await page.evaluate(async start=>{g.update=()=>{};const {isMountainArea,isMountainBlocked}=await import('/src/world/natural-terrain.js');return {distance:g.player.x-start.x,inMountain:isMountainArea(g.player.x,g.player.y),blocked:isMountainBlocked(g.player.x,g.player.y)};},start);
  assert.ok(mountainMove.distance>100);assert.equal(mountainMove.inMountain,true);assert.equal(mountainMove.blocked,false);await page.screenshot({path:out+'/mountain-touch.png'});
  fs.writeFileSync(out+'/result.json',JSON.stringify({sites,reports,motion,mountainMove,errors},null,2));assert.deepEqual(errors,[]);return {sites,samples:reports.length,motion,mountainMove,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});console.error({errors});throw e;}finally{await context.close();}
}
