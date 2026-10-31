// 操作指引专项实机：通过真实点选与长按施工推进升级，不使用提交接口代做。
async(page)=>{
 if(new URL(page.url()).port!=='4253')throw Error('仅限隔离端口4253');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.bringToFront();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');const g=a.game;g.progress=freshProgress();g.progress.arrival={version:2,phase:'complete',keys:true,parked:false};g.reset();g.arrivalScene=null;g.progress.coins=g.progress.wood=100000;g.progress.materials={parts:10000,crystal:10000,core:10000};g.progress.mainline.completed=MAINLINE_IDS.slice(0,2);g.progress.mainline.phase='doing';g.mainlineTalkDelay=999;Object.assign(g.player,MAINLINE_SITES.weapons);a.refresh();});
 await page.locator('#mainline-hud').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.getElementById('operation-guide').dataset.stage==='part');
 await page.screenshot({path:'output/playwright/operation-guide/phone-container-select.png'});
 // 点选部件自动试装，真实按住按钮完成交易。
 async function upgrade(part){await page.locator('[data-ws-upgrade="'+part+'"]').click();await page.waitForFunction(()=>document.getElementById('operation-guide').dataset.stage==='hold'&&!document.getElementById('ws-hold').disabled);const h=await page.locator('#ws-hold').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.waitForFunction(()=>!a.workshop.guideState().draft);await page.mouse.up();}
 const money=await page.evaluate(()=>a.game.progress.coins);await upgrade('damage');await page.waitForFunction(()=>a.game.progress.weapons[0]===2);
 await page.waitForFunction(()=>document.getElementById('operation-guide').dataset.stage==='continue');await page.locator('#ws-change-part').click();await page.waitForFunction(()=>document.getElementById('operation-guide').dataset.stage==='part');await upgrade('damage');await page.waitForFunction(()=>a.game.progress.weapons[0]===3);
 // 玩家确认离开工坊后才进入下一项，升级完成不强制切页。
 await page.waitForTimeout(1300);if(!await page.locator('#workshop-dialog').isVisible())throw Error('升级后仍自动切页');
 await page.locator('#ws-close').click();await page.locator('#mainline-hud').click();
 await page.locator('#camp-dialog').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('[data-action="upgrade"][data-index="0"]').classList.contains('operation-source'));
 await page.screenshot({path:'output/playwright/operation-guide/next-hero.png'});
 await page.locator('[data-action="upgrade"][data-index="0"]').click();if(!await page.evaluate(money=>a.game.progress.heroes[0]===2&&a.game.progress.coins<money,money))throw Error('真实升级未完成');
 if(errors.length)throw Error(errors.join('\n'));return {weapons:3,hero:2,manualPanel:true,errors};
}
