// 实机专项：通过真实入口、暂离和领奖按钮检查道具清理，不重跑战斗流程。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
  if(new URL(page.url()).port!=='4220')throw Error('仅允许隔离端口4220');
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await openWorldStory();await page.getByRole('button',{name:'开始第一章',exact:true}).click();
  await page.locator('#story-speech-skip').click();
  // 选车页不再提供暂离按钮，开始行动后再检查章节清理。
  await page.locator('[data-story-loadout="tide-arc"]').click();await page.locator('[data-story-command="start"]').click();
  await page.locator('#quest').click();
  // 复核入口读取正式绘制列表，截图由实际场景绘制。
  async function inspect(label){const s=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    return (await import('/src/rendering/visual-review.js')).inspectStoryReturn(a.game);
  });samples.push({label,...s});return s;}
  if(!(await inspect('active')).props.length)throw Error('章节道具未出现');
  await page.locator('[data-story-command="leave"]').click();
  if((await inspect('leave')).props.length)throw Error('暂离残留道具');
  // 暂离原规则处于暂停；恢复游戏再使用营地按钮继续。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='playing';a.refresh();});
  await openWorldStory();await page.getByRole('button',{name:'继续本章',exact:true}).click();
  if(!(await inspect('continue')).props.length)throw Error('继续后道具未恢复');
  // 只设置交付检查点，保留正式领取事务、保存与森林恢复。
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    for(const d of document.querySelectorAll('dialog[open]'))d.close();
    Object.assign(g.story,{stageId:'Q80',phase:'prepare',dialogue:null,routeId:'road',readLines:['ending']});
    Object.assign(g.story.flags,{silenced:true,sign:true,supply:true,relay:true});
    Object.assign(g.player,{x:900,y:700});g.state='story';a.refresh();
  });
  await page.locator('[data-story-command="claim"]').click();
  const result=await inspect('complete');if(result.props.length||!result.completed)throw Error('完成清理或记录异常');
  // 手机与桌面昼夜检查同一正式营地，入口可见且不溢出。
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await page.evaluate(async(time)=>{
      const a=(await import('/src/main.js')).application;a.game.state='playing';
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      const {EnvironmentTransition}=await import('/src/world/environment.js');
      a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
      a.refresh();a.renderer.camera.time=null;a.renderer.draw();
    },time);
    await page.locator('[data-story-post="sunleaf-post"]').waitFor({state:'visible'});
    const box=await page.locator('[data-story-post="sunleaf-post"]').boundingBox();
    if(box.x<0||box.x+box.width>width)throw Error('营地入口超出屏幕');
    await page.screenshot({path:`output/playwright/story-prop-cleanup/complete-${width}-${time}.png`});
  }
  // 通关重载没有残留，重玩不沿用上次修复状态。
  await page.reload();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
  if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
  if((await inspect('reload')).props.length)throw Error('重载残留道具');
  await openWorldStory();await page.getByRole('button',{name:'重玩本章',exact:true}).click();
  if(!(await inspect('replay')).props.length)throw Error('重玩道具未生成');
  const repaired=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;
    return (await import('/src/rendering/story-props.js')).storyObjects(a.game).some(o=>o.restored);});
  if(repaired)throw Error('重玩错误继承修复外观');
  if(errors.length)throw Error(errors.join('\n'));
  return {pass:true,samples,errors,screenshots:6};
}
