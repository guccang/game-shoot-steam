// 守护升级完整浏览器流程：真实点选、挂载保存、顶部资源和混编昼夜同屏。
async page=>{
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离验收端口');
  const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;window.upgradeReview=a;
    if(!await(await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('正式猫图集缺失');
    if(g.realm)g.leaveRealm();g.state='playing';g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);g.enterRealm('guardian');g.realm.realmCoins=3000;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());a.renderer.resize();a.renderer.draw();a.refresh();
  });
  // 使用真实屏幕坐标，兼容横屏全景点击区的最近格位仲裁。
  async function pad(slot){const b=await page.locator('[data-guardian-slot="'+slot+'"]').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);}
  await pad(0);
  if(await page.locator('[data-guardian-equipment^="vehicle:"]').count())throw Error('目录仍有载具');
  if(await page.locator('.guardian-build-panel [data-guardian-close]').count()!==1)throw Error('关闭入口不唯一');
  await page.locator('[data-guardian-equipment="weapon:0"]').click();await pad(0);
  if(await page.locator('.guardian-build-panel button').filter({hasText:'×'}).count()!==1)throw Error('出现两个叉');
  const attackBefore=await page.locator('.guardian-stats tbody tr').first().locator('td').first().textContent();
  await page.locator('[data-guardian-stat="damage"]').click();
  const attackAfter=await page.locator('.guardian-stats tbody tr').first().locator('td').first().textContent();
  if(+attackAfter<=+attackBefore)throw Error('攻击显示未更新');
  // 逐项真实点击，预览成为当前值且每条线首次只扣40币。
  const upgrades=[];
  for(const key of ['rate','magazine','reload']){
    const row=page.locator('[data-guardian-row="'+key+'"]');
    const before=await row.locator('td').first().textContent(),next=await row.locator('td').nth(1).textContent();
    const coins=await page.evaluate(()=>window.upgradeReview.game.realm.realmCoins);
    await row.locator('button').click();
    const after=await row.locator('td').first().textContent();
    if(after!==next||after===before)throw Error(key+'升级预览和实际不符');
    if(await page.evaluate(()=>window.upgradeReview.game.realm.realmCoins)!==coins-40)throw Error('独立升级费用错误');
    upgrades.push({key,before,after});
  }
  await page.locator('[data-guardian-close]').click();await pad(1);await page.locator('[data-guardian-equipment="weapon:12"]').click();await pad(1);
  await page.locator('[data-guardian-module="0"]').selectOption('1');
  await page.locator('.guardian-module summary').nth(1).click();await page.locator('[data-guardian-module="1"]').selectOption('6');
  await page.locator('.guardian-module summary').nth(2).click();await page.locator('[data-guardian-module="2"]').selectOption('9');
  await page.locator('.guardian-module').nth(2).locator('[data-guardian-stat="rate"]').click();
  await page.evaluate(()=>{
    const a=window.upgradeReview,g=a.game;
    if(JSON.stringify(g.realm.defenses[1].funnelLoadout)!=='[1,6,9]')throw Error('挂载配置未应用');
    if(JSON.stringify(g.progress.funnelLoadout)!=='[12,12,12]')throw Error('误修改角色挂载');
    a.save();
  });
  await page.reload();
  const saved=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;window.upgradeReview=a;
    if(JSON.stringify(g.realm.defenses[1].funnelLoadout)!=='[1,6,9]')throw Error('刷新丢失挂载');
    if(JSON.stringify(g.realm.defenses[0].upgrades)!=='{"rate":2,"magazine":2,"reload":2}'||g.realm.defenses[1].upgrades.rate!==2)throw Error('刷新丢失属性升级');
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    g.continueRealm();g.realm.warning=0;g.summonVehicle();g.player.invincible=999;
    const {updateRealm}=await import('/src/core/realms/realm-manager.js');
    for(let i=0;i<24;i++){g.realm.spawnTimer=0;updateRealm(g,0);}
    for(const e of g.enemies){e.hp=e.maxHp=100000;e.damage=0;}
    g.realm.spawnTimer=999;g.realm.goddess.hp=432.2;a.refresh();a.renderer.draw();
    return {modules:g.realm.defenses[1].funnelLoadout,colors:[...new Set(g.enemies.map(e=>e.biome))],flying:g.enemies.filter(e=>e.flying).length,ground:g.enemies.filter(e=>!e.flying).length};
  });
  if(saved.colors.length!==4||!saved.flying||!saved.ground)throw Error('混编类型不足');
  if(!await page.locator('[data-guardian-coins]').isVisible()||!await page.locator('[data-guardian-hp]').isVisible())throw Error('主页面状态未显示');
  if(!await page.locator('[data-guardian-hp]').textContent().then(t=>t.includes('433 / 600')))throw Error('女神血量未更新');
  const cdp=await page.context().newCDPSession(page);
  for(const [width,height] of [[320,568],[390,844],[740,413],[1280,900]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    for(const time of ['day','night']){
      await page.evaluate(async time=>{
        const a=window.upgradeReview,r=a.renderer,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(r.environment,{time,weather:'sun',autoTime:false,autoWeather:false});r.light=new EnvironmentTransition(r.environment,0);r.tone=new SceneTone(r.environment,0);
        r.resize();r.draw();a.refresh();await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
      },time);
      await page.screenshot({path:'output/playwright/upgrade-field-'+width+'-'+time+'.png'});
    }
    await pad(0);await page.screenshot({path:'output/playwright/upgrade-stats-'+width+'.png'});
    if(await page.locator('.guardian-stats tbody tr').count()<6)throw Error('枪械能力缺项');
    // 在详情数字列做真实触摸纵向拖动，不依赖鼠标滚轮，也不能触发角色摇杆。
    if(await page.locator('.guardian-build-panel').evaluate(el=>el.scrollHeight>el.clientHeight+5)){
      const box=await page.locator('.guardian-build-panel').boundingBox(),x=box.x+box.width*.65,y=box.y+box.height-85;
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
      for(let i=1;i<=8;i++){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*10,id:1}]});
        await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      if(await page.locator('.guardian-build-panel').evaluate(el=>el.scrollTop)<30)throw Error('详情触摸纵向滚动失效');
      if(!await page.locator('#joystick').evaluate(el=>el.hidden))throw Error('详情滚动误触角色移动');
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
    }
    // 窄竖屏和矮横屏均需滚动到末项，并真实点击换弹升级；验证固定底栏不会挡住属性。
    const reloadRow=page.locator('[data-guardian-row="reload"]'),reloadNext=await reloadRow.locator('td').nth(1).textContent();
    await reloadRow.locator('button').click();
    if(await reloadRow.locator('td').first().textContent()!==reloadNext)throw Error('小屏换弹升级失败');
    await page.screenshot({path:'output/playwright/upgrade-scroll-'+width+'.png'});
    await page.locator('[data-guardian-close]').click();await pad(1);
    await page.screenshot({path:'output/playwright/upgrade-modules-'+width+'.png'});
    views.push(await page.evaluate(()=>{
      const panel=document.querySelector('.guardian-build-panel'),box=panel.getBoundingClientRect();
      if(box.top<0||box.bottom>innerHeight||document.documentElement.scrollWidth>innerWidth)throw Error('面板越界');
      if(panel.querySelectorAll('[data-guardian-close]').length!==1)throw Error('关闭按钮重复');
      // 升级和回收按钮不能被底部驾驶栏或菜单遮住，尤其是矮横屏。
      for(const button of panel.querySelectorAll('.guardian-actions button')){
        const rect=button.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
        if(!button.contains(hit))throw Error('底部操作被其他界面遮挡');
      }
      const hud=document.querySelector('.guardian-live-status').getBoundingClientRect();
      if(hud.right>innerWidth)throw Error('主界面资源条越界');
      return {width:innerWidth,height:innerHeight,panel:{top:box.top,bottom:box.bottom},scroll:panel.scrollHeight>panel.clientHeight};
    }));
    await page.locator('[data-guardian-close]').click();
  }
  if(errors.length)throw Error(errors.join(';'));
  return {attackBefore,attackAfter,upgrades,saved,views,errors,designCriterion:['guardian-stat-upgrades','guardian-upgrade-panel','guardian-mixed-horde','guardian-day-night']};
}
