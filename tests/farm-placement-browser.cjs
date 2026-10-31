// 真实手机选址：营地首田原位、邻田对齐、视野外新田区、路面拒绝与昼夜显示。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-placement/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],placed=[];
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress(),g=a.game;p.arrival=null;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;
   Object.assign(g.player,{x:803.25,y:751.5,vx:0,vy:0,invincible:9999});window.realUpdate=g.update.bind(g);g.update=()=>{};
   // 记录触摸的真实反投影坐标，断言首田没有被旧世界网格吸附。
   document.querySelector('#game-frame').addEventListener('pointerup',e=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();window.lastWorldTap={x:v.x+(e.clientX-r.x)/r.width*v.w,y:v.y+(e.clientY-r.y)/r.height*v.h};},true);
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  // 点击时冻结逻辑用于读取队列，随后恢复正式更新，真实走近与挥锄完成土地事务。
  async function dig(point,expected){
   await page.waitForTimeout(250);const screen=await page.evaluate(p=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.x+(p.x-v.x)*v.zoom,y:r.y+(p.y-v.y)*v.zoom};},point);
   await page.touchscreen.tap(screen.x,screen.y);
   try{await page.waitForFunction(()=>a.game.farmWork?.queue.some(j=>j.action==='dig'));}catch(error){await page.screenshot({path:'output/playwright/farm-placement/failed-tap.png'});throw Error('点击未入队 '+JSON.stringify({point,screen,state:await page.evaluate(()=>({work:a.game.farmWork,notice:document.querySelector('#farm-notice').textContent,tap:lastWorldTap,plots:a.game.progress.farm.plots}))}));}
   const before=await page.evaluate(()=>({count:a.game.progress.farm.plots.length,target:a.game.farmWork.queue[0].point,cursor:a.game.farmCursor,tap:lastWorldTap}));
   const goal=expected||before.tap;if(Math.hypot(before.target.x-goal.x,before.target.y-goal.y)>1e-7)throw Error('点击落点偏移 '+JSON.stringify({before,goal}));
   if(before.cursor.x!==before.target.x||before.cursor.y!==before.target.y)throw Error('预览与实际目标不同');
   await page.evaluate(()=>{a.game.update=realUpdate;});
   await page.waitForFunction(n=>a.game.progress.farm.plots.length===n+1&&!a.game.farmWork.job,before.count,{timeout:18000});
   const result=await page.evaluate(()=>{a.game.update=()=>{};return a.game.progress.farm.plots.at(-1);});
   if(Math.hypot(result.x-before.target.x,result.y-before.target.y)>1e-7)throw Error('行走中目标被重新对齐');placed.push(result);return result;
  }
  const first=await dig({x:803.25,y:643.5});
  await dig({x:first.x+61,y:first.y+5},{x:first.x+56,y:first.y});
  await dig({x:first.x+61,y:first.y-47},{x:first.x+56,y:first.y-52});
  await dig({x:first.x+4,y:first.y-47},{x:first.x,y:first.y-52});
  // 已完成四块田仍作为附近对齐参照；点到路面时提示拒绝，不创建待办。
    const roadTap=await page.evaluate(p=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.x+(p.x-v.x)*v.zoom,y:r.y+(p.y-v.y)*v.zoom};},{x:first.x+4,y:first.y+108});
  await page.touchscreen.tap(roadTap.x,roadTap.y);await page.waitForTimeout(150);
  if(!await page.locator('#farm-notice').innerText().then(s=>s.includes('路面')))throw Error('道路点击未提示拒绝');
  if(await page.evaluate(()=>a.game.farmWork.queue.length||a.game.progress.farm.plots.length!==4))throw Error('道路拒绝仍创建田块');
  await page.screenshot({path:'output/playwright/farm-placement/camp-road-fields.png'});
  // 去没有田块的视野，原营地网格不能干预新位置。
  const remote=await page.evaluate(async()=>{
   const g=a.game,{farmLandReason,farmApproach}=await import('/src/world/farm-land.js');
   for(let y=900;y<1500;y+=52)for(let x=2000;x<2800;x+=56){const p={x:x+.375,y:y+.625,mapId:'forest'},start=farmApproach(g,p);if(!farmLandReason(g,p)&&start){Object.assign(g.player,start,{vx:0,vy:0});a.renderer.camera.time=null;a.refresh();return p;}}
   throw Error('没有远处合法田地');
  });
  const remoteFirst=await dig(remote);
  // 回到营地保留原网格，完成的田块位置与原尺寸在昼夜下保持一致。
  await page.evaluate(()=>{Object.assign(a.game.player,{x:837,y:768,vx:0,vy:0});a.renderer.camera.time=null;});
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{
    const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },time);await page.waitForTimeout(350);await page.screenshot({path:'output/playwright/farm-placement/'+width+'-'+time+'.png'});
  }
  const saved=await page.evaluate(()=>a.game.progress.farm.plots.map(({id,x,y})=>({id,x,y})));
  await page.reload();await page.locator('#start').tap();await page.waitForFunction(async()=>{const a=(await import('/src/main.js')).application;return !a.game.worldPending;});
  const restored=await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.farm.plots.map(({id,x,y})=>({id,x,y})));
  if(JSON.stringify(restored)!==JSON.stringify(saved))throw Error('读档重新搬走道路田');
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'world-farm-delivery',first,remoteFirst,placed,restored,errors,video:await page.video().path()};
 }finally{await context.close();}
}
