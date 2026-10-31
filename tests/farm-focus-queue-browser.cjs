// 正式触控验收：失焦保留农活、空位补田、显示同等清晰的右下角圆点。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-focus-queue/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.delivery.nextAt=Date.now()+3600000;
   p.farm.plots=[0,1,2,3,4,5].map(id=>({id,mapId:'forest',x:893+id%3*56,y:2752+Math.floor(id/3)*52,crop:null,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=6;p.farm.seeds[0]=10;
   g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];
   Object.assign(g.player,{x:949,y:2910,vx:0,vy:0,invincible:99999});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;
   // 固定时段只用于比较显示，长按、取消、排队与执行均走原生触控和正式农活。
   window.light=async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();};await light('day');
  });await page.waitForTimeout(500);
  const cdp=await context.newCDPSession(page),cell=id=>`[data-farm-cell="${id}"]`;
  // 自动化默认强制页面始终获得焦点；关闭该模拟以验证真实标签失焦。
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});
  // 通过真实热点发出原生触控，保证编号来自排队顺序而非存档编号。
  const touch=async(type,id)=>{const r=id===undefined?null:await page.locator(cell(id)).boundingBox();await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:r?[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]:[]});};
  await page.locator(cell(0)).tap();await page.waitForFunction(()=>!document.getElementById('farm-sickle').disabled);await page.locator('#farm-sickle').tap();
  await page.evaluate(()=>{window.realUpdate=a.game.update.bind(a.game);window.focusEvents=[];addEventListener('blur',()=>focusEvents.push('blur'));document.addEventListener('visibilitychange',()=>focusEvents.push(document.visibilityState));for(const p of a.game.progress.farm.plots)Object.assign(p,{crop:0,plantedAt:0,readyAt:0});const n=document.getElementById('pause-on-blur');n.checked=false;n.dispatchEvent(new Event('change'));a.refresh();});
  const route=[2,1,0,3,4,5],before=await page.evaluate(()=>a.game.progress.coins);
  await touch('touchStart',route[0]);for(const id of route.slice(1))await touch('touchMove',id);
  // 圆点处于作物右下角、同等强度；内部步骤继续按真实队列顺序检查。
  const markers=await page.locator('[data-farm-cell]').evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n,'::after');return {id:Number(n.dataset.farmCell),step:n.dataset.farmStep,content:s.content,width:s.width,height:s.height,radius:s.borderRadius,background:s.backgroundColor,right:s.right,bottom:s.bottom,color:s.color,opacity:s.opacity};}));
  if(route.some((id,index)=>markers.find(n=>n.id===id)?.step!==String(index+1))||markers.some(n=>n.content!=='""'||n.width!=='10px'||n.height!=='10px'||n.radius!=='50%'||n.background!=='rgb(255, 244, 181)'||n.opacity!=='1'||parseFloat(n.right)>0||parseFloat(n.bottom)>0))throw Error('圆点样式或队列顺序错误 '+JSON.stringify(markers));
  for(const [width,height] of [[390,844],[320,568]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(120);await page.screenshot({path:`output/playwright/farm-focus-queue/dots-${width}-${time}.png`});}}
  // 手指未松开时失焦也保留已安排农活；丢失指针捕获不能变成主动取消。
  await page.evaluate(()=>{a.game.update=()=>{};window.workBefore=a.game.farmWork;dispatchEvent(new Event('blur'));});await touch('touchEnd');
  if(await page.evaluate(()=>a.game.farmWork!==workBefore||a.game.farmWork.queue.length!==6||a.game.farmDragging||document.getElementById('farm-tools').hidden))throw Error('拖动失焦清空农活');
  // 实际切换浏览器标签，随后继续正式更新，确保农活最终执行而非仅保留一份假队列。
  const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();await other.waitForTimeout(250);await page.bringToFront();
  if(await page.evaluate(()=>a.game.farmWork!==workBefore||a.game.farmWork.queue.length!==6||focusEvents.length<2))throw Error('切换标签状态 '+JSON.stringify(await page.evaluate(()=>({same:a.game.farmWork===workBefore,queue:a.game.farmWork?.queue.length,events:focusEvents,focused:document.hasFocus(),hidden:document.hidden}))));
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{a.game.update=realUpdate;});
  await page.waitForFunction(()=>a.game.farmWork?.job&&a.game.farmWork.queue.length>0);
  if(await page.evaluate(()=>document.querySelector(`[data-farm-cell="${a.game.farmWork.job.id}"]`).dataset.farmStep!=='1'))throw Error('当前动作没有编号1');
  await page.waitForFunction(()=>a.game.progress.farm.plots.every(p=>p.crop===null)&&!a.game.farmWork.job&&!a.game.farmWork.queue.length,null,{timeout:30000});await page.waitForTimeout(100);
  if(await page.evaluate(before=>a.game.progress.coins!==before+360||[...document.querySelectorAll('[data-farm-cell]')].some(n=>n.dataset.farmStep),before))throw Error('恢复后漏收、重复收或圆点残留');
  // 开启失焦暂停时保留相同动作对象，玩家点击继续后按原队列执行。
  await page.evaluate(()=>{for(const p of a.game.progress.farm.plots)Object.assign(p,{crop:0,plantedAt:0,readyAt:0});Object.assign(a.game.player,{x:949,y:2910,vx:0,vy:0});a.renderer.camera.time=null;const n=document.getElementById('pause-on-blur');n.checked=true;n.dispatchEvent(new Event('change'));a.refresh();});await page.waitForTimeout(150);
  await touch('touchStart',2);await touch('touchMove',1);await touch('touchEnd');await page.evaluate(()=>{window.pausedWork=a.game.farmWork;});await other.bringToFront();await other.waitForTimeout(250);
  if(await page.evaluate(()=>a.game.state!=='paused'||a.game.farmWork!==pausedWork||(a.game.farmWork.queue.length+(a.game.farmWork.job?1:0))!==2))throw Error('自动暂停清空农活');
  await page.bringToFront();
  // 真实失焦已验明，后续固定焦点避免测试过程中其他桌面操作再次触发暂停。
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.locator('#resume').click();await page.waitForFunction(()=>a.game.progress.farm.plots[1].crop===null&&a.game.progress.farm.plots[2].crop===null,null,{timeout:20000});
  await page.evaluate(()=>{const n=document.getElementById('pause-on-blur');n.checked=false;n.dispatchEvent(new Event('change'));});await other.close();
  // 偏移旧档田地围住完整空位：直接点屏幕空地，正式落锄后必须落在该空格。
  await page.locator('#farm-hoe').tap();await page.evaluate(()=>{a.game.progress.farm.plots=[[0,-52],[-56,0],[56,0],[0,52]].map(([dx,dy],id)=>({id,mapId:'forest',x:913+dx,y:2772+dy,crop:null,plantedAt:0,readyAt:0,watered:false}));a.game.progress.farm.nextId=4;Object.assign(a.game.player,{x:913,y:2900,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(200);
  const gap=await page.evaluate(()=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.left+(913-v.x)*v.zoom,y:r.top+(2772-v.y)*v.zoom};});await page.screenshot({path:'output/playwright/farm-focus-queue/gap-before.png'});await page.mouse.click(gap.x,gap.y);
  await page.waitForFunction(()=>a.game.progress.farm.plots.some(p=>p.id===4&&p.x===913&&p.y===2772),null,{timeout:15000});await page.waitForFunction(()=>!a.game.farmWork.job&&!a.game.farmWork.queue.length);
  if(await page.evaluate(()=>a.game.farmCursor))throw Error('开垦结束残留步骤');await page.screenshot({path:'output/playwright/farm-focus-queue/gap-filled.png'});
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'world-farm-delivery',markers,blurKeepsQueue:true,tabSwitch:true,pauseResume:true,harvestExactlyOnce:true,gapFilled:true,errors};
 }finally{await context.close();}
}
