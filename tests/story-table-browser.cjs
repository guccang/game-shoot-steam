// 第一章迁移实机专项：公开按钮验证流程，后段夹具只设置检查点，不重跑无关玩法。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
  if(new URL(page.url()).port!=='4222')throw Error('仅允许隔离端口4222');
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await openWorldStory();await page.getByRole('button',{name:'开始第一章',exact:true}).click();
  await page.locator('#story-speech').waitFor({state:'visible'});
  if(await page.locator('#story-speech-speaker').textContent()!=='雪团')throw Error('初始人物错误');
  await page.locator('#story-speech-skip').click();
  if(await page.locator('[data-story-loadout]').count()!==3)throw Error('借用配置数量变化');
  await page.locator('[data-story-loadout="tide-arc"]').click();
  await page.locator('.story-training summary').click();await page.locator('[data-story-trial="scatter"]').click();
  await page.keyboard.down('KeyD');await page.waitForTimeout(400);await page.keyboard.up('KeyD');
  if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.story.trial?.scene==='scatter'&&g.enemies.length===6&&g.player.x>900;}))throw Error('试射或移动失效');
  await page.locator('#story-interact').click();await page.locator('[data-story-command="start"]').click();
  await page.evaluate(async()=>{(await import('/src/main.js')).application.save();});
  await page.reload();
  const restored=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return {stage:a.game.story?.stageId,state:a.game.state,version:a.game.story?.definitionVersion};});
  if(restored.stage!=='Q20'||restored.state!=='paused'||restored.version!==1)throw Error('检查点恢复错误 '+JSON.stringify(restored));
  samples.push({restored});await page.locator('#resume').click();
  // 清除已验证的遭遇配额，让正式两秒交互、气泡与路线选择负责迁移。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    g.story.combat={site:'SIGN',total:6,cap:4,heavy:0,spawned:6,timer:0,cleared:true,blocked:0};g.enemies=[];Object.assign(g.player,{x:780,y:900});a.refresh();});
  await page.locator('#story-interact').click();await page.locator('#story-speech').waitFor({state:'visible'});
  await page.locator('#story-speech-skip').click();
  if(await page.locator('[data-story-route]').count()!==2)throw Error('路线选择数量变化');
  await page.locator('[data-story-route="short"]').click();
  if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.story.routeId==='short'&&g.storyObjective().site==='SHORT1';}))throw Error('近道目标错误');
  // 找到伙伴的检查点夹具；出场、读条、对白和守点启动仍由正式配置执行。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    Object.assign(g.story,{stageId:'Q40',phase:'active',dialogue:null,combat:null});g.enemies=[];Object.assign(g.player,{x:740,y:1390});g.state='playing';a.refresh();});
  await page.locator('#story-interact').click();await page.locator('#story-speech').waitFor({state:'visible'});
  if(await page.locator('#story-speech-speaker').textContent()!=='薄荷')throw Error('薄荷未出场');
  await page.locator('#story-speech-skip').click();await page.locator('[data-story-command="start"]').click();
  // 同屏检查不改正式绘制函数；守点阶段保留真实武器、载具、人物、中继站与来敌。
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    const state=await page.evaluate(async(time)=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      for(const d of document.querySelectorAll('dialog[open]'))d.close();
      Object.assign(g.story,{stageId:'Q50',phase:'prepare',dialogue:null});g.startStoryStage();
      for(let i=0;i<70;i++)g.update(.05,{x:0,y:0});g.state='story';
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      const {EnvironmentTransition}=await import('/src/world/environment.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
      a.renderer.camera.time=null;a.refresh();a.renderer.draw();
      const {storyObjects}=await import('/src/rendering/story-props.js');
      return {stage:g.story.stageId,hp:g.story.relay.hp,props:storyObjects(g).map(p=>p.kind),enemies:g.enemies.length,
        objective:g.storyObjective(),hud:document.getElementById('quest-detail').textContent};
    },time);
    if(state.stage!=='Q50'||!state.props.includes('mint')||!state.props.includes('relay')||!state.enemies)throw Error('守点出场异常');
    samples.push({width,time,...state});await page.screenshot({path:`output/playwright/story-table/defense-${width}-${time}.png`});
  }
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='playing';a.game.hurtStoryTarget(300);a.refresh();});
  await page.locator('[data-story-command="retry"]').click();await page.locator('[data-story-command="start"]').click();
  if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.story.relay.hp===300&&g.story.group===0;}))throw Error('守点重试错误');
  // 领主准备、人物对白和场地边界仍经公开意图启动。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    Object.assign(g.story,{stageId:'Q60',phase:'dialogue',dialogue:'boss',line:0});g.enemies=[];g.state='story';a.refresh();});
  await page.locator('#story-speech-skip').click();await page.locator('[data-story-command="start"]').click();
  if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.boss.kind==='boar'&&g.boss.maxHp===720&&g.player.arena.radius===420;}))throw Error('领主配置发生变化');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.boss=null;g.enemies=[];g.hazards=[];delete g.player.arena;
    Object.assign(g.story,{stageId:'Q80',phase:'prepare',dialogue:null,readLines:['intro','sign','mint','boss','silence','ending']});g.story.flags.silenced=true;g.state='story';a.refresh();});
  await page.locator('[data-story-command="claim"]').click();
  const completed=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;
    return {coins:g.progress.coins,wood:g.progress.wood,completed:g.progress.story.chapters['sunleaf-01'].completed,props:(await import('/src/rendering/story-props.js')).storyObjects(g)};});
  if(completed.coins!==660||completed.wood!==270||!completed.completed||completed.props.length)throw Error('结算或清理变化');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,samples,completed,errors,screenshots:6};
}
