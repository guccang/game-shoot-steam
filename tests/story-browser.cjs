// 隔离端口实际界面验收；中后段使用明确场景夹具，完整实战另见模拟报告。
async (page) => {
  if(new URL(page.url()).port!=='4217')throw Error('只允许隔离测试端口4217');
  const errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await page.locator('#story-button').click();await page.getByRole('button',{name:'开始第一章',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('story-speech-speaker').textContent==='栗子');
  await page.getByRole('button',{name:'跳过对话',exact:true}).click();
  for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:width===1280?900:844});
    const overflow=await page.locator('#story-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1);
    if(overflow)throw Error('章节面板横向溢出：'+width);
    await page.screenshot({path:`output/playwright/sunleaf/loadouts-${width}.png`});
  }
  await page.locator('[data-story-loadout="tide-arc"]').click();
  await page.locator('.story-training summary').click();await page.locator('[data-story-trial="scatter"]').click();
  await page.keyboard.down('KeyD');await page.waitForTimeout(600);await page.keyboard.up('KeyD');
  if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.story.trial&&g.player.x>910&&g.loadout.weapon===10&&g.vehicle.index===3;}))throw Error('借用装备试射或键盘移动失败');
  await page.locator('#story-interact').click();
  await page.locator('[data-story-command="start"]').click();
  await page.keyboard.down('KeyS');await page.waitForTimeout(600);await page.keyboard.up('KeyS');
  // 保存并重新载入真实章节，确认回到已提交阶段且保持暂停。
  await page.evaluate(async()=>{(await import('/src/main.js')).application.save();});
  await page.reload();
  await page.waitForFunction(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return a.game.story?.stageId==='Q20';});
  if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.state==='paused'&&g.story.loadoutId==='tide-arc'&&g.player.y===700;}))throw Error('刷新未按检查点暂停恢复');
  await page.locator('#resume').click();
  // 用正式任务意图验证触屏读条：夹具只清除前置遭遇并移动至目标。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,s=(await import('/src/world/story-sites.js')).STORY_SITES;
    Object.assign(g.story,{stageId:'Q40',phase:'active',dialogue:null,combat:null,routeId:'road'});Object.assign(g.player,s.MINT);g.enemies=[];g.state='playing';a.refresh();});
  await page.locator('#story-interact').click();await page.waitForTimeout(2300);
  await page.getByRole('button',{name:'跳过对话',exact:true}).click();
  await page.locator('[data-story-command="start"]').click();
  // 正式同屏昼夜、三套枪车、薄荷待机、中继站和敌人；不替换任何绘制函数。
  for(const [index,id] of ['line-patrol','tide-arc','frost-guard'].entries())for(const width of [390,1280])for(const time of ['day','night']){
    await page.setViewportSize({width,height:width===1280?900:844});
    const result=await page.evaluate(async({id,time})=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      Object.assign(g.story,{stageId:'Q50',phase:'prepare',dialogue:null});g.state='story';g.chooseStoryLoadout(id);g.startStoryStage();
      for(let i=0;i<95;i++)g.update(.05,{x:0,y:-.2});
      g.state='story';Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      const {EnvironmentTransition}=await import('/src/world/environment.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
      g.state='playing';a.refresh();for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.renderer.draw();
      return {id,time,stage:g.story.stageId,trees:g.story.clearedTrees,props:(await import('/src/rendering/story-props.js')).storyObjects(g).map(p=>p.kind),hull:g.vehicle.maxHp};
    },{id,time});
    await page.screenshot({path:`output/playwright/sunleaf/${id}-${width}-${time}.png`});shots.push({...result,width});
  }
  // 连续帧来自正式更新时间；不以旋转静图模拟动作。
  const frames=[];
  for(let i=0;i<8;i++){
    frames.push(await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.state='playing';for(let j=0;j<4;j++)g.update(.05,{x:1,y:0});g.state='story';a.renderer.draw();return {time:g.time,x:g.player.x,body:g.player.bodyAnimation,hull:g.vehicle.hp};}));
    await page.screenshot({path:`output/playwright/sunleaf/motion-${i}.png`});
  }
  // 实际暂停与日志关闭不能偷偷推进守点。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='playing';a.refresh();});
  await page.locator('#story-button').click();
  const paused=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.time;});
  await page.waitForTimeout(300);
  if(await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.time;})!==paused)throw Error('章节面板未冻结战斗');
  await page.locator('#story-close').click();
  // 强制站点失败检查弹窗，再通过真实按钮重试。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='playing';a.game.hurtStoryTarget(300);a.refresh();});
  await page.locator('[data-story-command="retry"]').click();await page.locator('[data-story-command="start"]').click();
  if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.story.relay.hp===300&&g.story.group===0;}))throw Error('站点重试未归零波次');
  // Boss使用公开阶段入口，采样真正的蓄力、冲锋、恢复。
  const phases={};
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.story,{stageId:'Q60',phase:'prepare',dialogue:null});a.game.startStoryStage();a.game.state='story';a.refresh();});
  for(let step=0;step<200&&Object.keys(phases).length<3;step++){
    const phase=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.state='playing';g.update(.05,{x:1,y:0});g.state='story';a.refresh();a.renderer.draw();return g.boss?.ai.phase;});
    if(['windup','cast','recover'].includes(phase)&&!phases[phase]){phases[phase]=true;await page.screenshot({path:`output/playwright/sunleaf/boss-${phase}.png`});}
  }
  if(Object.keys(phases).length!==3)throw Error('未采样到领主三个正式技能阶段：'+JSON.stringify(phases));
  // 完成夹具只用于结算与持久场景检查，不能替代章节通关记录。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.boss=null;g.enemies=[];g.hazards=[];
    Object.assign(g.story,{stageId:'Q80',phase:'prepare',dialogue:null,readLines:['intro','sign','mint','boss','silence','ending']});g.story.flags.silenced=true;g.state='story';a.refresh();});
  await page.locator('[data-story-command="claim"]').click();await page.reload();
  await page.waitForFunction(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return !!a.game.progress.story.worldFlags.sunleafRestored;});
  await page.locator('#resume').click();await page.screenshot({path:'output/playwright/sunleaf/restored-camp.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,shots,frames,phases,errors};
}
