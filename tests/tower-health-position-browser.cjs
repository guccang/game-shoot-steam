// 真实塔内 DOM 布局回归，覆盖安全区、上下车、领主血条、暂停和离场。
async original=>{
 const errors=[],results=[];
 for(const [width,height,time,mounted] of [[320,568,'night',false],[390,844,'day',true],[1100,800,'night',true]]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:width<500,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async({time,mounted})=>{
    const a=window.a=(await import('/src/main.js')).application;await a.ready;
    const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),p=freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);p.weapons.fill(1);p.vehicleIndex=0;
    p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
    const g=a.game;g.progress=validateProgress(p);g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=9999;if(mounted&&!g.summonVehicle())throw Error('召唤失败');
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    if(!g.enterRealm('tower'))throw Error('进入高塔失败');if(g.realm.phase==='choice')g.chooseRealmBlessing(g.realm.offers[0]);
    // 布局验收冻结战斗模拟，使用正式第五层与领主生成，不改变 HUD 和绘制路径。
    const {beginRealmStage,updateRealm}=await import('/src/core/realms/realm-manager.js');g.realm.stage=5;beginRealmStage(g);g.realm.warning=0;g.realm.spawned=g.realm.spec.total-1;g.realm.kills=g.realm.spec.total-1;g.realm.spawnTimer=0;updateRealm(g,.1);g.update=()=>{};a.refresh();
   },{time,mounted});
   await page.waitForTimeout(250);
   const rects=await page.evaluate(()=>{
    const frame=document.getElementById('game-frame').getBoundingClientRect();
    // 返回相对游戏画面的坐标，宽屏外侧留白不计入 HUD 左边距。
    const box=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {x:r.left-frame.left,y:r.top-frame.top,right:r.right-frame.left,bottom:r.bottom-frame.top,width:r.width,height:r.height,hidden:e.hidden,visibility:getComputedStyle(e).visibility};};
    return {health:box('.bottom-info'),quest:box('#quest'),boss:box('#boss-hud'),frame:{width:frame.width,height:frame.height},mounted:a.game.vehicle.active,hasBoss:!!a.game.boss};
   });
   if(Math.abs(rects.health.x-10)>1||Math.abs(rects.health.y-12)>1||rects.health.visibility!=='visible')throw Error('生命卡未在左上 '+JSON.stringify(rects));
   if(rects.quest.y<rects.health.bottom+5||rects.boss.y<rects.quest.bottom+7||rects.boss.hidden||!rects.hasBoss)throw Error('进度与领主条重叠 '+JSON.stringify(rects));
   if(rects.health.right>rects.frame.width||rects.mounted!==mounted)throw Error('边界或驾驶状态错误');
   await page.screenshot({path:`output/playwright/tower-hp-top-left/${width}-${time}.png`});
   await page.evaluate(()=>{a.game.pause();a.refresh();});await page.locator('#resume').tap();
   await page.waitForFunction(()=>a.game.state==='playing'&&getComputedStyle(document.querySelector('.bottom-info')).visibility==='visible');
   const resumed=await page.locator('.bottom-info').boundingBox();if(Math.abs(resumed.y-rects.health.y-(await page.locator('#game-frame').boundingBox()).y)>1)throw Error('暂停恢复错位');
   await page.evaluate(()=>{a.game.leaveRealm();a.refresh();});await page.waitForTimeout(100);
   if(await page.locator('#game-frame').evaluate(e=>e.classList.contains('tower-active')||e.classList.contains('realm-active')))throw Error('退出高塔样式残留');
   await page.evaluate(()=>{if(!a.game.enterRealm('football'))throw Error('进入球赛失败');a.refresh();});await page.waitForTimeout(100);
   if(await page.locator('.player-hud').isVisible())throw Error('球赛生命卡显隐被改变');
   results.push({width,height,time,mounted,rects,pauseResume:true,exit:true,footballHidden:true});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'tower-health-top-left',results,errors};
}
