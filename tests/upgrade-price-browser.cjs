// 真实工坊验证原价、追赶折扣、资源不足与施工扣费；仅使用隔离存档。
async page=>{
 if(new URL(page.url()).port!=='4288')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4288/');await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('资源未就绪');
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
  const p=freshProgress();p.weapons[0]=4;p.weapons[3]=1;p.heroes[0]=4;p.heroes[1]=1;p.vehicleWeapons[0]=4;p.vehicleWeapons[3]=1;p.vehicleWeapons[17]=1;p.vehicleHulls[0]=1;p.vehicleHulls[1]=4;p.vehicleIndex=0;
  p.coins=1000;p.wood=1000;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
  a.game.progress=p;a.game.arrivalScene=null;a.game.reset();a.menu.enter();a.game.start();a.game.mainlineTalkDelay=9999;a.game.progress.living.patrolActive=false;
  Object.assign(a.game.player,{x:1030,y:710});a.game.summonVehicle();
  const e=a.game.spawnEnemy(0,100);Object.assign(e,{x:1130,y:790,hp:100000,maxHp:100000});a.refresh();
 });
 const checks=[];
 for(const width of [1440,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1440?960:844});
  await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.resize();a.renderer.draw();a.refresh();},time);
  await page.evaluate(()=>a.workshop.open('weapons',3));await page.locator('[data-ws-upgrade="damage"]').click();
  const read=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectEconomyFeedback(document));
  if(!read.cost.includes('追赶3折')||!read.resources.includes('原价 35')||!read.resources.includes('折后 11')||!read.resources.includes('原价 14')||!read.resources.includes('折后 5'))throw Error('报价缺失 '+JSON.stringify(read));
  if(read.overflow)throw Error('工坊溢出');
  const clipped=await page.locator('#ws-resources').evaluate(el=>{const footer=el.closest('.ws-footer').getBoundingClientRect();return [...el.querySelectorAll('small')].some(n=>n.getBoundingClientRect().bottom>footer.bottom);});if(clipped)throw Error('报价底部被裁切');
  await page.screenshot({path:`output/playwright/upgrade-price/workshop-${width}-${time}.png`});checks.push({width,time,...read});await page.locator('#ws-close').click();
 }
 // 角色卡片和载具使用相同原价展示，在最窄屏检查按钮内容。
 if(!await page.locator('#heroes-button').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#heroes-button').click();
 const hero=page.locator('#camp-dialog [data-action="upgrade"][data-index="1"]');
 if(!await hero.innerText().then(t=>t.includes('3折')&&t.includes('原价')&&t.includes('折后')))throw Error('角色报价缺失');
 await hero.scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/upgrade-price/hero-320.png'});await page.locator('#close-camp').click();
 if(!await page.locator('#vehicles-button').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#vehicles-button').click();
 await page.locator('[data-ws-upgrade="armor"]').click();
 if(!await page.locator('#ws-cost-title').innerText().then(t=>t.includes('3折'))||!await page.locator('#ws-resources').innerText().then(t=>t.includes('原价 80')&&t.includes('折后 24')))throw Error('车体报价缺失');
 await page.screenshot({path:'output/playwright/upgrade-price/vehicle-320.png'});
 await page.locator('#ws-kits-tab').click();await page.locator('[data-ws-upgrade="damage"]').click();
 if(!await page.locator('#ws-cost-title').innerText().then(t=>t.includes('3折'))||!await page.locator('#ws-resources').innerText().then(t=>t.includes('原价 40')&&t.includes('折后 12')))throw Error('炮塔报价缺失');
 await page.screenshot({path:'output/playwright/upgrade-price/turret-320.png'});await page.locator('#ws-close').click();
 // 不足提示依然按折后价判断；补足后执行一次正式施工。
 await page.evaluate(()=>{a.game.progress.coins=10;a.game.progress.wood=4;a.workshop.open('weapons',3);});await page.locator('[data-ws-upgrade="damage"]').click();
 const short=await page.locator('#ws-resources').innerText();if((short.match(/缺 1/g)||[]).length!==2)throw Error('折后缺口不正确 '+short);
 await page.locator('#ws-close').click();await page.evaluate(()=>{a.game.progress.coins=1000;a.game.progress.wood=1000;a.workshop.open('weapons',3);});await page.locator('[data-ws-upgrade="damage"]').click();
 await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');
 const before=await page.evaluate(()=>({coins:a.game.progress.coins,wood:a.game.progress.wood,level:a.game.progress.weapons[3]}));
 await page.locator('#ws-hold').focus();await page.keyboard.down('Space');await page.waitForTimeout(1900);await page.keyboard.up('Space');
 const after=await page.evaluate(()=>({coins:a.game.progress.coins,wood:a.game.progress.wood,level:a.game.progress.weapons[3]}));
 if(before.coins-after.coins!==11||before.wood-after.wood!==5||after.level!==2)throw Error('真实扣费不匹配 '+JSON.stringify({before,after}));
 await page.locator('#ws-close').click();await page.evaluate(()=>a.workshop.open('weapons',3));await page.locator('[data-ws-upgrade="damage"]').click();
 if(await page.locator('#ws-cost-title').innerText().then(t=>t.includes('追赶'))||await page.locator('#ws-resources').innerText().then(t=>t.includes('原价')))throw Error('退出折扣后仍残留原价');
 await page.locator('#ws-close').click();if(errors.length)throw Error(errors.join('\n'));return {checks,transaction:{before,after},errors};
}
