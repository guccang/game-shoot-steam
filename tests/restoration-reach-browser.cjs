// 实际触屏从营地内侧靠近守备台，验证无需下车、无需踩围栏落点以及可见修复范围。
async page=>{
 if(new URL(page.url()).port!=='4295')throw Error('仅限隔离验收端口4295');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/restoration-reach/video',size:{width:390,height:844}}});
 const t=await context.newPage(),errors=[],results=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4295');
 await t.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await t.reload();await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await t.waitForFunction(()=>a.menu.page==='game'&&a.game.state==='playing');
 const cdp=await context.newCDPSession(t);
 for(const [gate,mounted,time,width,height] of [['left',true,'day',390,844],['left',false,'night',320,568],['top',true,'night',390,844],['top',false,'day',320,568]]){
  await t.setViewportSize({width,height});
  await t.evaluate(async({gate,mounted,time})=>{
   const g=a.game;g.state='paused';const {freshProgress}=await import('/src/progression/progress.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{CAMP_GATES}=await import('/src/config/camp-defense.js');
   const f=TOWN_RESTORATIONS.find(f=>f.id==='defense'),anchor=f.locations.find(p=>p.site.id==='repair-gate-'+gate),door=CAMP_GATES.find(g=>g.id===gate),p=freshProgress();
   p.mainline.completed=MAINLINE_IDS.slice(0,f.order);p.mainline.phase='doing';p.restoration.repaired=TOWN_RESTORATIONS.filter(v=>v.order<f.order).map(v=>v.id);p.wood=f.wood;p.vehicleHulls[0]=1;
   g.progress=p;g.enemies=[];g.boss=null;g.parking=null;g.mainlineSpeech=null;g.attackTimer=g.fireClock=999;g.arrivalScene=null;
   const {createVehicle}=await import('/src/combat/vehicle.js');g.vehicles[0]=createVehicle(p, 0);g.vehicle=g.vehicles[0];g.vehicle.active=mounted;
   Object.assign(g.player,{x:anchor.x-door.nx*180,y:anchor.y-door.ny*180+24,vx:0,vy:0});a.renderer.camera.time=null;
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,weather:'sun',forestSeason:'summer',time:time==='day'?'night':'dusk'});
   document.getElementById('time-picture').click();a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   window.repairStart=null;window.repairDone=false;
   // 观察正式帧循环记录开工位置，证明没有穿出营地或自动下车。
   function watch(){
    if(!repairStart&&g.progress.restoration.build)repairStart={x:g.player.x,y:g.player.y,mounted:g.vehicle.active,anchor,door};
    if(g.progress.restoration.repaired.includes('defense')){window.repairDone=true;return;}
    requestAnimationFrame(watch);
   }
   g.state='playing';requestAnimationFrame(watch);a.refresh();
  },{gate,mounted,time});
  await t.screenshot({path:'docs/art-reference/repair-area-'+gate+'-'+time+'.png'});
  if(await t.evaluate(()=>!!a.game.progress.restoration.build))throw Error('测试起点应位于修复区外');
  const y=height-200;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:gate==='left'?65:130,y:gate==='left'?y:y-65}]});
  await t.waitForFunction(()=>!!repairStart,null,{timeout:15000});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await t.waitForFunction(()=>a.game.progress.restoration.build?.elapsed>.5);
  await t.screenshot({path:'docs/art-reference/repair-active-'+gate+'-'+time+'.png'});
  await t.waitForFunction(()=>repairDone,null,{timeout:15000});
  const r=await t.evaluate(()=>({start:repairStart,wood:a.game.progress.wood,overflow:document.documentElement.scrollWidth>innerWidth}));
  const d=r.start.door,inside=(r.start.x-d.x)*-d.nx+(r.start.y-d.y)*-d.ny;
  if(inside<=25||inside>110||r.start.mounted!==mounted||r.wood!==0||r.overflow)throw Error('营门修复失败 '+JSON.stringify(r));
  results.push({gate,time,mounted,inside,...r});
  await t.waitForTimeout(2800);
 }
 if(errors.length)throw Error(JSON.stringify(errors));
 const video=await t.video().path();await context.close();
 await page.evaluate(r=>window.restorationReachResult=r,{results,video,errors});
}
