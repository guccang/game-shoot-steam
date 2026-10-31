// 真实触屏走近小屋自动修复并进入，录制完整材料转移和局部施工，不使用鼠标代替。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/restoration-touch-video',size:{width:390,height:844}}});
 const t=await context.newPage(),errors=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4291');
 await t.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const {freshProgress}=await import('/src/progression/progress.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
  const p=freshProgress(),f=TOWN_RESTORATIONS.find(f=>f.id==='cottage');
  p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=MAINLINE_IDS.slice(0,f.order);p.mainline.phase='doing';
  p.restoration.repaired=['clearing'];p.restoration.gathered.cottage=f.wood;p.wood=300;p.weapons[14]=1;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await t.reload();await t.locator('#start').tap();
 await t.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  window.fs=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
  const g=a.game,f=fs.find(f=>f.id==='cottage');g.enemies=[];g.attackTimer=g.fireClock=999;
  Object.assign(g.player,{x:f.site.x,y:f.site.y+135,vx:0,vy:0});a.renderer.camera.time=null;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});
  a.game.progress.living.calendar.elapsed=0;
 });
 const cdp=await context.newCDPSession(t);
 // 持续触摸到修复范围，启动施工后才松手，未点击任何修复按钮。
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:550}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:485}]});
 await t.waitForFunction(()=>!!a.game.progress.restoration.build,null,{timeout:15000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await t.waitForFunction(()=>a.game.progress.restoration.build?.elapsed>.25);
 await t.screenshot({path:'output/playwright/restoration-touch-transfer.png'});
 await t.waitForFunction(()=>a.game.progress.restoration.build?.elapsed>1.1);
 await t.screenshot({path:'output/playwright/restoration-touch-scaffold.png'});
 await t.waitForFunction(()=>a.game.progress.restoration.repaired.includes('cottage'));
 const paid=await t.evaluate(()=>a.game.progress.wood);if(paid!==220)throw Error('触摸修复扣费异常 '+paid);
 await t.screenshot({path:'output/playwright/restoration-touch-ready.png'});
 // 真实走到原屋门，修好后也不会自动入室。
 if(await t.evaluate(()=>!!a.game.cottage))throw Error('不应自动进屋');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:550}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:485}]});
 await t.waitForTimeout(320);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await t.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='room-cottage');
 await t.locator('#nearby-interaction').tap();await t.waitForFunction(()=>!!a.game.cottage);
 await t.locator('#cottage-exit').tap();await t.waitForFunction(()=>!a.game.cottage);
 // 夜间车库：同屏保留正式猫、树木和邻近设施，车辆另由同屏验收脚本覆盖。
 await t.evaluate(async()=>{
  const g=a.game,f=fs.find(f=>f.id==='garage'),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;
  g.progress.mainline.completed=ids.slice(0,f.order);g.progress.mainline.phase='doing';g.progress.restoration.repaired=fs.slice(0,fs.indexOf(f)).map(f=>f.id);
  g.progress.restoration.gathered.garage=f.wood;g.progress.wood=300;
  const {LIVING_PHASES}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id==='night').start;
  a.environment.time='dusk';document.getElementById('time-picture').click();
  const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
  a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
  Object.assign(g.player,{x:f.site.x,y:f.site.y+135,vx:0,vy:0});a.renderer.camera.time=null;
 });
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:550}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:485}]});
 await t.waitForFunction(()=>a.game.progress.restoration.build?.id==='garage',null,{timeout:15000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await t.waitForFunction(()=>a.game.progress.restoration.build?.elapsed>.25);
 await t.screenshot({path:'output/playwright/restoration-touch-night-transfer.png'});
 await t.waitForFunction(()=>a.game.progress.restoration.repaired.includes('garage'));
 await t.screenshot({path:'output/playwright/restoration-touch-night-ready.png'});
 const night=await t.evaluate(()=>({wood:a.game.progress.wood,restoration:a.game.progress.restoration}));
 if(night.wood!==140)throw Error('车库投料错误');
 if(errors.length)throw Error('真实触屏错误 '+JSON.stringify(errors));
 const video=await t.video().path();await context.close();
 await page.evaluate(result=>window.restorationTouchResult=result,{paid,night,video,errors});
 console.log(JSON.stringify({paid,night,video,errors}));
}
