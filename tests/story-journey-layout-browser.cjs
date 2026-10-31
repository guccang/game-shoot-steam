// 补查短气泡与玩家遮挡、画外延后、危险期隐藏，以及章后载具入口与持久忽略。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
  if(new URL(page.url()).port!=='4223')throw Error('仅允许隔离端口4223');
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
  // 复查可以重复执行：保留上一轮真实结算，仅重新开启可选入口作为测试前置。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;if(g.story)g.leaveStory();g.progress.story.run=null;for(const d of document.querySelectorAll('dialog[open]'))d.close();g.state='paused';g.enemies=[];Object.assign(g.player,{x:900,y:700,hp:120});
    if(!g.progress.story.chapters['sunleaf-01'].completed)throw Error('请先执行主流程实机脚本');
    g.progress.story.chapters['sunleaf-01'].followupDismissed=false;});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;for(const d of document.querySelectorAll('dialog[open]'))d.close();Object.assign(a.game.player,{x:900,y:700,hp:120});a.game.state='playing';a.refresh();});
  await openWorldStory();await page.locator('[data-story-workshop="vehicle"]').click();
  await page.locator('#workshop-dialog').waitFor({state:'visible'});
  if(!(await page.locator('#ws-name').textContent()).includes('重型'))throw Error('载具入口未指向真实体验搭配');
  await page.locator('#ws-test').click();await page.locator('#ws-trial').waitFor({state:'visible'});await page.locator('#ws-trial-stop').click();
  await page.locator('#ws-close').click();await openWorldStory();
  await page.locator('[data-story-command="dismiss-followup"]').click();
  await page.reload();
  const dismissed=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return a.game.progress.story.chapters['sunleaf-01'];});
  if(!dismissed.followupDismissed)throw Error('忽略引导未保存');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;for(const d of document.querySelectorAll('dialog[open]'))d.close();Object.assign(a.game.player,{x:900,y:700,hp:120});a.game.state='playing';a.refresh();});
  await openWorldStory();if(await page.locator('.story-followup').count())throw Error('忽略后仍强制引导');
  await page.getByRole('button',{name:'重玩本章',exact:true}).click();await page.locator('#story-speech-skip').click();
  await page.locator('[data-story-loadout="line-patrol"]').click();await page.locator('.story-training summary').click();
  await page.locator('[data-story-trial="line"]').click();
  await page.waitForFunction(async()=>!!(await import('/src/main.js')).application.game.story.experiences?.['laser-line']);
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await page.evaluate(async({width,time})=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
      if(width===320){g.story.activeCue={id:'experience:laser-line',speaker:'player',text:'一束光打中了前后两只。站的位置真有讲究。',priority:0,remaining:8,age:0};}
      else{
        if(g.story.trial)g.stopStoryTrial();for(const d of document.querySelectorAll('dialog[open]'))d.close();
        Object.assign(g.story,{stageId:'Q50',phase:'prepare',dialogue:null});g.startStoryStage();Object.assign(g.player,{x:480,y:1300});
        // 留一个正式敌人在远侧，验证提示出现时战场仍继续；不改原波次数值。
        g.story.combat.timer=10;g.spawnEnemy(0,0,{x:600,y:1450},{bossOwner:'story'});
        g.update(.05,{x:0,y:0});
      }
      a.renderer.camera.time=null;a.refresh();a.renderer.draw();
    },{width,time});
    await page.locator('#story-chatter').waitFor({state:'visible'});
    const state=await page.evaluate(async()=>{
      const a=(await import('/src/main.js')).application,g=a.game,n=document.getElementById('story-chatter'),b=n.getBoundingClientRect(),canvas=a.renderer.canvas.getBoundingClientRect(),v=a.renderer.view;
      const x=(g.player.x-v.x)*v.zoom+canvas.left,y=(g.player.y-v.y)*v.zoom+canvas.top;
      return {...(await import('/src/rendering/visual-review.js')).inspectStoryJourney(g,document),
        overlapsPlayer:b.left<x+45*v.zoom&&b.right>x-45*v.zoom&&b.top<y+36*v.zoom&&b.bottom>y-72*v.zoom,
        cameraLayout:a.renderer.storyCamera.layout,inside:b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight-90};
    });
    if(state.overlapsPlayer||!state.inside||state.cameraLayout||state.state!=='playing')throw Error('气泡遮挡或镜头失效 '+JSON.stringify(state));
    samples.push({width,time,...state});
    await page.screenshot({path:`output/playwright/story-journey/layout-${width}-${time}.png`});
  }
  // 画外普通反馈应延后，预警阶段一律隐藏，不用移动镜头凑位置。
  const guards=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    g.enemies=[];const e=g.spawnEnemy(0,0,{x:1100,y:1300},{bossOwner:'story'});Object.assign(e,{hp:1e6,maxHp:1e6,football:true});
    Object.assign(g.player,{x:1000,y:1300});g.story.activeCue={id:'outside',speaker:'mint',text:'安全间隙再读',priority:0,safeOnly:true,remaining:5,age:0};
    a.renderer.camera.time=null;a.renderer.draw();
  }).then(()=>page.waitForTimeout(150)).then(()=>page.locator('#story-chatter').isHidden());
  if(!guards)throw Error('画外普通反馈未延后');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    Object.assign(g.story,{stageId:'Q60',phase:'prepare'});g.startStoryStage();g.boss.ai.phase='windup';g.boss.ai.elapsed=0;
    g.story.activeCue={id:'danger',speaker:'player',text:'此时不能遮住预警',priority:2,remaining:5,age:0};a.refresh();});
  await page.waitForTimeout(100);if(!await page.locator('#story-chatter').isHidden())throw Error('冲锋预警未隐藏气泡');
  if(errors.length)throw Error(errors.join(' | '));
  return {passed:true,dismissed,samples,guards,errors};
}
