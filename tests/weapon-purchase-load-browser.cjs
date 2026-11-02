// 通过正式工坊和整理页验证购买拦截、确认清理、恢复购买与暂停归属，默认使用4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 try{
  await page.goto(original.url());await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;window.tick=a.game.update.bind(a.game);a.game.update=()=>{};});
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.coins=p.wood=100000;p.materials={parts:10000,crystal:10000,core:10000};p.weapons.fill(0);p.weapons[0]=1;p.weapon=0;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999;g.enemies=[];
    const {WORKSHOP}=await import('/src/world/workshop.js');Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+22});if(!(await import('/src/core/cottage.js')).enterWorkshop(g,'weapons'))throw Error('无法进入武器工坊');
    g.progress.logistics.bagWood=100;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();a.workshop.open('weapons',1);
   },time);
   await page.evaluate(()=>a.workshop.open('weapons',0));
   if(!await page.locator('#ws-cleanup').isVisible())throw Error('已购枪升级页缺少原地整理入口');
   await page.evaluate(()=>a.workshop.open('weapons',1));
   if(!await page.locator('#ws-purchase').isDisabled())throw Error('满载仍可购枪');
   if(!/购买后背包负重/.test(await page.locator('#ws-feedback').textContent()))throw Error('缺少明确负重提示');
   await page.locator('#ws-cleanup').scrollIntoViewIfNeeded();
   const layout=await page.locator('#ws-cleanup').evaluate(b=>{const r=b.getBoundingClientRect(),p=b.closest('dialog');return {width:r.width,height:r.height,right:r.right,bottom:r.bottom,overflow:p.scrollWidth>p.clientWidth+1};});
   if(layout.width<44||layout.height<44||layout.right>width+1||layout.bottom>height+1||layout.overflow)throw Error('整理按钮布局错误'+JSON.stringify(layout));
   await page.screenshot({path:`output/playwright/weapon-purchase-load/${width}-${time}-blocked.png`});await page.locator('#ws-cleanup').tap();
   await page.locator('[data-cleanup-item="material:wood"]').tap();await page.locator('[data-quantity-preset=all]').tap();await page.locator('[data-quantity-confirm]').tap();
   if(!await page.evaluate(()=>a.game.progress.logistics.bagWood===0&&a.game.state==='paused'))throw Error('清理未生效或提前恢复游戏');
   // 清理图标沿用500毫秒触摸去重，自动化关闭等待该保护窗口结束。
   await page.waitForTimeout(550);await page.locator('#load-cleanup-close').tap();await page.locator('#ws-purchase').tap();
   if(!await page.evaluate(async()=>a.game.progress.weapons[1]===1&&(await import('/src/progression/load-weight.js')).movementLoadFactor(a.game)>0))throw Error('清理后无法购枪或再次超载');
   await page.locator('#ws-close').tap();await page.waitForTimeout(100);
   if(!await page.evaluate(()=>a.game.state==='playing'))throw Error('工坊关闭后未恢复游戏');
   const moved=await page.evaluate(()=>{const g=a.game,y=g.player.y;for(let i=0;i<5;i++)tick(.05,{x:0,y:1});a.refresh();a.renderer.draw();return g.player.y>y;});if(!moved)throw Error('购枪后仍不能移动');
   await page.screenshot({path:`output/playwright/weapon-purchase-load/${width}-${time}-recovered.png`});checks.push({viewport:{width,height},time,button:layout,moved});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
