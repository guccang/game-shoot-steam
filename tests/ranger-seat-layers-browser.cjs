// 乘坐层级专项：正式前后座同轴、完整身体帧，以及下车前后连续画面。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.menu.enter();a.game.resetProgress();a.game.start();window.seatTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};});
 for(const [phase,elapsed,label] of [['ride',4,'ride'],['vehicle',8.5,'stopped'],['dismount',1.5,'dismount'],['parking',2,'pushing']]){
  await page.evaluate(async({phase,elapsed})=>{const a=(await import('/src/main.js')).application,g=a.game;let n=0;while((g.progress.arrival.phase!==phase||g.progress.arrival.elapsed<elapsed)&&n++<2000)window.seatTick(.05);if(n>=2000)throw Error('Missing phase');if(g.arrivalScene.riding&&(g.player.x!==g.arrivalScene.elder.x||g.player.x!==g.arrivalScene.scooter.x))throw Error('Seats not aligned');a.refresh();},{phase,elapsed});
  for(const [width,height,size] of [[1280,900,'desktop'],[390,844,'390'],[320,740,'320']])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;Object.assign(a.environment,{livingPreview:true,forestSeason:'summer',time,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false});const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.renderer.draw();a.refresh();},time);await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/seat-${label}-${size}-${time}.png`});
  }
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.renderer.diagnosticInfo().catAnimation.status!=='ready')throw Error('Real cat frames missing');});if(errors.length)throw Error(errors.join('\n'));
}
