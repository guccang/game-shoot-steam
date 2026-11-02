// 实际手机触控与直线步行验收：点击、正面倒计时、关闭防重弹及主动重开。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  for(const [kind,dialog,close,width,height,time] of [['ammo','field-equipment-dialog','field-equipment-close',320,568,'night'],['seed','seed-shop-dialog','seed-shop-close',390,844,'day'],['weapons','workshop-dialog','ws-close',390,844,'day'],['vehicle','workshop-dialog','ws-close',320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async({kind,time})=>{
    const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
    g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.vehicle.active=false;g.enemies=[];
    const layout=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind});Object.assign(g.player,layout.door);
    if(!(await import('/src/core/cottage.js')).enterWorkshop(g,kind))throw Error('进店失败 '+kind);
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   },{kind,time});
   const seller=page.locator('[data-room-item="shopkeeper"]');await seller.waitFor();
   await page.waitForTimeout(1100);if(await page.locator('#'+dialog).isVisible())throw Error('入室即开店 '+kind);
   await seller.tap();await page.locator('#'+dialog+'[open]').waitFor();await page.locator('#'+close).tap();await page.waitForFunction(()=>a.game.state==='playing');
   // 工坊出生点紧邻柜台，主动开店后先走出防重弹范围，再测试重新靠近。
   if(['weapons','vehicle'].includes(kind)){await page.keyboard.down('ArrowDown');await page.waitForTimeout(250);await page.keyboard.up('ArrowDown');}
   // 输入走到碰撞前沿再松手，不能只把角色传送到测试专用候停点。
   await page.keyboard.down('ArrowUp');await page.waitForTimeout(1100);await page.keyboard.up('ArrowUp');
   await page.waitForFunction(()=>a.game.cottage.displayEntry?.elapsed>=.2);await page.evaluate(()=>a.game.pause());
   const pose=await page.evaluate(async()=>{const c=(await import('/src/config/workshop-interiors.js')).interiorCounter(a.game.cottage);return {x:a.game.player.x,y:a.game.player.y,counterX:c.x,elapsed:a.game.cottage.displayEntry.elapsed};});
   if(Math.abs(pose.x-pose.counterX)>1)throw Error('未正面对齐 '+kind);
   await page.screenshot({path:`output/playwright/shopkeeper-click-front/${kind}-${width}-${time}-countdown.png`});await page.evaluate(()=>a.game.start());
   await page.locator('#'+dialog+'[open]').waitFor();await page.locator('#'+close).tap();await page.waitForFunction(()=>a.game.state==='playing');await page.waitForTimeout(1200);
   if(await page.locator('#'+dialog).isVisible())throw Error('关闭后自动重弹 '+kind);
   await seller.tap();await page.locator('#'+dialog+'[open]').waitFor();await page.locator('#'+close).tap();await page.waitForFunction(()=>a.game.state==='playing');
   const y=await page.evaluate(()=>a.game.player.y);await page.keyboard.down('ArrowDown');await page.waitForTimeout(250);await page.keyboard.up('ArrowDown');
   if(!await page.evaluate(y=>a.game.player.y>y+10,y))throw Error('关店后不能走 '+kind);
   checks.push({kind,width,time,pose,click:true,frontCountdown:true,reopen:true});
  }
  if(errors.length)throw Error(errors.join('\n'));return{pass:true,checks,errors,designCriterion:'shopkeeper-counters'};
 }catch(error){
  await page.screenshot({path:'output/playwright/shopkeeper-click-front/failure.png'});
  const state=await page.evaluate(()=>({room:a.game.cottage,state:a.game.state,player:{x:a.game.player.x,y:a.game.player.y,vx:a.game.player.vx,vy:a.game.player.vy},dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id)}));
  throw Error(error.message+' '+JSON.stringify(state));
 }finally{await context.close();}
}
