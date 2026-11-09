// 真实手机入口加载重建后的底图，并通过触控移动确认正式角色动作没有被地貌改动替换。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/terrain-coverage';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.updateGame=g.update.bind(g);g.update=()=>{};
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.vehicle.active=false;g.spawnTimer=g.encounterTimer=g.mainlineTalkDelay=99999;Object.assign(g.player,{x:1700,y:710,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#phone-button').tap();
  const buttons=await page.locator('#phone-dialog button').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),html:n.outerHTML.slice(0,250)})));fs.writeFileSync(out+'/phone-buttons.json',JSON.stringify(buttons,null,2));
  await page.locator('#phone-dialog').getByRole('button',{name:/地图/}).first().tap();await page.waitForFunction(()=>document.getElementById('map-dialog').open);
  await page.waitForFunction(()=>a.renderer.ground.mapPreview.stats().count>0&&!a.renderer.ground.mapPreview.stats().pending);await page.waitForTimeout(250);
  const map=await page.evaluate(async()=>({version:(await import('/src/rendering/map-preview-cache.js')).MAP_PREVIEW_VERSION,cache:a.renderer.ground.mapPreview.stats(),overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(map.version,'2026-11-08-open-mountains');assert.equal(map.cache.error,null);assert.equal(map.overflow,false);
  await page.locator('#region-map').screenshot({path:out+'/map-mobile.png'});await page.screenshot({path:out+'/map-dialog-390.png'});await page.locator('#close-map').tap();
  if(await page.locator('#phone-dialog').isVisible())await page.locator('#phone-close').tap();
  await page.evaluate(()=>{g.state='playing';g.update=updateGame;});const start=await page.evaluate(()=>({x:g.player.x,y:g.player.y})),touch=await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:75,y:400}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:155,y:400}]});await page.waitForFunction(start=>Math.hypot(g.player.x-start.x,g.player.y-start.y)>20,start,{timeout:7000});await page.screenshot({path:out+'/move-touch.png'});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.evaluate(()=>{g.update=()=>{};});await page.screenshot({path:out+'/stop-touch.png'});
  const movement=await page.evaluate(start=>({start,end:{x:g.player.x,y:g.player.y},distance:Math.hypot(g.player.x-start.x,g.player.y-start.y)}),start);assert.deepEqual(errors,[]);fs.writeFileSync(out+'/map-result.json',JSON.stringify({map,movement,errors},null,2));return {map,movement,errors};
 }finally{await context.close();}
}
