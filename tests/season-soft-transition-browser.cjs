// 真实主循环与固定连续帧共同验收材质渐变、快速重定向和无数字圆环。
async (page) => {
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
 await page.setViewportSize({width:390,height:844});await page.reload();
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;
  const {catSprites}=await import('/src/rendering/cat-animation.js');await catSprites.load();
  a.game.spawnTimer=999;a.game.attackTimer=999;a.game.enemies=[];
  Object.assign(a.environment,{autoTime:false,autoWeather:false,forestSeason:'winter',weather:'sun',time:'day'});
  a.renderer.seasons.reset('winter',performance.now());
 });
 await page.locator('#season-picture').click();
 await page.waitForFunction(()=>a.renderer.seasonVisual.active&&a.renderer.seasonVisual.progress>.02);
 const first=await page.evaluate(()=>a.renderer.seasonVisual);
 if(first.progress>=.9||first.weights.winter>=1)throw Error('切换未形成渐变');
 await page.screenshot({path:'output/playwright/season-soft-transition/live-change.png'});
 await page.locator('#season-picture').click();
 const redirected=await page.evaluate(()=>a.renderer.seasonVisual);
 if(Object.values(redirected.from).filter(v=>v>0).length<2)throw Error('连续点击未保留当前颜色');
 if(await page.locator('#season-picture-label').textContent().then(s=>/\d/.test(s)))throw Error('季节仍有数字时间');
 const ring=await page.evaluate(()=>({offset:Number(document.getElementById('season-picture-progress').style.strokeDashoffset),label:document.getElementById('season-picture').getAttribute('aria-label')}));
 if(ring.offset>2||/\d/.test(ring.label))throw Error('圆环未重置或辅助文字仍有时间数字');
 // 用正式主循环跨过季节边界，外观应从旧季开始，圆环已进入新季。
 await page.evaluate(()=>{a.environment.forestSeason='autumn';a.renderer.seasons.reset('autumn',performance.now());a.environment.seasonAt=Date.now()-299700;});
 await page.waitForFunction(()=>a.environment.forestSeason==='winter'&&a.renderer.seasonVisual.active);
 const automatic=await page.evaluate(()=>a.renderer.seasonVisual);
 if(automatic.weights.autumn<.9)throw Error('自动换季瞬间覆盖旧颜色');
 // 停止模拟，仅固定外观时间抽帧；仍使用正式Renderer和角色/载具/怪物。
 await page.evaluate(async()=>{
  a.destroy();
  const {createEnvironmentPanel}=await import('/src/ui/panels/environment.js');
  window.panel=createEnvironmentPanel({environment:a.environment,root:document,dialogs:{register(){},open(){},close(){}},onSave:()=>{}});
  const g=a.game;g.reset();g.state='playing';Object.assign(g.player,{x:900,y:800});g.progress.vehicleHulls[0]=1;g.summonVehicle();g.spawnEnemy(0,0,{x:810,y:865});a.refresh();
  window.originalSample=a.renderer.seasons.sample.bind(a.renderer.seasons);window.fadeTime=0;
  a.renderer.seasons.sample=()=>originalSample(fadeTime);
 });
 const duration=await page.evaluate(async()=>(await import('/src/world/season-transition.js')).SEASON_FADE_DURATION);
 const frames=[];
 for(const width of [320,390,1100])for(const time of ['day','night']) {
  await page.setViewportSize({width,height:844});
  await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{forestSeason:'spring',time,weather:'sun',seasonAt:Date.now()-150000});
   a.renderer.seasons.reset('winter',0);a.renderer.seasons.set('spring',0);
   a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();panel.render();
  },time);
  const hashes=[];
  for(const t of [0,duration/2,duration]) {
   const result=await page.evaluate(t=>{
    fadeTime=t;a.renderer.draw();const d=a.renderer.diagnosticInfo();
    const c=a.renderer.c,pixels=c.getImageData(0,0,c.canvas.width,c.canvas.height).data;
    let hash=0;for(let i=0;i<pixels.length;i+=29)hash=(hash*31+pixels[i])>>>0;
    return {hash,ground:d.groundCache.bytes,trees:d.trees.bytes,scratch:d.seasonScratch.bytes,weights:d.seasonTransition.weights};
   },t);hashes.push(result.hash);frames.push({width,time,t,...result});
   await page.screenshot({path:`output/playwright/season-soft-transition/melt-${width}-${time}-${t}.png`});
  }
  if(new Set(hashes).size!==3)throw Error('起点、中点、终点未改变像素');
  const mid=frames.at(-2),end=frames.at(-1);
  if(mid.ground!==end.ground*2||mid.trees!==end.trees*2)throw Error('来源缓存没有在完成后释放');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('窄屏溢出');
 }
 const alpha=await page.evaluate(async()=>{
  const {mixRaster}=await import('/src/rendering/season-raster.js');
  const canvases=['#ff0000','#0000ff'].map(color=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,1,1);return canvas;});
  const pixels=[...mixRaster(...canvases,.5).getContext('2d').getImageData(0,0,2,2).data];
  if(pixels[3]!==255||pixels[7]!==0||Math.abs(pixels[0]-128)>1||Math.abs(pixels[2]-128)>1)throw Error('透明混合产生穿透/底板');
  return pixels;
 });
 if(errors.length)throw Error(errors.join(';'));
 return {designCriterion:['season-soft-transition','season-ring-clock'],first,redirected,automatic,ring,frames,alpha,errors};
}
