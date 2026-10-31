// 在真实手机场景制造种子面板与任务HUD重叠，验证层级、触摸和拖播；默认本地4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;const {MAINLINE_IDS}=await import('/src/config/mainline.js');p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('tower'));p.mainline.phase='doing';p.farm.wildMaps=['forest'];p.farm.lessonRewarded=true;p.farm.seeds.fill(3);p.farm.unlocked.fill(true);p.farm.plots=[];g.progress=p;g.reset();g.state='playing';g.update=()=>{};g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];Object.assign(g.player,{x:921,y:2855});a.renderer.camera.time=null;a.refresh();});
  for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   // 地块使用正式世界投影，开出的面板自然落到任务卡区域，而非手改面板CSS。
   await page.evaluate(()=>{const v=a.renderer.view,f=document.querySelector('#game-frame').getBoundingClientRect(),r=a.renderer.canvas.getBoundingClientRect();a.game.progress.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:v.x+v.w/2+id*56,y:v.y+(335-(r.top-f.top))/v.zoom,crop:null,plantedAt:0,readyAt:0,watered:false}));a.game.progress.farm.nextId=2;a.refresh();});
   await page.locator('[data-farm-cell="0"]').tap();await page.locator('#farm-picker').waitFor({state:'visible'});await page.locator('[data-farm-category="ornamental"]').tap();await page.waitForFunction(()=>document.querySelector('[data-farm-seed="0"]')?.disabled===false);
   const info=await page.evaluate(()=>{const p=document.querySelector('#farm-picker'),h=document.querySelector('#mainline-hud'),b=p.getBoundingClientRect(),r=h.getBoundingClientRect();const x=Math.max(b.left,r.left)+8,y=Math.max(b.top,r.top)+8;return {overlap:b.left<r.right&&b.right>r.left&&b.top<r.bottom&&b.bottom>r.top,topHit:p.contains(document.elementFromPoint(x,y)),fit:b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight,buttons:[...p.querySelectorAll('button')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.farmSeed||'shop',hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})};});
   if(!info.overlap||!info.topHit||!info.fit||info.buttons.some(b=>!b.hit))throw Error(JSON.stringify(info));checks.push({width,phase,...info});await page.screenshot({path:`output/playwright/seed-picker-layer/${width}-overlap.png`});
   await page.locator('[data-farm-seed="0"]').tap();if(!await page.evaluate(()=>a.game.farmWork.tool==='seed'&&getComputedStyle(document.querySelector('#farm-world-layer')).zIndex==='6'))throw Error('选种或关闭后层级错误');
   await page.locator('[data-farm-cell="1"]').tap();if(!await page.evaluate(()=>a.game.farmWork.queue.some(j=>j.action==='plant'&&j.id===1)))throw Error('选种后不能安排播种');
   await page.locator('#farm-hoe').tap();await page.locator('[data-farm-cell="0"]').tap();
   // 从选种面板直接拖到另一个地块，检查原父层指针捕获仍可工作。
   await page.locator('[data-farm-category="vegetable"]').tap();const seed=await page.locator('[data-farm-seed="1"]').boundingBox(),cell=await page.locator('[data-farm-cell="1"]').boundingBox();await page.mouse.move(seed.x+seed.width/2,seed.y+seed.height/2);await page.mouse.down();await page.mouse.move(cell.x+cell.width/2,cell.y+cell.height/2,{steps:12});await page.mouse.up();
   if(!await page.evaluate(()=>a.game.farmWork.queue.some(j=>j.action==='plant'&&j.crop===1&&j.id===1)&&!a.game.farmDragging))throw Error('拖播失效');await page.locator('#farm-exit').tap();
   const taskHit=await page.locator('#mainline-hud b').evaluate(n=>{const r=n.getBoundingClientRect();return n.closest('#mainline-hud').contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});if(!taskHit)throw Error('退出后田块挡住任务UI');
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
