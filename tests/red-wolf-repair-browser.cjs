// 手机现场维修：真实入口、报价、确认扣款和短屏文案，不读取玩家存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.coins=100000;p.vehicleHulls[6]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,6);p.vehicleWeapons[21]=20;p.vehicleIndex=6;
   g.progress=p;g.reset();g.state='playing';g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.mainlineTalkDelay=g.fireClock=999999;g.updateWaves=()=>{};g.vehicle.active=false;g.vehicle.hp=g.vehicle.maxHp*.5;
   const bay=(await import('/src/config/vehicle-repair.js')).REPAIR_BAY,room=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.repair;
   g.progress.campParking.owned=[{hull:6,spot:null,mapId:'forest',...bay,hp:.5,ammo:0,reload:0}];Object.assign(g.player,room.door,{vx:0,vy:0});g.cottageDoorLatch=false;g.cottageEntry=null;g.cottageEntryKind=null;a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>a.game.cottage?.kind==='repair');await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('[data-npc-service]').tap();await page.locator('#vehicle-repair-dialog[open]').waitFor();
  for(const [width,height] of [[390,844],[320,568]]){
   await page.setViewportSize({width,height});const row=page.locator('[data-repair-hull="6"]');if(!/1050/.test(await row.textContent()))throw Error('报价错误');await row.tap();
   const report=await page.evaluate(()=>{const n=document.getElementById('vehicle-repair-dialog'),r=n.getBoundingClientRect();return {width:innerWidth,height:innerHeight,help:n.querySelector('.ui-inset').textContent,confirm:n.querySelector('[data-repair-confirm]').textContent,overflow:document.documentElement.scrollWidth>innerWidth,contained:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1};});
   if(report.overflow||!report.contained||!report.help.includes('5%'))throw Error(JSON.stringify(report));checks.push(report);await page.screenshot({path:`output/red-wolf-balance/repair-${width}.png`});
  }
  await page.locator('[data-repair-confirm]').tap();const paid=await page.evaluate(()=>({coins:a.game.progress.coins,phase:a.game.progress.vehicleService[6]?.phase,level:a.game.progress.vehicleWeapons[21]}));if(paid.coins!==98950||paid.phase!=='repairing'||paid.level!==20)throw Error('扣费与报价不一致 '+JSON.stringify(paid));
  if(!await page.locator('[data-repair-confirm]').isDisabled())throw Error('重复确认未禁用');if(errors.length)throw Error(errors.join('\n'));return {checks,paid,errors};
 }finally{await context.close();}
}
