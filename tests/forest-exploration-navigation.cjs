// 真实点击任务卡与按键驾驶门洞，验证按需导航和车辆通行；夹具只设置当前教学目标。
async page=>{
 await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,{MAINLINE_TASKS}=await import('/src/config/mainline.js');
  g.progress.mainline.completed=MAINLINE_TASKS.slice(0,MAINLINE_TASKS.findIndex(t=>t.id==='own-hover')).map(t=>t.id);g.progress.mainline.phase='doing';g.progress.taskTracking={kind:'mainline'};
  g.progress.vehicleHulls[3]=0;g.progress.living.patrolActive=false;g.enemies=[];g.mainlineTalkDelay=999;g.progress.fireDispatch.next=600;
  Object.assign(g.player,{x:900,y:900});a.refresh();
 });
 await page.waitForTimeout(200);
 if(await page.locator('.mainline-bearing').isVisible())throw Error('攒钱阶段不应自动导航');
 await page.screenshot({path:'output/playwright/forest-exploration/purchase-no-route.png'});
 await page.locator('#mainline-hud').click();
 if(await page.locator('#mainline-dialog').isVisible())throw Error('点击工坊任务不应暂停导航打开详情');
 await page.waitForTimeout(200);
 if(!await page.locator('.mainline-bearing').isVisible())throw Error('点击任务未开启路线');
 const route=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return (await import('/src/core/story-route.js')).storyRouteState(g);});
 if(!route?.reachable)throw Error('购船地点无可行路线');
 await page.screenshot({path:'output/playwright/forest-exploration/purchase-selected-route.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicle=g.vehicles[0];g.summonVehicle();Object.assign(g.player,{x:600,y:1980});a.refresh();});
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(1300);await page.keyboard.up('ArrowDown');
 const outside=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.y);
 if(outside<=2070)throw Error('载具被木门卡住 '+outside);
 await page.screenshot({path:'output/playwright/forest-exploration/vehicle-outside-gate.png'});
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(1300);await page.keyboard.up('ArrowUp');
 const inside=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.y);
 if(inside>=2025)throw Error('载具不能返回聚落 '+inside);
 return {route:route.reachable,outside,inside};
}
