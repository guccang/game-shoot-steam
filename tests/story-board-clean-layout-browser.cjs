// 委托目录真实交互回归：隔离存档，检查点击/触屏/键盘、嵌套说明与滚动稳定。
async page=>{
 if(new URL(page.url()).port!=='4228')throw Error('仅允许隔离端口4228');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.clear());await page.reload();
 await page.evaluate(async()=>{window.app=(await import('/src/main.js')).application;await app.ready;});
 await page.locator('#start').click();
 const cdp=await page.context().newCDPSession(page);
 // 手机用真实触摸事件，桌面使用鼠标；不直接调用按钮业务函数。
 async function activate(selector,touch){
  const n=page.locator(selector);await n.scrollIntoViewIfNeeded();
  if(!touch){await n.click();return;}
  const b=await n.boundingBox(),point={x:b.x+b.width/2,y:b.y+b.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 // 使用正式场景与入口，只固定验收用进度和环境。
 async function scene(width,height,time){
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').click();
  await page.setViewportSize({width,height});
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:width<600});
  await page.evaluate(async time=>{
   const g=app.game,p=(await import('/src/config/story-posts.js')).STORY_POSTS.find(p=>p.id==='sunleaf-post');
   g.story=null;g.progress.story.run=null;g.state='playing';g.enemies=[];g.bullets=[];
   Object.assign(g.player,(await import('/src/core/story-posts.js')).storyPostApproach(p));g.player.hp=1e8;
   for(const [i,id] of p.chapters.entries())Object.assign(g.progress.story.chapters[id],{completed:i<2,rewardClaimed:i<2});
   g.summonVehicle();const e=g.spawnEnemy(0,0,{x:g.player.x+130,y:g.player.y+80});Object.assign(e,{hp:1e8,damage:0,speed:0});
   Object.assign(app.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
   const {EnvironmentTransition}=await import('/src/world/environment.js');
   app.renderer.light=new EnvironmentTransition(app.environment,performance.now()-20000);app.refresh();
  },time);
  await page.waitForTimeout(350);
  await page.screenshot({path:`output/playwright/story-board-clean-layout/world-${width}-${time}.png`});
  await page.keyboard.press('e');await page.locator('#story-dialog').waitFor({state:'visible'});
  if(await page.locator('.story-collection').evaluate(n=>n.open))await activate('.story-collection>summary',width<600);
 }
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await scene(width,height,time);
  const sample=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectStoryCatalog(document));
  if(sample.overflow||sample.rows.length!==8||sample.rows.some(r=>!r.icon||r.height<44||r.left!==sample.rows[0].left))throw Error('单行布局错误 '+JSON.stringify(sample));
  await page.screenshot({path:`output/playwright/story-board-clean-layout/catalog-${width}-${time}.png`});
  const row=page.locator('[data-story-chapter]').last();await row.scrollIntoViewIfNeeded();
  const id=await row.getAttribute('data-story-chapter');
  const before=await page.evaluate(()=>({scroll:document.querySelector('#story-dialog').scrollTop,top:document.querySelector('#story-dialog').getBoundingClientRect().top}));
  await activate(`[data-story-chapter="${id}"]`,width<600);
  const after=await page.evaluate(()=>({scroll:document.querySelector('#story-dialog').scrollTop,top:document.querySelector('#story-dialog').getBoundingClientRect().top,selected:document.querySelector('[data-selected-story]').dataset.selectedStory}));
  if(Math.abs(before.scroll-after.scroll)>1||before.top!==after.top||after.selected!==id)throw Error('选择跳动 '+JSON.stringify({before,after,id}));
  // 在原位置连续切换另一个委托，空格选择不得丢失焦点。
  const previous=page.locator('[data-story-chapter]').nth(6);await previous.focus();
  const keyboardBefore=await page.locator('#story-dialog').evaluate(n=>n.scrollTop);
  await page.keyboard.press('Space');
  if(await page.locator('#story-dialog').evaluate(n=>n.scrollTop)!==keyboardBefore||!await previous.evaluate(n=>document.activeElement===n))throw Error('键盘跳动或丢焦点');
  await page.locator('[data-story-help="chapter"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/playwright/story-board-clean-layout/selection-${width}-${time}.png`});
  const helpScroll=await page.locator('#story-dialog').evaluate(n=>n.scrollTop);
  await activate('[data-story-help="chapter"]',width<600);
  await page.locator('#story-help-dialog').waitFor({state:'visible'});
  const help=await page.locator('#story-help-content').textContent();
  if(!help.includes('免费借用')||!help.includes('暂离保存阶段')||!help.includes('重玩不会重复'))throw Error('二级说明遗漏');
  await page.screenshot({path:`output/playwright/story-board-clean-layout/help-${width}-${time}.png`});
  await page.keyboard.press('Escape');
  if(await page.locator('#story-dialog').evaluate(n=>n.scrollTop)!==helpScroll||await page.evaluate(()=>app.game.state)!=='paused')throw Error('说明关闭恢复错误');
  if(!await page.locator('[data-story-help="chapter"]').evaluate(n=>document.activeElement===n))throw Error('说明焦点未返回');
  const visible=await page.locator('#story-content').innerText();
  if(/免费借用|首通奖励已领取|重玩无额外奖励|按阶段保存|返回主菜单/.test(visible))throw Error('主页面仍有说明段落');
  // 展开赠礼后选故事，详情不能折叠；礼物问号关闭不改变主面板。
  await activate('.story-collection>summary',width<600);
  await activate('[data-story-help="collection"]',width<600);
  if(!await page.locator('#story-help-content').innerText().then(t=>t.includes('每块委托板仅领一次')))throw Error('赠礼说明缺失');
  await activate('#story-help-close',width<600);
  await activate('[data-story-chapter="sunleaf-01"]',width<600);
  if(!await page.locator('.story-collection').evaluate(n=>n.open))throw Error('赠礼展开状态丢失');
  samples.push({viewportWidth:width,time,...sample,before,after,helpScroll});
 }
 await page.locator('#story-close').click();await page.waitForTimeout(100);
 if(await page.evaluate(()=>app.game.state)!=='playing')throw Error('退出后未恢复');
 if(errors.length)throw Error(errors.join('\n'));
 return {pass:true,designCriterion:'story-board-clean-layout',samples,errors};
}
