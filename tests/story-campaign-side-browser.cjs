// 两条委托用真实目录、配给/祝福/布防按钮；战斗只用显式击杀夹具缩短等待。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
 if(new URL(page.url()).port!=='4224')throw Error('仅允许隔离端口4224');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;window.campaignApp=a;
  a.game.state='playing';Object.assign(a.game.player,{x:900,y:700});a.refresh();});
 for(const [id,mode,width,height] of [['sunleaf-side-expedition','rogue',320,568],['sunleaf-side-guardian','guardian',1280,900]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>{window.campaignApp.game.state='playing';window.campaignApp.refresh();});
  if(!await page.locator('#story-dialog').evaluate(n=>n.open))await openWorldStory();
  if(!await page.locator('.story-catalog').evaluate(n=>n.open))await page.locator('.story-catalog summary').click();await page.locator(`[data-story-chapter="${id}"]`).click();
  if(await page.locator('[data-story-command="enter"]').isVisible()===false)throw Error('选章后没有显示出发入口');
  await page.screenshot({path:`output/playwright/story-campaign/${mode}-entry.png`});
  await page.locator('[data-story-command="enter"]').click();await page.locator('#story-speech').waitFor({state:'visible'});
  for(const time of ['day','night']){
   await page.evaluate(async(time)=>{const a=window.campaignApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},time);
   await page.screenshot({path:`output/playwright/story-campaign/${mode}-${time}.png`});
  }
  await page.locator('#story-speech-skip').click();await page.locator('[data-story-command="excursion"]').click();
  if(mode==='rogue'){
   for(const kind of ['weapon','vehicle','turret'])await page.locator(`[data-realm-roll="${kind}"]`).click();
   await page.locator('[data-realm-ready]').click();await page.locator('[data-realm-blessing]').first().click();
  }else await page.locator('.guardian-next-wave').click();
  // 正式刷怪和清关逻辑继续执行，只把已经出生的敌人用夹具击杀。
  await page.evaluate(async()=>{const a=window.campaignApp,g=a.game,{updateRealm}=await import('/src/core/realm-manager.js');
   for(let i=0;i<2000&&g.realm.cleared<1;i++){updateRealm(g,.1);for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);}
   if(g.realm.cleared!==1)throw Error('未完成正式清关');a.refresh();});
  if(mode==='rogue')await page.locator('[data-realm-blessing]').first().click();
  else{await page.locator('[data-guardian-slot="0"]').press('Enter');await page.locator('[data-guardian-equipment="weapon:0"]').click();}
  const state=await page.evaluate(()=>({mode:window.campaignApp.game.realm.mode,flag:window.campaignApp.game.progress.story.run.flags.excursion,activeStory:!!window.campaignApp.game.story}));
  if(!state.flag||state.activeStory)throw Error('秘境与故事事务不正确');samples.push(state);
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
  await page.locator('#realm-button').click();
  if(!(await page.locator('#realm-content').textContent()).includes('秘境体验已达成'))throw Error('缺少回营提示');
  await page.screenshot({path:`output/playwright/story-campaign/${mode}-return.png`});
  await page.locator('[data-realm-exit]').click();
  await page.locator('[data-story-command="claim"]').click();
  const final=await page.evaluate(async(id)=>{const a=window.campaignApp;return {record:a.game.progress.story.chapters[id],props:(await import('/src/rendering/story-props.js')).storyObjects(a.game).length};},id);
  if(!final.record.completed||final.props)throw Error('委托未正常交付');samples.push(final);
 }
 await page.reload();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
 const records=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectStoryCampaign(a.game,document);});
 if(records.chapter||records.props.length)throw Error('刷新后仍有故事残留');
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,samples,records,errors};
}
