// 正式页面鼠标、触屏、键盘和昼夜截图；只覆盖场景直接交互影响的入口。
async page=>{
 if(new URL(page.url()).port!=='4259')throw Error('仅使用隔离端口4259');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=['first-map'];p.mainline.phase='doing';p.living.position={x:950,y:900};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 // 固定两位邻居在近处，稍远者应收到自己的点击，不能被最近邻居替代。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineTalkDelay=999;g.mainlineSpeech=null;Object.assign(g.player,{x:950,y:930});const m=await import('/src/core/camp/living-world.js');for(const [id,x] of [['snow',900],['mint',1000]]){const r=m.residentFor(g,id);Object.assign(r,{x,y:900,path:[],goal:null});}a.refresh();});await page.waitForTimeout(100);
 const mintBox=await page.locator('[data-resident="mint"]').boundingBox();await page.mouse.click(mintBox.x+mintBox.width/2,mintBox.y+mintBox.height/2);if(await page.locator('#living-title').textContent()!=='薄荷')throw Error('点薄荷却打开其他人');if(await page.locator('#living-patrol').count())throw Error('人物交谈仍混入清缴列表');checks.push('鼠标点本人、个人对话无全局列表');await page.locator('#living-close').click();
 const box=await page.locator('[data-resident="snow"]').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+55,box.y+box.height/2+10,{steps:5});await page.mouse.up();if(await page.locator('#living-dialog').isVisible())throw Error('拖动人物误开对话');checks.push('人物起步拖动不会误开');
 await page.locator('[data-resident="snow"]').focus();await page.keyboard.press('Enter');if(await page.locator('#living-title').textContent()!=='雪团')throw Error('键盘交互错人');await page.locator('#living-close').click();checks.push('键盘交互');
 // 武器工坊、车库直接点立面，两者必须进各自的正式工作台。
 for(const kind of ['weapons','vehicle']){await page.evaluate(async kind=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:kind==='vehicle'?300:490,y:760});a.game.mainlineSpeech=null;a.refresh();},kind);await page.waitForTimeout(500);await page.locator('[data-workshop-kind="'+kind+'"].scene-hit').click();if(!await page.locator('#workshop-dialog').isVisible())throw Error('工坊本体无法打开');await page.keyboard.press('Escape');checks.push(kind+'本体点击');}
 // 盾牌告示牌用触屏点击，接取流程仍保持现场权限。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:840,y:1000});a.refresh();});await page.waitForTimeout(500);
 const b=await page.locator('#clearing-marker').boundingBox(),cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);if(!await page.locator('#clearing-dialog').isVisible())throw Error('触屏不能点击清缴板');await page.locator('#clearing-close').click();checks.push('触屏清缴板');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:990,y:850});a.refresh();});await page.waitForTimeout(500);await page.locator('[data-story-post="sunleaf-post"]').click();if(!await page.locator('dialog[open]').count())throw Error('回信驿本体不可点击');await page.keyboard.press('Escape');checks.push('故事板本体点击');
 // 正式实机采样，镜头跟随与行走仍由原游戏更新。
 const samples=[];for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});for(const phase of ['day','night']){
 await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application,g=a.game;Object.assign(g.player,{x:460,y:800});g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();},phase);await page.waitForTimeout(21000);
 samples.push(await page.evaluate(async()=>{const r=await import('/src/rendering/visual-review.js');return r.inspectWorldDirectInteraction(document);}));await page.screenshot({path:'output/playwright/world-direct-interaction/'+width+'-'+phase+'.png'});
 }}
 if(samples.some(s=>s.overflow||s.hotspots.some(h=>h.text||!h.label||h.background!=='rgba(0, 0, 0, 0)')))throw Error('残留悬浮名称或热点不可访问');if(errors.length)throw Error(errors.join(';'));return {checks,samples,errors};
}
