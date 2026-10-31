// 表驱动地图专项：沿用前一实机流程的完成存档，重玩并检查地图与窄屏正式绘制。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
  if(new URL(page.url()).port!=='4222')throw Error('仅允许隔离端口4222');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // 新结算保留可选工坊入口，先关闭它再验证重玩地图。
  if(await page.locator('#story-dialog').evaluate(n=>n.open))await page.locator('#story-close').click();
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='playing';a.refresh();});
  await openWorldStory();await page.getByRole('button',{name:'重玩本章',exact:true}).click();
  await page.locator('#story-speech-skip').click();await page.locator('[data-story-loadout="line-patrol"]').click();
  await page.locator('[data-story-command="start"]').click();
  await page.locator('#map-button').click();
  const description=await page.locator('#map-description').textContent();
  if(!description.includes('调查薄荷留下的布条'))throw Error('地图目标未读取配置：'+description);
  const legend=await page.locator('#region-legend').textContent();
  if(!legend.includes('主路')||!legend.includes('近道'))throw Error('地图缺少路线图例');
  await page.screenshot({path:'output/playwright/story-table/map.png'});await page.locator('#close-map').click();
  const samples=[];
  // 窄屏取景夹具只移动玩家，不修改正式镜头、NPC站位、资源或绘制器。
  for(const time of ['day','night']){
    await page.setViewportSize({width:320,height:568});
    samples.push(await page.evaluate(async(time)=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      Object.assign(g.story,{stageId:'Q50',phase:'prepare',dialogue:null});g.startStoryStage();
      Object.assign(g.player,{x:480,y:1555});g.state='story';
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      const {EnvironmentTransition}=await import('/src/world/environment.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
      a.renderer.camera.time=null;a.refresh();a.renderer.draw();
      return {time,...(await import('/src/rendering/visual-review.js')).inspectStoryDefinition(g)};
    },time));
    await page.screenshot({path:`output/playwright/story-table/detail-320-${time}.png`});
  }
  if(samples.some(s=>s.designCriterion!=='story-table-driven'||s.task!=='defense'||!s.props.some(p=>p.kind==='mint')))throw Error('正式验收入口读取失败');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,description,legend,samples,errors};
}
