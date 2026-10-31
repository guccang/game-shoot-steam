// 统一细滚动条实机验收：工坊与设置的正式列表，覆盖滚轮、触摸及手机昼夜。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.weapons.fill(1);
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};Object.assign(a.game.player,{x:630,y:360});a.renderer.camera.time=null;});
 // 样式来自实际滚动节点，不能以单独示意图代替浏览器的滚动条。
 const inspect=selector=>page.locator(selector).evaluate(n=>({width:getComputedStyle(n,'::-webkit-scrollbar').width,height:getComputedStyle(n,'::-webkit-scrollbar').height,color:getComputedStyle(n,'::-webkit-scrollbar-thumb').backgroundColor,track:getComputedStyle(n,'::-webkit-scrollbar-track').backgroundColor,arrows:getComputedStyle(n,'::-webkit-scrollbar-button').display,scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight}));
 for(const [width,height]of [[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.workshop.open('weapons',0);a.refresh();
  },phase);
  const shelf=page.locator('#ws-shelf'),box=await shelf.boundingBox();await shelf.evaluate(n=>n.scrollTop=0);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,250);await page.waitForFunction(()=>document.getElementById('ws-shelf').scrollTop>20);
  const sample=await inspect('#ws-shelf');if(sample.width!=='4px'||sample.height!=='4px'||sample.track!=='rgba(0, 0, 0, 0)'||sample.arrows!=='none')throw Error(JSON.stringify(sample));
  samples.push({viewportWidth:width,phase,...sample});await page.mouse.move(2,2);await page.screenshot({path:`output/playwright/subtle-scrollbars/workshop-${width}-${phase}.png`});
  await page.locator('#ws-close').click();
 }
 // 真实触摸手势沿侧栏上滑，列表内容仍可以连续滚动。
 await page.evaluate(()=>a.workshop.open('weapons',0));const shelf=page.locator('#ws-shelf');await shelf.evaluate(n=>n.scrollTop=0);
 const box=await shelf.boundingBox(),cdp=await page.context().newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height*.8;
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*20}]});await page.waitForTimeout(20);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>document.getElementById('ws-shelf').scrollTop>20);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();await page.locator('#ws-close').click();
 await page.locator('#settings-button').click();const settings=page.locator('.settings-scroll'),settingsBox=await settings.boundingBox();
 await page.mouse.move(settingsBox.x+settingsBox.width/2,settingsBox.y+settingsBox.height/2);await page.mouse.wheel(0,240);await page.waitForTimeout(150);
 const common=await inspect('.settings-scroll');if(common.width!=='4px'||common.color!==samples[0].color||common.scrollTop<=0)throw Error('通用列表未统一或无法滚动');
 await page.mouse.move(2,2);await page.screenshot({path:'output/playwright/subtle-scrollbars/settings-320.png'});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'subtle-scrollbars',samples,common,touchScroll:true,errors};
}
