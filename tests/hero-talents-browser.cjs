// 用隔离存档验收角色天赋、实际升级换人和桌面手机昼夜同屏。
async page=>{
 if(new URL(page.url()).port!=='4288')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源未加载');
  const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
  const p=freshProgress();p.heroes.fill(10);p.heroes[1]=9;p.heroes[2]=20;p.heroes[3]=0;p.weapons[2]=20;p.weapon=2;p.vehicleHulls[2]=20;p.vehicleIndex=2;p.vehicleWeapons[19]=20;p.vehicleLoadouts[2]=19;p.coins=p.wood=100000;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
  a.game.progress=validateProgress(p);a.game.arrivalScene=null;a.game.reset();a.menu.enter();a.game.start();a.game.mainlineTalkDelay=9999;
  Object.assign(a.game.player,{x:1030,y:710});a.game.summonVehicle();
  const e=a.game.spawnEnemy(0,100);Object.assign(e,{x:1130,y:790,hp:100000,maxHp:100000});a.refresh();
 });
 const checks=[];
 for(const width of [1440,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1440?960:844});
  await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.resize();a.renderer.draw();},time);
  if(!await page.locator('#heroes-button').isVisible())await page.locator('#field-menu-toggle').click();
  await page.locator('#heroes-button').click();
  if(await page.evaluate(()=>a.environment.time)!==time)throw Error('实际时段与验收不符');
  const result=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectHeroAttack(document));
  if(result.overflow||result.cards.length!==6)throw Error('卡片缺失或溢出');
  if(!result.cards[0].text.includes('伤害 +109.8%')||!result.cards[0].text.includes('机炮伤害 +90.8%'))throw Error('10级攻击/天赋未显示');
  if(!result.cards[1].text.includes('射速 +9%')||!result.cards[2].text.includes('最大耐久 +30%')||!result.cards[3].text.includes('1级预览'))throw Error('升级/预览边界错误');
  await page.locator('.item-card').filter({has:page.locator('[data-hero-growth="0"]')}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/playwright/hero-talents/panel-${width}-${time}.png`});checks.push({width,time,...result});
  for(const index of [2,3,5]){await page.locator(`[data-hero-growth="${index}"]`).scrollIntoViewIfNeeded();if(await page.locator('#camp-dialog').evaluate(el=>el.scrollWidth>el.clientWidth+1))throw Error('其他角色溢出');}
  await page.locator('#close-camp').click();
  if(width===1440||width===320)await page.screenshot({path:`output/playwright/hero-talents/scene-${width}-${time}.png`});
 }
 if(!await page.locator('#heroes-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#heroes-button').click();
 const before=await page.evaluate(()=>({damage:a.game.damage(),coins:a.game.progress.coins,level:a.game.progress.heroes[0]}));
 await page.locator('#inventory [data-action="upgrade"][data-index="0"]').click();
 const after=await page.evaluate(()=>({damage:a.game.damage(),coins:a.game.progress.coins,level:a.game.progress.heroes[0]}));
 if(after.level!==11||after.damage<=before.damage||after.coins>=before.coins)throw Error('升级未真正生效');
 if(!await page.locator('[data-hero-growth="0"]').innerText().then(t=>t.includes('伤害 +120.2%')))throw Error('升级后卡片未刷新');
 await page.locator('#inventory [data-action="equip"][data-index="1"]').click();
 const equipped=await page.evaluate(()=>({hero:a.game.progress.hero,interval:a.game.weapon().interval}));
 if(equipped.hero!==1||Math.abs(equipped.interval-.075/1.09)>1e-8)throw Error('射速天赋换人后未生效');
 await page.locator('#close-camp').click();
 if(errors.length)throw Error(errors.join('\n'));return {checks,before,after,equipped,errors};
}
