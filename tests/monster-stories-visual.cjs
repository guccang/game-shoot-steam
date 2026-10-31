// 补充正式NPC同屏与装备来源检查；只设定视觉阶段，不作为故事通关证据。
async(page)=>{
 if(new URL(page.url()).port!=='4230')throw Error('仅允许隔离端口4230');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.evaluate(async()=>{window.neighborApp=(await import('/src/main.js')).application;await neighborApp.ready;});
 if(await page.locator('#resume').isVisible())await page.locator('#resume').click();else if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.setViewportSize({width:1280,height:900});
 await page.locator('#weapons-button').click();await page.locator('[data-ws-item="1"]').click();
 if(!(await page.locator('#ws-purpose').textContent()).includes('故事获取：雾松密林'))throw Error('工坊武器来源缺失');
 await page.locator('[data-ws-mode="vehicle"]').click();await page.locator('[data-ws-item="3"]').click();
 if(!(await page.locator('#ws-purpose').textContent()).includes('故事获取：雾松密林'))throw Error('工坊载具来源缺失');
 await page.screenshot({path:'output/playwright/monster-stories/equipment-source.png'});await page.locator('#ws-close').click();
 for(const id of ['neighbors-lunch','neighbors-night']){
  await page.evaluate(id=>{const a=neighborApp,g=a.game;Object.assign(g.player,{x:650,y:1840});g.state='playing';g.boss=null;g.enemies=[];g.enterStory(id,'monster-neighbors');g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();},id);
  // 公开动作推进到领主交谈前，移动和清场为显式夹具。
  await page.evaluate(async()=>{
   const a=neighborApp,g=a.game,{updateStory}=await import('/src/core/story-manager.js'),{storyDefinition}=await import('/src/core/story-definition.js');
   for(let i=0;i<10000;i++){
    if(g.story.dialogue&&['SERVE','ASK'].includes(g.story.stageId))break;
    if(g.story.dialogue){g.advanceStoryDialogue(true);continue;}
    g.state='playing';const o=g.storyObjective();Object.assign(g.player,storyDefinition(g).world.sites[o.site]);
    for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);
    if(o.action&&!g.story.interacting)g.interactStory();updateStory(g,.1);
   }
   a.renderer.draw();a.refresh();
  });
  await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-pause').click();
  for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{const a=neighborApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();},time);
   await page.waitForTimeout(1800);
   const state=await page.evaluate(async()=>{
    const a=neighborApp,g=a.game,v=a.renderer.view,canvas=a.renderer.canvas.getBoundingClientRect();
    const data=(await import('/src/rendering/visual-review.js')).inspectMonsterStories(g,document);
    return {...data,view:v,player:{x:g.player.x,y:g.player.y},canvas:{width:canvas.width,height:canvas.height},
     bubble:document.querySelector('#story-speech').getBoundingClientRect().toJSON()};
   });
   if(state.overflow||!state.actors.length)throw Error('NPC或布局检查失败');
   const half=id==='neighbors-lunch'?72:88;
   if(state.actors.some(a=>(a.x-half-state.view.x)*state.view.zoom<25||(a.x+half-state.view.x)*state.view.zoom>state.canvas.width-25))throw Error('领主身体被裁切');
   samples.push({id,width,time,...state});await page.screenshot({path:'output/playwright/monster-stories/npc-'+id+'-'+width+'-'+time+'.png'});
  }
  await page.evaluate(()=>{neighborApp.game.leaveStory();neighborApp.game.progress.story.run=null;neighborApp.game.state='playing';neighborApp.refresh();});
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,errors,samples};
}
