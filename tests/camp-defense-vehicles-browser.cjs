// 通过正式存档、刷新页面和开始按钮验证兽潮乘坐状态，不替换载具绘制。
async original=>{
 const results=[],errors=[];
 for(const [index,width,height] of [[0,390,844],[2,320,568]]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   const before=await page.evaluate(async index=>{
    const a=window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);p.vehicleIndex=index;
    const g=a.game;g.progress=(await import('/src/progression/progress.js')).validateProgress(p);g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=9999;Object.assign(g.player,(await import('/src/config/camp-defense.js')).CAMP_GATES.find(g=>g.id==='left'));if(!g.summonVehicle())throw Error('召唤失败');
    if(!(await import('/src/core/camp-defense.js')).startCampDefense(g,'left'))throw Error('进入兽潮失败 '+JSON.stringify({state:g.state,story:g.story,realm:g.realm,arrival:g.arrivalCinematic,boss:g.boss,fire:g.fireActive,living:g.livingBattle,patrol:g.progress.living.patrolActive,map:g.mapId,player:{x:g.player.x,y:g.player.y}}));g.vehicle.hp-=31;g.campDefense.wave=3;g.campDefense.cleared=2;g.state='paused';if(!a.save())throw Error('保存失败');return {index:g.vehicle.index,hp:g.vehicle.hp};
   },index);
   await page.reload();await page.locator('#start').tap();
   const restored=await page.evaluate(async()=>{const a=window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;return {index:g.vehicle.index,active:g.vehicle.active,hp:g.vehicle.hp,flying:g.player.flying,wave:g.campDefense?.wave};});
   if(!restored.active||restored.index!==index||restored.hp!==before.hp||restored.wave!==3||restored.flying!==(index===2))throw Error(JSON.stringify({before,restored}));
   const resume=page.getByRole('button',{name:'继续游戏',exact:true});
   await page.waitForTimeout(100);if(await resume.isVisible())await resume.tap();
   await page.screenshot({path:`output/playwright/horde-vehicle-reentry/${index}-restored.png`});
   await page.evaluate(()=>{if(!a.game.dismountVehicle())throw Error('下车失败');if(!a.save())throw Error('保存下车失败');});
   await page.reload();await page.locator('#start').tap();
   const onFoot=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return {active:a.game.vehicle.active,wave:a.game.campDefense?.wave};});
   if(onFoot.active||onFoot.wave!==3)throw Error('主动下车未保留');results.push({width,height,before,restored,onFoot});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
