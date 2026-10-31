// 4175 独立浏览器验收：任务走近自动修复，自选建筑经真实面板确认，保存与施工使用正式实现。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4175');await page.setViewportSize({width:390,height:844});await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;window.fs=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),f=fs.find(f=>f.id==='cottage'),p=freshProgress();
  p.mainline.completed=MAINLINE_IDS.slice(0,f.order);p.mainline.currentId=MAINLINE_IDS[f.order];p.mainline.phase='doing';p.restoration.repaired=['clearing'];p.wood=999;
  const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.arrivalScene=null;g.vehicle.active=false;g.enemies=[];g.boss=null;g.spawnTimer=g.attackTimer=g.fireClock=99999;
  Object.assign(g.player,{x:f.x,y:f.y+140,vx:0,vy:0,invincible:99999});
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});
  const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id==='day');g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
  a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
  a.renderer.camera.time=null;a.refresh();
 });
 await page.keyboard.down('ArrowUp');
 try{await page.waitForFunction(()=>a.game.progress.restoration.build?.id==='cottage',{},{timeout:12000});}finally{await page.keyboard.up('ArrowUp');}
 await page.screenshot({path:'output/playwright/task-restoration/task-auto-day.png'});
 await page.waitForFunction(()=>a.game.progress.restoration.repaired.includes('cottage'));
 const wood=await page.evaluate(()=>a.game.progress.wood);if(wood!==919)throw Error('任务修复重复扣料 '+wood);
 // 尚未轮到载具工坊，靠近及关闭面板都不应修复；确认按钮才扣费。
 await page.setViewportSize({width:320,height:568});await page.evaluate(async()=>{
  const g=a.game,f=fs.find(f=>f.id==='garage');Object.assign(g.player,{x:f.site.x,y:f.site.y+25,vx:0,vy:0});g.attackTimer=99999;
  const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id==='night');g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
  Object.assign(a.environment,{time:'night'});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
 });await page.waitForTimeout(800);
 if(await page.evaluate(()=>!!a.game.progress.restoration.build||a.game.progress.wood!==919))throw Error('路过自选建筑扣料');
 await page.locator('#nearby-interaction[data-target="workshop-vehicle"]').click();await page.locator('#restoration-dialog').waitFor({state:'visible'});
 if(await page.evaluate(()=>!!a.game.progress.restoration.build||a.game.progress.wood!==919))throw Error('打开面板扣料');
 await page.screenshot({path:'output/playwright/task-restoration/manual-panel-night.png'});
 const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,button:document.querySelector('#restoration-repair').getBoundingClientRect().height}));if(layout.overflow||layout.button<44)throw Error('手机面板布局异常');
 await page.locator('#restoration-close').click();await page.waitForTimeout(500);if(await page.evaluate(()=>!!a.game.progress.restoration.build))throw Error('关闭面板触发自选修复');
 await page.locator('#nearby-interaction[data-target="workshop-vehicle"]').click();await page.locator('#restoration-repair').click();
 const manual=await page.evaluate(()=>({id:a.game.progress.restoration.build?.id,wood:a.game.progress.wood,cost:fs.find(f=>f.id==='garage').wood}));if(manual.id!=='garage'||manual.wood!==919-manual.cost)throw Error('确认修复未正确投料 '+JSON.stringify(manual));
 await page.waitForFunction(()=>a.game.progress.restoration.repaired.includes('garage'));
 // 新手工坊同属任务，骑乘靠近也自动施工，无需点修复按钮。
 await page.evaluate(async()=>{
  const p=(await import('/src/progression/progress.js')).freshRangerProgress(),{WORKSHOP}=await import('/src/world/workshop.js'),g=a.game;
  Object.assign(p.arrival,{phase:'repair',keys:true,x:WORKSHOP.x+100,y:WORKSHOP.y+30});p.wood=80;
  g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.arrivalError=false;g.vehicle.active=true;g.mainlineSpeech=null;g.spawnTimer=g.attackTimer=g.fireClock=99999;
  Object.assign(g.player,{x:WORKSHOP.x+100,y:WORKSHOP.y+30});a.renderer.camera.time=null;a.refresh();
 });await page.waitForFunction(()=>a.game.progress.arrival.phase==='repairing');
 if(await page.evaluate(()=>a.game.progress.wood)!==0)throw Error('首次工坊扣费不正确');
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,taskWood:wood,manual,layout,firstWorkshop:true,errors};
}
