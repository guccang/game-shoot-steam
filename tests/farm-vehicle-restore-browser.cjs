// 独立手机会话验证真实种地入口与退出按钮，避免读写玩家存档；默认4175，占用时允许4176。
async original=>{
 const origin=new URL(original.url()).origin;
 if(!['4175','4176'].includes(new URL(origin).port))throw Error('仅允许本地测试端口');
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin);await page.locator('#start').click();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  // 每例准备同一辆受损且未装满的载具，游戏刷新继续执行真实UI代码。
  async function setup(hull){await page.evaluate(async hull=>{
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.lessonRewarded=true;p.vehicleIndex=hull;p.vehicleHulls[hull]=1;
   (await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,hull);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.arrivalScene=null;g.update=()=>{};g.trees=[];g.enemies=[];g.boss=null;
   Object.assign(g.player,{x:900,y:750});if(!g.summonVehicle())throw Error('准备载具失败');g.vehicle.hp=73;
   // 保留远处已发现的存活怪物，复现旧版驾驶种地误报战斗的现场条件。
   const enemy={id:991,type:'enemy',kind:'slime',hp:100,maxHp:100,radius:12,x:2400,y:750};
   g.enemies=[enemy];g.combatSight=new WeakMap([[enemy,enemy.id]]);
   if(g.vehicle.module)Object.assign(g.vehicle.module.magazine,{ammo:2,remaining:.7});a.refresh();
  },hull);}
  // 菜单可能随上一次点击收起，按真实可见状态打开。
  async function menu(){if(!await page.locator('#farm-menu').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#farm-menu').click();}
  // 返回界面和战场共同核验，不能只看按钮隐藏。
  async function inspect(label,mounted){
   const row=await page.evaluate(()=>({mounted:a.game.vehicle.active,hull:a.game.vehicle.index,hp:a.game.vehicle.hp,ammo:a.game.vehicle.module?.magazine.ammo,reload:a.game.vehicle.module?.magazine.remaining,tool:a.game.farmWork?.tool||null,toolsVisible:!document.getElementById('farm-tools').hidden}));
   if(row.mounted!==mounted||row.hp!==73||(row.hull===0&&(row.ammo!==2||row.reload!==.7))||(mounted&&(row.tool||row.toolsVisible)))throw Error(label+JSON.stringify(row));
   results.push({label,...row});
  }
  // 真正进入射程后仍禁止种地，离开射程即可正常打开，按钮不得残留战斗选中态。
  await setup(0);await page.evaluate(()=>{a.game.enemies[0].x=a.game.player.x+100;a.refresh();});await menu();
  await inspect('近处敌人保留乘车',true);
  if(!await page.locator('#farm-notice').textContent().then(s=>s.includes('战斗中暂不可种地')))throw Error('战斗拦截缺少说明');
  await page.evaluate(()=>{a.game.enemies[0].x=a.game.player.x+1500;a.refresh();});await menu();
  await page.locator('#farm-tools').waitFor({state:'visible'});await inspect('远离敌人正常种地',false);
  if(await page.locator('#farm-combat').getAttribute('aria-pressed')!=='false'||await page.locator('#farm-hoe').getAttribute('aria-pressed')!=='true')throw Error('切换后仍显示战斗选中态');
  await page.screenshot({path:'output/playwright/farm-vehicle-mode-fix/normal-farming.png'});await page.locator('#farm-exit').click();
  for(const hull of [0,5])for(const exit of ['button','menu','escape','combat']){
   await setup(hull);await menu();await page.locator('#farm-tools').waitFor({state:'visible'});await inspect(`${hull}-${exit}-进入`,false);
   if(exit==='combat'){await page.locator('#farm-combat').click();await inspect(`${hull}-临时战斗`,false);await page.locator('#farm-water').click();}
   if(exit==='menu')await menu();else if(exit==='escape')await page.keyboard.press('Escape');else await page.locator('#farm-exit').click();
   await inspect(`${hull}-${exit}-退出`,true);
   if(await page.locator('dialog[open]').count())await page.keyboard.press('Escape');
  }
  // 从农具转到快递时继续步行，关闭快递才返车，不能提前上车挡住领取入口。
  await setup(0);await page.evaluate(async()=>{const p=(await import('/src/config/farm.js')).FARM_DELIVERY;Object.assign(a.game.player,{x:p.x,y:p.y+40});a.refresh();});await menu();
  // 快递入口已迁到场景柜台，使用正式热点，避免等待已移除的旧菜单按钮。
  await page.locator('#farm-delivery-hit').click();
  await page.locator('#farm-mail').waitFor({state:'visible'});await inspect('种地转快递保持步行',false);await page.locator('[data-farm-mail-close]').click();await inspect('关闭快递恢复载具',true);
  await setup(0);await page.evaluate(()=>{a.game.dismountVehicle();a.refresh();});await menu();await page.locator('#farm-exit').click();await inspect('步行进入退出',false);
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
 }finally{await context.close();}
}
