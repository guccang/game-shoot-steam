// 正式实战画布在固定镜头比较白昼、黄昏、夜晚及转场中点，保留战斗对象。
async(page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;a.destroy();
  const {catSprites}=await import('/src/rendering/cat-animation.js');await catSprites.load();
  const {createEnvironmentPanel}=await import('/src/ui/panels/environment.js');window.panel=createEnvironmentPanel({environment:a.environment,root:document,dialogs:{register(){},open(){},close(){}},onSave(){}});
  a.game.reset();a.game.state='playing';Object.assign(a.game.player,{x:800,y:850});a.game.progress.vehicleHulls[0]=1;a.game.summonVehicle();a.game.spawnEnemy(0,0,{x:710,y:915});a.game.time=5;a.refresh();
 });
 const duration=await page.evaluate(async()=>(await import('/src/world/environment.js')).WEATHER_FADE_DURATION);
 const samples=[];
 for(const width of [320,390,1100])for(const time of ['day','dusk','night']) {
  await page.setViewportSize({width,height:844});
  const sample=await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
   const r=a.renderer;r.seasons.reset('summer');r.light=new EnvironmentTransition(a.environment);r.tone=new SceneTone(a.environment);r.camera.time=null;r.resize();panel.render();r.draw();
   const d=r.diagnosticInfo();return {tone:r.tone.sample(0),filter:getComputedStyle(r.canvas).filter,fireflies:r.fireflies.field.points.length,cache:d.backgroundBytes};
  },time);samples.push({width,time,...sample});await page.screenshot({path:`output/playwright/environment-calendar/light-${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 for(const to of ['dusk','night'])for(const t of [0,duration/2,duration]) {
  await page.evaluate(async({to,t})=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   const from=to==='night'?'dusk':'day';a.environment.time=to;
   const r=a.renderer;r.light=new EnvironmentTransition({...a.environment,time:from},0);r.light.set(a.environment,0);const light=r.light.sample(t);r.light.sample=()=>light;
   r.tone=new SceneTone({...a.environment,time:from},0);r.tone.set(a.environment,0);const tone=r.tone.sample(t);r.tone.sample=()=>tone;r.resize();panel.render();r.draw();
  },{to,t});await page.screenshot({path:`output/playwright/environment-calendar/transition-${to}-${t}.png`});
 }
 // 湖畔使用真实萤火虫栖息地，不额外生成散点或扩大光晕。
 await page.evaluate(async()=>{
  const {LANDSCAPES}=await import('/src/world/landscape-compositions.js');const h=LANDSCAPES.habitats[0];Object.assign(a.game.player,{x:h.x,y:h.y});a.renderer.camera.time=null;a.renderer.draw();
 });await page.screenshot({path:'output/playwright/environment-calendar/lakeside-night.png'});
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'environment-calendar-light',samples,errors};
}
