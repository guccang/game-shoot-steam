// 点选升级中断专项：连续录制替换、触摸取消恢复与三属性短屏。
async page=>{
 if(new URL(page.url()).port!=='4308')throw Error('仅允许隔离端口4308');
 for(const c of page.context().browser().contexts())if(c!==page.context())await c.close();
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/workshop-tap',size:{width:320,height:568}}}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4308');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory){await t.screenshot({path:'output/playwright/workshop-tap/failure.png'});throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));}
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/workshop-tap/'+label+'.png'});
 }
 // 连续录制正式独立部件替换及中断触摸恢复，不调用内部施工函数。
 await t.evaluate(()=>a.workshop.open('weapons',0));
 if(!(await t.locator('[data-ws-upgrade="damage"]').getAttribute('aria-label')).includes('点击自动试装'))throw Error('读屏仍提示拖动');
 await t.locator('[data-ws-upgrade="damage"]').tap();await t.waitForTimeout(180);await t.screenshot({path:'output/playwright/workshop-tap/assembly-out.png'});
 await t.waitForTimeout(420);await t.screenshot({path:'output/playwright/workshop-tap/assembly-in.png'});
 await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);
 const cdp=await context.newCDPSession(t),b=await t.locator('#ws-hold').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
 await t.waitForFunction(()=>parseFloat(document.getElementById('ws-hold').style.getPropertyValue('--work-progress'))>10);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 if(await t.locator('#ws-hold').isDisabled()||!(await t.locator('#ws-work-progress').textContent()).includes('暂停'))throw Error('中断触摸不能恢复');
 const before=await t.evaluate(()=>JSON.stringify(a.game.progress));
 await t.locator('#ws-change-part').tap();await t.locator('[data-ws-upgrade="rate"]').tap();await t.locator('#ws-change-part').tap();await t.waitForTimeout(1200);
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before||await t.locator('#ws-construction-tools').isVisible())throw Error('取消动画遗留草稿或扣费');
 const pixels=await t.locator('#ws-construction').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v));if(pixels)throw Error('取消动画残留覆盖层');
 // 三项变化的最短屏再次录入，确认单行分列没有占用空白高度。
 await t.evaluate(()=>a.workshop.open('weapons',9));await t.locator('[data-ws-upgrade="rate"]').tap();await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);await check('three-changes-320',true);
 if(errors.length)throw Error(errors.join('\n'));const video=t.video();await cdp.detach();await context.close();return {samples:samples.length,video:await video.path(),cancel:'触摸中断恢复、动画取消清层、不扣费通过',errors};
}
