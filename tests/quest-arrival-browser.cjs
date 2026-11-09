// 在隔离端口验收十五个邻里节点的到点弹窗、关闭抑制及战后交接；使用正式页面和事务。
async page=>{
  if(new URL(page.url()).port!=='4267')throw Error('请在隔离端口4267运行任务验收');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.destroy();
    const p=(await import('/src/progression/progress.js')).freshProgress();
    p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
    localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await page.reload();await page.locator('#start').click();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  const nodes=await page.evaluate(async()=> (await import('/src/config/living-world.js')).LIVING_REQUESTS.flatMap(q=>q.steps.map((step,stage)=>({id:q.id,stage,battle:!!step.battle}))));
  for(const node of nodes){
    await page.evaluate(async node=>{
      const g=a.game,{LIVING_REQUESTS}=await import('/src/config/living-world.js');
      const {livingRequestTarget}=await import('/src/core/camp/living-world.js');
      g.state='playing';g.livingBattle=null;g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999;
      g.progress.living.patrolActive=false;g.livingPreview=false;a.environment.livingPreview=false;
      for(const q of Object.values(g.progress.living.requests)){q.stage=-1;q.completed=false;q.battleKills=0;}
      const record=g.progress.living.requests[node.id];record.stage=node.stage;
      g.progress.taskTracking={kind:'living',id:node.id};
      const target=livingRequestTarget(g,LIVING_REQUESTS.find(q=>q.id===node.id));
      // 显式夹具先在范围外，再到真实目标，避免沿用上一节点的到达状态。
      Object.assign(g.player,{x:target.x+200,y:target.y});a.living.renderFrame();
      Object.assign(g.player,{x:target.x+30,y:target.y});a.refresh();a.living.renderFrame();
    },node);
    await page.locator('#living-dialog').waitFor({state:'visible'});
    if(!await page.locator(`[data-living-do="${node.id}"]`).isVisible())throw Error('到达后未显示当前步骤：'+JSON.stringify(node));
    if(await page.evaluate(node=>a.game.progress.living.requests[node.id].stage!==node.stage,node))throw Error('自动打开不应代交任务');
    await page.locator('#living-close').click();
    await page.waitForTimeout(150);
    if(await page.locator('#living-dialog').isVisible())throw Error('关闭后原地反复弹出');
    // 同一节点离开后再次靠近，允许重新打开。
    await page.evaluate(async node=>{
      const spec=(await import('/src/config/living-world.js')).LIVING_REQUESTS.find(q=>q.id===node.id);
      const target=(await import('/src/core/camp/living-world.js')).livingRequestTarget(a.game,spec);
      Object.assign(a.game.player,{x:target.x+200,y:target.y});a.living.renderFrame();
      Object.assign(a.game.player,{x:target.x+30,y:target.y});a.living.renderFrame();
    },node);
    await page.locator('#living-dialog').waitFor({state:'visible'});
    if(node.battle){
      await page.locator(`[data-living-do="${node.id}"]`).click();
      if(await page.locator('#living-dialog').isVisible())throw Error('开战后弹窗没有关闭');
      const fought=await page.evaluate(async()=>{
        const g=a.game,count=g.enemies.filter(e=>e.livingRequest==='neighbors-night').length;
        a.living.renderFrame();if(document.getElementById('living-dialog').open)throw Error('战斗中自动弹窗');
        for(const e of [...g.enemies].filter(e=>e.livingRequest==='neighbors-night'))g.hit(e,1e6);
        (await import('/src/core/camp/living-world.js')).updateLivingWorld(g,0);a.living.renderFrame();return count;
      });
      if(!fought)throw Error('护路没有生成敌人');
      await page.locator('#living-dialog').waitFor({state:'visible'});
      await page.locator(`[data-living-do="${node.id}"]`).click();
      if(await page.evaluate(()=>a.game.progress.living.requests['neighbors-night'].stage)!==node.stage+1)throw Error('战后未能继续交接');
    }
    await page.locator('#living-close').click();
  }
  // 追踪主线时，即使附近有已接的邻里节点也不能抢占页面。
  await page.evaluate(()=>{a.game.progress.taskTracking={kind:'mainline'};a.living.renderFrame();});
  if(await page.locator('#living-dialog').isVisible())throw Error('未追踪请求抢占页面');
  if(errors.length)throw Error(errors.join('\n'));
  return {nodes:nodes.length,closeSuppression:true,reentry:true,battleHandoff:true,errors};
}
