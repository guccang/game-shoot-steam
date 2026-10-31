// 正式触控验收：主动切回武器、退出种田、已持镰刀连续拖选及小屏工具栏。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-combat/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.delivery.nextAt=Date.now()+3600000;
   p.farm.plots=[0,1,2,3].map(id=>({id,mapId:'forest',x:893+id%2*56,y:2752+Math.floor(id/2)*52,crop:null,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=4;p.farm.seeds[0]=10;
   g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];
   Object.assign(g.player,{x:921,y:2910,vx:0,vy:0});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;
   // 固定时段只用于比较显示，长按、取消、排队与执行均走原生触控和正式农活。
   window.light=async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();};await light('day');
  });await page.waitForTimeout(500);
  const cdp=await context.newCDPSession(page);
  // 原生触点从工具或真实田格起步，按住阶段检查未提前收获。
  const touch=async(type,selector)=>{const r=selector?await page.locator(selector).boundingBox():null;await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:r?[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]:[]});};
  const cell=id=>`[data-farm-cell="${id}"]`;
  await page.locator(cell(0)).tap();await page.locator('#farm-sickle').tap();
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   const boxes=await page.locator('#farm-tools button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));
   if(boxes.length!==6||boxes.some(r=>r.w<44||r.h<44||r.x<0||r.right>width||r.y<0||r.bottom>height))throw Error('小屏工具按钮不可用 '+JSON.stringify(boxes));
   for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/farm-combat/toolbar-${width}-${time}.png`});}
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  // 持镰刀按下空田不立即抢占拖选，取消不弹窗；真正原地点击才打开种子页。
  await touch('touchStart',cell(0));await page.waitForTimeout(100);
  if(await page.locator('#farm-picker').isVisible())throw Error('按下空田过早切换选种');
  await touch('touchCancel');if(await page.locator('#farm-picker').isVisible())throw Error('取消触摸误开种子页');
  await page.locator(cell(0)).tap();await page.locator('#farm-picker').waitFor({state:'visible'});
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(time=>light(time),time);await page.waitForTimeout(150);
   const r=await page.locator('#farm-picker').boundingBox();if(!r||r.x<0||r.y<0||r.x+r.width>width||r.y+r.height>height)throw Error('空田种子浮层越界');
   await page.screenshot({path:`output/playwright/farm-combat/sickle-seed-${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('[data-farm-seed="0"]').tap();
  if(await page.evaluate(()=>a.game.farmWork.tool!=='seed'||a.game.progress.farm.plots[0].crop!==null))throw Error('选择种子未拿起或提前播种');
  await page.locator(cell(0)).tap();await page.waitForFunction(()=>a.game.progress.farm.plots[0].crop===0,null,{timeout:15000});
  if(await page.evaluate(()=>a.game.progress.farm.seeds[0]!==9))throw Error('播种重复消耗种子');
  await page.locator('#farm-sickle').tap();
  // 保留空田和幼苗作为拖选起点，二者不能把已选镰刀切换成其他工具。
  await page.evaluate(()=>{for(const p of a.game.progress.farm.plots)Object.assign(p,{crop:p.id===0?null:3,plantedAt:0,readyAt:0});Object.assign(a.game.progress.farm.plots[1],{plantedAt:Date.now(),readyAt:Date.now()+180000});a.refresh();});
  const before=await page.evaluate(()=>a.game.progress.coins);
  for(const start of [cell(0),cell(1),'#farm-sickle']){
   await touch('touchStart',start);await page.waitForTimeout(300);for(const id of [0,1,3,2,3])await touch('touchMove',cell(id));
   const held=await page.evaluate(()=>({tool:a.game.farmWork?.tool,ids:a.game.farmWork?.queue.map(j=>j.id),coins:a.game.progress.coins,picker:!document.querySelector('#farm-picker').hidden,marked:document.querySelectorAll('[data-farm-cell][data-queued="true"]').length}));
   if(held.tool!=='harvest'||held.ids.length!==2||new Set(held.ids).size!==2||held.coins!==before||held.picker||held.marked!==2)throw Error('持镰刀拖选错误 '+JSON.stringify(held));
   await page.screenshot({path:`output/playwright/farm-combat/drag-${start==='#farm-sickle'?'tool':start===cell(0)?'empty':'young'}.png`});
   await touch('touchCancel');await page.waitForTimeout(80);
   if(await page.evaluate(before=>a.game.farmWork.queue.length||a.game.farmWork.job||a.game.progress.coins!==before,before))throw Error('取消收割发生结算');
  }
  await touch('touchStart','#farm-sickle');for(const id of [3,2])await touch('touchMove',cell(id));await touch('touchEnd');
  await page.waitForFunction(()=>a.game.progress.farm.plots.filter(p=>[2,3].includes(p.id)).every(p=>p.crop===null),null,{timeout:20000});
  const harvest=await page.evaluate(async()=>({coins:a.game.progress.coins,value:(await import('/src/config/farm.js')).FARM_CROPS[3].value,watered:a.game.progress.farm.plots[1].watered,tool:a.game.farmWork?.tool}));
  if(harvest.coins!==before+2*harvest.value||harvest.watered||harvest.tool!=='harvest')throw Error('松手收割结算错误 '+JSON.stringify(harvest));
  // 真正生成敌人并等待自动开火，确认主动战斗无需先被攻击。
  await page.evaluate(()=>{const g=a.game;g.enemies=[];g.spawnEnemy(0,160,{x:g.player.x+160,y:g.player.y});window.target=g.enemies.at(-1);Object.assign(target,{hp:100000,maxHp:100000,speed:0,damage:0});window.hp=g.player.hp;g.attackTimer=0;});
  await page.waitForFunction(()=>target.hp<100000&&a.game.farmWork?.autoCombat,null,{timeout:6000});if(await page.evaluate(()=>a.game.farmWork?.tool!=='harvest'))throw Error('自动迎敌丢失原农具');
  await page.locator('#farm-combat').tap();await page.waitForFunction(()=>target.hp<100000,null,{timeout:6000});
  if(await page.evaluate(()=>a.game.farmWork||a.game.player.hp!==hp||document.querySelector('#farm-tools').hidden||document.querySelector('#farm-combat').getAttribute('aria-pressed')!=='true'))throw Error('主动战斗状态错误');
  await page.screenshot({path:'output/playwright/farm-combat/combat.png'});await page.evaluate(()=>{a.game.enemies=[];});
  // 切换和退出均取消未执行的收割，返回农具后仍能继续使用。
  for(const button of ['#farm-combat','#farm-exit']){
   await page.locator('#farm-sickle').tap();await page.evaluate(()=>{const p=a.game.progress.farm.plots[2];Object.assign(p,{crop:3,readyAt:0,plantedAt:0});Object.assign(a.game.player,{x:921,y:2960,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(250);
   await touch('touchStart',cell(2));await touch('touchEnd');await page.locator(button).tap();await page.waitForTimeout(1100);
   if(await page.evaluate(()=>a.game.farmWork||a.game.progress.farm.plots[2].crop!==3||a.game.farmDragging||document.querySelector('[data-farm-cell][data-queued="true"]')))throw Error('取消农活后仍执行或残留');
  }
  if(await page.locator('#farm-tools').isVisible())throw Error('退出未收起种田UI');
  // 桌面键盘入口和再次打开沿用正式按钮事件。
  await page.locator('#farm-menu').evaluate(n=>n.click());await page.locator('#farm-sickle').focus();await page.keyboard.press('Enter');
  if(await page.evaluate(()=>a.game.farmWork?.tool!=='harvest'))throw Error('键盘选择镰刀失败');
  await page.locator('#farm-exit').focus();await page.keyboard.press('Enter');if(await page.locator('#farm-tools').isVisible())throw Error('键盘退出失败');
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'world-farm-delivery',layouts:10,sickleEmptySeed:true,plantExactlyOnce:true,sickleDrag:true,toolbarDrag:true,harvestExactlyOnce:true,combatWithoutDamage:true,exitCancels:true,keyboard:true,errors};
 }finally{await context.close();}
}
