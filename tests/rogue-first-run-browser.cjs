// 在独立验收服务上检查首次第五关引导、真实点击和手机昼夜布局，不读取正式端口存档。
async page => {
  if(new URL(page.url()).port!=='4176')throw Error('请使用独立验收端口 4176');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;
    const p=(await import('/src/progression/progress.js')).freshProgress();
    p.arrival=null;p.restoration.repaired.push('rogue');
    a.game.progress=p;a.game.reset();document.querySelectorAll('dialog[open]').forEach(d=>d.close());a.game.state='playing';
    a.game.enterRealm('rogue');a.game.rollRealmEquipment('weapon');a.game.rollRealmEquipment('vehicle');a.game.readyRealm();
    a.game.chooseRealmBlessing(a.game.realm.offers[0]);a.game.player.invincible=999;
    a.refresh();
  });
  for(const width of [320,390,480]){
    await page.setViewportSize({width,height:844});
    for(const time of ['day','night']){
      await page.evaluate(async time=>{
        const a=(await import('/src/main.js')).application;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        const {SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
        a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);
        a.renderer.resize();a.refresh();a.renderer.draw();
      },time);
      const pos=await page.evaluate(()=>{
        const q=document.getElementById('quest').getBoundingClientRect(),f=document.getElementById('game-frame').getBoundingClientRect();
        return {top:q.top-f.top,left:q.left-f.left,right:q.right-f.right};
      });
      if(pos.top>13||pos.top<9||pos.left>13||pos.left<9||pos.right>0)throw Error('远征状态位置错误 '+JSON.stringify(pos));
      await page.screenshot({path:`docs/art-reference/rogue-first-run/hud-${width}-${time}.png`});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {updateRealm}=await import('/src/core/realm-manager.js');
    for(let n=0;n<4;n++){g.enemies=[];g.boss=null;g.realm.kills=g.realm.spec.total;updateRealm(g,0);g.chooseRealmBlessing(g.realm.offers[0]);}
    a.refresh();a.save();
  });
  await page.getByRole('button',{name:'返回营地，继续主线',exact:true}).waitFor();
  for(const width of [320,390]){
    await page.setViewportSize({width,height:width===320?568:844});
    for(const label of ['返回营地，继续主线','继续挑战第 5 关']){
      const b=await page.getByRole('button',{name:label,exact:true}).boundingBox();
      if(!b||b.height<44||b.x<0||b.x+b.width>width)throw Error('按钮触控范围错误');
    }
    await page.screenshot({path:`docs/art-reference/rogue-first-run/guide-${width}.png`});
  }
  await page.reload();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;a.refresh();});
  await page.getByRole('button',{name:'返回营地，继续主线',exact:true}).click();
  const returned=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return !g.realm&&g.progress.taskTracking?.kind==='mainline'&&g.progress.realms.records.rogue.best===4;});
  if(!returned)throw Error('未返回森林并追踪主线');
  // 先验证第二次不弹提示，再重建引导状态，实点继续后只能进入第五关。
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    g.enterRealm('rogue');g.rollRealmEquipment('weapon');g.rollRealmEquipment('vehicle');g.readyRealm();g.chooseRealmBlessing(g.realm.offers[0]);
    const {updateRealm}=await import('/src/core/realm-manager.js');
    for(let n=0;n<4;n++){g.enemies=[];g.boss=null;g.realm.kills=g.realm.spec.total;updateRealm(g,0);g.chooseRealmBlessing(g.realm.offers[0]);}
    if(g.realm.phase!=='combat'||g.realm.stage!==5)throw Error('第二次不应提示');
    g.realm.firstRun=true;g.realm.phase='guide';g.state='realm';a.refresh();
  });
  await page.getByRole('button',{name:'继续挑战第 5 关',exact:true}).click();
  const continued=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.realm.stage===5&&g.realm.phase==='combat'&&!document.getElementById('realm-dialog').open;});
  if(!continued)throw Error('继续第五关失败');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,widths:[320,390,480],refresh:true,exit:true,continue:true,repeatSuppressed:true};
}
