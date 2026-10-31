// 最终道路复核与小屏建筑页：真实触屏点击建筑主体，关闭不扣材料。
async page=>{
 await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineTalkDelay=999;g.mainlineSpeech=null;g.vehicle.active=false;g.progress.fireDispatch.next=600;Object.assign(g.player,{x:690,y:970});a.environment.season='spring';a.environment.weather='sun';g.progress.living.calendar={day:1,elapsed:400000};a.refresh();});
 await page.waitForTimeout(21000);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 await page.screenshot({path:'output/playwright/arrival-world-polish/road-junction.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:415,y:1850});a.refresh();});
 await page.waitForTimeout(700);await page.screenshot({path:'output/playwright/arrival-world-polish/road-neighbors-final.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.arrival={version:2,phase:'craft',elapsed:0,wood:24,keys:true,parked:true,x:480,y:680};g.progress.wood=8;g.vehicle.active=false;Object.assign(g.player,{x:480,y:680});(await import('/src/core/ranger-arrival.js')).restoreArrival(g);a.refresh();});
 const cdp=await page.context().newCDPSession(page),samples=[];
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(600);
  await page.screenshot({path:`output/playwright/arrival-world-polish/compact-target-${width}.png`});
  const point=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:(480-v.x)*v.zoom+r.left,y:(610-v.y)*v.zoom+r.top};});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:2,radiusY:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForSelector('#arrival-workshop-dialog[open]');
  await page.screenshot({path:`output/playwright/arrival-world-polish/workshop-${width}.png`});
  samples.push(await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {...(await import('/src/rendering/visual-review.js')).inspectArrivalWorld(a.game,document),buttons:[...document.querySelectorAll('#arrival-workshop-dialog button')].map(n=>n.getBoundingClientRect().height)};}));
  await page.locator('#arrival-workshop-close').click();
  if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.wood)!==8)throw Error('关闭建筑页扣了材料');
 }
 if(samples.some(s=>s.overflow||s.buttons.some(h=>h<44)))throw Error('建筑页触控或布局失败');
 return {touchBuilding:true,closeWithoutCharge:true,samples};
}
