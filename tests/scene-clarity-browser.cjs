// 固定镜头、时间与环境对比清晰度，使用正式实战绘制器并保留中文验收记录。
async(page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 const label=new URL(page.url()).searchParams.get('clarity')||'before';
 await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;a.destroy();
  await (await import('/src/rendering/cat-animation.js')).catSprites.load();
  const {createEnvironmentPanel}=await import('/src/ui/panels/environment.js');
  window.panel=createEnvironmentPanel({environment:a.environment,root:document,dialogs:{register(){},open(){},close(){}},onSave(){}});
  a.game.reset();a.game.state='playing';Object.assign(a.game.player,{x:900,y:800});
  a.game.time=5;a.game.progress.vehicleHulls[0]=1;a.game.summonVehicle();
  a.game.spawnEnemy(0,0,{x:810,y:865});a.refresh();
 });
 const samples=[];
 for(const width of [320,390,1100])for(const [season,weather] of [['spring','sun'],['summer','rain'],['autumn','cloud'],['winter','snow']])for(const time of ['day','night']){
  if(width!==390&&!((season==='summer'&&time==='day')||(season==='winter'&&time==='night')))continue;
  await page.setViewportSize({width,height:844});
  const stats=await page.evaluate(async({season,weather,time})=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{forestSeason:season,weather,time,autoTime:false,autoWeather:true,weatherAt:Date.now()-45000,seasonAt:Date.now()-150000});
   const r=a.renderer;r.seasons.reset(season);r.light=new EnvironmentTransition(a.environment,0);r.tone=new SceneTone(a.environment,0);
   r.camera.time=null;r.resize();panel.render();r.draw();
   return {tone:r.tone.sample(0),snow:r.snow.stats(),scratch:r.diagnosticInfo().seasonScratch,canvasFilter:getComputedStyle(r.canvas).filter};
  },{season,weather,time});
  await page.screenshot({path:`output/playwright/scene-clarity/${label}-${width}-${season}-${time}.png`});
  samples.push({width,season,weather,time,...stats});
 }
 if(label==='after') {
  await page.setViewportSize({width:1200,height:600});
  for(const id of ['scene-clarity','scene-clarity-night','landscape-group-0-winter-to-spring','landscape-group-0-winter-to-spring-night']) {
   await page.evaluate(async id=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');document.getElementById('clarity-gallery')?.remove();
    const canvas=document.createElement('canvas');canvas.id='clarity-gallery';canvas.width=1200;canvas.height=600;
    canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:1200px;height:600px';document.body.append(canvas);
    for(const [i,t] of [0,10,20].entries()) {
     const tile=document.createElement('canvas');tile.width=400;tile.height=600;
     await renderVisualCase(tile.getContext('2d'),id,t);canvas.getContext('2d').drawImage(tile,i*400,0);
    }
   },id);await page.screenshot({path:`output/playwright/scene-clarity/gallery-${id}.png`});
  }
 }
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'scene-clarity',label,samples,errors};
}
