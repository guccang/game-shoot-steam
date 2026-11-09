// 独立浏览器存档实点红狼接取与借装，检验昼夜任务现场及履带开路，不更改用户存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/game.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=['story','garage','neighbors'];
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999999;
   const posts=await import('/src/core/story/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'equipment-red-wolf')));
   a.living.open();a.refresh();
  });
  await page.locator('[data-living-tab="equipment"]').tap();
  await page.locator('#living-dialog [data-equipment-story="equipment-red-wolf"]').tap();
  await page.locator('[data-selected-story="equipment-red-wolf"] [data-story-command="enter"]').tap();
  await page.locator('#story-speech-skip').tap();
  await page.locator('[data-story-loadout="equipment-red-wolf-loan"]').tap();
  await page.locator('[data-story-command="start"]').tap();
  if(!await page.evaluate(()=>a.game.story?.stageId==='VISIT'&&a.game.vehicle.active))throw Error('接取或借装失败');
  // 只缩短长途距离；现场交谈和驾驶碾树均走正式状态机。
  async function arrive(){await page.evaluate(async()=>{
   const g=a.game,def=(await import('/src/core/story/story-definition.js')).storyDefinition(g),p=def.world.sites[g.storyObjective().site];
   Object.assign(g.player,{x:p.x,y:p.y+35});a.refresh();
  });}
  await arrive();
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;
   },time);
   await page.waitForTimeout(350);await page.screenshot({path:'output/playwright/red-wolf-chapter-route/'+time+'.png'});
  }
  await page.locator('#story-interact').tap();await page.locator('#story-speech-skip').tap();
  await arrive();await page.waitForFunction(()=>a.game.story?.stageId==='TIMBER'&&a.game.story.timberTrees?.length===3);
  // 真实键盘输入驱动车体，只有履带接触树干才能推进开路任务。
  let steps=0;while(steps++<150){
   const d=await page.evaluate(()=>{const g=a.game,t=g.story?.timberTrees?.find(t=>t.hp>0);return t?{x:t.x-g.player.x,y:t.y-g.player.y}:null;});if(!d)break;
   const keys=[];if(Math.abs(d.x)>10)keys.push(d.x>0?'ArrowRight':'ArrowLeft');if(Math.abs(d.y)>10)keys.push(d.y>0?'ArrowDown':'ArrowUp');
   if(!keys.length)throw Error('树干未被碾碎');for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(100);for(const key of keys)await page.keyboard.up(key);
  }
  await page.waitForFunction(()=>a.game.story?.stageId==='CLEAR'&&a.game.story.flags.roadCleared);
  await page.screenshot({path:'output/playwright/red-wolf-chapter-route/timber-cleared.png'});
  const state=await page.evaluate(()=>({chapter:a.game.story.chapterId,stage:a.game.story.stageId,roadCleared:a.game.story.flags.roadCleared,owned:a.game.progress.vehicleHulls[6]}));
  if(errors.length)throw Error(errors.join('\n'));return {state,steps,errors};
 }finally{await context.close();}
}
