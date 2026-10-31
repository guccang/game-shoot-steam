// 隔离浏览器验收房屋本体交互：使用正式页面、入口和绘制器，验证手机昼夜与明确点击。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 try{
 await page.goto(original.url());
 // 默认4175；该端口已有用户服务时，在独立浏览器存档中使用隔离服务4177。
 if(!['4175','4177'].includes(new URL(page.url()).port))throw Error('仅允许本地测试端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};p.wood=500;p.mainline.completed=['first-map'];p.mainline.phase='doing';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999999;a.game.state='playing';a.game.enemies=[];
  window.facilities=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});
 });
 const results=[];
 for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  for(const id of ['garage','cottage','clearing']){
   await page.evaluate(async({id,time})=>{
    const g=a.game,f=facilities.find(f=>f.id===id);g.progress.restoration.repaired=[];g.progress.restoration.build=null;g.cottageEntry=null;g.vehicle.active=false;g.state='playing';g.mainlineSpeech=null;
    Object.assign(g.player,{x:f.site.x,y:f.site.y+24,vx:0,vy:0});
    const {LIVING_PHASES}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start;
    a.environment.time=time;const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
    a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
   },{id,time});
   await page.waitForTimeout(300);
   const row=await page.evaluate(async()=>{
    const result=(await import('/src/rendering/visual-review.js')).inspectNearbyInteraction(a.game,document);
    return {...result,dialogs:document.querySelectorAll('dialog[open]').length,guideVisible:!!document.getElementById('operation-guide')&&!document.getElementById('operation-guide').hidden};
   });
   if(!row.visible||!row.building||row.visibleText.trim()||!row.touchTarget||row.overflow||row.dialogs||row.guideVisible)throw Error('房屋透明入口不合格 '+JSON.stringify({width,time,id,...row}));
   results.push({width,time,id,...row});
   await page.screenshot({path:`output/playwright/camp-house-interaction-${id}-${width}-${time}.png`});
  }
 }
 // 短距离移动不自动弹窗；直接点击建筑本体才显示修复详情。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const f=facilities.find(f=>f.id==='garage');Object.assign(a.game.player,{x:f.site.x,y:f.site.y+24});a.renderer.camera.time=null;a.refresh();});
 for(const dx of [-8,8,-8,8]){await page.evaluate(dx=>{a.game.player.x+=dx;a.refresh();},dx);await page.waitForTimeout(100);if(await page.locator('dialog[open]').count())throw Error('移动时自动打开弹窗');}
 await page.locator('#nearby-interaction').tap();await page.locator('#restoration-dialog').waitFor({state:'visible'});
 if(await page.locator('#nearby-interaction').isVisible())throw Error('修复页打开后仍保留场景热点');
 await page.locator('#restoration-close').click();
 // 已完成建筑仍可直接点击打开正式升级界面。
 await page.evaluate(()=>{a.game.progress.restoration.repaired.push('garage');a.game.state='playing';a.refresh();});
 await page.waitForTimeout(300);await page.locator('#nearby-interaction').tap();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await page.locator('#ws-close').click();
 // 种子小屋同样只有本体热点；点击仍打开购买页。
 await page.evaluate(async()=>{const f=(await import('/src/config/farm.js')).FARM_SEED_DOOR;Object.assign(a.game.player,{x:f.x,y:f.y});a.game.vehicle.active=true;a.renderer.camera.time=null;a.refresh();});
 await page.locator('#nearby-interaction[data-target="seed-shop"]').tap();await page.locator('#seed-shop-dialog').waitFor({state:'visible'});
 await page.locator('#seed-shop-close').tap();
 // 从房屋热点切换到床边按钮，确保透明样式和世界拖动属性不会残留。
 await page.evaluate(async()=>{const g=a.game,c=(await import('/src/config/cottage.js')).COTTAGE;g.progress.restoration.repaired.push('cottage');g.vehicle.active=false;Object.assign(g.player,c.door);g.cottageEntry=null;a.renderer.camera.time=null;a.refresh();});
 await page.locator('#nearby-interaction[data-interaction="cottage"]').tap();
 await page.waitForFunction(()=>!!a.game.cottage);
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/cottage.js')).COTTAGE.bed);a.renderer.draw();a.refresh();});
 const rest=page.locator('#nearby-interaction[data-interaction="rest"]');
 if(await rest.evaluate(n=>n.classList.contains('scene-hit')||n.hasAttribute('data-world-movement')||!n.innerText.includes('休息')))throw Error('床边操作样式残留');
 await rest.tap();await page.locator('#cottage-rest-dialog').waitFor({state:'visible'});
 if(await page.locator('.nearby-paw').count())throw Error('残留猫爪节点');
 if(errors.length)throw Error(JSON.stringify(errors));
 return {screens:results.length,results,errors};
 }finally{await context.close();}
}
