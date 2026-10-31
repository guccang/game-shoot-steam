// 实时演出录制：点击进入后不加速、不点对白，自动完成接送、导览、停车与目送。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();localStorage.removeItem('forest-patrol-v1');});await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;window.scenicGame=a.game;window.scenicLive=[];
  Object.assign(a.environment,{weather:'sun',autoSeason:false,autoTime:false,autoWeather:false});while(a.environment.forestSeason!=='autumn')document.getElementById('season-picture').click();while(a.environment.time!=='day')document.getElementById('time-picture').click();
  const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('autumn',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
 });await page.locator('#start').click();
 for(const phase of ['ride','cottage','weapons','vehicle','dismount','parking','handover','leave','watch','gather']){
  await page.waitForFunction(phase=>window.scenicGame.progress.arrival.phase===phase,phase,{timeout:30000});await page.waitForTimeout(650);
  const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,s=(await import('/src/rendering/visual-review.js')).inspectScenicArrival(a.game,document);window.scenicLive.push(s);return s;});
  if(sample.enemies||sample.overflow)throw Error('Invalid live scene');
  await page.screenshot({path:`output/playwright/scenic-live-${phase}.png`});
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.renderer.diagnosticInfo().catAnimation.status!=='ready')throw Error('Cat source unavailable');a.save();});
 if(errors.length)throw Error(errors.join('\n'));
}
