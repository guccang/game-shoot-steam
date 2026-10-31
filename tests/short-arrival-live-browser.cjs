// 实时原速播放，不手动推进时钟；记录阶段墙钟时间及最后持信画面。
async page=>{
 await page.goto('http://localhost:4291/');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;a.game.resetProgress();a.game.start();
  Object.assign(a.environment,{livingPreview:true,time:'day',weather:'sun',autoTime:false,autoWeather:false,autoSeason:false});
  const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
  a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
  window.liveMarks=[{phase:'bus',ms:0}];window.liveStart=performance.now();
  const update=Object.getPrototypeOf(a.game).update;
  // 包装仅记录正式更新已经完成的阶段，不改变dt、输入、角色或计时。
  a.game.update=function(...args){const phase=this.progress.arrival.phase;update.apply(this,args);if(this.progress.arrival.phase!==phase)window.liveMarks.push({phase:this.progress.arrival.phase,ms:performance.now()-window.liveStart});};
  a.refresh();
 });
 await page.waitForFunction(()=>window.liveMarks?.at(-1)?.phase==='gather',{},{timeout:20000});
 const marks=await page.evaluate(()=>window.liveMarks);
 await page.screenshot({path:'output/playwright/short-live-finish.png'});
 if(marks.at(-1).ms>10000)throw Error('实时剧情超过十秒：'+JSON.stringify(marks));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.shortTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};});
 return marks;
}
