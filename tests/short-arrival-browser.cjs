// 正式导演按顺序采样，隔离浏览器只使用本任务端口；全尺寸昼夜和信件操作留下截图。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:4291/');
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;a.game.resetProgress();a.game.start();
  window.shortTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};
 });
 for(const [phase,elapsed] of [['alight',.3],['wait',.45],['pickup',.6],['ride',1.3],['handover',.15],['leave',.15],['watch',.45],['letter',0]]){
  await page.evaluate(async({phase,elapsed})=>{
   const a=(await import('/src/main.js')).application;let n=0;
   while((a.game.progress.arrival.phase!==phase||a.game.progress.arrival.elapsed<elapsed-.001)&&n++<220)window.shortTick(.05);
   if(n>=220)throw Error('短剧阶段不可达：'+phase);a.refresh();
  },{phase,elapsed});
  for(const [width,height,label]of [[390,844,'390'],[320,568,'320'],[1280,900,'desktop']])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const a=(await import('/src/main.js')).application;
    Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time,forestSeason:'summer'});
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
    a.renderer.resize();a.renderer.draw();a.refresh();
   },time);
   await page.waitForTimeout(60);
   const sample=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;return {...(await import('/src/rendering/visual-review.js')).inspectShortArrival(a.game,document),time:a.environment.time};
   });
   if(sample.time!==time||sample.seconds>10||sample.overflow||sample.enemies)throw Error('短剧验收失败：'+JSON.stringify(sample));
   const b=sample.bubble;
   if(b.visible&&(b.x<0||b.y<0||b.x+b.width>width+1||b.y+b.height>height+1))throw Error('头顶气泡越界');
   await page.screenshot({path:`output/playwright/short-${phase}-${label}-${time}.png`});
  }
 }
 // 信件不自动弹出；真实按钮打开与关闭，暂停归属及窄横屏滚动同时检查。
 if(await page.locator('#arrival-letter-dialog').isVisible())throw Error('信件被强制打开');
 for(const [width,height]of [[320,568],[360,640],[390,844],[430,932],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('#arrival-goal').click();
  const state=await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application,d=document.getElementById('arrival-letter-dialog'),r=d.getBoundingClientRect();
   return {paused:a.game.state==='paused',fit:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
    overflow:d.scrollWidth>d.clientWidth+1,button:document.getElementById('arrival-letter-done').getBoundingClientRect().height};
  });
  if(!state.paused||!state.fit||state.overflow||state.button<44)throw Error('信件布局或暂停异常：'+JSON.stringify(state));
  await page.screenshot({path:`output/playwright/short-letter-${width}.png`});
  await page.locator('#arrival-letter-dialog .ui-panel__body').evaluate(n=>n.scrollTop=n.scrollHeight);
  await page.locator('#arrival-letter-close').click();
  if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.state==='playing'))throw Error('收信后未恢复');
 }
 await page.locator('#arrival-goal').click();await page.locator('#arrival-letter-done').click();
 if(await page.locator('#arrival-letter-menu').count())throw Error('完成阅读后仍保留来信菜单');
 // 减少动态仍保留真实待机帧和完整剧情，不引入整图变形。
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.screenshot({path:'output/playwright/short-reduced.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'ranger-short-arrival',screenshots:54,errors};
}
