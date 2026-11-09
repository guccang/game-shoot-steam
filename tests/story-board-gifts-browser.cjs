// 委托板赠礼实机专项：隔离存档，正式地图入口、真实点击和存档重载，不代替八篇剧情试玩。
async(page)=>{
 if(new URL(page.url()).port!=='4234')throw Error('仅允许隔离端口4234');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();localStorage.clear();});
 await page.reload();await page.locator('#start').click();
 // 只固定验收用交付记录和昼夜，保留正式地图、人物、载具与界面绘制。
 async function scene(board,width,height,time,complete=false){
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').click();
  await page.setViewportSize({width,height});
  await page.evaluate(async({board,time,complete})=>{
   const a=(await import('/src/main.js')).application,g=a.game;
   const {STORY_POSTS}=await import('/src/config/story-posts.js'),post=STORY_POSTS.find(p=>p.id===board);
   const {storyPostApproach}=await import('/src/core/story/story-posts.js');
   g.progress.story.run=null;g.story=null;g.boss=null;g.enemies=[];g.bullets=[];g.state='playing';
   Object.assign(g.player,storyPostApproach(post));g.player.hp=1e8;
   for(const id of post.chapters)Object.assign(g.progress.story.chapters[id],{completed:complete,rewardClaimed:complete});
   // 模态框外保留真正的角色、敌人和载具，测试对象仍是奖励目录。
   const e=g.spawnEnemy(0,0,{x:g.player.x-150,y:g.player.y+150});
   Object.assign(e,{hp:1e8,maxHp:1e8,damage:0,speed:0});
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
   const {EnvironmentTransition}=await import('/src/world/environment.js');
   a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();
  },{board,time,complete});
  await page.waitForTimeout(700);
  // E 与地图标记共用正式地点入口，也能覆盖手机折叠菜单状态。
  await page.screenshot({path:`output/playwright/story-board-gifts/world-${board}-${width}-${time}.png`});
  await page.keyboard.press('e');await page.locator('#story-dialog').waitFor({state:'visible'});if(!await page.locator('.story-collection').evaluate(n=>n.open))await page.locator('.story-collection>summary').click();
 }
 // 正式 DOM 复核窄屏溢出、领取状态与触屏尺寸。
 async function sample(){return page.evaluate(async()=>{
  const result=(await import('/src/rendering/visual-review.js')).inspectStoryBoardGifts(document);
  const dialog=document.querySelector('#story-dialog');
  return {...result,overflow:result.overflow||dialog.scrollWidth>dialog.clientWidth+1,
   touch:[...dialog.querySelectorAll('[data-story-prize]')].every(n=>n.getBoundingClientRect().height>=44)};
 });}
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night'])for(const board of ['sunleaf-post','monster-neighbors']){
  await scene(board,width,height,time);
  const s=await sample(),title=board==='sunleaf-post'?'晴叶回信驿':'怪物邻里委托板';
  if(s.title!==title||s.overflow||!s.touch||s.buttons.some(b=>!b.disabled))throw Error('目录布局错误 '+JSON.stringify(s));
  samples.push({width,time,board,...s});
  await page.screenshot({path:`output/playwright/story-board-gifts/board-${board}-${width}-${time}.png`});
  await page.locator('[data-story-prize]').last().scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/playwright/story-board-gifts/prizes-${board}-${width}-${time}.png`});
 }
 // 营地旧档八篇交付后，点击资源选项：保存失败不能消耗机会，重试成功且重载不重发。
 await scene('sunleaf-post',390,844,'day',true);
 const ready=await sample();if(ready.buttons.some(b=>b.disabled))throw Error('已交付不可领取');
 const before=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;
  window.__giftPersist=g.storyPersist;g.storyPersist=()=>false;
  return {coins:g.progress.coins,wood:g.progress.wood,materials:{...g.progress.materials}};
 });
 await page.locator('[data-story-prize="patrol-supplies"]').click();
 if(!await page.locator('.story-error').textContent().then(s=>s.includes('保存失败')))throw Error('未显示保存失败');
 const failed=await sample();if(failed.buttons.some(b=>b.disabled))throw Error('保存失败消耗领取机会');
 await page.evaluate(async()=>{(await import('/src/main.js')).application.game.storyPersist=window.__giftPersist;});
 await page.locator('[data-story-prize="patrol-supplies"]').click();
 const claimed=await sample();if(claimed.buttons.some(b=>!b.disabled)||!claimed.text.includes('✓ 已领取'))throw Error('领取状态未刷新');
 const after=await page.evaluate(async()=>{
  const p=(await import('/src/main.js')).application.game.progress;
  return {coins:p.coins,wood:p.wood,materials:{...p.materials},chosen:p.story.boardRewards['sunleaf-post']};
 });
 if(after.coins-before.coins!==1200||after.wood-before.wood!==400||after.materials.parts-before.materials.parts!==8||after.materials.crystal!==before.materials.crystal||after.materials.core!==before.materials.core)throw Error('资源入账错误 '+JSON.stringify({before,after}));
 await page.screenshot({path:'output/playwright/story-board-gifts/claimed-resources.png'});
 await page.reload();await page.evaluate(async()=>await (await import('/src/main.js')).application.ready);
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,p=(await import('/src/config/story-posts.js')).STORY_POSTS[0];
  Object.assign(a.game.player,(await import('/src/core/story/story-posts.js')).storyPostApproach(p));a.refresh();
 });
 await page.keyboard.press('e');await page.locator('#story-dialog').waitFor({state:'visible'});if(!await page.locator('.story-collection').evaluate(n=>n.open))await page.locator('.story-collection>summary').click();
 const reloaded=await sample();if(!reloaded.text.includes('✓ 已领取')||reloaded.buttons.some(b=>!b.disabled))throw Error('重载丢失领取记录');
 // 暂离营地章节时查看另一块板，目录名称和选中故事仍属于当前板。
 await page.locator('#story-close').click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;
  if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('无法建立暂离夹具');
  g.leaveStory();g.state='playing';
  const p=(await import('/src/config/story-posts.js')).STORY_POSTS.find(p=>p.id==='monster-neighbors');
  Object.assign(g.player,(await import('/src/core/story/story-posts.js')).storyPostApproach(p));a.refresh();
 });
 await page.keyboard.press('e');await page.locator('#story-dialog').waitFor({state:'visible'});if(!await page.locator('.story-collection').evaluate(n=>n.open))await page.locator('.story-collection>summary').click();await page.waitForTimeout(300);
 const pending=await sample();if(pending.title!=='怪物邻里委托板'||!pending.text.includes('0 / 3'))throw Error('暂离任务覆盖另一块板');
 if(errors.length)throw Error(errors.join('\n'));
 return {pass:true,designCriterion:'story-board-gifts',layouts:samples.length,samples,before,after,reloaded,pending,errors};
}
