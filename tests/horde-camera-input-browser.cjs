// 在独立端口检查真实触摸摇杆，以及怪潮会话切换时重建时钟的镜头连续性。
async page => {
 if(new URL(page.url()).port!=='4278')throw Error('仅用于隔离端口4278');
 await page.reload();await page.setViewportSize({width:390,height:900});await page.locator('#start').click();
 const transition=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game,{startCampDefense,leaveCampDefense}=await import('/src/core/camp/camp-defense.js');
  const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES.find(g=>g.id==='top');
  if(g.campDefense)leaveCampDefense(g);
  g.state='playing';g.boss=null;g.player.x=gate.x;g.player.y=gate.y+50;
  g.time=120;a.renderer.draw();
  if(!startCampDefense(g,'top'))throw Error('无法进入北门');
  g.state='paused';g.player.angle=-Math.PI/2;g.time=200;
  a.renderer.camera.time=null;a.renderer.draw();
  const before={x:a.renderer.camera.x,y:a.renderer.camera.y};
  if(!leaveCampDefense(g))throw Error('无法退出怪潮');
  a.renderer.draw();const after={x:a.renderer.camera.x,y:a.renderer.camera.y};
  if(Math.hypot(before.x-after.x,before.y-after.y)>.001)throw Error('恢复旧森林时钟导致瞬切');
  if(!startCampDefense(g,'top'))throw Error('无法重新进入怪潮');
  a.renderer.draw();const entered={x:a.renderer.camera.x,y:a.renderer.camera.y};
  if(Math.hypot(after.x-entered.x,after.y-entered.y)>.001)throw Error('重建怪潮时钟导致瞬切');
  g.enemies=[];g.trees=[];g.aimLock=null;g.campDefense.timer=99999;g.campDefense.elapsed=-99999;
  g.attackTimer=99999;g.player.aimHold=0;g.state='playing';
  return {before,after,entered};
 });
 const before=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y};});
 const touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:520}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:125,y:520}]});
 await page.waitForTimeout(450);
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 const after=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {x:a.game.player.x,y:a.game.player.y,
  camera:(await import('/src/rendering/visual-review.js')).inspectHordeCamera(a.game,a.renderer)};});
 if(before.x-after.x<5)throw Error('触摸摇杆未产生真实移动');
 return {transition,touch:{before,after}};
}
