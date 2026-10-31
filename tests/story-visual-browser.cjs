// 最终尺寸与领主昼夜矩阵；全部截图通过正式场景绘制，夹具仅设置阶段入口。
async(page)=>{
  if(new URL(page.url()).port!=='4217')throw Error('仅允许隔离端口');
  await page.reload();await page.waitForFunction(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return true;});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const results=[];
  // 已完成存档的回营布局，先采样再搭建其他阶段夹具。
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.story)a.game.leaveStory();a.game.start();a.refresh();});
  await page.screenshot({path:'output/playwright/sunleaf/final-restored-camp.png'});
  for(const [width,height] of [[320,568],[390,844],[1440,1000]]){
    await page.setViewportSize({width,height});
    await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;if(!g.story){g.start();g.enterStory();}
      Object.assign(g.story,{stageId:'Q10',phase:'prepare',dialogue:null,loadoutId:'line-patrol'});g.state='story';a.refresh();});
    await page.locator('#story-button').evaluate(e=>e.click());
    if(await page.locator('#story-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1))throw Error('章节卡片横向溢出');
    await page.screenshot({path:`output/playwright/sunleaf/final-layout-${width}.png`});
    await page.locator('[data-story-command="start"]').click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    Object.assign(g.story,{stageId:'Q30',phase:'prepare',dialogue:null,routeId:null});Object.assign(g.player,(await import('/src/world/story-sites.js')).STORY_SITES.SIGN);g.state='story';a.refresh();});
  await page.screenshot({path:'output/playwright/sunleaf/final-routes.png'});
  await page.locator('[data-story-route="road"]').click();
  if(!await page.locator('#map-button').isVisible())await page.locator('#field-menu-toggle').click();
  await page.locator('#map-button').click();await page.screenshot({path:'output/playwright/sunleaf/final-route-map.png'});await page.locator('#map-done').click();
  // 最小常用手机尺寸在真实守点场景检查目标、血条、独立供给仪表。
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;Object.assign(g.story,{stageId:'Q50',phase:'prepare',dialogue:null});g.startStoryStage();for(let i=0;i<85;i++)g.update(.05);a.refresh();a.renderer.camera.time=null;a.renderer.draw();});
  await page.screenshot({path:'output/playwright/sunleaf/final-guard-320.png'});
  for(const id of ['line-patrol','tide-arc','frost-guard'])for(const time of ['day','night']){
    await page.setViewportSize({width:390,height:844});
    const data=await page.evaluate(async({id,time})=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      Object.assign(g.story,{stageId:'Q60',phase:'prepare',dialogue:null});g.state='story';g.chooseStoryLoadout(id);g.startStoryStage();
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      const {EnvironmentTransition}=await import('/src/world/environment.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
      for(let i=0;i<400&&g.boss?.ai.phase!=='windup';i++)g.update(.05,{x:1,y:0});
      a.refresh();for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.renderer.draw();
      return (await import('/src/rendering/visual-review.js')).inspectSunleaf(g,document);
    },{id,time});
    await page.screenshot({path:`output/playwright/sunleaf/final-boss-${id}-${time}.png`});results.push({id,time,...data});
  }
  // 手机指针拖动通过正式输入事件，不调用角色坐标赋值。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    g.boss=null;g.hazards=[];Object.assign(g.story,{stageId:'Q10',phase:'prepare'});g.startStoryStage();a.refresh();});
  const canvas=page.locator('#game'),box=await canvas.boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.6;
  const before=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.player;return {x:p.x,y:p.y};});
  const touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+65,y}]});
  await page.waitForTimeout(450);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  const after=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.player;return {x:p.x,y:p.y};});
  if(Math.hypot(after.x-before.x,after.y-before.y)<10)throw Error('手机拖动未驱动正式移动');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,results,touch:{before,after},errors};
}
