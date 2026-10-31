// 车库专项实机采样：乘坐、下车、倒推和停稳，分别检查三个尺寸及昼夜、冬雪。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.menu.enter();a.game.resetProgress();a.game.start();window.garageTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};window.garageSamples=[];});
 for(const [phase,elapsed,label] of [['ride',2,'seated'],['vehicle',8.5,'garage'],['dismount',2.9,'off'],['parking',2.5,'pushing'],['parking',5.8,'parked'],['handover',8.8,'handover']]){
  await page.evaluate(async({phase,elapsed})=>{const a=(await import('/src/main.js')).application,g=a.game;let n=0;while((g.progress.arrival.phase!==phase||g.progress.arrival.elapsed<elapsed)&&n++<2000)window.garageTick(.05);if(n>=2000)throw Error('Missing phase');a.refresh();}, {phase,elapsed});
  for(const [width,height,size] of [[1280,900,'desktop'],[390,844,'390'],[320,740,'320']])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;Object.assign(a.environment,{weather:'sun',autoSeason:false,autoTime:false,autoWeather:false});while(a.environment.forestSeason!=='summer')document.getElementById('season-picture').click();while(a.environment.time!==time)document.getElementById('time-picture').click();const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.renderer.draw();a.refresh();},time);
   await page.waitForTimeout(100);const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,s=(await import('/src/rendering/visual-review.js')).inspectGarageArrival(a.game,document);window.garageSamples.push(s);return s;});if(sample.overflow||sample.enemies)throw Error('Scene failed');if(phase==='parking'&&(sample.riding||sample.player.x!==200))throw Error('Passenger still riding');
   await page.screenshot({path:`output/playwright/garage-${label}-${size}-${time}.png`});
  }
 }
 // 冬雪沿正式建筑材质变化，车身和人物不被雪色覆盖。
 for(const time of ['day','night']){
  await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;while(a.environment.forestSeason!=='winter')document.getElementById('season-picture').click();while(a.environment.time!==time)document.getElementById('time-picture').click();const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('winter',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.draw();a.refresh();},time);await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/garage-winter-320-${time}.png`});
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;let n=0;while(a.game.progress.arrival.phase!=='gather'&&n++<600)window.garageTick(.05);a.save();if(a.renderer.diagnosticInfo().catAnimation.status!=='ready')throw Error('Missing real cat frames');window.garageAtlas=(await import('/src/rendering/scenery.js')).sceneryAtlasStats();});
 if(errors.length)throw Error(errors.join('\n'));
}
