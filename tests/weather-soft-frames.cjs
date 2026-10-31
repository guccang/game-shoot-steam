// 昼夜实战同屏抽帧与工作台连续采样，验证降水交接、停雪及晴阴亮度。
async(page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;a.destroy();
  const {catSprites}=await import('/src/rendering/cat-animation.js');await catSprites.load();
  const {createEnvironmentPanel}=await import('/src/ui/panels/environment.js');window.panel=createEnvironmentPanel({environment:a.environment,root:document,dialogs:{register(){},open(){},close(){}},onSave(){}});
  a.game.reset();a.game.state='playing';Object.assign(a.game.player,{x:900,y:800});a.game.progress.vehicleHulls[0]=1;a.game.summonVehicle();a.game.spawnEnemy(0,0,{x:810,y:865});a.refresh();
 });
 const duration=await page.evaluate(async()=>(await import('/src/world/environment.js')).WEATHER_FADE_DURATION);
 const samples=[];
 for(const width of [320,390,1100])for(const time of ['day','night']){
  await page.setViewportSize({width,height:844});
  for(const t of [0,duration/2,duration]){
   const result=await page.evaluate(async({time,t,duration})=>{
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    Object.assign(a.environment,{forestSeason:'winter',weather:'snow',time,autoWeather:true,weatherAt:Date.now()-45000,seasonAt:Date.now()-150000});a.renderer.seasons.reset('winter');
    a.renderer.light=new EnvironmentTransition({time,weather:'rain'},0);a.renderer.light.set(a.environment,0);const light=a.renderer.light.sample(t);a.renderer.light.sample=()=>light;
    a.renderer.tone=new SceneTone({time,weather:'rain'},0);a.renderer.tone.set(a.environment,0);const tone=a.renderer.tone.sample(t);a.renderer.tone.sample=()=>tone;
    a.renderer.resize();panel.render();a.renderer.draw();
    const d=a.renderer.diagnosticInfo();if(d.snow.count>167||d.snow.largeCount>3)throw Error('雪花超预算');
    if(t===0&&d.snow.count!==0||t===duration&&a.renderer.rain.drops.length!==0)throw Error('端点残留另一种降水');
    return {light,tone,snow:d.snow,rain:a.renderer.rain.drops.length};
   },{time,t,duration});samples.push({width,time,t,...result});
   await page.screenshot({path:`output/playwright/weather-soft-cycle/rain-snow-${width}-${time}-${t}.png`});
  }
 }
 await page.setViewportSize({width:1200,height:600});
 for(const [from,to] of [['sun','rain'],['rain','snow'],['snow','sun'],['sun','cloud']])for(const night of [false,true]){
  await page.evaluate(async({from,to,night,duration})=>{
   const {renderVisualCase}=await import('/src/rendering/visual-review.js');document.getElementById('weather-gallery')?.remove();
   const canvas=document.createElement('canvas');canvas.id='weather-gallery';canvas.width=1200;canvas.height=600;canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:1200px;height:600px';document.body.append(canvas);
   for(const [i,t] of [0,duration/2000,duration/1000].entries()){const tile=document.createElement('canvas');tile.width=400;tile.height=600;await renderVisualCase(tile.getContext('2d'),`weather-change-${from}-to-${to}${night?'-night':''}`,t);canvas.getContext('2d').drawImage(tile,i*400,0);}
  },{from,to,night,duration});await page.screenshot({path:`output/playwright/weather-soft-cycle/gallery-${from}-${to}-${night?'night':'day'}.png`});
 }
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'weather-soft-transition',samples,galleries:8,errors};
}
