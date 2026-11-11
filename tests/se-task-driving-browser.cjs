// 从手机任务卡开关出发，并用实际方向键检查巡战的手动走位和恢复。
async(page)=>{
 const assert=require('node:assert/strict');
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;
  await a.ready;
  window.g=a.game;
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true};
  p.vehicleHulls[1]=1;
  p.vehicleIndex=1;
  (await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,1);
  p.vehicleSE[1].installed=['flare','autopilot','combat'];
  p.vehicleSE[1].owned=[...p.vehicleSE[1].installed];
  g.progress=p;
  g.reset();
  g.state='playing';
  g.mainlineSpeech=null;
  g.mainlineTalkDelay=999;
  g.trees=[];
  g.vehicle.active=true;
  const site=(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(g).site;
  Object.assign(g.player,{x:site.x+230,y:site.y});
  window.startX=g.player.x;
  a.refresh();
 });
 const toggle=page.locator('#task-navigation-toggle');
 if(await toggle.getAttribute('aria-pressed')==='true')await toggle.click();
 await toggle.click();
 await page.waitForFunction(()=>g.seControl?.mode==='autopilot');
 await page.waitForFunction(()=>Math.abs(g.player.x-startX)>15);
 await page.waitForFunction(()=>!g.seControl,{},{timeout:20000});
 const distance=await page.evaluate(()=>Math.abs(g.player.x-startX));
 assert.ok(distance>90);
 await page.evaluate(async()=>{
  g.mainlineSpeech=null;
  g.state='playing';
  Object.assign(g.player,{x:9000,y:9000});
  const {startSEControl}=await import('/src/combat/vehicle-se.js');
  if(!startSEControl(g,'combat').ok)throw Error('巡战未启动');
 });
 await page.keyboard.down('ArrowRight');
 await page.waitForFunction(()=>g.seControl?.manual===true);
 await page.keyboard.up('ArrowRight');
 await page.waitForFunction(()=>g.seControl?.mode==='combat' && !g.seControl.manual);
 return {taskTravel:distance,combatContinued:true};
}
