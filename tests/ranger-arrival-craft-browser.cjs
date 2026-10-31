// 修复与首枪制造经由真实门前按钮提交，再检查两处工坊及手机昼夜。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;const {WORKSHOP}=await import('/src/world/workshop.js');
  const target={x:WORKSHOP.x,y:WORKSHOP.y+40};let n=0;
  while(Math.hypot(g.player.x-target.x,g.player.y-target.y)>8&&n++<600){const dx=target.x-g.player.x,dy=target.y-g.player.y,d=Math.hypot(dx,dy);window.rangerTick(.05,{x:dx/d,y:dy/d});}
  if(n>=600)throw Error('Workshop approach blocked');a.refresh();a.renderer.draw();window.beforeRepair=g.progress.wood;
 });
 await page.locator('#arrival-next').click();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;for(let i=0;i<62;i++)window.rangerTick(.05);a.refresh();a.renderer.draw();if(a.game.progress.arrival.phase!=='craft'||a.game.progress.wood!==window.beforeRepair-16)throw Error('Repair transaction failed');});
 await page.screenshot({path:'output/playwright/ranger-workshop-repaired.png'});
 await page.locator('#arrival-next').click();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;for(let i=0;i<62;i++)window.rangerTick(.05);a.refresh();a.renderer.draw();if(a.game.progress.arrival.phase!=='complete'||a.game.progress.weapon!==0||a.game.progress.wood!==window.beforeRepair-24)throw Error('First pistol transaction failed');for(let i=0;i<85;i++)window.rangerTick(.05);if(!a.game.enemies.length)throw Error('Waves remain locked');a.save();});
 await page.screenshot({path:'output/playwright/ranger-first-wave.png'});
 // 远处也保留菜单入口，但两类工作台不再互相切换或混列。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.workshop.open('weapons');});
 if(await page.locator('#workshop-title').textContent()!=='武器工坊'||await page.locator('[data-ws-mode]').count())throw Error('Weapons workshop still combined');
 await page.screenshot({path:'output/playwright/ranger-weapons-workshop.png'});await page.locator('#ws-close').click();
 await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('vehicle',5);});
 if(await page.locator('#workshop-title').textContent()!=='载具工坊')throw Error('Vehicle workshop title');
 if(!await page.locator('#ws-kits-tab').isDisabled())throw Error('Scooter exposes mount');
 await page.screenshot({path:'output/playwright/ranger-vehicle-workshop.png'});await page.locator('#ws-close').click();
 // 保存后刷新不再重放入职；仍然保有锯、枪、钥匙与车。
 await page.reload();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;if(a.game.arrivalPending||!a.game.progress.arrival.keys||!a.game.progress.vehicleHulls[5]||!a.game.progress.weapons[14]||!a.game.progress.weapons[0])throw Error('Completed save did not restore');});await page.locator('#start').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.rangerTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};});
 if(errors.length)throw Error(errors.join('\n'));
}
