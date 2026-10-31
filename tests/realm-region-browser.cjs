// 隔离端口验收：真实布防点击与移动、主场景镜头、三模式昼夜同屏及刷新选区。
async page => {
  if(new URL(page.url()).port!=='4198')throw Error('仅允许隔离端口4198');
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.destroy();
    const {freshProgress}=await import('/src/progression/progress.js');
    localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));
  });
  await page.reload();await page.setViewportSize({width:390,height:844});
  await page.locator('#start').click();
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
  await page.locator('#realm-button').click();await page.locator('[data-enter-realm="guardian"]').click();
  await page.locator('[data-guardian-open]').click();
  await page.locator('[data-guardian-equipment="weapon:0"]').click();
  await page.locator('[data-guardian-slot="2"]').click();
  const before=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    if(!g.realm.defenses.some(t=>t.slot===2))throw Error('正式格位点击未部署');
    return {x:g.player.x,y:g.player.y,view:a.renderer.view.x,arena:g.realm.arena};
  });
  await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');
  const moved=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    return {x:g.player.x,view:a.renderer.view.x,enemies:g.enemies.length,time:g.time};
  });
  if(moved.x<=before.x+5||moved.view<=before.view+5||moved.enemies||moved.time)throw Error('布防移动或冻结战斗失败');
  // 使用真实指针拖动继续布防，空白战场手势不产生第二次建造。
  await page.mouse.move(190,400);await page.mouse.down();await page.mouse.move(230,400,{steps:6});
  await page.waitForTimeout(300);await page.mouse.up();
  const dragged=await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    return {x:g.player.x,defenses:g.realm.defenses.length};
  });
  if(dragged.x<=moved.x||dragged.defenses!==1)throw Error('布防拖动失败或误建');
  await page.locator('[data-realm-next]').click();
  await page.reload();
  const restored=await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    return {arena:g.realm.arena,state:g.state,defenses:g.realm.defenses.length};
  });
  if(JSON.stringify(restored.arena)!==JSON.stringify(before.arena)||restored.state!=='paused'||restored.defenses!==1)throw Error('刷新改变选区或丢失布防');
  const results=[];
  for(const mode of ['guardian','rogue','tower']) {
    // 同屏夹具通过正式入场、抽取与部署入口构造，不使用替代绘制器。
    await page.evaluate(async mode=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      if(g.realm)g.leaveRealm();g.state='playing';g.player.hp=g.maxHp();g.progress.weapon=0;
      g.progress.vehicleHulls[2]=1;g.progress.vehicleWeapons[3]=1;g.progress.vehicleLoadouts[2]=3;g.progress.vehicleIndex=2;
      g.random=()=>({guardian:.1,rogue:.5,tower:.95})[mode];g.enterRealm(mode);
      if(mode==='guardian'){g.guardianDefense('deploy',2,'weapon',0);g.continueRealm();}
      if(mode==='rogue'){
        g.random=()=>0;g.rollRealmEquipment('weapon');g.random=()=>.6;g.rollRealmEquipment('vehicle');
        g.random=()=>.2;g.rollRealmEquipment('turret');g.readyRealm();g.chooseRealmBlessing(g.realm.offers[0]);
      }else g.summonVehicle();
      const r=g.realm;g.player.x=r.arena.x;g.player.y=r.arena.y+45;
      for(const dx of [-95,100]){
        const e=g.spawnEnemy(0,0,{x:g.player.x+dx,y:g.player.y-60});
        Object.assign(e,{hp:100000,maxHp:100000,arena:r.arena,realm:true,flying:false,speed:0,damage:1});
      }
      r.warning=999;g.random=Math.random;
      document.querySelectorAll('dialog[open]').forEach(d=>d.close());a.refresh();
    },mode);
    for(const [width,height]of [[390,844],[1280,900]]){
      await page.setViewportSize({width,height});
      for(const time of ['day','night']) {
        const result=await page.evaluate(async({time,mode})=>{
          const a=(await import('/src/main.js')).application,g=a.game;
          const {EnvironmentTransition}=await import('/src/world/environment.js');
          const {SceneTone}=await import('/src/rendering/scene-tone.js');
          Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
          a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
          g.player.invincible=0;a.renderer.resize();a.renderer.draw();
          const expected=a.renderer.width<500?.85:1.05;
          if(a.renderer.view.zoom!==expected)throw Error(mode+'没有使用主场景镜头');
          if(a.renderer.ground.stats().bytes<=0)throw Error('没有使用主场景地形缓存');
          return {mode,time,zoom:a.renderer.view.zoom,arena:g.realm.arena,trees:a.renderer.visibleStats.trees};
        },{time,mode});
        await page.screenshot({path:`output/playwright/realm-forest/${mode}-${width}-${time}.png`});results.push(result);
      }
    }
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,restored,results,errors,designCriterion:['realm-main-scene','realm-area-size','realm-camera','realm-day-night','guardian-world-build-hit-targets']};
}
