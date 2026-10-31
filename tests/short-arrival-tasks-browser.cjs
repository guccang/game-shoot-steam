// 从营门通过正式寻路、移动和电锯结算采木，再用真实建筑按钮维修与购买首枪。
async page=>{
 const result=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;
  const {planQuestRoute}=await import('/src/physics/quest-route.js'),{nearest,worldDistance}=await import('/src/world/coordinates.js');
  const {WORKSHOP}=await import('/src/world/workshop.js');
  // 验收只发移动输入，不传送、不填充材料；到达树边后由正式自动攻击结算。
  function walk(route){
   for(const point of route.points.slice(1)){let n=0;
    while(Math.hypot(g.player.x-point.x,g.player.y-point.y)>6&&n++<800){
     const dx=point.x-g.player.x,dy=point.y-g.player.y,d=Math.hypot(dx,dy);window.shortTick(.05,{x:dx/d,y:dy/d});
    }if(n>=800)return false;
   }return true;
  }
  const rejected=new Set();let attempts=0;
  while(g.progress.arrival.phase==='gather'&&attempts++<80){
   const candidates=g.trees.filter(t=>t.hp>0&&!rejected.has(t.id)&&t.x<1100).sort((x,y)=>worldDistance(x,g.player)-worldDistance(y,g.player));
   const tree=candidates[0];if(!tree)throw Error('营地附近没有可采集树木');
   const point=nearest(tree,g.player),route=planQuestRoute(g.player,{x:point.x-48,y:point.y,mapId:'forest'},g.trees,16000);
   if(!route.reachable||!walk(route)){rejected.add(tree.id);continue;}
   for(let i=0;i<80&&tree.hp>0;i++)window.shortTick(.05);
   if(tree.hp>0)rejected.add(tree.id);
  }
  if(g.progress.arrival.phase!=='repair')throw Error('采木任务未完成：'+g.progress.arrival.wood);
  const route=planQuestRoute(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+35,mapId:'forest'},g.trees,16000);
  if(!route.reachable||!walk(route))throw Error('工坊门前不可达');
  window.taskBeforeWood=g.progress.wood;a.refresh();a.renderer.draw();
  return {attempts,wood:g.progress.wood,phase:g.progress.arrival.phase};
 });
 await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();
 await page.locator('#arrival-workshop-action').click();
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.progress.arrival.phase==='repairing');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;for(let i=0;i<130;i++)window.shortTick(.05);a.refresh();a.renderer.draw();if(a.game.progress.arrival.phase!=='craft'||a.game.progress.wood!==window.taskBeforeWood-80)throw Error('维修扣料异常');});
 if(await page.locator('#arrival-workshop-dialog').isVisible())throw Error('维修后强制弹出购买页');
 await page.screenshot({path:'output/playwright/short-task-buy.png'});
 await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();
 if(!((await page.locator('#arrival-workshop-action').textContent()).includes('购买手枪')))throw Error('购买任务文案错误');
 await page.locator('#arrival-workshop-action').click();
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.progress.arrival.phase==='crafting');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;for(let i=0;i<65;i++)window.shortTick(.05);a.refresh();a.renderer.draw();if(a.game.arrivalPending||a.game.progress.weapon!==0||a.game.progress.wood!==window.taskBeforeWood-288)throw Error('首枪购买结算异常');a.save();});
 await page.locator('#field-menu-toggle').click();
 if(await page.locator('#arrival-letter-menu').count())throw Error('任务完成后仍有来信菜单');
 // 已完成任务后的正式车、枪、敌人与营地同屏检查，不在短剧中放入怪物。
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,{planQuestRoute}=await import('/src/physics/quest-route.js');
  const route=planQuestRoute(g.player,{x:260,y:735,mapId:'forest'},g.trees,16000);
  if(!route.reachable)throw Error('车库门前不可达');
  for(const point of route.points.slice(1)){let n=0;while(Math.hypot(g.player.x-point.x,g.player.y-point.y)>6&&n++<800){const dx=point.x-g.player.x,dy=point.y-g.player.y,d=Math.hypot(dx,dy);window.shortTick(.05,{x:dx/d,y:dy/d});}if(n>=800)throw Error('前往车库被阻挡');}
  if(!g.summonVehicle())throw Error('不能领取赠送的电动车');
  // 驶出原车库再转向营地主路，停车门框仍由正式绘制器遮挡。
  for(const point of [{x:260,y:745},{x:415,y:745}]){let n=0;while(Math.hypot(g.player.x-point.x,g.player.y-point.y)>8&&n++<400){const dx=point.x-g.player.x,dy=point.y-g.player.y,d=Math.hypot(dx,dy);window.shortTick(.05,{x:dx/d,y:dy/d});}if(n>=400)throw Error('电动车出库被阻挡');}
  g.spawnEnemy(.4,125);g.spawnEnemy(2.5,150);a.refresh();
 });
 for(const time of ['day','night']){
  await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;a.environment.time=time;
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.draw();a.refresh();
  },time);await page.screenshot({path:`output/playwright/short-battle-${time}.png`});
 }
 return {...result,repairWood:80,pistolWood:8,letterMenuRemoved:true};
}

