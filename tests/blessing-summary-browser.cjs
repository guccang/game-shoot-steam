// 隔离端口验证选择卡的累计次数、当前加成、上限提示、实际点击与刷新保存。
async page => {
  if(new URL(page.url()).port!=='4199')throw Error('仅允许隔离端口4199');
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    if(g.realm)g.leaveRealm();g.state='playing';g.player.hp=g.maxHp();
    g.enterRealm('rogue');for(const kind of ['weapon','vehicle','turret'])g.rollRealmEquipment(kind);g.readyRealm();a.refresh();
  });
  const initial=await page.locator('[data-realm-blessing]').first().innerText();
  if(!initial.includes('累计选择 0 次')||!initial.includes('当前加成'))throw Error('首次选择没有零次统计');
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game,r=g.realm;
    r.stage=10;r.cleared=10;r.buffs={power:3,haste:4,armor:5};r.blessingCounts={power:3,haste:4,armor:5};
    r.offers=['power','haste','armor'];a.refresh();
  });
  for(const width of [320,390,1280]) {
    await page.setViewportSize({width,height:844});
    for(const [key,text]of [['power','+60%'],['haste','−48%'],['armor','−60%']]){
      const card=page.locator(`[data-realm-blessing="${key}"]`);
      if(!(await card.innerText()).includes(text))throw Error('当前加成错误 '+key);
      if(!await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1))throw Error('卡片横向溢出');
    }
    if(!(await page.locator('[data-realm-blessing="armor"]').innerText()).includes('已达上限'))throw Error('缺少上限说明');
    await page.locator('[data-realm-blessing="power"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/playwright/blessing-summary/choices-${width}.png`});
  }
  await page.locator('[data-realm-blessing="power"]').click();
  await page.reload();
  const saved=await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    return {count:g.realm.blessingCounts.power,stacks:g.realm.buffs.power,stage:g.realm.stage};
  });
  if(saved.count!==4||saved.stacks!==4||saved.stage!==11)throw Error('选择后次数或刷新恢复失败');
  // 昼夜同屏使用正式绘制，检查载具、角色、敌人与统计界面的统一表现。
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;g.pause();g.realm.warning=999;
    if(!g.vehicle.active)g.summonVehicle();
    const enemy=g.spawnEnemy(0,0,{x:g.player.x-70,y:g.player.y-30});
    Object.assign(enemy,{hp:10000,maxHp:10000,arena:g.realm.arena,realm:true,speed:0});
    a.refresh();
  });
  for(const time of ['day','night']){
    await page.evaluate(async time=>{
      const a=(await import('/src/main.js')).application;
      const {EnvironmentTransition}=await import('/src/world/environment.js');
      const {SceneTone}=await import('/src/rendering/scene-tone.js');
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.draw();
    },time);
    await page.screenshot({path:`output/playwright/blessing-summary/combat-${time}.png`});
  }
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;g.leaveRealm();g.enterRealm('guardian');
    const r=g.realm;r.phase='choice';r.cleared=r.stage;r.offers=['mend','heal','power'];r.blessingCounts={mend:2,heal:1};
    a.refresh();
  });
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
  await page.locator('#realm-button').click();
  const instant=await page.locator('[data-realm-blessing="mend"]').innerText();
  if(!instant.includes('累计选择 2 次')||!instant.includes('无持续加成'))throw Error('即时祝福累计说明缺失');
  await page.locator('[data-realm-blessing="mend"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/playwright/blessing-summary/instant-390.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,saved,errors,designCriterion:['blessing-count-and-current','realm-day-night']};
}
