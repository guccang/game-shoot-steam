// 通过正式页面按钮验收入职；独立端口不触碰用户存档。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();localStorage.clear();});
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/*.ttf',async route=>{await gate;await route.continue();});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(300);
 const loading=await page.locator('#start').textContent();
 if(!loading?.trim()||!await page.locator('#start').isDisabled())throw Error('首屏仍是空按钮');
 await page.screenshot({path:'output/playwright/arrival-world-polish/loading.png'});release();
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.unroute('**/*.ttf');
 await page.waitForTimeout(1200);await page.locator('#arrival-speech-pause').click();
 const before=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {elapsed:a.game.progress.arrival.elapsed,x:a.game.player.x,y:a.game.player.y};});
 await page.waitForTimeout(500);
 const after=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {elapsed:a.game.progress.arrival.elapsed,x:a.game.player.x,y:a.game.player.y};});
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('暂停讲述仍在开车');
 await page.screenshot({path:'output/playwright/arrival-world-polish/north-bus-speech.png'});
 await page.locator('#arrival-speech-skip').click();await page.locator('#arrival-skip').click();
 if(await page.locator('#arrival-next').count())throw Error('主页面仍有制作按钮');
 for(let i=0;i<8;i++){
  const phase=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;const t=(await import('/src/core/camp/ranger-arrival.js')).arrivalTarget(g);if(t&&g.progress.arrival.phase==='gather')Object.assign(g.player,{x:t.x-45,y:t.y});return g.progress.arrival.phase;});
  if(phase!=='gather')break;await page.waitForTimeout(2500);
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:480,y:680});a.refresh();});
 await page.waitForTimeout(500);await page.screenshot({path:'output/playwright/arrival-world-polish/repair-target.png'});
 await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();
 if(!await page.locator('#arrival-workshop-dialog').isVisible())throw Error('点建筑未打开建筑页');
 await page.screenshot({path:'output/playwright/arrival-world-polish/repair-page.png'});
 await page.locator('#arrival-workshop-action').click();
 await page.waitForTimeout(3700);
 if(!await page.locator('#arrival-workshop-dialog').isVisible())throw Error('修复后没有回到工坊制作页');
 const craft=await page.locator('#arrival-workshop-state').textContent();if(craft!=='制作松果手枪')throw Error(craft);
 await page.screenshot({path:'output/playwright/arrival-world-polish/craft-page.png'});
 await page.locator('#arrival-workshop-action').click();await page.waitForTimeout(3700);
 const result=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {phase:a.game.progress.arrival.phase,wood:a.game.progress.wood,pistol:a.game.progress.weapons[0],errors:[]};});
 if(result.phase!=='complete'||result.pistol!==1)throw Error('工坊制作未完成');
 await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();
 if(!await page.locator('#workshop-dialog').isVisible())throw Error('入职后建筑没有进入正式购买升级页');
 await page.locator('#ws-close').click();
 return {loading,pause:before,phase:result.phase,pistol:result.pistol,wood:result.wood,errors};
}
