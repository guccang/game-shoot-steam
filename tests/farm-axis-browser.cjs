// 正式手机界面验证建造门槛、长按选择、行列作业与读档记忆。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/farm-axis';
 fs.mkdirSync(out,{recursive:true});
 const ctx=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await ctx.newPage(),touch=await ctx.newCDPSession(page),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const el=id=>page.locator('#farm-'+id);
 // 用真实触点长按分类，不直接调用界面回调。
 async function choose(group,tool){
  const b=await el(group).boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
  await el('group-'+group).waitFor({state:'visible'});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await el(tool).tap();
 }
 try{
  await page.goto('http://localhost:4175');await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(x=>x.id);
   p.farm.lessonRewarded=true;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.wildScatterVersion=1;
   g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.boss=null;
   g.fireClock=g.spawnTimer=g.mainlineTalkDelay=99999;g.livingPersist=()=>true;
   const {farmLandReason}=await import('/src/world/farm-land.js');
   let point;for(let y=1800;y<2600&&!point;y+=52)for(let x=1800;x<2400&&!point;x+=56)
    if([-1,0,1,2,3].every(i=>[-1,0,1,2,3].every(j=>!farmLandReason(g,{x:x+i*56,y:y+j*52,mapId:'forest'}))))point={x,y};
   if(!point)throw Error('需要连续行列农田');window.fieldPoint=point;Object.assign(g.player,point,{vx:0,vy:0});
   g.progress.farm.oxPlow=true;g.progress.farm.oxSite={...(await import('/src/config/pasture.js')).oxSiteFromFoot(point,0),mapId:'forest'};
   a.renderer.camera.time=null;a.refresh();
  });
  await el('menu').tap();await el('seeder').tap();await page.locator('#industry-dialog').waitFor({state:'visible'});
  assert.notEqual(await page.evaluate(()=>g.farmWork?.tool),'seeder');await page.locator('[data-industry-close]').tap();
  await page.evaluate(()=>{g.progress.materials.seederKit=1;g.progress.materials.reaperKit=1;});
  await choose('hoe','summon-ox');await page.waitForFunction(()=>g.farmWork?.ox&&!g.farmWork.ox.approach);
  await page.locator('[data-ox-axis]').tap();assert.equal(await page.evaluate(()=>g.progress.farm.axis),'column');
  const hold=page.locator('[data-ox-hold]'),box=await hold.boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await page.waitForFunction(()=>g.progress.farm.dug>=1,null,{timeout:12000});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const shared=await page.evaluate(async()=>{const v=(await import('/src/rendering/visual-review.js')).inspectOxPlow(a.renderer);return {dx:v.handler.x-v.foot.x,dy:v.handler.y-v.foot.y};});
  assert.equal(shared.dx,0);assert.equal(shared.dy,-96);
  assert.ok(await page.evaluate(()=>g.player.bodyAnimation.moveWeight<.01));
  await page.evaluate(async()=>{
   const {x,y}=g.player;g.progress.vehicleHulls[0]=1;
   g.progress.campParking.owned=[{hull:0,spot:null,mapId:g.mapId,x:x+104,y:y+84,hp:1,ammo:0}];
   const enemy=g.spawnEnemy(0,0,{x:x-130,y:y-108});Object.assign(enemy,{speed:0,damage:0,hp:1e6,maxHp:1e6});
   const shield=(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.attackKind==='defense');g.progress.weapon=shield;g.loadout.weapon=shield;
  });
  await page.waitForFunction(()=>!document.querySelector('.toast.visible'));
  // 同一正式场景在短屏、长屏与桌面竖版容器里复核昼夜，不新增布局。
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1280,900,'day'],[1280,900,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{
    Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },time);await page.waitForTimeout(250);
   const buttons=await page.locator('#farm-ox-controls button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,right:r.right,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}));
   await page.screenshot({path:`${out}/ox-${width}-${time}.png`});
   assert.ok(buttons.every(b=>b.w>=44&&b.h>=44&&b.x>=0&&b.right<=width&&b.hit),JSON.stringify({width,buttons}));
  }
  await page.setViewportSize({width:390,height:844});await page.locator('[data-ox-park]').tap();
  await page.evaluate(()=>{g.enemies=[];});
  assert.match(await el('hoe').innerText(),/耕牛/);await el('exit').tap();await el('menu').tap();
  await page.waitForFunction(()=>g.farmWork?.tool==='ox');await page.locator('[data-ox-park]').tap();
  await choose('sickle','reaper');assert.equal(await page.evaluate(()=>g.farmWork.reaper.axis),'column');
  await page.evaluate(async()=>{
   const f=g.progress.farm,{x,y}=fieldPoint;
   // 停牛留在田边，避免牛身遮住新农具的动作验收。
   f.oxSite={...(await import('/src/config/pasture.js')).oxSiteFromFoot({x:x-110,y:y+90},0),mapId:'forest'};
   f.plots=Array.from({length:6},(_,id)=>({id,mapId:'forest',x:x+56*Math.floor(id/3),y:y+52*(id%3),crop:0,plantedAt:1,readyAt:2,watered:false}));f.nextId=6;
   Object.assign(g.player,{x,y:y-26,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
  });
  const harvest=await hold.boundingBox();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:harvest.x+harvest.width/2,y:harvest.y+harvest.height/2}]});
  await page.waitForFunction(()=>g.progress.farm.harvested>=1);await page.screenshot({path:out+'/reaper-column-moving.png'});
  await page.waitForFunction(()=>g.progress.farm.harvested===3&&!g.farmWork.reaper.held,null,{timeout:16000});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual(await page.evaluate(()=>g.progress.farm.plots.map(p=>p.crop)),[null,null,null,0,0,0]);
  await page.locator('[data-ox-axis]').tap();assert.equal(await page.evaluate(()=>g.farmWork.reaper.axis),'row');
  await page.screenshot({path:out+'/reaper-row.png'});await page.locator('[data-ox-park]').tap();
  assert.match(await el('sickle').innerText(),/推镰/);await el('seeder').tap();await el('axis').tap();
  assert.equal(await page.evaluate(()=>g.progress.farm.axis),'column');await page.screenshot({path:out+'/seeder-column.png'});
  await page.evaluate(()=>{g.progress.farm.seeds[0]=3;g.progress.farm.unlocked[0]=true;});
  await page.locator('[data-farm-cell="1"]').tap();await page.locator('[data-farm-seed="0"]').tap();
  await page.waitForFunction(()=>g.progress.farm.seeds[0]===2,null,{timeout:15000});await page.screenshot({path:out+'/seeder-column-moving.png'});
  await page.waitForFunction(()=>g.progress.farm.seeds[0]===0&&!g.farmWork.job&&!g.farmWork.queue.length,null,{timeout:20000});
  assert.deepEqual(await page.evaluate(()=>g.progress.farm.plots.map(p=>p.crop)),[0,0,0,0,0,0]);
  await el('exit').tap();
  await page.evaluate(async()=>{g.progress=(await import('/src/progression/progress.js')).validateProgress(JSON.parse(JSON.stringify(g.progress)));a.refresh();});
  await el('menu').tap();assert.equal(await page.evaluate(()=>g.farmWork.tool),'seeder');
  assert.match(await el('hoe').innerText(),/耕牛/);assert.match(await el('sickle').innerText(),/推镰/);
  assert.equal(await page.evaluate(()=>g.progress.farm.axis),'column');
  assert.deepEqual(errors,[]);return {shared,remembered:true,locked:true,errors};
 }finally{await ctx.close();}
}
