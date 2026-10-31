// 实机专项：真实入口与自动对白；后续阶段用显式夹具，只验证本次场景提示与衔接。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
  if(new URL(page.url()).port!=='4219')throw Error('仅允许隔离端口4219');
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await openWorldStory();await page.getByRole('button',{name:'开始第一章',exact:true}).click();
  await page.locator('#story-speech').waitFor({state:'visible'});
  if(await page.locator('#story-dialog').isVisible())throw Error('对白仍然弹出页面');
  if(await page.getByRole('button',{name:'下一句',exact:true}).count())throw Error('仍存在下一句按钮');
  // 用实际触摸点击暂停，再确认阅读计时和战斗时钟均冻结。
  const touch=await page.context().newCDPSession(page),pauseBox=await page.locator('#story-speech-pause').boundingBox();
  const tx=pauseBox.x+pauseBox.width/2,ty=pauseBox.y+pauseBox.height/2;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  if(await page.locator('#story-speech-pause').getAttribute('aria-pressed')!=='true')throw Error('触摸暂停没有生效');
  const reading=await page.locator('.story-speech-progress i').getAttribute('style');
  const clock=await page.evaluate(async()=>(await import('/src/main.js')).application.game.time);
  await page.waitForTimeout(700);
  if(reading!==await page.locator('.story-speech-progress i').getAttribute('style'))throw Error('暂停仍消耗阅读时间');
  if(clock!==await page.evaluate(async()=>(await import('/src/main.js')).application.game.time))throw Error('剧情期间战斗未冻结');
  await page.screenshot({path:'output/playwright/story-guidance/intro-touch-390.png'});
  await page.locator('#story-speech-pause').click();
  await page.locator('#settings-button').click();await page.waitForTimeout(100);
  const settingsClock=await page.locator('.story-speech-progress i').getAttribute('style');
  await page.waitForTimeout(700);
  if(settingsClock!==await page.locator('.story-speech-progress i').getAttribute('style'))throw Error('设置面板消耗阅读时间');
  await page.locator('#close-settings').click();
  // 整段开场不点击下一句，自然结束后进入装备选择；日志由正式状态机保存。
  await page.locator('[data-story-loadout="line-patrol"]').waitFor({state:'visible',timeout:35000});
  if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.story.readLines.includes('intro')))throw Error('自动对白未记录日志');
  await page.locator('[data-story-loadout="line-patrol"]').click();await page.locator('[data-story-command="start"]').click();
  // 记录正式复核数据，并检查气泡落在屏幕内且尾巴在说话者上方。
  async function inspect(label){const result=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    const info=(await import('/src/rendering/visual-review.js')).inspectStoryGuidance(a.game,document);
    const frame=document.getElementById('game-frame').getBoundingClientRect();
    const n=document.getElementById('story-speech'),b=n.getBoundingClientRect();
    return {...info,contained:n.hidden||b.left>=frame.left&&b.right<=frame.right&&b.top>=frame.top,
      tailAboveHead:n.hidden||b.bottom-frame.top<=info.anchor.y+2,overflow:!n.hidden&&n.scrollWidth>n.clientWidth+1};
  });if(!result.contained||!result.tailAboveHead||result.overflow)throw Error(label+' 气泡布局错误 '+JSON.stringify(result));samples.push({label,...result});return result;}
  // 设置真实环境与指定阶段，所有图片仍使用正式绘制器和真实人物图集。
  async function scene(stage,dialogue,time){await page.evaluate(async({stage,dialogue,time})=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    for(const d of document.querySelectorAll('dialog[open]'))d.close();
    g.boss=null;delete g.player.arena;g.enemies=[];g.hazards=[];
    Object.assign(g.story,{stageId:stage,phase:dialogue?'dialogue':'active',dialogue,line:0,combat:null,support:null,repair:0,trial:null});
    const sites=(await import('/src/world/story-sites.js')).STORY_SITES;
    Object.assign(g.player,dialogue?stage==='Q10'||stage==='Q80'?sites.CAMP:sites.MINT:{x:sites.SIGN.x+55,y:sites.SIGN.y+65});
    g.state=dialogue?'story':'playing';
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
    const {EnvironmentTransition}=await import('/src/world/environment.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
    a.refresh();a.renderer.camera.time=null;a.renderer.draw();
  },{stage,dialogue,time});await page.waitForTimeout(100);}
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await scene('Q10','intro',time);await inspect('bubble-'+width+'-'+time);
    await page.screenshot({path:`output/playwright/story-guidance/bubble-${width}-${time}.png`});
    await scene('Q20',null,time);const s=await inspect('target-'+width+'-'+time);
    if(s.target.site!=='SIGN')throw Error('目标不是当前任务');
    await page.screenshot({path:`output/playwright/story-guidance/target-${width}-${time}.png`});
  }
  // 每段对白及刷新恢复均出现头顶气泡；跳过按正式流程进入路线、整备或回营。
  await page.setViewportSize({width:390,height:844});
  for(const [stage,dialogue] of [['Q20','sign'],['Q40','mint'],['Q60','boss'],['Q70','silence'],['Q80','ending']]){
    await scene(stage,dialogue,'night');await inspect(dialogue);
    await page.screenshot({path:`output/playwright/story-guidance/dialogue-${dialogue}.png`});
    if(dialogue==='boss'){
      await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.syncStory();a.save();});
      await page.reload();await page.locator('#story-speech').waitFor({state:'visible'});
      if(await page.locator('#story-dialog').isVisible())throw Error('刷新对白恢复成旧面板');
      await inspect('restored-boss-dialogue');
    }
    await page.locator('#story-speech-skip').click();
    await page.waitForFunction(async()=>!(await import('/src/main.js')).application.game.story.dialogue);
    const result=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {stage:g.story.stageId,phase:g.story.phase,read:g.story.readLines};});
    if(!result.read.includes(dialogue))throw Error('跳过未记录日志');samples.push({dialogue,result});
  }
  // 实际野猪战：从距边缘20单位处按键向外走，停止于角色半径内侧，画面能见地面边线。
  for(const [width,height,time] of [[320,568,'day'],[390,844,'night'],[1280,900,'day']]){
    await page.setViewportSize({width,height});
    await scene('Q60',null,time);
    await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
      g.story.phase='prepare';g.startStoryStage();Object.assign(g.player,{x:g.player.arena.x,y:g.player.arena.y+248});a.refresh();a.renderer.camera.time=null;});
    await page.keyboard.down('KeyS');await page.waitForTimeout(600);await page.keyboard.up('KeyS');
    const distance=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.player;return Math.hypot(p.x-p.arena.x,p.y-p.arena.y);});
    if(distance<260||distance>268.01)throw Error('边界实机阻挡位置不一致 '+distance);
    await inspect('arena-'+width+'-'+time);samples.push({width,time,distance});
    await page.screenshot({path:`output/playwright/story-guidance/arena-${width}-${time}.png`});
  }
  // 胜利后真实任务推进释放空气墙和边线，地面目标切回中继站。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    g.boss=null;g.enemies=[];g.story.support={triggered:false,spawned:0,timer:0};g.update(.01);a.refresh();});
  const cleared=await inspect('boss-cleared');if(cleared.arena||cleared.target.site!=='RELAY')throw Error('战后边界或目标未更新');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.leaveStory();a.refresh();});
  await page.waitForTimeout(100);const left=await inspect('left');
  if(left.arena||left.target||left.speechVisible||left.speechCount!==1)throw Error('暂离残留提示或重复气泡');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,autoDialogue:true,touchPause:true,samples,errors};
}
