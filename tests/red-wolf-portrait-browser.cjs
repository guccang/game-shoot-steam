// 红狼画像在正式工坊内验证手机昼夜、完整显示、失败提示及其他装备隔离。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#start').click();await page.locator('#game-frame[data-page="game"]').waitFor({timeout:60000});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;window.artApp=a;
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
  a.game.progress=p;a.game.reset();a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999999;a.game.state='playing';a.environment.livingPreview=false;a.refresh();
 });
 for(const [width,height,phase] of [[390,844,'day'],[320,568,'night'],[844,390,'day'],[1280,900,'night']]){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   const a=artApp;Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.workshop.open('vehicle',6);a.renderer.draw();
  },phase);
  await page.locator('#ws-info').click();
  const img=page.locator('.ws-equipment-portrait img');await img.scrollIntoViewIfNeeded();
  await img.evaluate(el=>el.decode());
  const check=await page.evaluate(()=>{
   const img=document.querySelector('.ws-equipment-portrait img'),r=img.getBoundingClientRect(),d=document.querySelector('#ws-equipment-dialog'),body=d.querySelector('.ui-panel__body'),b=document.querySelector('#ws-equipment-done').getBoundingClientRect();
   return {loaded:img.naturalWidth,width:r.width,height:r.height,overflow:body.scrollWidth>body.clientWidth+1,buttonVisible:b.top>=0&&b.bottom<=innerHeight+1,storyChildren:document.querySelector('#ws-equipment-story').children.length};
  });
  if(check.loaded!==1254||Math.abs(check.width-check.height)>1||check.overflow||!check.buttonVisible||check.storyChildren!==6)throw Error(JSON.stringify(check));
  await page.screenshot({path:`output/playwright/red-wolf-portrait/${width}-${phase}.png`});samples.push({viewportWidth:width,viewportHeight:height,phase,...check});
  await page.locator('#ws-equipment-done').click();
  if(!await page.locator('#workshop-dialog').isVisible())throw Error('未返回工坊');
 }
 // 切换为其他车体，确保可选画像不会串到下一份档案。
 await page.evaluate(()=>artApp.workshop.open('vehicle',0));await page.locator('#ws-info').click();
 if(await page.locator('.ws-equipment-portrait').count())throw Error('画像串档');await page.locator('#ws-equipment-done').click();
 // 模拟断网时的真实图片请求失败，错误提示仍可关闭并重试。
 await page.route('**/assets/equipment-stories/red-wolf-portrait.png',route=>route.abort());
 await page.evaluate(()=>artApp.workshop.open('vehicle',6));await page.locator('#ws-info').click();
 await page.locator('.ws-equipment-portrait [role="status"]').waitFor({state:'visible'});
 if(!await page.locator('.ws-equipment-portrait img').isHidden())throw Error('失败图片没有隐藏');
 await page.locator('#ws-equipment-done').click();await page.unroute('**/assets/equipment-stories/red-wolf-portrait.png');
 await page.locator('#ws-info').click();await page.locator('.ws-equipment-portrait img').scrollIntoViewIfNeeded();await page.locator('.ws-equipment-portrait img').evaluate(el=>el.decode());
 if(errors.length)throw Error(errors.join('\n'));return {samples,errors,checks:['画像完整显示','四种视口昼夜','返回工坊','其他装备无画像','资源失败提示与重试']};
}
