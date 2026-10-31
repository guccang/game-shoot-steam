// 真实 UI 验收：载具收藏、上下车、生命来源切换及窄屏布局，仅操作隔离端口。
async(page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const {freshProgress}=await import('/src/game.js');const p=freshProgress();p.hero=1;p.heroes[1]=1;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
 await page.reload();await page.locator('#vehicles-button').click();
 if(await page.locator('#vehicle-collection-count').textContent()!=='已收集 1 辆'||!await page.locator('#vehicle-board').isDisabled())throw Error('准备阶段收藏错误');
 await page.keyboard.press('Escape');await page.locator('#start').click();
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;g.enemies=[];g.spawnTimer=999;g.attackTimer=999;});
 await page.locator('#vehicles-button').click();
 if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.state==='paused'))throw Error('打开收藏没有暂停');
 await page.screenshot({path:'output/playwright/vehicle-collection/collection-390.png'});
 await page.locator('#vehicle-board').click();
 await page.waitForFunction(()=>document.getElementById('game-frame').dataset.state==='playing');
 if(await page.locator('#player-name').textContent()!=='松果战车'||await page.locator('#player-health').textContent()!=='200 / 200')throw Error('上车名称与HP没有切换');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.player.invincible=0;g.hurt(50);a.refresh();if(g.player.hp!==100)throw Error('误扣角色HP');});
 if(await page.locator('#player-health').textContent()!=='150 / 200'||await page.locator('#health-fill').getAttribute('style').then(s=>!s.includes('75%')))throw Error('耐久损失未同步');
 await page.locator('#vehicles-button').click();
 if(!(await page.locator('#vehicle-board').textContent()).includes('下车'))throw Error('缺少下车按钮');
 if(await page.locator('#vehicle-collection-health').textContent()!=='150 / 200')throw Error('收藏耐久错误');
 await page.locator('#vehicle-board').click();
 if(!(await page.locator('#player-name').textContent()).includes('薄荷')||await page.locator('#player-health').textContent()!=='100 / 100')throw Error('下车未恢复猫猫HP');
 await page.locator('#vehicle-button').click();
 if(await page.locator('#player-health').textContent()!=='150 / 200')throw Error('快捷上车修复了载具');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.player.invincible=0;a.game.hurt(9999);a.refresh();});
 if(!(await page.locator('#player-name').textContent()).includes('薄荷')||await page.locator('#player-health').textContent()!=='100 / 100')throw Error('被毁后没有切回角色');
 await page.locator('#vehicles-button').click();
 if(!await page.locator('#vehicle-board').isDisabled()||!(await page.locator('#vehicle-collection-status').textContent()).includes('修复'))throw Error('冷却允许上车');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,c=g.vehicle.cooldown;for(let i=0;i<100;i++)g.update(.05);if(g.vehicle.cooldown!==c)throw Error('收藏中仍推进修复');});
 await page.screenshot({path:'output/playwright/vehicle-collection/repair-390.png'});
 await page.locator('#vehicle-collection-done').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;const {updateVehicle}=await import('/src/combat/vehicle.js');a.game.vehicle.cooldown=.01;updateVehicle(a.game,.02);a.refresh();});
 await page.locator('#vehicles-button').click();await page.locator('#vehicle-board').click();
 if(await page.locator('#player-health').textContent()!=='200 / 200')throw Error('修复召唤不满耐久');
 await page.locator('#pause').click();await page.locator('#vehicles-button').click();await page.keyboard.press('Escape');
 if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.state==='paused'))throw Error('关闭收藏取消手动暂停');
 await page.locator('#resume').click();
 const layouts=[];
 for(const size of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:580,height:928}]){
  await page.setViewportSize(size);
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.renderer.resize();a.refresh();});
  const layout=await page.evaluate(()=>{
   const menu=document.querySelector('.field-menu').getBoundingClientRect(),hud=document.querySelector('.player-hud').getBoundingClientRect(),quest=document.getElementById('quest').getBoundingClientRect();
   if(document.querySelectorAll('.field-menu button').length!==4)throw Error('缺少四个入口');
   if(menu.top<quest.bottom||menu.bottom>hud.top||menu.left<0||menu.right>innerWidth||document.documentElement.scrollWidth>innerWidth)throw Error('入口遮挡HUD或溢出');
   if(document.getElementById('player-name').scrollWidth>document.getElementById('player-name').clientWidth)throw Error('战车名称被截断');
   const bar=document.getElementById('health-fill').parentElement;if(bar.getAttribute('aria-valuemax')!=='200')throw Error('无障碍仍显示角色HP');
   return {width:innerWidth,height:innerHeight,menuTop:menu.top,hudHeight:hud.height};
  });
  layouts.push(layout);await page.screenshot({path:`output/playwright/vehicle-collection/mounted-${size.width}.png`});
  await page.locator('#vehicles-button').click();
  await page.evaluate(()=>{const d=document.getElementById('vehicle-collection-dialog');if(d.scrollWidth>d.clientWidth||d.getBoundingClientRect().width>innerWidth)throw Error('收藏页横向溢出');});
  await page.screenshot({path:`output/playwright/vehicle-collection/collection-${size.width}.png`});
  await page.locator('#close-vehicle-collection').click();
 }
 // 弹窗销毁不遗留监听或暂停状态；浏览器重新进入仍从步战开始。
 await page.locator('#vehicles-button').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();if(document.querySelector('dialog[open]'))throw Error('卸载未关闭收藏页');});
 await page.reload();await page.locator('#start').click();
 if(!(await page.locator('#player-name').textContent()).includes('薄荷'))throw Error('重启未恢复步战');
 if(errors.length)throw Error(errors.join(';'));
 return {collection:true,mountAndDismount:true,hpSource:true,repair:true,pause:true,layouts,errors};
}
