// 隔离端口实机验收：正式UI交互、昼夜手机布局与NPC连续帧；后期使用显式进度夹具。
async(page)=>{
 if(new URL(page.url()).port!=='4251')throw Error('仅限主线隔离端口4251');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.bringToFront();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const {freshProgress}=await import('/src/progression/progress.js');a.game.progress=freshProgress();a.game.reset();a.game.progress.arrival=null;a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.refresh();});
 await page.locator('#start').click();
 await page.evaluate(async()=>{const g=a.game,{MAINLINE_SITES}=await import('/src/config/mainline.js');g.enemies=[];g.boss=null;g.wavePhase='waiting';g.waveTimer=999;g.state='playing';Object.assign(g.player,{x:MAINLINE_SITES.camp.x,y:MAINLINE_SITES.camp.y+60});a.renderer.camera.time=null;a.refresh();});
 await page.locator('#mainline-speech').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/mainline/intro.png'});
 const initial=await page.evaluate(()=>({zoom:a.renderer.view.zoom,text:document.querySelector('#mainline-speech p').textContent}));
 await page.waitForFunction(()=>a.game.progress.mainline.phase==='doing',null,{timeout:8000});
 const after=await page.evaluate(()=>({zoom:a.renderer.view.zoom,text:document.querySelector('#mainline-speech p').textContent}));
 if(initial.zoom!==after.zoom)throw Error('对白改变缩放');
 await page.locator('#mainline-info').click();
 await page.locator('#mainline-dialog').waitFor({state:'visible'});
 const book=await page.locator('#mainline-dialog').innerText();if(!book.includes('金币 +60'))throw Error('奖励说明缺失');
 await page.locator('#mainline-map').click();await page.locator('#map-dialog').waitFor({state:'visible'});
 await page.locator('#close-map').click();
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.map))throw Error('打开地图未记录');
 // 按正式键盘输入移动；教学中实际距离由运行时累计，不直接写完成条件。
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1200);await page.keyboard.up('ArrowLeft');
 const moved=await page.evaluate(()=>a.game.progress.mainline.distance);if(moved<20)throw Error('移动未记录 '+moved);
 const samples=[];
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const g=a.game;g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.enemies=[];g.boss=null;g.wavePhase='waiting';g.waveTimer=999;
   const {MAINLINE_SITES}=await import('/src/config/mainline.js');Object.assign(g.player,{x:MAINLINE_SITES.camp.x,y:MAINLINE_SITES.camp.y+100});Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
   a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },time);
  await page.waitForTimeout(350);await page.screenshot({path:`output/playwright/mainline/hud-${width}-${time}.png`});
  await page.locator('#mainline-info').click();await page.screenshot({path:`output/playwright/mainline/book-${width}-${time}.png`});
  const sample=await page.evaluate(async()=>{const {inspectMainline}=await import('/src/rendering/visual-review.js');return inspectMainline(a.game,document,a.renderer);});
  if(sample.overflow||sample.book.overflow||sample.book.rect.left<0||sample.book.rect.right>width+1)throw Error('主线界面溢出 '+width);
  samples.push({width,time,...sample});await page.locator('#mainline-close').click();
 }
 // 模拟已到整备任务，仍由正式NPC对白、任务簿及工坊确认完成真实购买。
 await page.evaluate(async()=>{const {MAINLINE_IDS}=await import('/src/config/mainline.js');const g=a.game;g.progress.mainline.completed=MAINLINE_IDS.slice(0,5);g.progress.mainline.phase='doing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.progress.coins=g.progress.wood=100000;g.progress.bosses=100;g.progress.materials={parts:9999,crystal:9999,core:9999};Object.assign(g.player,{x:530,y:740});g.enemies=[];a.refresh();});
 await page.locator('#mainline-hud').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/mainline/workshop.png'});
 const coins=await page.evaluate(()=>a.game.progress.coins);await page.locator('#ws-purchase').click();if(await page.locator('#ws-equip').isEnabled())await page.locator('#ws-equip').click();
 if(!await page.evaluate(coins=>a.game.progress.weapons[3]===1&&a.game.progress.weapon===3&&a.game.progress.coins<coins,coins))throw Error('真实购买/装备未完成');
 if(errors.length)throw Error(errors.join('\n'));
 return {errors,initial,after,moved,samples,purchase:true};
}
