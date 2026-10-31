// 隔离存档中点击接警，逐帧验证全黑换位，再以正式物理步行出车并检查昼夜手机画面。
async page=>{
 if(new URL(page.url()).port!=='4198')throw Error('仅限隔离端口4198');
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:390,height:844});await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.fireApp=(await import('/src/main.js')).application;await fireApp.ready;const g=fireApp.game;
  window.fireTick=g.update.bind(g);g.update=()=>{};g.random=()=>.4;g.state='playing';
  Object.assign(g.player,{x:2242.903006543718,y:439.83505954865404,vx:0,vy:0});g.requestFireRescue();fireApp.refresh();
 });
 await page.locator('[data-fire-open]').click();await page.locator('[data-fire-accept]').click();
 // 转场使用实际帧循环，记录换位帧的遮罩及位移；到达镇内后暂时停下便于复核。
 await page.evaluate(()=>{
  const g=fireApp.game;window.transferSamples=[];
  window.transferUpdate=(dt,input)=>{const before={x:g.player.x,y:g.player.y};fireTick(dt,input);fireApp.refresh();const mask=document.getElementById('fire-town-transfer');
   transferSamples.push({phase:g.fireRescue.phase,distance:Math.hypot(g.player.x-before.x,g.player.y-before.y),opacity:Number(mask.style.opacity),x:g.player.x,y:g.player.y});
   if(Number(mask.style.opacity)===1&&!window.blackCaptured){window.blackCaptured=true;g.update=()=>{};}
   if(g.fireRescue.phase==='approaching')g.update=()=>{};
  };g.update=window.transferUpdate;
 });
 await page.waitForFunction(()=>window.blackCaptured);
 await page.screenshot({path:'output/playwright/fire-town-transfer/black.png'});
 await page.evaluate(()=>{fireApp.game.update=window.transferUpdate;});
 await page.waitForFunction(()=>fireApp.game.fireRescue.phase==='approaching',null,{timeout:15000});
 const transfer=await page.evaluate(()=>{
  const jumps=transferSamples.filter(sample=>sample.distance>10);if(jumps.length!==1||jumps[0].opacity!==1)throw Error('换位未完全被黑屏遮住');
  if(Math.hypot(fireApp.game.player.x-900,fireApp.game.player.y-700)>1e-6)throw Error('未先回到小镇');return transferSamples;
 });
 await page.screenshot({path:'output/playwright/fire-town-transfer/town.png'});
 await page.evaluate(()=>{
  const g=fireApp.game;window.walkSamples=[];g.update=(dt,input)=>{const before={x:g.player.x,y:g.player.y};fireTick(dt,input);
   walkSamples.push({distance:Math.hypot(g.player.x-before.x,g.player.y-before.y),dt});if(g.fireRescue.phase==='active')g.update=()=>{};
  };
 });
 await page.waitForFunction(()=>fireApp.game.fireRescue.phase==='active',null,{timeout:50000});
 const views=[];
 for(const [width,height]of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  const view=await page.evaluate(async time=>{
   const a=fireApp,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{livingPreview:true,time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false,autoSeason:false});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.renderer.resize();a.refresh();a.renderer.draw();return (await import('/src/rendering/visual-review.js')).inspectFireMotion(a.game,document);
  },time);
  if(view.overflow||view.transferVisible||view.cat!=='ready'||!view.driving)throw Error('出车画面未通过 '+JSON.stringify(view));
  await page.screenshot({path:`output/playwright/fire-town-transfer/${width}-${time}.png`});views.push({width,time,...view});
 }
 const walk=await page.evaluate(()=>({count:walkSamples.length,violations:walkSamples.filter(s=>s.distance>150*s.dt+.001),phase:fireApp.game.fireRescue.phase}));
 if(walk.violations.length||errors.length)throw Error(JSON.stringify({walk,errors}));return {designCriterion:'fire-garage-motion',transfer,walk,views,errors};
}
