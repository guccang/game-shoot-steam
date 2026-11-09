// 隔离手机存档，通过正式 Debug、仓库按钮验证领取、往返、移动和重载。
async original=>{
 const out='output/playwright/debug-grant-storage/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 // 显示 Debug 菜单，所有领取使用页面原有事件。
 async function debug(){await page.locator('#settings-button').tap();await page.locator('#settings-advanced>summary').tap();await page.locator('#debug-toggle').tap();}
 // 截取正式页面并校验外框，不用替代绘制或固定游戏时钟。
 async function shot(name){const bad=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('dialog[open]')].some(d=>{const r=d.getBoundingClientRect();return r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1;}));if(bad)throw Error('布局溢出 '+name);await page.screenshot({path:out+name+'.png'});checks.push(name);}
 try{
  await page.goto(original.url());await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=99999;g.progress.living.patrolActive=false;g.enemies=[];g.parkingVisitors=[];Object.assign(g.player,{x:780,y:900,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
  await debug();
  await page.evaluate(()=>{window.before=structuredClone(a.game.progress);window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('验收：保存不可用');};});
  await page.locator('#unlock-weapons').tap();if(!await page.evaluate(()=>JSON.stringify(before)===JSON.stringify(a.game.progress)))throw Error('保存失败改变进度');await page.evaluate(()=>{Storage.prototype.setItem=originalSet;});checks.push('save-rollback');
  await page.locator('#unlock-weapons').tap();await page.locator('#unlock-vehicles').tap();
  await page.evaluate(async()=>{const g=a.game,{catLoad}=await import('/src/progression/inventory/load-weight.js');if(catLoad(g).overloaded||g.progress.warehouse.weapons.length!==18||!g.progress.vehicleHulls.every(n=>n>0))throw Error('领取不完整或超重');for(const [hull,gun] of [[0,17],[1,18],[2,19],[3,20],[6,21],[7,22]])if(g.vehicles[hull].weaponIndex!==gun)throw Error('未同步主炮 '+hull);});
  await page.locator('#max-weapons').tap();await page.locator('#unlock-feedback').scrollIntoViewIfNeeded();await shot('debug-grants');await page.locator('#settings-done').tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 测试起点通过正式碰撞检测选择，避免贴墙把碰撞误判为负重锁定。
  await page.evaluate(async()=>{const g=a.game,{blocked}=await import('/src/physics/motion.js');for(let y=600;y<1100;y+=40)for(let x=350;x<1000;x+=40)if(Array.from({length:9},(_,i)=>x+i*12).every(px=>!blocked(px,y,12,g.trees,g.player))){Object.assign(g.player,{x,y,vx:0,vy:0});return;}throw Error('未找到测试空地');});
  const beforeMove=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await page.keyboard.down('ArrowRight');await page.waitForTimeout(600);await page.keyboard.up('ArrowRight');const distance=await page.evaluate(p=>Math.hypot(a.game.player.x-p.x,a.game.player.y-p.y),beforeMove);if(distance<15)throw Error('领取后不能移动 '+distance);checks.push('movement-'+distance.toFixed(1));
  await page.evaluate(async()=>{const s=(await import('/src/config/warehouse.js')).WAREHOUSE;Object.assign(a.game.player,{x:s.x,y:s.y+60,vx:0,vy:0});a.game.cottageDoorLatch=false;a.renderer.camera.time=null;a.refresh();});
  await page.locator('#nearby-interaction[data-interaction=warehouse]').tap();await page.locator('#warehouse-dialog[open]').waitFor();await page.locator('#warehouse-dialog [data-category=weapon]').tap();
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{autoWeather:false,weather:'sun',autoTime:false,time,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(250);if(!await page.evaluate(()=>[...document.querySelectorAll('#warehouse-dialog canvas')].every(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>0))))throw Error('仓库武器图标未绘制');await shot('warehouse-'+width+'-'+time);
   if(!await page.evaluate(()=>[...document.querySelectorAll('#warehouse-dialog [data-category]')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44;})))throw Error('分类触控区域过小');
  }
  await page.locator('[data-item="weapon:1"][data-direction=withdraw]').tap();await page.locator('#warehouse-quantity [data-confirm]').tap();if(!await page.evaluate(()=>!a.game.progress.warehouse.weapons.includes(1)))throw Error('取出失败');
  await page.locator('[data-item="weapon:1"][data-direction=deposit]').tap();await page.locator('#warehouse-quantity [data-confirm]').tap();if(!await page.evaluate(()=>a.game.progress.warehouse.weapons.includes(1)))throw Error('存入失败');checks.push('weapon-roundtrip');
  await page.locator('#warehouse-dialog [data-close]').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,{catLoad}=await import('/src/progression/inventory/load-weight.js');if(catLoad(g).overloaded||g.progress.warehouse.weapons.length!==18||!g.progress.vehicleHulls.every(n=>n>0)||![9,10].every(i=>g.progress.campParking.owned.some(r=>r.hull===i)))throw Error('重载丢失');});checks.push('reload');
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});throw e;}finally{await context.close();}
}
