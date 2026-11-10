// 通过营地服务的真实按钮检查购买、装卸、跨营地重装和显示重量。
async(page)=>{
 const assert=require('node:assert/strict'),out='output/regional-se-shop',errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.trackingPaused=true;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(r=>r.id);p.vehicleHulls[1]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,1);p.vehicleIndex=1;p.coins=25000;p.supplies.vehicles[1].shell=100;for(const k of ['he','frost','flame','gas','arcShell','seismic','flare'])p.supplies.vehicles[1][k]=10;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=true;g.progress.campParking.owned=[];g.enemies=[];g.boss=null;g.update=()=>{};g.livingPersist=()=>true;Object.assign(g.player,{x:9000,y:9000});a.renderer.camera.time=null;a.refresh();});
 const camps=await page.evaluate(async()=> (await import('/src/config/regional-camps.js')).REGIONAL_CAMPS);
 for(const [i,camp] of camps.entries()){
  await page.evaluate(async c=>{
   Object.assign(g.player,{x:c.x-85,y:c.y-5});
   g.vehicle.active=false;
   g.progress.campParking.owned=[{hull:1,spot:null,mapId:'forest',x:c.x+70,y:c.y+10,hp:1,ammo:0}];
   a.environment.time=c.id==='snowcedar'?'night':'day';
   a.renderer.camera.time=null;
   a.refresh();
  },camp);
  await page.locator('#nearby-interaction').tap();
  await page.locator('[data-regional-tab=repair]').tap();
  // 重型坦克自带照明器，其他首次购入后才出现安装按钮。
  const button=(action,key)=>page.locator('[data-regional-action="se-'+action+'"][data-key="'+key+'"]');
  const key=camp.seDevice;
  if(key==='flare')await button('remove',key).tap();
  else await button('buy',key).tap();
  await button('install',key).tap();
  assert.ok(await page.evaluate(k=>g.progress.vehicleSE[1].installed.includes(k),key));
  await button('remove',key).tap();
  if(i){
   const other=camps[i-1].seDevice;
   await button('install',other).tap();
   await button('remove',other).tap();
  }
  if(i===0||i===2){
   await page.setViewportSize({width:i===0?390:320,height:i===0?844:568});
   await button('install',key).scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/'+camp.id+'.png'});
   assert.equal(await page.locator('#regional-camps-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
  }
  await page.locator('#regional-camps-dialog .ui-close').tap();
 }
 assert.deepEqual(errors,[]);
 return {passed:true,camps:camps.length,errors};
}
