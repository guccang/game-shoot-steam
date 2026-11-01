// 手机正式页面验收：真实按钮接取、开战和交付；场景夹具仅缩短赶路与重复击杀。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('请使用本地验收端口4175');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
  p.mainline.completed=MAINLINE_IDS.filter(id=>id!=='last-letter');p.mainline.currentId='last-letter';p.mainline.phase='doing';
  for(let i=1;i<6;i++)Object.assign(p.story.chapters['sunleaf-0'+i],{completed:true,rewardClaimed:true});
  const {createSaveStore}=await import('/src/platform/storage.js');createSaveStore().saveProgress(p);
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.warApp=(await import('/src/main.js')).application;const g=warApp.game;
  const {storyPostForChapter,storyPostApproach}=await import('/src/core/story-posts.js');
  Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-06')));g.state='playing';g.mainlineSpeech=null;warApp.refresh();
 });
 if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
 await page.locator('#story-button').click();
 await page.locator('[data-story-chapter="sunleaf-06"]').click();
 if(!/击败铁棘统领.*切断号令核心/.test(await page.locator('.story-selection-lead').innerText()))throw Error('目录未显示决战目标');
 await page.screenshot({path:'output/playwright/counteroffensive/mission.png'});
 await page.locator('[data-story-command="enter"]').click();await page.locator('#story-speech-skip').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/counteroffensive/intro.png'});
 await page.locator('#story-speech-skip').click();
 checks.push('正式目录与开场显示反攻目标');
 // 将已接取的章节移到决战准备点，开战仍点击正式按钮。
 await page.evaluate(async()=>{const {runStoryActions}=await import('/src/core/story-manager.js');runStoryActions(warApp.game,[{type:'stage',id:'COMMAND',phase:'prepare'}]);warApp.refresh();});
 await page.locator('[data-story-loadout="line-patrol"]').click();
 await page.locator('[data-story-command="start"]').click();
 await page.waitForFunction(()=>warApp.game.boss?.name==='铁棘统领');
 for(const [time,width,height] of [['day',390,844],['night',320,568]]){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const a=warApp,{LIVING_PHASES}=await import('/src/config/living-world.js');
   a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;
   Object.assign(a.environment,{time,autoTime:false,autoWeather:false,weather:'sun'});
   // 截图夹具把双方放到同一视野，只检查现有模型与剧情名称，不作为自然战斗证据。
   Object.assign(a.game.boss,{x:a.game.player.x+70,y:a.game.player.y-115});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   // 保持正式渲染器，截图前冻结此刻战况以便观察昼夜文字。
   window.warUpdate??=a.game.update;a.game.update=()=>{};a.game.state='playing';a.renderer.draw();a.refresh();
  },time);
  await page.waitForFunction(()=>document.querySelector('#boss-name').textContent.includes('铁棘统领'));
  if(await page.locator('dialog[open]').count())throw Error('决战画面被弹窗遮挡');
  await page.screenshot({path:`output/playwright/counteroffensive/commander-${time}.png`});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('手机页面横向溢出');
 }
 checks.push('390与320宽度昼夜决战场景，无横向溢出');
 await page.evaluate(async()=>{
  warApp.game.update=window.warUpdate;const {failStory}=await import('/src/core/story-manager.js');failStory(warApp.game,'决战重试验收');warApp.refresh();
 });
 await page.locator('[data-story-command="retry"]').click();await page.locator('[data-story-command="start"]').click();
 await page.waitForFunction(()=>warApp.game.boss?.hp===2530);
 checks.push('失败页真实重试按钮重开统领战');
 await page.evaluate(async()=>{
  const g=warApp.game,{updateStory}=await import('/src/core/story-manager.js');g.hit(g.boss,1e6);
  for(let i=0;i<1000&&g.story.stageId==='COMMAND';i++){
   for(const e of [...g.enemies])if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);updateStory(g,.1);
  }
  if(g.story.stageId!=='CORE'||g.progress.story.chapters['sunleaf-06'].completed)throw Error('核心前错误结算');
  Object.assign(g.player,{x:2700,y:400});warApp.refresh();
 });
 await page.locator('#story-interact').click();await page.locator('#story-speech-skip').waitFor({state:'visible'});await page.locator('#story-speech-skip').click();
 await page.evaluate(async()=>{
  const g=warApp.game,{STORY_CAMPAIGN}=await import('/src/config/story-campaign.js'),{updateStory}=await import('/src/core/story-manager.js');
  if(!g.story.flags.coreBroken)throw Error('核心未切断');Object.assign(g.player,STORY_CAMPAIGN['sunleaf-06'].world.sites.CAMP);updateStory(g,.1);updateStory(g,.1);warApp.refresh();
 });
 await page.locator('#story-speech-skip').waitFor({state:'visible'});await page.locator('#story-speech-skip').click();
 await page.screenshot({path:'output/playwright/counteroffensive/victory.png'});
 await page.locator('[data-story-command="claim"]').click();
 await page.waitForFunction(()=>warApp.game.progress.story.chapters['sunleaf-06'].completed&&!warApp.game.story);
 checks.push('必须清完援军、切断核心、回营交谈后才能交付胜利');
 if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
}
