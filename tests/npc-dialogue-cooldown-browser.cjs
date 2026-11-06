// 正式店员触控流程验证收尾、读档冷却、服务切换和期满恢复。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.coins=1000;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.enemies=[];g.mainlineSpeech=null;g.vehicle.active=false;g.updateWaves=()=>{};g.attackTimer=g.spawnTimer=g.fireClock=999;g.player.invincible=999;
   const rooms=await import('/src/config/workshop-interiors.js');Object.assign(g.player,rooms.WORKSHOP_INTERIORS.ammo.door,{vx:0,vy:0});g.cottageDoorLatch=false;a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();
  const first=await page.locator('[data-npc-text]').textContent();await page.locator('[data-npc-next]').tap();const second=await page.locator('[data-npc-text]').textContent();if(first===second)throw Error('本轮对白重复');
  await page.locator('[data-npc-next]').tap();if(await page.locator('[data-npc-next]').textContent()!=='下次再聊')throw Error('未切换为收尾按钮');
  const ended=await page.evaluate(()=>structuredClone(a.game.progress.npcDialogue['shop:ammo']));if(ended.count!==2||ended.resumeAt<=Date.now())throw Error('没有持久化冷却');
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);await page.waitForTimeout(100);
   const metrics=await page.locator('#npc-conversation-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:n.scrollWidth>n.clientWidth,buttons:[...n.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>{const p=b.getBoundingClientRect();return {w:p.width,h:p.height,bottom:p.bottom};})};});
   if(metrics.left<0||metrics.right>width||metrics.bottom>height||metrics.overflow||metrics.buttons.some(b=>b.w<44||b.h<44||b.bottom>height))throw Error('收尾界面溢出 '+JSON.stringify(metrics));
   await page.screenshot({path:`output/camp-performance/npc-farewell-${width}-${time}.png`});checks.push({width,height,time,metrics});
  }
  await page.locator('[data-npc-next]').tap();await page.waitForFunction(()=>a.game.state==='playing');await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();
  if(await page.locator('[data-npc-next]').textContent()!=='下次再聊')throw Error('关闭重开绕过冷却');
  // 收尾期间仍可使用原有补给服务。
  await page.locator('[data-npc-service]').tap();await page.locator('#field-equipment-dialog[open]').waitFor();await page.locator('[data-supply-target=hand]').tap();await page.locator('[data-ammo-buy=light]').tap();if(await page.evaluate(()=>a.game.progress.coins)!==970)throw Error('冷却阻断购买');
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.mainlineSpeech=null;a.game.updateWaves=()=>{};a.game.player.invincible=999;});
  const restored=await page.evaluate(()=>a.game.progress.npcDialogue['shop:ammo']);if(JSON.stringify(restored)!==JSON.stringify(ended))throw Error('读档丢失冷却或提前续期');
  await page.evaluate(async()=>{const g=a.game,rooms=await import('/src/config/workshop-interiors.js');g.cottage=null;g.state='playing';g.vehicle.active=false;Object.assign(g.player,rooms.WORKSHOP_INTERIORS.ammo.door,{vx:0,vy:0});g.cottageDoorLatch=false;a.renderer.camera.time=null;});await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');
  await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();if(await page.locator('[data-npc-next]').textContent()!=='下次再聊')throw Error('刷新绕过冷却');await page.locator('[data-npc-next]').tap();
  // 只调整测试存档的截止时间，使用正式按钮验证期满后的行为。
  await page.evaluate(()=>{a.game.progress.npcDialogue['shop:ammo'].resumeAt=Date.now()-1;});await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();
  if(await page.locator('[data-npc-next]').textContent()!=='再聊聊'||await page.evaluate(()=>a.game.progress.npcDialogue['shop:ammo'].count)!==3)throw Error('期满未恢复');
  if(errors.length)throw Error(errors.join('\n'));return {checks,ended,restored,servicePurchase:true,resumed:true,errors};
 }finally{await context.close();}
}
