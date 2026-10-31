// 实机边界：拖动先排队、取消不扣种子、锯木暂停、任务入口和手机昼夜。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const g=farmApp.game;g.progress.farm.plots=[0,1,2,3,4,5].map(id=>({id,mapId:'forest',x:781+(id%3)*56,y:620+Math.floor(id/3)*52,crop:null,plantedAt:0,readyAt:0}));g.progress.farm.nextId=6;g.progress.farm.seeds[1]=3;Object.assign(g.player,{x:837,y:760,vx:0,vy:0,invincible:9999});farmApp.renderer.camera.time=null;farmApp.farm.open();farmApp.refresh();});
 await page.waitForTimeout(600);await page.locator('[data-farm-cell="0"]').click();await page.locator('[data-farm-seed="1"]').click();
 const point=async id=>page.locator(`[data-farm-cell="${id}"]`).evaluate(b=>{const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const touch=async(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{...p,id:1}]:[]});
 const a=await point(0),b=await point(2);await touch('touchStart',a);await touch('touchMove',b);await touch('touchMove',a);
 const pending=await page.evaluate(()=>({seeds:farmApp.game.progress.farm.seeds[1],crop:farmApp.game.progress.farm.plots[0].crop,queue:farmApp.game.farmWork.queue.length}));
 if(pending.seeds!==3||pending.crop!==null||pending.queue!==3)throw Error('拖动应只安排三次农活 '+JSON.stringify(pending));
 await touch('touchEnd');await page.waitForFunction(()=>farmApp.game.progress.farm.plots.slice(0,3).every(p=>p.crop===1),null,{timeout:20000});await page.waitForTimeout(500);
 const planted=await page.evaluate(()=>farmApp.game.progress.farm.seeds[1]);if(planted!==0)throw Error('队列没有恰好消耗三粒种子');
 await page.locator('#farm-hoe').click();await page.locator('[data-farm-cell="3"]').click();await page.locator('[data-farm-seed="0"]').click();
 await touch('touchStart',await point(3));await touch('touchMove',await point(5));await touch('touchCancel');await page.waitForTimeout(400);
 const cancelled=await page.evaluate(()=>({empty:farmApp.game.progress.farm.plots.slice(3).every(p=>p.crop===null),queue:farmApp.game.farmWork.queue.length,dragging:farmApp.game.farmDragging}));if(!cancelled.empty||cancelled.queue||cancelled.dragging)throw Error('取消手势残留农活 '+JSON.stringify(cancelled));
 // 选择真实地图树木，电锯仍复用正式采集奖励与树桩流程。
 await page.evaluate(async()=>{const g=farmApp.game,{farmApproach}=await import('/src/world/farm-land.js');const tree=g.trees.find(t=>t.hp>0&&t.x>1600&&t.x<2200&&t.y>200&&t.y<900&&farmApproach(g,t));if(!tree)throw Error('缺少可伐木的树');window.sawTree=tree;Object.assign(g.player,farmApproach(g,tree),{vx:0,vy:0});farmApp.renderer.camera.time=null;});
 await page.waitForTimeout(600);/* 内部兼容检查，电锯不再提供种地UI入口。 */await page.evaluate(async()=>{(await import('/src/core/farm.js')).setFarmTool(farmApp.game,'saw');});const tp=await page.evaluate(()=>{const v=farmApp.renderer.view,r=farmApp.renderer.canvas.getBoundingClientRect();return {x:r.x+(sawTree.x-v.x)*v.zoom,y:r.y+(sawTree.y-25-v.y)*v.zoom};});await page.mouse.click(tp.x,tp.y);
 await page.waitForFunction(()=>farmApp.game.farmWork?.job?.action==='saw'&&farmApp.game.farmWork.job.elapsed>.1,null,{timeout:10000});
 await page.evaluate(()=>farmApp.game.pause());const paused=await page.evaluate(()=>farmApp.game.farmWork.job.elapsed);await page.waitForTimeout(350);if(await page.evaluate(()=>farmApp.game.farmWork.job.elapsed)!==paused)throw Error('暂停仍在锯木');
 await page.screenshot({path:'output/playwright/world-farm-delivery/06-saw-paused.png'});await page.evaluate(()=>farmApp.game.pause());await page.waitForFunction(()=>sawTree.hp<=0,null,{timeout:10000});
 // 任务簿入口必须在正常菜单可达，完成后的任务步骤与奖励一致。
 await page.locator('#field-menu-toggle').click();await page.locator('#mainline-book-menu').click();await page.waitForSelector('#mainline-dialog[open]');
 const lesson=await page.locator('#farm-lesson').innerText();if(!lesson.includes('主要金币来源')||!lesson.includes('已完成'))throw Error('任务指引不准确');await page.screenshot({path:'output/playwright/world-farm-delivery/07-lesson.png'});
 await page.locator('#farm-lesson-go').click();await page.waitForFunction(()=>farmApp.game.state==='playing'&&!document.querySelector('#farm-tools').hidden);if(await page.locator('#farm-hoe').getAttribute('aria-pressed')!=='true')throw Error('任务返回没有默认选中锄头');
 // 正式历法与环境同时调整到昼夜，保留同一建筑和动作形体。
 await page.evaluate(async()=>{const g=farmApp.game,{FARM_DELIVERY}=await import('/src/config/farm.js');Object.assign(g.player,{x:FARM_DELIVERY.x,y:FARM_DELIVERY.y+55,vx:0,vy:0});farmApp.renderer.camera.time=null;window.setFarmLight=async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js'),p=LIVING_PHASES.find(p=>p.id===time),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');g.progress.living.calendar={day:1,elapsed:p.start+p.duration/2};Object.assign(farmApp.environment,{time,weather:'sun',autoWeather:false,autoTime:false,livingPreview:true});farmApp.renderer.light=new EnvironmentTransition(farmApp.environment,0);farmApp.renderer.tone=new SceneTone(farmApp.environment,0);farmApp.refresh();};});
 const reviews=[];for(const [w,h,time] of [[390,844,'day'],[320,568,'night'],[844,390,'day']]){await page.setViewportSize({width:w,height:h});await page.evaluate(time=>setFarmLight(time),time);await page.waitForTimeout(600);await page.screenshot({path:`output/playwright/world-farm-delivery/08-station-${w}-${time}.png`});const review=await page.evaluate(async()=>({... (await import('/src/ui/farm.js')).inspectFarm(farmApp.game,document),buttons:[...document.querySelectorAll('#farm-tools button')].map(b=>({w:b.offsetWidth,h:b.offsetHeight})),time:farmApp.environment.time}));reviews.push(review);if(review.overflow||review.buttons.some(b=>b.w<44||b.h<44))throw Error('手机工具栏尺寸不合格');}
 if(errors.length)throw Error(JSON.stringify(errors));return {pending,planted,cancelled,paused,lesson,reviews,errors};
}
