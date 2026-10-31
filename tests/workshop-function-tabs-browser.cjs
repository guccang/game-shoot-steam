// 功能页签实机回归：原交易、试射、指针和键盘施工，以及手机昼夜布局。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('仅允许测试端口4175');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
  p.weapons.fill(1);p.weapons[3]=0;p.vehicleHulls.fill(1);p.vehicleHulls[2]=0;p.vehicleWeapons.fill(1);p.mastery.fill(100);p.coins=p.wood=100000;p.bosses=100;
  for(const k of Object.keys(p.materials))p.materials[k]=999;
  a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];
  Object.assign(a.game.player,{x:600,y:700});a.game.selectVehicle(0);a.game.summonVehicle();a.game.spawnEnemy(0,125);a.refresh();
 });
 // 快照仅用于验证状态隔离，购买和施工一律从正式按钮发起。
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(a.game.progress)));
 await page.evaluate(()=>a.workshop.open('weapons',3));
 if(await page.locator('#workshop-dialog').getAttribute('data-function')!=='buy')throw Error('未拥有装备应默认购买');
 const purchaseBefore=await state();
 await page.locator('#ws-purchase').click();
 if((await state()).weapons[3]!==1||(await state()).coins>=purchaseBefore.coins)throw Error('购买未正式结算');
 await page.locator('#ws-go-upgrade').click();
 await page.locator('[data-ws-upgrade="damage"]').press('Enter');await page.locator('#ws-socket').press('Enter');await page.waitForTimeout(1200);
 const draftBefore=await state();await page.locator('#ws-function-unlock').click();await page.waitForTimeout(200);
 if(JSON.stringify(await state())!==JSON.stringify(draftBefore)||await page.locator('#ws-discard').isVisible()||await page.locator('#ws-construction-tools').isVisible())throw Error('切页未取消免费草稿');
 await page.locator('#ws-function-unlock').press('Home');
 if(await page.locator('#ws-function-buy').getAttribute('aria-selected')!=='true')throw Error('Home页签导航失败');
 await page.locator('#ws-function-buy').press('ArrowRight');
 await page.locator('[data-ws-upgrade="damage"]').press('Enter');await page.locator('#ws-socket').press('Enter');await page.waitForTimeout(1200);
 await page.locator('#ws-tool').press('Enter');await page.locator('#ws-hold').focus();await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');
 if((await state()).weapons[3]!==2)throw Error('键盘施工未完成');
 await page.locator('#ws-test').click();await page.waitForFunction(()=>!document.getElementById('ws-trial').hidden);
 await page.locator('#ws-function-modify').click();await page.waitForTimeout(250);
 if(await page.locator('#ws-trial').isVisible())throw Error('切页后试射残留');
 await page.locator('[data-ws-part="1"]').press('Enter');await page.locator('#ws-socket').press('Enter');
 await page.locator('#ws-close').click();if(await page.locator('#workshop-dialog').isVisible())throw Error('关闭仍然拦截');
 await page.evaluate(()=>a.workshop.open('weapons',3));await page.locator('#ws-function-buy').click();
 // 真实触控拖部件并按住施工；320宽时工作台、零件与工具均在结算栏上方。
 await page.setViewportSize({width:320,height:844});await page.evaluate(()=>a.workshop.open('weapons',0));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 // 使用控件实时位置发出触摸，不直接调用安装函数。
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y}]});}
 // 初次移动后才读取零件对应的新连接点。
 async function drag(selector,cancel=false){
  const b=await page.locator(selector).boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await touch('touchMove',b.x+b.width/2,b.y+b.height/2-14);
  const s=await page.locator('#ws-socket').boundingBox();await touch('touchMove',s.x+s.width/2,s.y+s.height/2);await touch(cancel?'touchCancel':'touchEnd');
 }
 const touchBefore=await state();await drag('[data-ws-upgrade="damage"]',true);
 if(JSON.stringify(await state())!==JSON.stringify(touchBefore))throw Error('取消指针扣费');
 await drag('[data-ws-upgrade="damage"]');await page.waitForTimeout(1200);await drag('#ws-tool');
 const hold=await page.locator('#ws-hold').boundingBox(),foot=await page.locator('.ws-footer').boundingBox();
 if(hold.y+hold.height>foot.y)throw Error('手机施工被结算栏遮挡');
 await touch('touchStart',hold.x+hold.width/2,hold.y+hold.height/2);await page.waitForTimeout(1800);await touch('touchEnd');
 if((await state()).weapons[0]!==2)throw Error('触控施工未完成');
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 // 车体和主炮分开编辑；挂载选择不切换当前出战车。
 await page.evaluate(()=>a.workshop.open('vehicle',1));const vehicleBefore=(await state()).vehicleIndex;
 await page.locator('#ws-kits-tab').click();
 if(!await page.locator('[data-ws-upgrade="damage"]').isVisible())throw Error('主炮升级不可达');
 await page.locator('#ws-function-modify').click();await page.locator('[data-ws-part="0"]').press('Enter');await page.locator('#ws-socket').press('Enter');
 await page.locator('#ws-confirm').click();
 if((await state()).vehicleLoadouts[1]!==0||(await state()).vehicleIndex!==vehicleBefore)throw Error('挂载对象或出战状态错误');
 await page.locator('#ws-turret-upgrade').click();
 if(await page.locator('#workshop-dialog').getAttribute('data-function')!=='upgrade')throw Error('挂载炮塔无法转入升级');
 // 实际页面逐项采样，不为截图新画示意图。
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.locator('#ws-close').click();await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
   a.game.progress.living.calendar.elapsed=time==='night'?1100000:400000;
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.resize();a.refresh();a.renderer.draw();
  },time);
  await page.screenshot({path:`output/playwright/workshop-function-tabs/scene-${width}-${time}.png`});
  for(const kind of ['weapons','vehicle']){
   await page.evaluate(kind=>a.workshop.open(kind,kind==='weapons'?0:1),kind);
   for(const tab of ['buy','upgrade','modify','unlock']){
    await page.locator('#ws-function-'+tab).click();await page.waitForTimeout(100);
    const s=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFunctionTabs(document));
    if(s.page!==tab||s.tabs.filter(t=>t.selected==='true').length!==1||s.tabs.some(t=>t.box.height<44)||s.overflow)throw Error('页签语义或布局不正确 '+JSON.stringify(s));
    if(tab==='unlock'?(s.stage||!s.challenge||!s.mastery):(s.challenge||s.mastery||!s.stage))throw Error('功能页隔离失败');
    if(tab==='buy'&&(s.components||s.kits)||tab==='upgrade'&&(!s.components||s.kits)||tab==='modify'&&(s.components||!s.kits))throw Error('部件列表未按功能分离');
    if(s.stage&&s.stage.bottom>s.footer.top)throw Error('工作台被费用遮挡');
    if(s.components&&s.components.bottom>s.footer.top)throw Error('零件与工作台无法同屏');
    samples.push({kind,width,time,...s});
    await page.screenshot({path:`output/playwright/workshop-function-tabs/${kind}-${tab}-${width}-${time}.png`});
   }
  }
 }
 // 零清缴也可购买；资源不足时可追踪材料，并从成长页查看优惠。
 await page.evaluate(()=>{a.game.progress.bosses=0;a.workshop.open('vehicle',2);});
 if(await page.locator('#ws-purchase').isDisabled())throw Error('零清缴仍限制购买');
 await page.evaluate(()=>{a.game.progress.coins=0;a.workshop.open('vehicle',2);});
 if(!await page.locator('#ws-purchase').isDisabled())throw Error('资源不足仍可购买');
 await page.locator('#ws-track').click();if((await state()).equipmentGoal?.index!==2)throw Error('材料追踪未保留');
 await page.locator('#ws-resources [data-resource-info]').first().click();
 if(!await page.locator('#resource-help-dialog').isVisible())throw Error('材料来源不可达');await page.locator('#close-resource-help').click();
 await page.locator('#ws-unlock-link').click();
 if(!await page.locator('#ws-challenge-level').isVisible())throw Error('无法查看营地成长');
 await page.screenshot({path:'output/playwright/workshop-function-tabs/resources-short-320.png'});
 await page.evaluate(()=>a.workshop.open('vehicle',5));await page.locator('#ws-function-modify').click();
 if(!await page.locator('#ws-empty-modify').isVisible()||await page.locator('#ws-socket').isVisible())throw Error('电动车出现不存在的挂载槽');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'workshop-function-tabs',transactions:'购买/升级/挂载/追踪通过',input:'键盘/触控/取消通过',scenes:samples.length,maxCanvasBytes:Math.max(...samples.map(s=>s.canvasBytes)),errors};
}
