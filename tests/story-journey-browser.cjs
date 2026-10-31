// 第一章体验实机：真实试射触发三种搭配，后段检查点夹具只缩短重复战斗等待。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
  if(new URL(page.url()).port!=='4223')throw Error('仅允许隔离端口4223');
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();await openWorldStory();
  await page.getByRole('button',{name:'开始第一章',exact:true}).click();
  await page.locator('#story-speech').waitFor({state:'visible'});
  if(!(await page.locator('#story-speech-text').textContent()).includes('薄荷去修旧哨站'))throw Error('新剧情未加载');
  await page.locator('#story-speech-skip').click();
  for(const [loadout,scene,id,width,height] of [['line-patrol','line','laser-line',320,568],['tide-arc','scatter','water-arc',390,844],['frost-guard','approach','frost-cannon',1280,900]]){
    await page.setViewportSize({width,height});await page.locator(`[data-story-loadout="${loadout}"]`).click();
    if(!(await page.locator('.story-advice').textContent()).includes('雪团'))throw Error('缺少装备建议');
    await page.locator('.story-training summary').click();await page.locator(`[data-story-trial="${scene}"]`).click();
    await page.waitForFunction(async(id)=>(await import('/src/main.js')).application.game.story.experiences?.[id],id,{timeout:20000});
    await page.locator('#story-chatter').waitFor({state:'visible'});
    const before=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {...a.renderer.view};});
    await page.waitForTimeout(600);
    const after=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {view:a.renderer.view,state:a.game.state,cameraKey:a.renderer.storyCamera.layout?.key};});
    if(after.state!=='playing'||after.cameraKey||Math.abs(after.view.x-before.x)>.5||Math.abs(after.view.y-before.y)>.5)throw Error('短气泡暂停或移动镜头');
    for(const time of ['day','night']){
      await page.evaluate(async(time)=>{const a=(await import('/src/main.js')).application;
        Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
        a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
        if(a.game.story.activeCue)a.game.story.activeCue.remaining=8;a.renderer.draw();a.refresh();},time);
      await page.screenshot({path:`output/playwright/story-journey/${loadout}-${time}.png`});
    }
    const layout=await page.locator('#story-chatter').evaluate(n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,bottom:b.bottom,placement:n.dataset.placement,pointer:getComputedStyle(n).pointerEvents};});
    if(layout.left<0||layout.right>width||layout.bottom>height-90||layout.pointer!=='none')throw Error('短气泡遮挡或越界');
    samples.push({loadout,width,layout,cameraStable:true});
    await page.keyboard.down('KeyD');await page.waitForTimeout(250);await page.keyboard.up('KeyD');
    await page.locator('#story-interact').click();
  }
  await page.locator('[data-story-command="start"]').click();
  await page.evaluate(async()=>{(await import('/src/main.js')).application.save();});await page.reload();
  const restored=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return {experiences:a.game.story.experiences,last:a.game.story.lastExperienceLoadout,state:a.game.state};});
  if(Object.keys(restored.experiences).length!==3||restored.last!=='frost-guard'||restored.state!=='paused')throw Error('体验存档恢复失败');
  await page.locator('#resume').click();
  // 夹具只清掉已验证的波次配额，正式交互读条与对白推进保持原入口。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.enemies=[];
    g.story.combat={site:'SIGN',total:6,cap:4,heavy:0,spawned:6,timer:0,cleared:true,blocked:0};Object.assign(g.player,{x:780,y:900});a.refresh();});
  await page.locator('#story-interact').click();await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-skip').click();
  if(!(await page.locator('.story-routes').textContent()).includes('薄荷的备注'))throw Error('路线缺少故事线索');
  await page.locator('[data-story-route="road"]').click();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.enemies=[];
    Object.assign(g.story,{stageId:'Q40',phase:'active',dialogue:null,combat:null});Object.assign(g.player,{x:740,y:1390});a.refresh();});
  await page.locator('#story-interact').click();await page.locator('#story-speech').waitFor({state:'visible'});
  await page.locator('#story-speech-skip').click();await page.locator('[data-story-command="start"]').click();
  await page.waitForFunction(async()=>!!(await import('/src/main.js')).application.game.story.activeCue);
  await page.screenshot({path:'output/playwright/story-journey/defense.png'});
  // 完成夹具故意改为未体验过的当前配置，结尾仍应回答最近真实使用过的霜炮。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.enemies=[];g.projectiles=[];g.boss=null;g.hazards=[];delete g.player.arena;
    Object.assign(g.story,{stageId:'Q80',phase:'active',dialogue:null,combat:null,loadoutId:'line-patrol',activeCue:null,cueQueue:[]});
    g.story.flags.silenced=true;Object.assign(g.player,{x:900,y:700});g.state='playing';a.refresh();});
  await page.locator('#story-interact').click();await page.locator('#story-speech').waitFor({state:'visible'});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.advanceStoryDialogue();a.refresh();});
  await page.waitForFunction(()=>document.getElementById('story-speech-text').textContent.includes('重炮'));
  await page.locator('#story-speech-skip').click();await page.locator('[data-story-command="claim"]').click();
  // 完成后先关闭唯一奖励结算，后续装备建议由玩家主动重开任务簿查看。
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();
  await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();
  await page.locator('.story-followup').waitFor({state:'visible'});
  const wallet=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {coins:g.progress.coins,wood:g.progress.wood,weapons:g.progress.weapons,vehicles:g.progress.vehicleHulls};});
  if(wallet.coins!==660||wallet.wood!==270)throw Error('奖励变化');
  await page.screenshot({path:'output/playwright/story-journey/followup.png'});
  await page.locator('[data-story-workshop="weapons"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
  if(!(await page.locator('#ws-name').textContent()).includes('冰'))throw Error('未定位实际体验武器');
  await page.locator('#ws-test').click();await page.locator('#ws-trial').waitFor({state:'visible'});
  await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
  const final=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;
    return {wallet:{coins:g.progress.coins,wood:g.progress.wood,weapons:g.progress.weapons,vehicles:g.progress.vehicleHulls},story:g.story,props:(await import('/src/rendering/story-props.js')).storyObjects(g)};});
  if(JSON.stringify(final.wallet)!==JSON.stringify(wallet)||final.story||final.props.length)throw Error('工坊引导变更资产或未清理');
  if(errors.length)throw Error(errors.join(' | '));
  return {passed:true,samples,restored,final,errors};
}
