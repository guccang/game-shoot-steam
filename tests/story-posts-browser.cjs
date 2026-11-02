// 世界入口用真实点击、E键和走位验收；昼夜画面单独设置场景，明确不代替战斗测试。
async(page)=>{
 if(new URL(page.url()).port!=='4226')throw Error('仅允许隔离端口4226');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.postApp=(await import('/src/main.js')).application;await window.postApp.ready;});
 await page.locator('[data-story-post="sunleaf-post"]').waitFor({state:'visible'});
 if(await page.locator('#story-interact').isVisible())throw Error('仍显示泛营地底部入口');
 await page.locator('[data-story-post="sunleaf-post"]').click();
 if(!(await page.locator('#story-content').textContent()).includes('晴叶回信驿'))throw Error('未显示当地入口名');
 if(await page.locator('[data-story-chapter]').count()!==8)throw Error('当地目录丢失已有故事');
 await page.locator('[data-story-command="enter"]').click();await page.locator('#story-speech').waitFor({state:'visible'});
 if(await page.locator('[data-story-post="sunleaf-post"]').isVisible())throw Error('剧情内仍残留世界入口');
 await page.locator('#story-speech-skip').click();
 // 选车页不提供暂离，进入行动阶段后从任务面板管理章节。
 await page.locator('[data-story-loadout="tide-arc"]').click();await page.locator('[data-story-command="start"]').click();
 await page.locator('#quest').click();await page.locator('[data-story-command="leave"]').click();
 if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
 await page.waitForTimeout(300);await page.keyboard.press('KeyE');
 if(!(await page.locator('[data-story-command="enter"]').textContent()).includes('继续'))throw Error('暂离后不能从驿牌继续');
 await page.locator('#story-close').click();
 if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
 await page.waitForFunction(()=>window.postApp.game.state==='playing');
 // 真实离开建筑，远处目录只能阅读，无法远程接取。
 await page.keyboard.down('KeyA');await page.waitForTimeout(1600);await page.keyboard.up('KeyA');
 await page.locator('#story-button').click();if(!await page.locator('[data-story-command="enter"]').isDisabled())throw Error('远程接取未被阻止');await page.locator('#story-close').click();
 await page.keyboard.down('KeyD');await page.waitForTimeout(1600);await page.keyboard.up('KeyD');
 await page.locator('#map-button').click();if(!(await page.locator('#region-legend').textContent()).includes('晴叶回信驿'))throw Error('地图缺少世界入口');
 await page.screenshot({path:'output/playwright/world-story-posts/map.png'});await page.locator('#map-done').click();
 // 在入口附近绕行，记录前、后与侧面的正式排序画面。
 await page.evaluate(()=>{const a=window.postApp;Object.assign(a.game.player,{x:970,y:710});a.renderer.camera.time=null;a.renderer.draw();});
 for(const [key,ms,name] of [['KeyS',150,'behind'],['KeyD',500,'side'],['KeyS',700,'front']]){
  await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.screenshot({path:`output/playwright/world-story-posts/walk-${name}.png`});
 }
 // 固定视觉场景只用于同屏采样：原始正式角色、载具、怪物及建筑共用绘制器。
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{const a=window.postApp,g=a.game;Object.assign(g.player,{x:930,y:850});g.state='playing';
   if(!g.vehicle.active)g.summonVehicle();g.enemies=[];g.spawnEnemy(0,0,{x:790,y:900});
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},time);
  await page.waitForTimeout(350);
  const sample=await page.evaluate(async()=>{const a=window.postApp,v=a.renderer.view,c=a.renderer.canvas.getBoundingClientRect(),p=a.game.player,b=document.querySelector('[data-story-post]').getBoundingClientRect(),x=(p.x-v.x)*v.zoom+c.left,y=(p.y-v.y)*v.zoom+c.top;
   return {...(await import('/src/rendering/visual-review.js')).inspectStoryPosts(a.game,document),overlapsPlayer:b.left<x+40*v.zoom&&b.right>x-40*v.zoom&&b.top<y+25*v.zoom&&b.bottom>y-85*v.zoom};});
  if(sample.overflow||sample.overlapsPlayer||!sample.genericEntryHidden||!sample.markers.some(m=>!m.hidden&&!m.disabled))throw Error('窄屏标签、角色遮挡或旧入口不合格');
  samples.push({width,height,time,...sample});await page.screenshot({path:`output/playwright/world-story-posts/${width}-${time}.png`});
 }
 // 手机真实短按与拖动取消均作用在同一个入口按钮。
 const marker=page.locator('[data-story-post="sunleaf-post"]'),box=await marker.boundingBox();
 await page.mouse.move(box.x+10,box.y+20);await page.mouse.down();await page.mouse.move(box.x+40,box.y+20);await page.mouse.up();
 if(await page.locator('#story-dialog').evaluate(n=>n.open))throw Error('拖动误开故事');
 await marker.click();if(!await page.locator('#story-dialog').evaluate(n=>n.open))throw Error('手机短按未打开');
 await page.screenshot({path:'output/playwright/world-story-posts/mobile-catalog.png'});
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,errors,samples};
}
