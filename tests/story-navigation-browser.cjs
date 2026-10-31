// 隔离端口验收正式导航DOM；阶段夹具用于覆盖路线、回营和领主，不冒充人工通关。
async (page) => {
  if(new URL(page.url()).port!=='4218')throw Error('仅允许隔离端口4218');
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await page.locator('#story-button').click();await page.getByRole('button',{name:'开始第一章',exact:true}).click();
  await page.getByRole('button',{name:'跳过对话',exact:true}).click();
  await page.locator('[data-story-loadout="line-patrol"]').click();
  await page.locator('[data-story-command="start"]').click();
  // 读取正式复核入口，并验证真实DOM旋转与当前目标方向一致。
  async function inspect() {return page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.refresh();
    return (await import('/src/rendering/visual-review.js')).inspectStoryNavigation(document);
  });}
  let s=await inspect();if(!s.visible||s.site!=='SIGN'||s.angle<200||s.angle>220)throw Error('初始箭头没有指向西南布条');
  const initial=s.angle;
  await page.keyboard.down('KeyD');await page.waitForTimeout(650);await page.keyboard.up('KeyD');
  s=await inspect();if(s.angle<=initial+3)throw Error('正式键盘移动后方向未更新');samples.push({kind:'keyboard',initial,...s});
  await page.locator('#story-button').click();if((await inspect()).visible)throw Error('弹窗仍显示导航');
  await page.locator('#story-close').click();if(!(await inspect()).visible)throw Error('关闭弹窗未恢复导航');
  // 纯场景夹具检查任务点变化、到点、循环世界镜像及准备/试射状态隐藏。
  const cases=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game,results=[];
    const {inspectStoryNavigation}=await import('/src/rendering/visual-review.js');
    for(const [stageId,routeId,group,site] of [['Q30','road',0,'ROAD1'],['Q30','road',1,'ROAD2'],['Q30','short',0,'SHORT1'],['Q40','road',0,'MINT'],['Q50','road',0,'RELAY'],['Q70','road',0,'RELAY'],['Q80','road',0,'CAMP']]){
      Object.assign(g.story,{stageId,routeId,group,phase:'active',dialogue:null,combat:null});a.refresh();
      const s=inspectStoryNavigation(document);if(s.site!==site)throw Error('任务导航未切换：'+stageId+routeId);results.push(s);
    }
    Object.assign(g.player,{x:900,y:700});a.refresh();let s=inspectStoryNavigation(document);
    if(!s.near||!s.coincident)throw Error('到点状态错误');
    Object.assign(g.player,{x:4500,y:3500});a.refresh();s=inspectStoryNavigation(document);
    if(!s.coincident)throw Error('循环镜像方向错误');
    g.state='paused';a.refresh();if(inspectStoryNavigation(document).visible)throw Error('暂停未隐藏');
    g.state='playing';g.story.trial={remaining:60};a.refresh();if(inspectStoryNavigation(document).visible)throw Error('试射仍显示导航');delete g.story.trial;
    return results;
  });samples.push(...cases);
  // 实战场景包含角色、轮式载具、独立炮管、薄荷、中继站与怪物，检查三种屏幕的昼夜布局。
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await page.evaluate(async({time})=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      Object.assign(g.story,{stageId:'Q50',phase:'prepare',dialogue:null,trial:null});g.startStoryStage();
      for(let i=0;i<90;i++)g.update(.05);
      Object.assign(g.player,{x:550,y:1480});
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      const {EnvironmentTransition}=await import('/src/world/environment.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
      a.refresh();a.renderer.camera.time=null;a.renderer.draw();
    },{time});
    s=await inspect();if(!s.visible||s.box.width!==44)throw Error('圆盘不可见或尺寸错误');
    const layout=await page.evaluate(()=>{
      const q=document.getElementById('quest'),nav=document.getElementById('story-navigation').getBoundingClientRect();
      const title=document.getElementById('quest-title').getBoundingClientRect(),count=document.getElementById('quest-count').getBoundingClientRect();
      return {overflow:q.scrollWidth>q.clientWidth+1,overlap:nav.right>title.left||nav.right>count.left,
        blocked:getComputedStyle(document.getElementById('story-navigation')).pointerEvents!=='none'};
    });if(layout.overflow||layout.overlap||layout.blocked)throw Error('导航布局错误：'+JSON.stringify(layout));
    await page.screenshot({path:`output/playwright/story-navigation/guard-${width}-${time}.png`});samples.push({width,time,...s,layout});
  }
  // 领主战导航改放血条左侧，原任务栏隐藏，血条和标题有独立空间。
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    Object.assign(g.story,{stageId:'Q60',phase:'prepare',dialogue:null});g.startStoryStage();a.refresh();a.renderer.camera.time=null;a.renderer.draw();});
  s=await inspect();if(!s.visible||s.host!=='boss-hud'||s.site!=='BOSS')throw Error('领主导航没有挂到血条');
  if(await page.locator('#quest').isVisible())throw Error('领主战任务栏未隐藏');
  const bossOverlap=await page.evaluate(()=>document.getElementById('story-navigation').getBoundingClientRect().right>document.getElementById('boss-name').getBoundingClientRect().left);
  if(bossOverlap)throw Error('导航覆盖领主名称');
  await page.screenshot({path:'output/playwright/story-navigation/boss-320-night.png'});samples.push({kind:'boss',...s});
  // 从领主切回回营，验证节点移回任务栏，正式触摸拖动仍能移动角色并更新方向。
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    g.boss=null;delete g.player.arena;g.enemies=[];g.hazards=[];Object.assign(g.story,{stageId:'Q80',phase:'active',dialogue:null,combat:null});Object.assign(g.player,{x:900,y:800});g.state='playing';a.refresh();});
  const before=await inspect();if(before.host!=='quest'||before.site!=='CAMP')throw Error('回营导航没有恢复');
  const canvas=await page.locator('#game').boundingBox(),x=canvas.x+canvas.width*.45,y=canvas.y+canvas.height*.6;
  const touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});
  await page.waitForTimeout(500);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  const after=await inspect();if(Math.abs(after.angle-before.angle)<3)throw Error('触摸移动未更新方位');samples.push({kind:'touch',before,after});
  await page.screenshot({path:'output/playwright/story-navigation/return-390-night.png'});
  // 临近和精确到点分别保留方向箭头与中心点，直接截取正式画面。
  for(const [x,name] of [[940,'near'],[900,'arrived']]){
    await page.evaluate(async(x)=>{const a=(await import('/src/main.js')).application;
      Object.assign(a.game.player,{x,y:700});a.refresh();a.renderer.camera.time=null;a.renderer.draw();},x);
    s=await inspect();if(!s.near||s.coincident!==(x===900))throw Error('临近展示状态错误');
    await page.screenshot({path:`output/playwright/story-navigation/${name}-390-night.png`});samples.push({kind:name,...s});
  }
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;for(let i=0;i<200;i++)a.refresh();});
  if((await inspect()).count!==1)throw Error('导航节点重复创建');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.leaveStory();a.refresh();});
  if((await inspect()).visible)throw Error('暂离残留导航');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,samples,errors};
}
