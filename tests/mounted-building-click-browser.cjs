// 手机真实触摸验证骑乘快递、其他建筑查看、拖动取消及既有上下车限制。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL(original.url()||'http://localhost:4175').origin);
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});
  await page.waitForFunction(()=>a.menu.page==='game');
  await page.evaluate(async()=>{
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const {TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
   window.delivery=(await import('/src/config/farm.js')).FARM_DELIVERY;
   // 每次重建隔离存档，真正调用上车方法；冻结战斗只为稳定点击和比较车辆数值。
   window.mountScene=index=>{
    const p=freshProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
    p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.vehicleHulls.fill(1);p.vehicleIndex=index;
    p.coins=100000;p.farm.unlocked[0]=true;p.farm.delivery.parcels=[{id:1,crop:0,count:3,sender:0,arrivedAt:1}];p.farm.delivery.nextAt=Date.now()+3600000;
    const g=a.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.enemies=[];g.update=()=>{};
    Object.assign(g.player,{x:delivery.x,y:delivery.y+80});if(!g.summonVehicle())throw Error('上车失败 '+index);
    a.renderer.camera.time=null;a.refresh();a.renderer.draw();
   };
   // 使用运行时历法和光照，不给画面叠加验收专用颜色。
   window.setLight=async time=>{
    a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();
   };
  });
  if(!new URL(original.url()).searchParams.has('buildings-only')){
  for(const index of [0,2,5])for(const [width,height,time] of [[390,844,'day'],[320,640,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(index=>mountScene(index),index);await page.evaluate(time=>setLight(time),time);
   const before=await page.evaluate(()=>({vehicle:JSON.stringify(a.game.vehicle),seeds:a.game.progress.farm.seeds[0]}));
   const hit=page.locator('#farm-delivery-hit');await hit.waitFor({state:'visible'});const box=await hit.boundingBox();
   if(box.width<44||box.height<44)throw Error('快递触控区太小');
   await hit.tap();await page.locator('#farm-mail').waitFor({state:'visible'});
   await page.screenshot({path:`output/playwright/mounted-building/delivery-${index}-${width}-${time}.png`});
   await page.locator('[data-farm-parcel="1"]').tap();
   const after=await page.evaluate(()=>({vehicle:JSON.stringify(a.game.vehicle),seeds:a.game.progress.farm.seeds[0],parcels:a.game.progress.farm.delivery.parcels.length}));
   if(after.vehicle!==before.vehicle||after.seeds!==before.seeds+3||after.parcels!==0)throw Error('骑乘领取改变车辆或未到账');
   await page.locator('[data-farm-mail-close]').tap();await page.locator('#farm-mail').waitFor({state:'hidden'});
   checks.push({index,width,time,claimed:true});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>mountScene(2));
  // 从建筑起步拖动和系统取消不会误开，短按及键盘仍可激活。
  const cdp=await context.newCDPSession(page),r=await page.locator('#farm-delivery-hit').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(await page.locator('#farm-mail').isVisible())throw Error('拖动误打开');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  if(await page.locator('#farm-mail').isVisible())throw Error('取消误打开');
  await page.locator('#farm-delivery-hit').focus();await page.keyboard.press('Enter');await page.locator('#farm-mail').waitFor({state:'visible'});
  await page.locator('[data-farm-mail-close]').tap();
  // 远处只铺路线，不远程领取；离开柜台和进入战斗时关闭正在查看的快递。
  await page.evaluate(()=>{a.game.player.y=delivery.y+190;a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
  await page.locator('#farm-delivery-hit').tap();
  const remote=await page.evaluate(async()=>({mail:!document.getElementById('farm-mail').hidden,nav:(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game)?.label,active:a.game.vehicle.active}));
  if(remote.mail||!remote.nav||!remote.active)throw Error('远程点击不正确');
  await page.evaluate(()=>{a.game.player.y=delivery.y+80;a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
  await page.locator('#farm-delivery-hit').tap();await page.locator('#farm-mail').waitFor({state:'visible'});
  await page.evaluate(()=>{a.game.livingBattle={};a.refresh();});await page.locator('#farm-mail').waitFor({state:'hidden'});
  await page.evaluate(()=>{a.game.livingBattle=null;a.refresh();});
  checks.push({dragCancel:true,keyboard:true,remote,combatCloses:true});
  }
  await page.evaluate(()=>mountScene(2));await page.evaluate(()=>setLight('day'));
  // 已有建筑逐个使用真实入口，关闭后保持骑乘；不替玩家接取或开始玩法。
  const entries=[['clearing','clearing-dialog','#clearing-close'],['post-sunleaf-post','story-dialog','#story-close'],
   ['post-monster-neighbors','living-dialog','#living-close'],['realm-fire','fire-dialog','[data-fire-close]'],['gate-top','camp-defense-dialog','#camp-close']];
  for(const [id,dialog,close] of entries){
   await page.evaluate(async id=>{const e=(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.id===id);Object.assign(a.game.player,{x:e.x,y:e.y});a.renderer.camera.time=null;a.refresh();a.renderer.draw();},id);
   await page.waitForFunction(id=>{const n=document.getElementById('nearby-interaction');return !n.hidden&&n.dataset.target===id;},id);
   // 本体与附近入口可能重叠，实际触摸最上层热点，验证玩家点击到的真实入口。
   const hit=await page.locator('#nearby-interaction').boundingBox();await page.touchscreen.tap(hit.x+hit.width/2,hit.y+hit.height/2);await page.locator('#'+dialog).waitFor({state:'visible'});
   if(!await page.evaluate(()=>a.game.vehicle.active))throw Error(id+' 打开后下车');
   await page.locator(close).first().tap();await page.waitForFunction(()=>a.game.state==='playing');checks.push({building:id,opened:true});
  }
  for(const kind of ['weapons','vehicle']){
   await page.evaluate(async kind=>{const site=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS[kind].door;Object.assign(a.game.player,{x:site.x,y:site.y});a.renderer.camera.time=null;a.refresh();a.renderer.draw();},kind);
   await page.screenshot({path:`output/playwright/mounted-building/workshop-${kind}-before.png`});
   const hit=await page.locator(`.world-workshop-entry[data-workshop-kind="${kind}"]`).boundingBox();
   // 门洞的停车按钮拥有独立操作含义，点屋顶名称来查看工坊。
   const target=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.outerHTML,{x:hit.x+hit.width/2,y:hit.y+15});
   await page.touchscreen.tap(hit.x+hit.width/2,hit.y+15);
   try{await page.locator('#workshop-dialog').waitFor({state:'visible',timeout:3000});}
   catch(error){throw Error(kind+' 点击目标 '+target+'；当前弹窗 '+await page.evaluate(()=>[...document.querySelectorAll('dialog[open]')].map(n=>n.id).join(',')));}
   if(!await page.evaluate(()=>a.game.vehicle.active&&!a.game.cottage))throw Error('骑乘工坊误入室');
   await page.locator('#ws-close').tap();checks.push({building:kind,opened:true});
  }
  await page.evaluate(async()=>{const site=(await import('/src/config/farm.js')).FARM_SEED_DOOR;Object.assign(a.game.player,{x:site.x,y:site.y});a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
  const seedHit=await page.locator('#seed-shop-hit').boundingBox();await page.touchscreen.tap(seedHit.x+seedHit.width/2,seedHit.y+seedHit.height/2);await page.locator('#seed-shop-dialog').waitFor({state:'visible'});
  await page.locator('[data-seed-shop-category="ornamental"]').tap();
  await page.locator('[data-buy-seed="0"][data-count="1"]').tap();
  if(!await page.evaluate(()=>a.game.vehicle.active))throw Error('购种改变驾驶状态');
  await page.screenshot({path:'output/playwright/mounted-building/seed-shop-mounted.png'});await page.locator('#seed-shop-close').tap();
  checks.push({building:'seed-shop',purchased:true});
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
