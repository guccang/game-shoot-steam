// 搬迁后的实际页面验收：小屋与商店点击、连接处真实行走、东西围栏昼夜同屏。
async original=>{
 const origin=new URL(original.url()).origin,context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],views=[],dir='output/playwright/camp-west-fences';
 page.on('pageerror',e=>errors.push(e.message));
 // 截图仅控制昼夜与玩家落点，继续使用正式相机、地图和实体绘制。
 async function scene(point,time){
  await page.evaluate(async({point,time})=>{
   const g=a.game,e=a.environment;Object.assign(g.player,point,{vx:0,vy:0});g.mainlineSpeech=null;
   g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;
   e.livingPreview=false;(await import('/src/world/living-calendar.js')).projectLivingCalendar(e,g.progress.living.calendar);
   Object.assign(e,{weather:'sun',autoWeather:false,autoTime:false,livingPreview:true});
   e.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  },{point,time});
 }
 try{
  await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('#start').disabled);
  await page.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls[0]=1;
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   window.tick=a.game.update.bind(a.game);a.game.update=()=>{};a.game.enemies=[];a.game.fireClock=a.game.spawnTimer=999;a.game.mainlineSpeech=null;a.refresh();
  });
  await scene({x:700,y:890},'day');await page.locator('#seed-shop-hit').tap();await page.locator('#seed-shop-dialog').waitFor({state:'visible'});await page.locator('#seed-shop-close').tap();
  await scene({x:550,y:312},'day');await page.evaluate(()=>{tick(.05);a.refresh();});
  await page.waitForFunction(()=>document.querySelector('#nearby-interaction').dataset.target==='cottage-entry');
  await page.locator('#nearby-interaction').tap();await page.waitForFunction(()=>!!a.game.cottage);
  await page.evaluate(async()=>{const layout=(await import('/src/config/workshop-interiors.js')).interiorLayout(a.game.cottage);Object.assign(a.game.player,layout.exit);for(let t=0;t<layout.exitWait+.1;t+=.04)tick(.04);a.refresh();});await page.waitForFunction(()=>!a.game.cottage);
  // 左侧跨循环边界的连接处，以真实输入往返，不直接修改终点。
  await scene({x:-100,y:1330},'day');await page.evaluate(()=>{a.game.update=tick;a.game.state='playing';});
  await page.keyboard.down('s');await page.waitForTimeout(1600);await page.keyboard.up('s');
  const walked=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));if(walked.y<1440)throw Error('两区连接处行走受阻 '+JSON.stringify(walked));
  await page.keyboard.down('w');await page.waitForTimeout(1600);await page.keyboard.up('w');
  const returned=await page.evaluate(()=>{a.game.update=()=>{};return a.game.player.y;});if(returned>1380)throw Error('反向行走受阻');
  for(const [width,height]of [[320,568],[390,844],[1280,960]])for(const time of ['day','night'])for(const [zone,x,y]of [['east-join',850,1400],['west-join',-100,1400],['parking',30,320],['garage',-10,1040],['neighbors',360,1860]]){
   await page.setViewportSize({width,height});await scene({x,y},time);await page.waitForTimeout(120);
   await page.screenshot({path:`${dir}/${zone}-${width}-${time}.png`});views.push({width,time,zone});
  }
  // 仅验收总览缩放相机，以同时核对营地、小院、河岸和两条直线围栏。
  await page.setViewportSize({width:1280,height:1100});await page.evaluate(()=>{
   a.renderer.camera.update=(p,w,h)=>{const zoom=Math.min(w/1700,h/2300);return {x:-350,y:0,w:w/zoom,h:h/zoom,width:w,height:h,zoom};};
  });
  for(const time of ['day','night']){await scene({x:600,y:700},time);await page.waitForTimeout(300);await page.screenshot({path:`${dir}/overview-${time}.png`});}
  const inspection=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectTownLayout(a.game,a.renderer,document));
  if(errors.length||inspection.overflow)throw Error(JSON.stringify({errors,inspection}));
  return {designCriterion:'town-district-layout',seedShop:true,cottage:true,walked,returned,views,inspection,errors};
 }finally{await context.close();}
}
