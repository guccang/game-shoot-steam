// 通关后的真实工坊换装、驾驶和刷新验证，仅限隔离端口。
async page=>{
 if(new URL(page.url()).port!=='4197')throw Error('隔离端口错误');
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.update=()=>{};a.game.start();a.refresh();});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 if(!await page.locator('#workshop-dialog').isVisible())await page.getByRole('button',{name:'载具收藏',exact:true}).click();
 await page.locator('[data-ws-item="4"]').click();
 if(!await page.getByRole('heading',{name:'森林消防车',exact:true}).isVisible())throw Error('车库没有消防车');
 await page.screenshot({path:'output/playwright/fire-rescue/workshop.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.vehicleWeapons[5]=1;});
 await page.getByRole('button',{name:'挂载武器',exact:true}).click();
 await page.locator('[data-ws-part="5"]').click();
 await page.getByRole('button',{name:'将选中零件放入装配位',exact:true}).click();
 await page.getByRole('button',{name:'确认装配',exact:true}).click();
 const mounted=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {slot:g.progress.vehicleLoadouts[4],hull:g.progress.vehicleHulls[4]};});
 if(mounted.slot!==5||mounted.hull!==1)throw Error('换装未提交');
 await page.locator('#ws-equip').click();await page.locator('#ws-equip').click();
 const driven=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;const g=a.game;a.save();return {index:g.vehicle.index,active:g.vehicle.active,weapon:g.vehicle.weaponIndex};});
 if(!driven.active||driven.index!==4||driven.weapon!==5)throw Error('正式车体未带着新挂载出发');
 await page.screenshot({path:'output/playwright/fire-rescue/owned-driving.png'});
 await page.reload();
 const saved=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.game.pause();return a.game.progress.vehicleLoadouts[4];});
 if(saved!==5)throw Error('挂载未持久化');if(errors.length)throw Error(errors.join('\n'));
 return {mounted,driven,saved,errors};
}
