// 正式手机页面验收：站点定位只缩短往返，护盾检测、遭遇和交付均由正式游戏运行。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');
  await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application;a.destroy();
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.coins=p.wood=1e7;for(const id of Object.keys(p.materials))p.materials[id]=10000;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  });
  await page.reload();await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.mainlineTalkDelay=999999;a.environment.livingPreview=false;});
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   },time);
   for(const index of [6,7,2]){
    await page.evaluate(index=>{a.workshop.open('vehicle',index);a.refresh();a.renderer.draw();},index);
    await page.locator('#ws-info').tap();const img=page.locator('.ws-equipment-portrait img');await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());
    const sample=await page.evaluate(async()=>{
     const d=document.querySelector('#ws-equipment-dialog'),body=d.querySelector('.ui-panel__body'),r=d.querySelector('img').getBoundingClientRect(),button=document.querySelector('#ws-equipment-done').getBoundingClientRect();
     return {...(await import('/src/rendering/visual-review.js')).inspectEquipmentStoryExpansion(a.renderer,document),bodyOverflow:body.scrollWidth>body.clientWidth+1,square:Math.abs(r.width-r.height)<1,buttonVisible:button.top>=0&&button.bottom<=innerHeight+1};
    });
    if(!sample.image.loaded||!sample.square||sample.bodyOverflow||!sample.buttonVisible||sample.time!==time)throw Error(JSON.stringify(sample));
    await page.screenshot({path:`output/playwright/equipment-story-expansion/${index}-${width}-${time}.png`});
    samples.push({width,height,time,index,...sample});await page.locator('#ws-equipment-done').tap();
   }
  }
  // 原有武器/主炮档案不继承上一辆车的图片；长文仍能滚动到末段。
  await page.evaluate(()=>a.workshop.open('weapons',18));await page.locator('#ws-info').tap();
  if(await page.locator('.ws-equipment-portrait').count())throw Error('画像串到武器档案');
  await page.locator('#ws-equipment-story p').last().scrollIntoViewIfNeeded();await page.locator('#ws-equipment-done').tap();
  for(const id of ['jinbei-van','helicopter']){
   const url='**/assets/equipment-stories/'+id+'-portrait.png';await page.route(url,route=>route.abort());
   await page.evaluate(index=>a.workshop.open('vehicle',index),id==='jinbei-van'?7:2);await page.locator('#ws-info').tap();
   await page.locator('.ws-equipment-portrait').scrollIntoViewIfNeeded();await page.locator('.ws-equipment-portrait [role="status"]').waitFor({state:'visible'});
   await page.locator('#ws-equipment-done').tap();await page.unroute(url);await page.locator('#ws-info').tap();
   await page.locator('.ws-equipment-portrait img').scrollIntoViewIfNeeded();await page.locator('.ws-equipment-portrait img').evaluate(el=>el.decode());await page.locator('#ws-equipment-done').tap();
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const posts=await import('/src/core/story-posts.js');Object.assign(a.game.player,posts.storyPostApproach(posts.storyPostForChapter(a.game,'equipment-shield')));
   a.environment.livingPreview=false;a.game.state='playing';a.workshop.open('weapons',18);a.refresh();
  });
  if(!await page.locator('#ws-purchase').isDisabled())throw Error('未交付已可购买');
  await page.locator('#ws-story-condition').tap();await page.locator('[data-selected-story="equipment-shield"] [data-story-command="enter"]').tap();
  await page.locator('#story-speech-skip').tap();await page.locator('[data-story-loadout="equipment-shield-loan"]').tap();await page.locator('[data-story-command="start"]').tap();
  // 每个站点仍需真实点击、等待照料或等待自动车炮完成清场，不改敌人血量。
  async function arrive(){return page.evaluate(async()=>{const g=a.game,def=(await import('/src/core/story-definition.js')).storyDefinition(g),o=g.storyObjective();Object.assign(g.player,{x:def.world.sites[o.site].x,y:def.world.sites[o.site].y+45});a.refresh();return g.story.stageId;});}
  async function reply(){await page.locator('#story-speech-skip').waitFor({state:'visible',timeout:30000});await page.locator('#story-speech-skip').tap();}
  for(const expected of ['VISIT','CHECK']){
   if(await arrive()!==expected)throw Error('检测阶段顺序不符');await page.locator('#story-interact').tap();
   if(expected==='CHECK'){
    await page.waitForTimeout(350);const shield=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectEquipmentStoryExpansion(a.renderer,document));
    if(!(shield.shield<480&&shield.shield>0))throw Error('检测未扣盾');samples.push(shield);await page.screenshot({path:'output/playwright/equipment-story-expansion/shield-check-day.png'});
   }
   await reply();
  }
  if(await arrive()!=='DRIVE')throw Error('没有驾驶护送');await page.waitForFunction(()=>a.game.story?.stageId==='GUARD');
  await page.waitForFunction(()=>a.game.story?.combat?.cleared,{},{timeout:45000});
  await arrive();await page.locator('#story-interact').tap();await reply();
  if(await arrive()!=='RECORD')throw Error('没有交回记录');await page.locator('#story-interact').tap();await reply();
  if(await arrive()!=='END')throw Error('没有返回交付');await reply();await page.locator('[data-story-command="claim"]').tap();
  await page.evaluate(()=>{
   if(!a.game.progress.story.chapters['equipment-shield'].completed||a.game.progress.weapons[18])throw Error('交付不应直接赠盾');
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.game.state='playing';a.workshop.open('weapons',18);a.refresh();
  });
  if(await page.locator('#ws-purchase').isDisabled())throw Error('已交付仍不可购买');await page.locator('#ws-purchase').tap();
  await page.waitForFunction(()=>a.game.progress.weapons[18]>0);await page.reload();await page.locator('#start').tap();
  const saved=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return {owned:a.game.progress.weapons[18],completed:a.game.progress.story.chapters['equipment-shield'].completed,run:a.game.progress.story.run};});
  if(!saved.owned||!saved.completed||saved.run)throw Error('刷新丢失任务或装备');if(errors.length)throw Error(errors.join('\n'));
  return {samples,saved,errors};
 }finally{await context.close();}
}
