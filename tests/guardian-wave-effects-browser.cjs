// 浏览器正式渲染回归：昼夜清波余辉消散、键盘移动、建造与下一波入口保持可用。
async page => {
  if(new URL(page.url()).port!=='4199')throw Error('仅使用隔离端口4199');
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewportSize({width:760,height:1188});
  for(const time of ['day','night']) {
    await page.evaluate(async time=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      const {EnvironmentTransition}=await import('/src/world/environment.js');
      const {SceneTone}=await import('/src/rendering/scene-tone.js');
      if(g.realm)g.leaveRealm();g.state='playing';g.enterRealm('guardian');
      g.guardianDefense('deploy',0,'weapon',0);g.continueRealm();g.summonVehicle();
      g.realm.warning=999;
      const enemy=g.spawnEnemy(0,0,{x:g.player.x+85,y:g.player.y+70});
      Object.assign(enemy,{realm:true,arena:g.realm.arena,speed:0,hp:99999,maxHp:99999});
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
      a.refresh();a.renderer.draw();
    },time);
    await page.screenshot({path:`output/playwright/guardian-wave-effects/${time}-combat.png`});
    const before=await page.evaluate(async()=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      const {updateRealm}=await import('/src/core/realm-manager.js');
      const {recycleEnemies}=await import('/src/core/enemy-manager.js');
      g.realm.kills=g.realm.spec.total-1;g.realm.spawned=g.realm.spec.total;
      g.hit(g.enemies.find(e=>e.hp>0),999999);
      g.shots.push({x:g.player.x,y:g.player.y-20,ex:g.player.x+90,ey:g.player.y+60,life:1.2,lifetime:1.2});
      g.fx.add('ring',g.player.x+85,g.player.y+70,1.4,{size:70});
      g.burst(g.player.x+85,g.player.y+70,'#ffe9aa');
      g.projectiles.push({kind:'grenade-bomb',life:2,damage:999});
      g.hazards.push({kind:'blast',life:2,damage:999});
      updateRealm(g,0.01);recycleEnemies(g);a.refresh();a.renderer.draw();
      if(g.projectiles.length||g.hazards.length)throw Error('残弹未清理');
      if(!g.numbers.length||!g.shots.length||!g.fx.items.length)throw Error('特效被瞬间删除');
      return {x:g.player.x,y:g.player.y,coins:g.realm.realmCoins,hp:g.player.hp,goddess:g.realm.goddess.hp};
    });
    await page.screenshot({path:`output/playwright/guardian-wave-effects/${time}-clear.png`});
    await page.keyboard.down('d');await page.waitForTimeout(350);await page.keyboard.up('d');
    // 显式等待异步模块读取的布尔结果，不能把 Promise 本身当作消散完成。
    let settled=false;
    for(let i=0;i<50&&!settled;i++){
      settled=await page.evaluate(async()=>{
        const g=(await import('/src/main.js')).application.game;
        return ['numbers','shots','particles','remnants'].every(key=>g[key].length===0)&&g.fx.items.length===0;
      });
      if(!settled)await page.waitForTimeout(100);
    }
    if(!settled)throw Error('特效未在期限内消散');
    const after=await page.evaluate(async()=>{
      const g=(await import('/src/main.js')).application.game;
      return {x:g.player.x,y:g.player.y,coins:g.realm.realmCoins,hp:g.player.hp,goddess:g.realm.goddess.hp,phase:g.realm.phase};
    });
    if(after.x===before.x&&after.y===before.y)throw Error('波间无法移动');
    if(after.phase!=='choice'||after.coins!==before.coins||after.hp!==before.hp||after.goddess!==before.goddess)throw Error('波间意外推进战斗或结算');
    await page.evaluate(async()=>(await import('/src/main.js')).application.renderer.draw());
    await page.screenshot({path:`output/playwright/guardian-wave-effects/${time}-settled.png`});
    await page.locator('[data-guardian-open]').click();
    if(!await page.locator('[data-guardian-equipment]').first().isVisible())throw Error('建造目录不可用');
    await page.locator('[data-guardian-close]').click();
    await page.locator('[data-guardian-wave]').click();
    await page.locator('[data-realm-blessing="power"]').click();
    const next=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {stage:g.realm.stage,phase:g.realm.phase};});
    if(next.stage!==2||next.phase!=='combat')throw Error('下一波未正常启动');
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,errors,designCriterion:['guardian-wave-effects','realm-day-night']};
}
