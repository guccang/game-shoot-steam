// 从交接完成的真实位置用正式运动与电锯采集；不传送、不修改物资和任务阶段。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');
 const result=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;
  window.rangerTick=Object.getPrototypeOf(g).update.bind(g);g.update=()=>{};g.start();
  const {arrivalTarget}=await import('/src/core/ranger-arrival.js');
  // 沿真实目标方向步行，靠近后保持自动采集，每次仍使用0.05秒规则上限。
  let frames=0;while(g.progress.arrival.phase==='gather'&&frames++<2000){const t=arrivalTarget(g),dx=t.x-g.player.x,dy=t.y-g.player.y,d=Math.hypot(dx,dy);window.rangerTick(.05,d>62?{x:dx/d,y:dy/d}:{x:0,y:0});}
  if(g.progress.arrival.phase!=='repair')throw Error('Gather blocked at '+JSON.stringify({player:g.player,target:arrivalTarget(g),wood:g.progress.arrival.wood}));
  a.refresh();a.renderer.draw();a.save();return {phase:g.progress.arrival.phase,wood:g.progress.wood,frames,player:{x:g.player.x,y:g.player.y},enemies:g.enemies.length};
 });
 await page.screenshot({path:'output/playwright/ranger-chopped.png'});console.log(JSON.stringify({result,errors}));
 if(errors.length)throw Error(errors.join('\n'));
}
