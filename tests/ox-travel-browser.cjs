// 在真实路面按住犁地，经过禁种区后自动继续开田；手机触控松手仍能停车。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/ox-travel';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  const start=await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.restoration.cottageRested=true;p.farm.oxPlow=true;p.farm.axis='column';p.wood=0;p.farm.plots=[];p.farm.wildMaps=['forest','jiuzhaigou'];
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.encounterTimer=99999;g.vehicle.active=false;g.enemies=[];g.boss=null;
   const {farmLandReason}=await import('/src/world/farm-land.js'),{oxRigClear}=await import('/src/core/farming/farm.js');window.landReason=farmLandReason;
   let point;for(let x=1500;x<2800&&!point;x+=14){const s={x,y:700,mapId:'forest'};if(!farmLandReason(g,s)?.includes('路面'))continue;if(!farmLandReason(g,{...s,y:752})?.includes('路面'))continue;if(farmLandReason(g,{...s,y:908}))continue;if(Array.from({length:34},(_,i)=>({...s,y:s.y+i*8})).every(q=>oxRigClear(g,q,Math.PI/2)))point=s;}
   if(!point)throw Error('未找到连通道路与草地的真实通行段');Object.assign(g.player,{...point,vx:0,vy:0});g.progress.farm.oxSite={...(await import('/src/config/pasture.js')).oxSiteFromFoot(point,Math.PI/2),mapId:'forest',facing:1,yaw:Math.PI/2};a.renderer.camera.time=null;a.refresh();return point;
  });
  await page.locator('#farm-ox-hit').tap();await page.waitForFunction(()=>g.farmWork?.ox&&!g.farmWork.ox.approach);
  await page.evaluate(()=>{window.realUpdate=g.update.bind(g);g.update=()=>{};});
  const nextReason=await page.evaluate(async()=>landReason(g,(await import('/src/core/farming/farm.js')).oxTarget(g)));assert.match(nextReason,/路面/,JSON.stringify(await page.evaluate(async()=>({player:{x:g.player.x,y:g.player.y},target:(await import("/src/core/farming/farm.js")).oxTarget(g),plots:g.progress.farm.plots,axis:g.progress.farm.axis}))));
  const touch=await context.newCDPSession(page),button=await page.locator('[data-ox-hold]').boundingBox();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});assert.equal(await page.evaluate(()=>g.farmWork.ox.held),true);
  const travel=await page.evaluate(()=>{const initial={x:g.player.x,y:g.player.y};let frames=0;while(g.player.y-initial.y<215&&frames++<600)realUpdate(1/60);a.refresh();return {initial,end:{x:g.player.x,y:g.player.y},frames,held:g.farmWork.ox.held,dug:g.progress.farm.dug,plots:g.progress.farm.plots.filter(p=>!p.wild)};});
  assert.ok(travel.end.y-travel.initial.y>=215,JSON.stringify(travel));assert.ok(travel.held);assert.ok(travel.dug>0);assert.ok(travel.plots.every(p=>p.y>800));
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>g.farmWork.ox.held),false);
  const stopped=await page.evaluate(()=>{for(let i=0;i<60;i++)realUpdate(1/60);const y=g.player.y;for(let i=0;i<60;i++)realUpdate(1/60);a.refresh();return Math.abs(g.player.y-y);});assert.ok(stopped<.1);
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(200);await page.screenshot({path:out+'/'+width+'-'+time+'.png'});}
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({start,nextReason,travel,stopped,errors},null,2));return {start,travel,stopped,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
