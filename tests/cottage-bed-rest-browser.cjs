// 手机真实行走触发床前和售货员一秒候停，验证暂停、服务打开与关闭防重入。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 键盘输入驱动原角色移动和家具碰撞，不直接调用睡眠或打开服务方法。
 async function walk(key,axis,target,sign){await page.keyboard.down(key);try{await page.waitForFunction(({axis,target,sign})=>sign>0?a.game.player[axis]>=target:a.game.player[axis]<=target,{axis,target,sign},{timeout:7000});}finally{await page.keyboard.up(key);}}
 // 每个场景从正式房门进入，清空任务与怪物干扰，不替代控制器或页面路由。
 async function enter(kind,time){await page.evaluate(async({kind,time})=>{
  const {freshProgress}=await import('/src/progression/progress.js'),p=freshProgress();p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.vehicleHulls[6]=1;
  const g=a.game;g.progress=p;g.reset();g.start();g.vehicle.active=false;g.mainlineSpeech=null;g.enemies=[];g.attackTimer=g.spawnTimer=999;g.player.hp=20;
  const layout=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind});Object.assign(g.player,layout.door);const c=await import('/src/core/cottage.js');if(!(kind==='cottage'?c.enterCottage(g):c.enterWorkshop(g,kind)))throw Error('进屋失败 '+kind);
  g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
 },{kind,time});}
 try{
  await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});await page.waitForFunction(()=>a.menu.page==='game');
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});await enter('cottage',time);const day=await page.evaluate(()=>a.game.progress.living.calendar.day);
   await walk('ArrowUp','y',220,-1);await walk('ArrowLeft','x',119,-1);await walk('ArrowUp','y',158,-1);
   await page.waitForFunction(()=>a.game.cottage.restElapsed>=.25);await page.evaluate(()=>a.game.pause());
   const elapsed=await page.evaluate(()=>a.game.cottage.restElapsed);await page.waitForTimeout(300);if(await page.evaluate(()=>a.game.cottage.restElapsed)!==elapsed)throw Error('暂停仍倒计时');
   const badge=await page.evaluate(()=>a.renderer.actionCountdownView);if(badge?.icon!=='bed')throw Error('床前徽记缺失');
   await page.screenshot({path:`output/playwright/room-dwell/bed-${width}-${time}.png`});await page.evaluate(()=>a.game.start());await page.waitForFunction(()=>!!a.game.cottage.sleep);await page.waitForFunction(()=>!a.game.cottage.sleep);
   const result=await page.evaluate(()=>({day:a.game.progress.living.calendar.day,hp:a.game.player.hp,max:a.game.maxHp(),notice:document.querySelector('#cottage-notice').textContent}));if(result.day!==day+1||result.hp!==result.max)throw Error('睡眠结算异常 '+JSON.stringify(result));
   if(await page.locator('#cottage-rest-dialog,#cottage-sleep-phase,#cottage-sleep-morning').count())throw Error('旧睡眠按钮未移除');await page.waitForTimeout(1200);if(await page.evaluate(()=>!!a.game.cottage.sleep))throw Error('醒来重复入睡');checks.push({kind:'bed',width,time,badge,result});
  }
  for(const [kind,dialog,close] of [['seed','seed-shop-dialog','seed-shop-close'],['ammo','field-equipment-dialog','field-equipment-close'],['weapons','workshop-dialog','ws-close'],['vehicle','workshop-dialog','ws-close'],['repair','vehicle-repair-dialog','vehicle-repair-close'],['cat-home','cat-home-dialog','cat-home-close'],['furniture','home-decor-dialog','home-close']]){
   await page.setViewportSize({width:390,height:844});await enter(kind,'day');
   const point=await page.evaluate(async()=>(await import('/src/core/workshop-display-entry.js')).shopkeeperApproach(a.game.cottage));
   await walk('ArrowRight','x',point.x,1);await walk('ArrowUp','y',point.y,-1);await page.waitForFunction(()=>a.game.cottage.displayEntry?.elapsed>=.25);await page.evaluate(()=>a.game.pause());
   const badge=await page.evaluate(()=>a.renderer.actionCountdownView);if(badge?.icon!=='board')throw Error('售货员徽记缺失 '+kind);
   await page.screenshot({path:`output/playwright/room-dwell/seller-${kind}.png`});await page.evaluate(()=>a.game.start());await page.locator('#'+dialog).waitFor({state:'visible',timeout:5000});
   await page.locator('#'+close).click();await page.locator('#'+dialog).waitFor({state:'hidden'});await page.waitForTimeout(1200);
   if(await page.locator('#'+dialog).isVisible())throw Error('关闭后重复打开 '+kind);checks.push({kind,badge,dialog});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
