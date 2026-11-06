// 实际领用牛犁，触屏横拖移动，检查逐格开田与停车。
async original=>{
 const browser=original.context().browser(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
 const out='output/playwright/ox-plow';
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const {freshRangerProgress}=await import('/src/progression/progress.js'),p=freshRangerProgress();
   p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.doubleCan=false;p.mining.ore=0;p.wood=0;p.coins=72;p.farm.inventory[1]=4;if(!p.keepsakes.items.includes('patrol-phone'))p.keepsakes.items.push('patrol-phone');
   const g=a.game;g.progress=p;g.reset();g.start();g.fireClock=999999;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   // 选取能连续开三格且可通行的地面，避免地形调整破坏测试。
   const {farmLandReason}=await import('/src/world/farm-land.js');
   let start;
   for(let y=350;y<1300&&!start;y+=52)for(let x=1300;x<2400&&!start;x+=56){
    if([0,1,2,3,4].every(i=>!farmLandReason(g,{x:x+i*56,y,mapId:g.mapId})))start={x,y};
   }
   if(!start)throw Error('缺少可耕田段');window.fieldPoint=start;Object.assign(g.player,{x:990,y:950});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#field-menu-toggle').tap();await page.locator('#production-menu').tap();await page.locator('[data-production-tab="tools"]').tap();
  // 在实际触屏上横拖动物入口，确认付款后才改变牧栏所有权。
  const purchaseTouch=await context.newCDPSession(page);
  async function adopt(action){
   const button=page.locator('[data-tend="'+action+'"]');await button.scrollIntoViewIfNeeded();
   const rect=await button.boundingBox(),x=rect.x+rect.width*.35,y=rect.y+rect.height/2;
   await purchaseTouch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await purchaseTouch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+38,y}]});
   await purchaseTouch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.locator('dialog[open] > .shop-dropzone:visible').tap();
   await page.locator('#shop-checkout [data-pay]').tap();
  }
  await adopt('adopt-ox');await page.waitForFunction(()=>a.game.progress.farm.oxPlow&&a.game.progress.coins===24);
  await adopt('adopt');await page.locator('[data-tend="sheep"]').tap();await page.locator('[data-tend="ox"]').tap();
  await page.locator('[data-production-close]').last().tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 从栏门一侧检查牛、羊与猫的比例，保留真实热点和前栏遮挡。
  await page.evaluate(()=>{Object.assign(a.game.player,{x:949,y:902});a.renderer.camera.time=null;a.refresh();});
  await page.waitForTimeout(250);await page.screenshot({path:out+'/pasture.png'});
  await page.evaluate(async()=>{
   Object.assign(a.environment,{time:'night',autoTime:false,autoWeather:false,livingPreview:true});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
  });await page.waitForTimeout(200);await page.screenshot({path:out+'/pasture-night.png'});

  await page.locator('#farm-ox-hit').tap();await page.waitForFunction(()=>a.game.farmWork?.tool==='ox'&&!a.game.farmWork.ox.approach,null,{timeout:12000});
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>a.game.player.y>945,null,{timeout:8000});await page.keyboard.up('ArrowDown');
  await page.locator('[data-ox-park]').tap();

  await page.evaluate(()=>{const g=a.game;Object.assign(g.player,fieldPoint);g.progress.farm.plots.push({id:92,mapId:'forest',x:fieldPoint.x-56,y:fieldPoint.y,crop:null,plantedAt:0,readyAt:0,watered:false});g.progress.farm.nextId=93;a.renderer.camera.time=null;a.refresh();});
  await page.waitForTimeout(350);await page.locator('#farm-menu').tap();await page.locator('#farm-summon-ox').tap();
  await page.waitForFunction(()=>a.game.oxArrival?.moving);
  if(!await page.locator('#farm-summon-ox').isDisabled())throw Error('赶来途中应阻止重复召唤');
  await page.waitForFunction(()=>!a.game.oxArrival);
  const distance=await page.evaluate(async()=>{
   const {oxFoot}=await import('/src/config/pasture.js'),{worldDistance}=await import('/src/world/coordinates.js');
   return worldDistance(a.game.player,oxFoot(a.game.progress.farm.oxSite));
  });
  if(distance>68)throw Error('耕牛没有走到田边玩家身旁');
  await page.locator('#farm-ox-hit').tap();await page.waitForFunction(()=>a.game.farmWork?.tool==='ox'&&!a.game.farmWork.ox?.approach);
  // 后续触控检查在完整可通行的平行田垄进行，召牛路径已由真实场景验证。
  await page.evaluate(()=>{const g=a.game;Object.assign(g.player,fieldPoint);Object.assign(g.farmWork.ox,{yaw:0,facing:1});});

  const base=await page.evaluate(()=>a.game.progress.farm.plots.length);
  const touch=await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:420}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y:420}]});
  await page.evaluate(async()=>{
   const {inspectOxPlow}=await import('/src/rendering/visual-review.js');
   const phases=[];
   while(phases.length<12){await new Promise(requestAnimationFrame);phases.push(inspectOxPlow(a.renderer).phase);}
   if(new Set(phases).size<2)throw Error('牵牛迈步未驱动四蹄');
  });
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(await page.evaluate(()=>a.game.progress.farm.plots.length)!==base)throw Error('只牵行时误开田');
  const button=await page.locator('[data-ox-hold]').boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});
  await page.waitForFunction(base=>a.game.progress.farm.plots.length>=base+3,base,{timeout:15000});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const row=await page.evaluate(()=>a.game.progress.farm.plots.filter(p=>!p.wild).slice(-3));
  if(row.some((p,i)=>p.y!==row[0].y||Math.abs(p.x-row[0].x-i*56)>.01))throw Error('田垄没有连续对齐');
  await page.locator('[data-ox-park]').tap();await page.locator('#farm-ox-hit').tap();
  await page.waitForFunction(()=>a.game.farmWork?.tool==='ox');
  await page.evaluate(async()=>{
   // 使用正式转弯校验寻找有完整半圈空间的位置。
   const g=a.game,{turnOx}=await import('/src/core/farm.js');
   let found=false;
   for(let y=1100;y<1800&&!found;y+=60)for(let x=1400;x<2600&&!found;x+=60){
    Object.assign(g.player,{x,y,vx:0,vy:0});
    Object.assign(g.farmWork.ox,{approach:null,yaw:0,facing:1,turn:null});
    turnOx(g,-1);
    if(g.farmWork.ox.turn){g.farmWork.ox.turn=null;a.renderer.camera.time=null;found=true;}
   }
   if(!found)throw Error('缺少完整转身区');
  });
  const turnStart=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
  await page.locator('[data-ox-turn]').tap();await page.waitForFunction(()=>a.game.farmWork?.ox?.turn?.elapsed>.3);
  await page.screenshot({path:out+'/front-turn.png'});
  await page.waitForFunction(()=>a.game.farmWork?.ox?.facing===-1);
  await page.evaluate(async start=>{
   const {foot,handler}= (await import('/src/rendering/visual-review.js')).inspectOxPlow(a.renderer);
   if(Math.abs(Math.abs(foot.y-start.y)-52)>1||Math.abs(foot.x-start.x)>1||handler.y>=foot.y)throw Error('牛与扶犁猫未一同转至相邻田垄');
  },turnStart);
  const count=await page.evaluate(()=>a.game.progress.farm.dug);await page.waitForTimeout(400);
  if(await page.evaluate(()=>a.game.progress.farm.dug)!==count)throw Error('停车仍在开田');
  await page.evaluate(async()=>{
   const g=a.game,x=g.player.x,y=g.player.y;
   g.progress.vehicleHulls[0]=1;g.progress.campParking.owned=[{hull:0,spot:null,mapId:g.mapId,x:x+104,y:y+84,hp:1,ammo:0}];
   const enemy=g.spawnEnemy(0,0,{x:x-130,y:y-108});Object.assign(enemy,{speed:0,damage:0,hp:1e6,maxHp:1e6});
   const shield=(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.attackKind==='defense');
   g.progress.weapon=shield;if(g.loadout)g.loadout.weapon=shield;
  });
  for(const [width,height,time] of [[320,568,'night'],[390,844,'day'],[1280,900,'day'],[1280,900,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    Object.assign(a.environment,{time,autoTime:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   },time);await page.waitForTimeout(200);await page.screenshot({path:out+'/farm-'+width+'-'+time+'.png'});
  }
 }finally{await context.close();}
}
