// 西门载具教学回归：真实按键跨过屏幕边缘，战场不能被操作引导滚动。
async page=>{
 if(new URL(page.url()).port!=='4273')throw Error('仅允许隔离验收端口4273');
 const errors=[],results=[];page.on('pageerror',error=>errors.push(error.message));
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.arrival=null;g.arrivalScene=null;g.reset();g.state='playing';g.mainlineTalkDelay=999;window.navigationFrames=[];const renderer=a.renderer,draw=renderer.draw.bind(renderer);renderer.draw=()=>{draw();const frame=document.getElementById('game-frame'),canvas=renderer.canvas.getBoundingClientRect(),rect=frame.getBoundingClientRect();if(navigationFrames.length<1500)navigationFrames.push({scrollX:frame.scrollLeft,scrollY:frame.scrollTop,offsetX:canvas.left-rect.left,offsetY:canvas.top-rect.top,zoom:renderer.view.zoom});};});
 for(const width of [390,320,1280])for(const time of ['day','night']){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(150);
  await page.evaluate(async time=>{const g=a.game,r=a.renderer,{MAINLINE_IDS}=await import('/src/config/mainline.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-vehicle'));g.progress.mainline.phase='meet';g.mainlineSpeech=null;g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time,weather:'sun',autoWeather:false});r.light=new EnvironmentTransition(a.environment,0);r.tone=new SceneTone(a.environment,0);const zoom=r.width<500?.85:1.05;Object.assign(g.player,{x:320-(r.width/2-18)/zoom-45,y:729,vx:0,vy:0});a.refresh();},time);
  await page.waitForTimeout(150);await page.evaluate(()=>navigationFrames=[]);
  await page.keyboard.down('d');await page.waitForTimeout(650);await page.keyboard.up('d');await page.waitForTimeout(250);
  await page.screenshot({path:`output/playwright/garage-flicker/${width}-${time}.png`});
  await page.keyboard.down('a');await page.waitForTimeout(650);await page.keyboard.up('a');await page.waitForTimeout(250);
  const result=await page.evaluate(()=>({frames:navigationFrames.length,maxScroll:Math.max(...navigationFrames.map(f=>Math.max(Math.abs(f.scrollX),Math.abs(f.scrollY)))),maxCanvasOffset:Math.max(...navigationFrames.map(f=>Math.max(Math.abs(f.offsetX),Math.abs(f.offsetY)))),zooms:[...new Set(navigationFrames.map(f=>f.zoom))]}));results.push({width,time,...result});
  if(!result.frames||result.maxScroll||result.maxCanvasOffset||result.zooms.length!==1)throw Error('场景闪跳：'+JSON.stringify(results));
 }
 // 工坊内仍自动定位升级部件，移动端先滚到页底再切换引导步骤。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');g.progress.mainline.completed=MAINLINE_IDS.slice(0,2);g.progress.mainline.phase='doing';g.progress.coins=g.progress.wood=100000;g.progress.materials={parts:10000,crystal:10000,core:10000};a.workshop.open('weapons',0);});
 await page.waitForFunction(()=>document.getElementById('operation-guide').dataset.stage==='part');
 await page.evaluate(()=>{const layout=document.querySelector('.ws-layout');layout.scrollTop=layout.scrollHeight;a.workshop.open('vehicle',0);});
 await page.waitForFunction(()=>document.getElementById('operation-guide').dataset.stage!=='part');
 await page.evaluate(()=>a.workshop.open('weapons',0));
 await page.waitForFunction(()=>document.getElementById('operation-guide').dataset.stage==='part');await page.waitForTimeout(600);
 const workshop=await page.evaluate(()=>{const source=document.querySelector('[data-ws-upgrade="damage"]'),layout=document.querySelector('.ws-layout'),rect=source.getBoundingClientRect(),bounds=layout.getBoundingClientRect();return {highlight:source.classList.contains('operation-source'),visible:rect.top>=bounds.top&&rect.bottom<=bounds.bottom,scroll:layout.scrollTop};});
 await page.screenshot({path:'output/playwright/garage-flicker/workshop-guide.png'});await page.locator('#ws-close').click();
 if(!workshop.highlight||!workshop.visible||errors.length)throw Error(JSON.stringify({workshop,errors}));
 return {results,workshop,errors};
}
