// 手机实机验证：按层购买与拆除、点击电梯真实走近、上下梯井和取消后的闩锁。
async original=>{
 const resume=await original.evaluate(()=>!!window.floorTransitResume);
 await original.evaluate(async()=>{(await import('/src/main.js')).application.destroy();});
 const out='output/playwright/floor-transit',context=await original.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
 // 只准备已有楼层和资源，电梯状态由真实施工按钮写入。
 async function enter(kind){
  await page.evaluate(async kind=>{const g=a.game;g.cottage=null;g.cottageDoorLatch=false;g.sceneApproach=null;g.state='playing';g.mainlineSpeech=null;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).interiorLayout({kind}).door,{vx:0,vy:0});a.renderer.camera.time=null;a.refresh();},kind);
  await page.waitForFunction(kind=>a.game.cottage?.kind===kind,kind);
 }
 // 截图同时检查全部可见场景触点44像素、方向不重叠、当前设施互斥。
 async function shot(name){
  const hits=await page.locator('[data-cottage-target]').evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.cottageTarget,x:r.x,y:r.y,w:r.width,h:r.height,label:n.getAttribute('aria-label')};}));
  if(hits.some(h=>h.w<43.9||h.h<43.9))throw Error('触点过小 '+JSON.stringify(hits));
  if(hits.some(h=>h.id==='elevator')&&hits.some(h=>h.id.startsWith('stairs-')))throw Error('同层叠画电梯楼梯');
  const up=hits.find(h=>h.id==='stairs-up'),down=hits.find(h=>h.id==='stairs-down');if(up&&down&&Math.min(up.y+up.h,down.y+down.h)>Math.max(up.y,down.y))throw Error('上下楼触点重叠');
  await page.screenshot({path:out+'/'+name+'.png'});checks.push({name,hits});
 }
 // 实际点击电梯门，等猫走近选层后乘坐，不通过底栏远程切层。
 async function lift(floor){
  await page.locator('[data-cottage-target="elevator"]').tap();await page.locator('#home-construction-dialog').waitFor({state:'visible'});
  await page.locator('#home-lift-floor').fill(String(floor));await page.locator('[data-lift]').tap();
  await page.waitForFunction(floor=>a.game.cottage.floor===floor-1&&a.game.state==='playing',floor);await page.locator('#home-construction-dialog').waitFor({state:'hidden'});
 }
 // 点击具体梯井，验收完整行走与候停；切层后不能原地自动反向。
 async function stairs(direction,floor){
  // 短横屏跟随角色裁切房间；先沿梯位左侧实走，让另一端入口进入镜头。
  if(!await page.locator('[data-cottage-target="stairs-'+direction+'"]').isVisible()){
   await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>a.game.player.x<335);await page.keyboard.up('ArrowLeft');
   const key=direction==='up'?'ArrowDown':'ArrowUp';await page.keyboard.down(key);await page.waitForFunction(direction=>direction==='up'?a.game.player.y>=420:a.game.player.y<=350,direction);await page.keyboard.up(key);
  }
  await page.locator('[data-cottage-target="stairs-'+direction+'"]').tap();await page.waitForFunction(floor=>a.game.cottage.floor===floor-1,floor);
  await page.waitForTimeout(1150);if(await page.evaluate(()=>a.game.cottage.floor)!==floor-1)throw Error('楼梯落地反复切层');
 }
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.evaluate(async resume=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.floors=4;p.coins=50000;p.wood=10000;
   if(resume){p.homeDecor.elevators=[0];p.coins=38000;p.wood=8400;}
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.enemies=[];g.spawnTimer=g.fireClock=g.mainlineTalkDelay=g.attackTimer=999999;g.progress.living.patrolActive=false;window.tick=g.update;
  },resume);
  let bought=null;
  if(!resume){
  await enter('construction');await page.locator('[data-room-item="shopkeeper"]').tap();await page.locator('[data-npc-service]').tap();
  await page.locator('[data-build="elevator"]').tap();await page.locator('#home-build-elevator-floor').fill('3');await page.locator('[data-build="elevator"]').tap();
  bought=await page.evaluate(()=>({floors:a.game.progress.homeDecor.elevators,coins:a.game.progress.coins,wood:a.game.progress.wood}));
  if(JSON.stringify(bought)!==JSON.stringify({floors:[0,2],coins:38000,wood:8400}))throw Error('按层收费失败 '+JSON.stringify(bought));await shot('purchase-two-floors');await page.locator('[data-build-close]').tap();
  await enter('cottage');await shot('first-floor-elevator');await lift(4);await shot('top-floor-down-only');await stairs('down',3);await shot('third-floor-elevator');
  await lift(2);await shot('middle-floor-both');await stairs('down',1);await lift(2);await stairs('up',3);
  // 取消乘梯后原地不会自动重开，明确再点电梯才能重新呼叫。
  await page.locator('[data-cottage-target="elevator"]').tap();await page.locator('[data-build-close]').tap();await page.waitForTimeout(1300);if(await page.locator('#home-construction-dialog').isVisible())throw Error('取消乘梯后反复打开');
  await lift(1);
  await enter('construction');await page.locator('[data-room-item="shopkeeper"]').tap();await page.locator('[data-npc-service]').tap();await page.locator('#home-build-elevator-floor').fill('3');
  await page.locator('[data-remove-elevator]').tap();await shot('remove-confirm');await page.locator('[data-cancel-remove]').tap();if(!await page.evaluate(()=>a.game.progress.homeDecor.elevators.includes(2)))throw Error('取消拆除失效');
  await page.locator('[data-remove-elevator]').tap();await page.locator('[data-build="remove-elevator"]').tap();if(await page.evaluate(()=>JSON.stringify(a.game.progress.homeDecor.elevators))!=='[0]')throw Error('拆除影响其他楼层');
  if(!await page.evaluate(()=>a.game.progress.coins===38000&&a.game.progress.wood===8400))throw Error('拆除意外返款或扣款');await page.locator('[data-build-close]').tap();
  await enter('cottage');await lift(3);await shot('removed-back-to-stairs');
  }else await enter('cottage');
  // 不同手机镜头下直接点上下行入口，昼夜共用正式房间。
  for(const [width,height] of [[320,568],[390,844],[844,390]].slice(resume?2:0))for(const night of [false,true]){
   await page.setViewportSize({width,height});await page.evaluate(async night=>{const g=a.game;g.update=()=>{};g.cottage.floor=1;g.cottage.stairsLatch=false;g.cottage.stairsElapsed=null;g.sceneApproach=null;Object.assign(g.player,{x:290,y:420});const phases=(await import('/src/config/living-world.js')).LIVING_PHASES,phase=phases.find(p=>p.id===(night?'night':'day'));g.progress.living.calendar.elapsed=phase.start+phase.duration*.5;a.refresh();},night);await page.waitForTimeout(150);
   await shot(width+'-'+(night?'night':'day')+'-stairs');await page.evaluate(()=>a.game.update=tick);await stairs('down',1);await lift(2);await stairs('up',3);
  }
  // 从远处打开设施说明也先走近，再由场景电梯打开选层，不能远程直达。
  await page.setViewportSize({width:390,height:844});await enter('cottage');await page.locator('#home-travel-open').tap();await page.locator('[data-walk-elevator]').tap();await page.locator('[data-lift]').waitFor({state:'visible'});await shot('walk-to-lift');await page.locator('[data-build-close]').tap();
  if(errors.length)throw Error(errors.join('\n'));return {bought,checks,errors};
 }catch(error){await shot('failure');const state=await page.evaluate(()=>({state:a.game.state,room:a.game.cottage,position:{x:a.game.player.x,y:a.game.player.y},walk:a.game.sceneApproach&&{id:a.game.sceneApproach.id,goal:a.game.sceneApproach.goal,elapsed:a.game.sceneApproach.elapsed}}));throw Error(error.message+' '+JSON.stringify(state));}finally{await context.close();}
}
