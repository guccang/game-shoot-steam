// 隔离浏览器验收：真实点击、刷新防重抽、声音触发、昼夜实战与正式美术采样。
async (page) => {
  if (new URL(page.url()).port !== '4197') throw Error('仅允许隔离测试端口 4197');
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.destroy();
    const {freshProgress}=await import('/src/progression/progress.js');
    localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));
    localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));
  });
  await page.reload();await page.setViewportSize({width:390,height:844});
  await page.locator('#start').click();
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
  await page.locator('#realm-button').click();await page.locator('[data-enter-realm="rogue"]').click();
  const before=await page.evaluate(async()=>JSON.stringify((await import('/src/main.js')).application.game.progress.weapons));
  if(!await page.locator('[data-realm-roll="vehicle"]').isDisabled())throw Error('载具被提前启用');
  await page.keyboard.press('Escape');if(!await page.locator('#realm-dialog').isVisible())throw Error('Esc 跳过准备');
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    if(!a.audio.enabled)await a.audio.toggle();else await a.audio.unlock();
    window.slotSounds=[];const play=a.audio.play;a.audio.play=kind=>{const played=play(kind);if(kind.startsWith('slot-'))window.slotSounds.push({kind,played});return played;};
  });
  await page.locator('[data-realm-roll="weapon"]').click();
  await page.waitForTimeout(150);await page.screenshot({path:'output/playwright/expedition-roll-1.png'});
  await page.waitForTimeout(200);await page.screenshot({path:'output/playwright/expedition-roll-2.png'});
  await page.locator('[data-realm-roll="vehicle"]').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[data-realm-roll="vehicle"]').disabled);
  const gun=await page.evaluate(async()=>(await import('/src/main.js')).application.game.realm.loadout.weapon);
  const sounds=await page.evaluate(()=>window.slotSounds);
  if(sounds.filter(s=>s.kind==='slot-tick'&&s.played).length<8||!sounds.some(s=>s.kind==='slot-reveal'&&s.played))throw Error('转轮音效未通过实际音效总线播放');
  await page.reload();
  if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.realm.loadout.weapon)!==gun)throw Error('刷新重新抽枪');
  await page.locator('[data-realm-roll="vehicle"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-realm-roll="turret"]').disabled);
  if(!await page.locator('[data-realm-ready]').isDisabled())throw Error('没有载具武器就能开战');
  const pending=await page.evaluate(async()=>(await import('/src/main.js')).application.game.realm.loadout);
  if(pending.turret!==null)throw Error('领取载具时自动附送了炮塔');
  await page.reload();
  const restoredPending=await page.evaluate(async()=>(await import('/src/main.js')).application.game.realm.loadout);
  if(JSON.stringify(pending)!==JSON.stringify(restoredPending))throw Error('第三槽等待阶段刷新丢失已领取装备');
  await page.locator('[data-realm-roll="turret"]').click();
  await page.waitForTimeout(150);await page.screenshot({path:'output/playwright/expedition-turret-roll.png'});

  await page.locator('[data-realm-ready]').click();
  await page.locator('[data-realm-blessing]').first().click();
  // 不点击召唤按钮，首次开战就应驾驶抽中的车体并装好独立抽取的炮塔。
  const autoBoard=await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    return {active:g.vehicle.active,vehicle:g.vehicle.index,turret:g.vehicle.weaponIndex,selected:g.realm.loadout};
  });
  if(!autoBoard.active||autoBoard.vehicle!==autoBoard.selected.vehicle||autoBoard.turret!==autoBoard.selected.turret)throw Error('首次开战未自动驾驶抽中的载具和炮塔');
  // 新秘境车库读取本局装备，未解锁的抽取车体与炮塔仍可查看和驾驶。
  if(!await page.locator('#vehicles-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
  await page.locator('#vehicles-button').click();
  if(!(await page.locator('#vehicle-collection-name').innerText()).includes('Lv.1'))throw Error('车库没有读取远征等级');
  if(!(await page.locator('#vehicle-upgrade').innerText()).includes('自动升级'))throw Error('车库错误提供手动升级');
  await page.locator('#vehicle-tab-turrets').click();
  if((await page.locator('#turret-list').innerText()).includes('NaN'))throw Error('远征炮塔预览缺失属性');
  await page.screenshot({path:'output/playwright/expedition-garage.png'});
  await page.locator('#vehicle-collection-done').click();
  await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');
  // 白天和夜晚均以主场景的正式地形、光照和秘境边界检查。
  await page.setViewportSize({width:1280,height:844});
  for(const time of ['day','night']) {
    await page.evaluate(async time=>{
      const a=(await import('/src/main.js')).application;
      a.environment.time=time;a.environment.autoTime=false;
      const g=a.game;g.player.invincible=0;g.realm.warning=0;g.realm.spawnTimer=0;
      g.updateWaves(.05);a.refresh();a.renderer.draw();
    },time);
    await page.keyboard.down('a');await page.waitForTimeout(300);await page.keyboard.up('a');
    await page.screenshot({path:`output/playwright/expedition-combat-${time}.png`});
  }
  const combat=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {catSprites}=await import('/src/rendering/cat-animation.js');
    if(catSprites.status!=='ready')throw Error('正式猫猫动画图集没有加载');
    return {turret:g.vehicle.weaponIndex,gun:g.loadout.weapon,vehicle:g.vehicle.index,active:g.vehicle.active,enemies:g.enemies.length,driver:g.player.hp,level:g.loadout.vehicleLevel};
  });
  if(!combat.active||!combat.enemies)throw Error('角色、载具、怪物未同屏');
  // 使用正式命中入口完成首关，再由真实祝福按钮推进第二关。
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    for(let n=0;n<2000&&g.realm.phase==='combat';n++){
      g.updateWaves(.05);for(const e of g.enemies)if(e.hp>0)g.hit(e,100000);
      if(g.boss)g.hit(g.boss,1000000);
    }
    if(g.realm.phase!=='choice')throw Error('首关未结束');a.refresh();
  });
  await page.locator('[data-realm-blessing]').first().click();
  await page.reload();
  const restored=await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    return {stage:g.realm.stage,gun:g.loadout.weapon,level:g.loadout.vehicleLevel,state:g.state,active:g.vehicle.active,turret:g.vehicle.weaponIndex,permanent:JSON.stringify(g.progress.weapons)};
  });
  if(restored.stage!==2||restored.level!==2||restored.gun!==gun||restored.state!=='paused'||restored.permanent!==before)throw Error('升级、恢复或永久隔离失败');
  if(!restored.active||restored.turret!==autoBoard.turret)throw Error('刷新丢失自动驾驶或抽取炮塔');
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
    await page.locator('#realm-button').click();await page.locator('[data-realm-exit]').click();
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
  await page.locator('#realm-button').click();await page.locator('[data-enter-realm="rogue"]').click();
  await page.locator('[data-realm-roll="weapon"]').click();await page.locator('[data-realm-roll="vehicle"]').click();
  await page.locator('[data-realm-roll="turret"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-realm-ready]').disabled);
  const next=await page.evaluate(async()=>(await import('/src/main.js')).application.game.realm.loadout);
  if(next.weapon===gun||next.vehicle===combat.vehicle||next.turret===combat.turret)throw Error('相邻远征重复装备');
  for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});
    const fits=await page.locator('#realm-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().width<=innerWidth);
    if(!fits)throw Error('补给面板横向溢出 '+width);
    await page.screenshot({path:`output/playwright/expedition-ready-${width}.png`});
  }
  await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=150;
    for(const kind of ['expedition-weapon','expedition-vehicle','expedition-turret'])for(let n=0;n<16;n++)await renderVisualCase(canvas.getContext('2d'),kind,n/8);
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  if(await page.locator('.expedition-machine').count()!==1)throw Error('减少动态丢失补给面板');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,sounds:sounds.length,combat,restored,next,errors,designCriterion:['expedition-supply','expedition-combat','expedition-motion']};
}
