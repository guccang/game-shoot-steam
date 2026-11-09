// 正式浏览器验收：密集怪潮、昼夜构图、清波后飞行连续与真实20秒倒计时。
async page => {
  if(new URL(page.url()).port!=='4187')throw Error('只使用隔离验收端口');
  const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.reload();
  const density=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;window.flowReview=a;
    if(!await (await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('猫正式图集加载失败');
    if(g.realm)g.leaveRealm();g.state='playing';g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);
    g.enterRealm('guardian');g.continueRealm();g.realm.warning=0;g.attackTimer=999;g.realm.goddess.hp=100000;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    for(let i=0;i<120;i++)g.update(.05);
    const alive=g.enemies.filter(e=>e.hp>0).length;
    if(alive<50)throw Error('六秒怪潮未达到50只：'+alive);
    g.realm.realmCoins=3000;
    for(const [slot,kind,index,weapon] of [[0,'weapon',12,12],[1,'weapon',13,13],[2,'weapon',0,0],[3,'weapon',2,2],[4,'weapon',2,2],[5,'weapon',1,1],[6,'weapon',3,3],[7,'weapon',6,6]])g.guardianDefense('deploy',slot,kind,index,weapon);
    // 仅同屏采样延长怪物寿命，仍使用正式寻路、飞控与绘制器。
    for(const e of g.enemies){e.hp=e.maxHp=100000;e.damage=0;}
    g.realm.spawnTimer=999;g.realm.goddess.hp=g.realm.goddess.maxHp;g.player.invincible=999;
    for(let i=0;i<12;i++)g.update(.05);
    a.refresh();return {total:g.realm.spec.total,alive,capacity:g.realm.spec.alive,hp:g.realm.spec.hp};
  });
  for(const [width,height] of [[320,568],[390,844],[1280,900]]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
      views.push(await page.evaluate(async time=>{
        const a=window.flowReview,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(r.environment,{time,weather:'sun',autoTime:false,autoWeather:false});r.light=new EnvironmentTransition(r.environment,0);r.tone=new SceneTone(r.environment,0);
        r.resize();r.draw();a.refresh();
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        return {width:r.width,height:r.height,zoom:r.view.zoom,time};
      },time));
      await page.screenshot({path:'output/playwright/flow-'+width+'-'+time+'.png'});
    }
  }
  await page.setViewportSize({width:390,height:844});
  // 观察真实循环中的清波，不通过暂停截帧冒充休整动作。
  const clear=await page.evaluate(async()=>{
    const a=window.flowReview,g=a.game,{updateRealm}=await import('/src/core/realms/realm-manager.js');
    g.realm.kills=g.realm.spec.total-g.enemies.filter(e=>e.hp>0).length;g.realm.spawned=g.realm.spec.total;
    for(const enemy of g.enemies.filter(e=>e.hp>0))g.hit(enemy,9999999);
    g.update(.001);a.refresh();a.renderer.resize();a.renderer.draw();
    if(g.enemies.length)throw Error('正式清波未回收死亡怪物');
    if(g.realm.phase!=='rest')throw Error('未进入休整');
    const f=g.realm.defenses[0].runtime.funnel,d=g.realm.defenses[1].runtime.drone;
    window.flowStart=performance.now();
    return {time:g.time,idle:g.realm.idleTime||0,phase:f.orbitPhase,drone:d.time,stage:g.realm.stage,coins:g.realm.realmCoins};
  });
  await page.waitForFunction(()=>window.flowReview.game.realm.restRemaining<18.8);
  const live=await page.evaluate(before=>{
    const g=window.flowReview.game,f=g.realm.defenses[0].runtime.funnel,d=g.realm.defenses[1].runtime.drone;
    if(g.time!==before.time||g.realm.idleTime<=before.idle||f.orbitPhase===before.phase||d.time<=before.drone)throw Error('休整动作冻结或偷跑战斗');
    return {idle:g.realm.idleTime,phase:f.orbitPhase,drone:d.time,remaining:g.realm.restRemaining};
  },clear);
  await page.screenshot({path:'output/playwright/flow-rest-night.png'});
  await page.evaluate(async()=>{
    const r=window.flowReview.renderer,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    r.environment.time='day';r.light=new EnvironmentTransition(r.environment,0);r.tone=new SceneTone(r.environment,0);
  });
  await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
  await page.screenshot({path:'output/playwright/flow-rest-day.png'});
  await page.waitForFunction(()=>window.flowReview.game.realm.stage===2,{},{timeout:35000});
  const automatic=await page.evaluate(()=>({elapsed:(performance.now()-window.flowStart)/1000,stage:window.flowReview.game.realm.stage,phase:window.flowReview.game.realm.phase}));
  if(automatic.elapsed<19.8||automatic.elapsed>27)throw Error('实际倒计时异常 '+JSON.stringify(automatic));
  // 在下一次正式休整点击倒计时，确认手动开波仍立即生效。
  await page.evaluate(async()=>{const a=window.flowReview,g=a.game;g.enemies=[];g.boss=null;g.realm.kills=g.realm.spec.total;(await import('/src/core/realms/realm-manager.js')).updateRealm(g,0);a.refresh();});
  await page.locator('.guardian-next-wave').click();
  if(await page.evaluate(()=>window.flowReview.game.realm.stage)!==3)throw Error('点击倒计时未开波');
  const pressure=await page.evaluate(()=>{
    const a=window.flowReview,g=a.game;g.leaveRealm();g.state='playing';g.enterRealm('guardian');g.realm.stage=30;g.continueRealm();
    g.realm.warning=0;g.realm.goddess.hp=10000000;g.attackTimer=999;
    for(let i=0;i<400;i++)g.update(.05);
    const alive=g.enemies.filter(e=>e.hp>0).length;
    if(alive<200||alive>216)throw Error('高波次怪潮上限异常：'+alive);
    const logic=[],render=[];
    for(let i=0;i<30;i++){
      let start=performance.now();g.update(1/60);logic.push(performance.now()-start);
      start=performance.now();a.renderer.draw();render.push(performance.now()-start);
    }
    logic.sort((a,b)=>a-b);render.sort((a,b)=>a-b);
    return {alive,capacity:g.realm.spec.alive,logicP95:logic[28],renderP95:render[28]};
  });
  if(errors.length)throw Error(errors.join(';'));
  return {density,views,clear,live,automatic,pressure,errors,designCriterion:['guardian-battlefield-overview','guardian-defense-motion','guardian-day-night']};
}

