// 近景同屏复核：沿用正式女神、角色、载具、炮台和混编怪物，固定样本便于昼夜比较。
async page=>{
  if(new URL(page.url()).port!=='4220')throw Error('仅允许隔离验收端口');
  await page.reload();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;window.guardianVisual=a;
    if(g.realm)g.leaveRealm();g.state='playing';g.progress.vehicleHulls[0]=1;
    g.enterRealm('guardian');g.guardianDefense('deploy',4,'weapon',0);g.continueRealm();g.realm.warning=999;
    g.summonVehicle();g.player.invincible=999;
    const {guardianEnemyProfile}=await import('/src/config/guardian-enemies.js');
    for(let i=0;i<4;i++){
      const e=g.spawnEnemy(0,0,{x:g.player.x+(i%2?-100:110),y:g.player.y+(i<2?-90:95)});
      Object.assign(e,guardianEnemyProfile(1,i),{level:1,hp:1000,maxHp:1000,speed:15,damage:0,arena:g.realm.arena});
    }
    for(let i=0;i<20;i++)g.update(.05,{x:0,y:0});
    g.update=()=>{};g.realm.warning=0;g.player.invincible=0;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());a.refresh();
  });
  for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});
    for(const time of ['day','night']){
      await page.evaluate(async time=>{
        const a=window.guardianVisual,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment);r.tone=new SceneTone(a.environment);r.resize();r.draw();a.refresh();
      },time);
      await page.screenshot({path:`output/playwright/guardian-gentle-start/combined-${width}-${time}.png`});
    }
  }
  return{designCriterion:'guardian-default-view',visualSamples:6};
}
