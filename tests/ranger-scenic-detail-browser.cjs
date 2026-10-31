// 额外审查公交站冬雪、减少动态与导览的无气泡留白，保存旧档后恢复。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.reload();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;window.detailSaved=JSON.stringify(a.game.progress);a.game.resetProgress();a.menu.enter();a.game.start();window.detailTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};for(let i=0;i<15;i++)window.detailTick(.05);});
 await page.setViewportSize({width:320,height:740});
 for(const season of ['spring','winter'])for(const time of ['day','night']){
  await page.evaluate(async ({season,time})=>{const a=(await import('/src/main.js')).application;Object.assign(a.environment,{autoSeason:false,autoTime:false,autoWeather:false,weather:'sun'});while(a.environment.forestSeason!==season)document.getElementById('season-picture').click();while(a.environment.time!==time)document.getElementById('time-picture').click();const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset(season,performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.renderer.draw();a.refresh();},{season,time});
  await page.screenshot({path:`output/playwright/scenic-stop-${season}-${time}.png`});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/scenic-reduced-motion.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 for(const phase of ['cottage','weapons','vehicle']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application,{RANGER_STAGES}=await import('/src/config/ranger-arrival.js');let n=0;while((a.game.progress.arrival.phase!==phase||a.game.progress.arrival.elapsed<RANGER_STAGES[phase].seconds-.7)&&n++<2000)window.detailTick(.05);a.renderer.draw();a.refresh();if(!document.getElementById('arrival-speech').hidden)throw Error('Missing quiet look at building');},phase);
  await page.screenshot({path:`output/playwright/scenic-quiet-${phase}.png`});
 }
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.setItem('forest-patrol-v1',window.detailSaved);});await page.reload();
 if(errors.length)throw Error(errors.join('\n'));
}
