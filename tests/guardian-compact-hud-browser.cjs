// 守护紧凑顶栏实际布局与触控回归，冻结战斗模拟以稳定读取生命和币值。
async original=>{
 const results=[],errors=[];
 for(const [width,height,time,mounted] of [[320,568,'night',false],[390,844,'day',true],[1100,800,'night',true]]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:width<500,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async({time,mounted})=>{
    const a=window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);p.vehicleIndex=0;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
    const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;if(mounted&&!g.summonVehicle())throw Error('召唤失败');
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    if(!g.enterRealm('guardian'))throw Error('进入守护失败');g.realm.realmCoins=500;g.update=()=>{};a.refresh();
   },{time,mounted});
   await page.waitForTimeout(200);
   const slot=await page.locator('[data-guardian-slot]').evaluateAll(nodes=>{
    const n=nodes.find(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>130&&r.bottom<innerHeight-180&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-guardian-slot]')===n;});
    if(!n)throw Error('没有可用布防格');return n.dataset.guardianSlot;
   });
   await page.locator(`[data-guardian-slot="${slot}"]`).tap();await page.locator('[data-guardian-equipment="weapon:0"]').tap();
   if(!await page.evaluate(slot=>a.game.realm.defenses.some(t=>t.slot===Number(slot)),slot))throw Error('布防点击失效');
   await page.locator('.guardian-next-wave').tap();
   await page.evaluate(()=>{const g=a.game;g.realm.warning=0;g.realm.kills=2;g.realm.realmCoins=64;g.realm.goddess.hp=423.5;a.refresh();});
   await page.waitForTimeout(200);
   const layout=await page.evaluate(()=>{
    const frame=document.getElementById('game-frame').getBoundingClientRect();
    // 使用相对游戏框坐标，兼容宽屏居中的原手机布局。
    const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x-frame.x,y:r.y-frame.y,width:r.width,height:r.height,bottom:r.bottom-frame.y,visible:getComputedStyle(e).visibility==='visible'};};
    const q=document.getElementById('quest');return {hp:box('.bottom-info'),quest:box('#quest'),coins:document.querySelector('[data-guardian-coins]').textContent,hpText:document.querySelector('[data-guardian-hp]').textContent,progress:document.querySelector('.guardian-health progress').value,coinColor:getComputedStyle(document.querySelector('.guardian-wallet')).color,hpColor:getComputedStyle(document.querySelector('.guardian-health')).color,overflow:q.scrollWidth>q.clientWidth,mounted:a.game.vehicle.active};
   });
   if(Math.abs(layout.hp.x-10)>1||Math.abs(layout.hp.y-12)>1||!layout.hp.visible||layout.quest.y<layout.hp.bottom+5||layout.quest.height>62||layout.quest.width>300||layout.overflow)throw Error('顶栏布局错误 '+JSON.stringify(layout));
   if(layout.coins!=='64'||layout.hpText!=='424 / 600'||layout.progress!==423.5||layout.mounted!==mounted)throw Error('数值或驾驶显示错误 '+JSON.stringify(layout));
   await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));
   await page.screenshot({path:`output/playwright/guardian-compact-hud/${width}-${time}.png`});
   await page.evaluate(()=>{a.game.pause();a.refresh();});await page.locator('#resume').tap();
   await page.waitForFunction(()=>a.game.state==='playing'&&getComputedStyle(document.querySelector('.bottom-info')).visibility==='visible');
   await page.evaluate(()=>{a.game.leaveRealm();a.refresh();});await page.waitForTimeout(100);
   if(await page.locator('#game-frame').evaluate(e=>e.classList.contains('guardian-active')))throw Error('离场布局残留');
   results.push({width,height,time,mounted,slot,layout,pauseResume:true,exit:true});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'guardian-compact-top-hud',results,errors};
}
