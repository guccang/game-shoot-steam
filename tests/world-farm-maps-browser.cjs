// 第二张地图的正式开垦交互与刷新存档；夹具仅定位安全空地、跳过旧主线。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.farmApp=(await import('/src/main.js')).application;await farmApp.ready;const g=farmApp.game;
  g.mapId=g.progress.mapId='jiuzhaigou';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;
  const {snapFarmPoint,farmLandReason,farmApproach}=await import('/src/world/farm-land.js');let site;
  for(let y=500;y<3000&&!site;y+=52)for(let x=500;x<3000&&!site;x+=56){const p=snapFarmPoint({x,y},g.mapId);Object.assign(g.player,p);if(!farmLandReason(g,p)){const approach=farmApproach(g,p);if(approach)site={point:p,approach};}}
  if(!site)throw Error('湖谷缺少可开垦空地');window.mapFarmSite=site;window.mapFarmId=g.progress.farm.nextId;Object.assign(g.player,site.approach,{vx:0,vy:0,invincible:99999});g.enemies=[];
  Object.assign(farmApp.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});farmApp.renderer.camera.time=null;farmApp.refresh();
 });
 await page.waitForTimeout(650);await page.locator('#field-menu-toggle').click();await page.locator('#farm-menu').click();
 const p=await page.evaluate(()=>{const v=farmApp.renderer.view,r=farmApp.renderer.canvas.getBoundingClientRect(),p=mapFarmSite.point;return {x:r.x+(p.x-v.x)*v.zoom,y:r.y+(p.y-v.y)*v.zoom};});await page.mouse.click(p.x,p.y);
 await page.waitForFunction(()=>farmApp.game.progress.farm.plots.some(p=>p.id===mapFarmId),null,{timeout:15000});await page.waitForTimeout(450);
 const id=await page.evaluate(()=>mapFarmId);await page.locator(`[data-farm-cell="${id}"]`).click();await page.locator('[data-farm-seed="0"]').click();await page.locator(`[data-farm-cell="${id}"]`).click();
 await page.waitForFunction(()=>farmApp.game.progress.farm.plots.find(p=>p.id===mapFarmId)?.crop===0,null,{timeout:15000});await page.waitForTimeout(450);
 await page.screenshot({path:'output/playwright/world-farm-delivery/09-lake-farm.png'});
 const before=await page.evaluate(()=>structuredClone(farmApp.game.progress.farm));if(!before.plots.some(p=>p.mapId==='forest')||!before.plots.some(p=>p.mapId==='jiuzhaigou'))throw Error('跨图丢失了另一张地图的土地');
 await page.reload();await page.waitForTimeout(800);if(await page.locator('#start').isVisible())await page.locator('#start').click();
 const after=await page.evaluate(async()=>{window.farmApp=(await import('/src/main.js')).application;await farmApp.ready;return structuredClone(farmApp.game.progress.farm);});
 for(const key of ['plots','seeds','lessonRewarded','nextId'])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))throw Error('刷新丢失农田状态：'+key);
 if(after.delivery.claimed!==before.delivery.claimed)throw Error('已领取包裹记录丢失');if(errors.length)throw Error(JSON.stringify(errors));
 return {maps:[...new Set(after.plots.map(p=>p.mapId))],plots:after.plots.length,claimed:after.delivery.claimed,restored:true,errors};
}
