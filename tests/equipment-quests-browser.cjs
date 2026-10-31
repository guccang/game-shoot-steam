// 隔离存档验证九项购买条件直达本任务；建筑夹具不完成任何故事，服务使用4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checked=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://localhost:4175');
  await page.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=['story','garage'];p.coins=p.wood=100000;
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  });
  await page.reload();await page.locator('#start').tap();
  const quests=await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;a.game.mainlineTalkDelay=999999;
   const {EQUIPMENT_QUESTS}=await import('/src/config/equipment-quests.js'),{WEAPONS}=await import('/src/config/weapons.js'),{COLLECTED_VEHICLES}=await import('/src/config/vehicles.js');
   return EQUIPMENT_QUESTS.map(q=>({...q,index:(q.kind==='weapons'?WEAPONS:COLLECTED_VEHICLES).findIndex(e=>e.id===q.equipment)}));
  });
  for(const q of quests){
   await page.evaluate(async q=>{
    for(const d of document.querySelectorAll('dialog[open]'))d.close();
    const posts=await import('/src/core/story-posts.js');Object.assign(a.game.player,posts.storyPostApproach(posts.storyPostForChapter(a.game,q.chapter)));
    a.game.state='playing';a.workshop.open(q.kind,q.index);a.refresh();
   },q);
   await page.locator('#ws-story-condition').waitFor({state:'visible'});
   if(!await page.locator('#ws-purchase').isDisabled())throw Error('未完成任务不应直接购买 '+q.equipment);
   await page.locator('#ws-story-condition').tap();
   if(await page.locator('[data-equipment-prerequisite]').count())throw Error('仍显示其他故事前置');
   const selected=page.locator('[data-selected-story="'+q.chapter+'"]');await selected.waitFor({state:'visible'});
   if(!await selected.locator('[data-story-command="enter"]').isEnabled())throw Error('现场无法独立接取 '+q.equipment);
   if(!(await page.locator('#story-content').innerText()).includes('本任务可独立接取'))throw Error('缺少独立任务说明');
   checked.push(q.equipment);
  }
  // 昼夜及短屏复核中文说明，再通过真实按钮接取红狼任务。
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    for(const d of document.querySelectorAll('dialog[open]'))d.close();
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    const posts=await import('/src/core/story-posts.js');Object.assign(a.game.player,posts.storyPostApproach(posts.storyPostForChapter(a.game,'equipment-red-wolf')));
    a.game.state='playing';a.workshop.open('vehicle',6);a.refresh();
   },time);
   await page.locator('#ws-story-condition').tap();await page.locator('[data-selected-story="equipment-red-wolf"]').scrollIntoViewIfNeeded();
   const overflow=await page.locator('#story-dialog').evaluate(el=>el.scrollWidth>el.clientWidth+2);if(overflow)throw Error('任务页面横向溢出');
   await page.screenshot({path:'output/playwright/equipment-quests/independent-'+time+'.png'});
  }
  await page.locator('[data-selected-story="equipment-red-wolf"] [data-story-command="enter"]').tap();
  const state=await page.evaluate(()=>({chapter:a.game.story?.chapterId,completed:Object.values(a.game.progress.story.chapters).filter(c=>c.completed).length}));
  if(state.chapter!=='equipment-red-wolf'||state.completed)throw Error('红狼接取依赖了其他完成记录');
  if(errors.length)throw Error(errors.join('\n'));return {checked,state,errors};
 }finally{await context.close();}
}
