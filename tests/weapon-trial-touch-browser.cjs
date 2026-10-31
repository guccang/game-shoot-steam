// 触屏录制、异步取消、失败重试与正式存档隔离，全部经过真实工坊按钮。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/weapon-trial-video',size:{width:390,height:844}}});
 const t=await context.newPage(),errors=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4292');
 await t.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await t.reload();await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.readTrial=(await import('/src/ui/workshop/trial-scene.js')).inspectWeaponTrialScene;});
 await t.waitForFunction(()=>a.menu.page==='game');
 await t.evaluate(()=>a.workshop.open('weapons',17));
 await t.locator('#ws-test').tap();await t.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.elapsed>1);
 const start=await t.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));
 const box=await t.locator('#weapon-trial-canvas').boundingBox(),cdp=await context.newCDPSession(t),x=box.x+box.width*.3,y=box.y+box.height*.78;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+38,y:y-12}]});
 await t.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const moved=await t.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));
 if(moved.player.x<start.player.x+30)throw Error('触屏走位失败');
 await t.screenshot({path:'output/playwright/trial-touch-gravity.png'});
 await t.waitForTimeout(1500);await t.locator('#weapon-trial-time').tap();await t.screenshot({path:'output/playwright/trial-touch-gravity-night.png'});
 await t.locator('#weapon-trial-restart').tap();await t.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.elapsed<.3);
 const reset=await t.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));if(reset.destroyed!==0||Math.abs(reset.player.x-start.player.x)>1)throw Error('重来没有重置');
 await t.locator('#weapon-trial-close').tap();await t.waitForTimeout(60);
 // 切换到脉冲，录下蓄能、释放、后坐恢复；再观察召唤物独立出击。
 await t.locator('[data-ws-item="9"]').tap();await t.locator('#ws-test').tap();await t.waitForTimeout(4200);
 await t.screenshot({path:'output/playwright/trial-touch-pulse.png'});await t.locator('#weapon-trial-close').tap();await t.waitForTimeout(60);
 await t.locator('[data-ws-item="16"]').tap();await t.locator('#ws-test').tap();await t.waitForTimeout(3500);
 await t.screenshot({path:'output/playwright/trial-touch-spider.png'});
 if(/NaN|Infinity/.test(await t.locator('#weapon-trial-score').textContent()))throw Error('数值显示异常');
 await t.locator('#weapon-trial-close').tap();await t.waitForTimeout(60);
 // 仅截断素材Promise验证取消顺序，不改变战斗或正式绘制器。
 await t.evaluate(async()=>{window.sprites=(await import('/src/rendering/cat-animation.js')).catSprites;window.loadBefore=sprites.load;sprites.load=()=>new Promise(resolve=>window.finishLoad=resolve);});
 await t.locator('#ws-test').tap();await t.locator('#weapon-trial-close').tap();await t.waitForTimeout(60);
 await t.evaluate(()=>finishLoad(true));await t.waitForTimeout(80);
 if(await t.evaluate(()=>!!readTrial(document.getElementById('weapon-trial-dialog'))))throw Error('关闭后异步复活');
 await t.evaluate(()=>sprites.load=()=>Promise.resolve(false));await t.locator('#ws-test').tap();
 await t.waitForFunction(()=>document.getElementById('weapon-trial-status').textContent.includes('加载失败'));
 await t.evaluate(()=>sprites.load=loadBefore);await t.locator('#weapon-trial-restart').tap();
 await t.waitForFunction(()=>!!readTrial(document.getElementById('weapon-trial-dialog')));
 await t.locator('#weapon-trial-close').tap();await t.locator('#ws-close').tap();
 await t.waitForFunction(()=>a.game.state==='playing');
 if(errors.length)throw Error(JSON.stringify(errors));
 const video=await t.video().path();await context.close();await page.evaluate(result=>window.weaponTrialTouchResult=result,{moved:Math.round(moved.player.x-start.player.x),video,errors});
}
