// 正式画面截图恢复入口，复用隔离验收场景。
async page=>{const views=[],checks=[];
 // 固定正式日夜渲染状态，画面保留猫、停车场载具及远处怪物。
 await page.evaluate(async()=>{
  const g=a.game;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0});g.enemies=[];g.spawnEnemy(.5,220);a.renderer.camera.time=null;
 });
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time,forestSeason:'summer'});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.renderer.resize();a.renderer.draw();a.refresh();
  },time);
  await page.waitForTimeout(150);
  const v=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectNearbyInteraction(a.game,document);return {...r,time:a.environment.time};});
  if(!v.visible||!v.touchTarget||v.overflow)throw Error('按钮尺寸或溢出 '+JSON.stringify(v));
  await page.screenshot({path:'output/playwright/click-'+width+'-'+time+'.png'});views.push({width,height,...v});
 }
 if(await page.locator('#nearby-interaction').textContent()!=='点击 · 进入巡林小屋')throw Error('目标错误');
 await page.locator('#nearby-interaction').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!!a.game.cottage);checks.push('电脑键盘确认同一按钮');
 return {checks,views};
}
