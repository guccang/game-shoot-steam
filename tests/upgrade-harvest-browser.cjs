// 手机真实触摸覆盖自种田、营地外已生成野田、日夜文案与收割后自动接续升级。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL(original.url()||'http://localhost:4175').origin);
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});
  await page.waitForFunction(()=>a.menu.page==='game'&&!a.game.worldPending);
  await page.evaluate(async()=>{
   const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const {TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),{farmCell}=await import('/src/config/farm.js');
   window.hg=await import('/src/core/farming/harvest-guide.js');window.mm=await import('/src/core/story/mainline-manager.js');
   window.farm=await import('/src/core/farming/farm.js');window.wild=await import('/src/core/farming/wild-farm.js');
   // 由九版缺金币升级存档进入真实迁移；作物使用普通存档结构，野田由正式生成器生成。
   window.setupHarvest=mature=>{
    const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pistol-upgrade')).filter(id=>id!=='upgrade-harvest');p.mainline.currentId='pistol-upgrade';p.mainline.version=9;p.mainline.phase='doing';
    p.weapons[0]=3;p.weaponParts[0].damage=3;p.coins=10;p.wood=355;
    p.farm.plots=[{...farmCell(0),id:0,mapId:'forest',crop:0,plantedAt:Date.now(),readyAt:mature?0:Date.now()+360000,watered:true}];p.farm.nextId=1;
    const g=a.game;g.progress=validateProgress(p);g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.wildFarmRetryAt=0;g.update=()=>{};
    Object.assign(g.player,{x:p.farm.plots[0].x,y:p.farm.plots[0].y+62});
    mm.updateMainline(g,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
   };
   // 昼夜取正式历法与环境绘制，保留正式角色、田地和任务 UI。
   window.lightHarvest=async time=>{
    a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();
   };
  });
  for(const [mature,width,height,time] of [[true,390,844,'day'],[false,320,640,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(mature=>setupHarvest(mature),mature);await page.waitForFunction(()=>!a.game.worldPending);
   const target=await page.evaluate(()=>{
    wild.ensureWildFarms(a.game);const p=hg.harvestGuidePlot(a.game);if(!p)throw Error('没有现有可收获田');
    if(!p.wild&&p.id!==0)throw Error('未优先先前田地');
    Object.assign(a.game.player,{x:p.x,y:p.y+62});a.renderer.camera.time=null;mm.updateMainline(a.game,0);a.refresh();a.renderer.draw();return {id:p.id,wild:!!p.wild};
   });
   if(target.wild===mature){const debug=await page.evaluate(()=>({target:hg.harvestGuidePlot(a.game),state:a.game.state,wild:a.game.progress.farm.plots.filter(p=>p.wild).length}));throw Error('田地优先级错误 '+JSON.stringify(debug));}
   await page.evaluate(time=>lightHarvest(time),time);
   await page.locator('#mainline-hud').waitFor({state:'visible'});
   const hint=await page.locator('#mainline-hud').innerText();if(!hint.includes('升级还差'))throw Error('缺少精确金币缺口 '+hint);
   await page.locator('#mainline-hud').tap();await page.locator('#farm-tools').waitFor({state:'visible'});
   await page.locator('#farm-sickle').tap();await page.locator(`[data-farm-cell="${target.id}"]`).waitFor({state:'visible'});
   await page.screenshot({path:`output/playwright/upgrade-harvest/${mature?'own':'wild'}-${width}-${time}.png`});
   const coins=await page.evaluate(()=>a.game.progress.coins);
   await page.locator(`[data-farm-cell="${target.id}"]`).tap();
   // 真实触摸只排队；使用正式农活时钟完成挥镰并结算，不直接调用收获或改余额。
   await page.evaluate(()=>{a.game.update=dt=>{farm.updateFarmWork(a.game,dt,{x:0,y:0});mm.updateMainline(a.game,dt);};});
   await page.waitForFunction(coins=>a.game.progress.coins>coins,coins);
   const result=await page.evaluate(()=>({coins:a.game.progress.coins,task:mm.mainlineTask(a.game).id,phase:a.game.progress.mainline.phase,overflow:document.documentElement.scrollWidth>innerWidth}));
   if(result.overflow)throw Error('手机横向溢出');if(!mature&&(result.task!=='pistol-upgrade'||result.phase!=='doing'))throw Error('野田收成后未继续升级 '+JSON.stringify(result));
   checks.push({mature,width,height,time,target,coinsBefore:coins,...result});
   await page.screenshot({path:`output/playwright/upgrade-harvest/after-${width}-${time}.png`});
   await page.evaluate(()=>{a.game.update=()=>{};});
   const reward=page.locator('#task-reward-dialog');if(await reward.isVisible())await reward.locator('button').first().tap();
   if(await page.locator('#farm-exit').isVisible())await page.locator('#farm-exit').tap();
  }
  if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({checks,errors}));
 }finally{await context.close();}
}
