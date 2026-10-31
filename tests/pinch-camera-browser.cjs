// 使用浏览器真实触摸事件验证双指与摇杆、建造格位和设置控件的仲裁。
async page => {
  if (new URL(page.url()).port !== '4187') throw Error('仅允许隔离验收端口');
  const errors = [], views = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', {enabled:true,maxTouchPoints:5});
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    window.pinchReview = a;
    const update=g.update.bind(g);
    // 观察正式循环的移动输入；角色的自然减速和武器后坐不算摇杆误输入。
    g.update=(dt,vector)=>{window.pinchVector=vector;update(dt,vector);};
    if (g.realm) g.leaveRealm();
    g.state='playing'; g.enterRealm('guardian');
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    a.renderer.resize();a.renderer.draw();a.refresh();
    if (!await (await import('/src/rendering/cat-animation.js')).catSprites.load()) throw Error('正式角色图集加载失败');
  });
  // 协议派发真实触摸，包含浏览器指针捕获与兼容点击，不用合成 DOM 事件替代。
  async function touch(type, points) {
    await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({id:p.id??i+1,x:p.x,y:p.y,radiusX:4,radiusY:4,force:1}))});
    // 等待浏览器投递合并的触摸移动，再读取正式镜头，避免协议确认早于下一帧。
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  for (const [width,height] of [[390,844],[844,390],[320,568]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(() => {
      const a=window.pinchReview; a.renderer.camera.setZoomStep(0);a.renderer.resize();a.renderer.draw();a.refresh();
    });
    if (await page.locator('#game-frame .camera-controls').count()) throw Error('主页面仍有镜头控件');
    const before=await page.evaluate(()=>({step:window.pinchReview.renderer.camera.zoomStep,zoom:window.pinchReview.renderer.view.zoom,x:window.pinchReview.game.player.x,y:window.pinchReview.game.player.y}));
    const box=await page.locator('[data-guardian-slot="0"]').boundingBox();
    const first={id:1,x:box.x+box.width/2,y:box.y+box.height/2};
    const second={id:2,x:first.x+45,y:first.y};
    await touch('touchStart',[first]);
    await touch('touchStart',[first,second]);
    await touch('touchMove',[first,{...second,x:first.x+90}]);
    const enlarged=await page.evaluate(()=>window.pinchReview.renderer.view.zoom);
    if (enlarged<=before.zoom*1.5) throw Error('双指张开未连续放大');
    await touch('touchMove',[first,{...second,x:first.x+65}]);
    const smaller=await page.evaluate(()=>window.pinchReview.renderer.view.zoom);
    if (smaller>=enlarged || smaller<=before.zoom) throw Error('双指捏合未缩小 '+JSON.stringify({width,height,before:before.zoom,enlarged,smaller}));
    await touch('touchEnd',[first]);
    await touch('touchMove',[{...first,x:first.x-20}]);
    await touch('touchEnd',[]);
    await page.evaluate(before=>{
      const a=window.pinchReview;
      if (a.game.player.x!==before.x||a.game.player.y!==before.y) throw Error('缩放手势误移动');
      if (!document.querySelector('.guardian-build-panel').hidden||a.game.realm.defenses.length) throw Error('缩放手势误建造');
      if (!document.querySelector('#joystick').hidden) throw Error('缩放结束残留摇杆');
    },before);
    await page.locator('#settings-button').click();
    const slider=page.getByRole('slider',{name:'视角缩放'});
    const current=await slider.inputValue();
    if (+current<=0) throw Error('设置滑条没有同步手势倍率');
    await page.getByRole('button',{name:'拉近视角',exact:true}).click();
    const plus=await slider.inputValue();
    if (+plus<=+current) throw Error('设置加号无效');
    await page.getByRole('button',{name:'拉远视角',exact:true}).click();
    await slider.fill('2.5');
    if (await page.evaluate(()=>window.pinchReview.renderer.camera.zoomStep)!==2.5) throw Error('设置滑条无效');
    await page.screenshot({path:`output/playwright/pinch-settings-${width}.png`});
    await page.getByRole('button',{name:'全景',exact:true}).click();
    await page.locator('#close-settings').click();
    await page.evaluate(()=>{
      if(window.pinchReview.renderer.camera.zoomStep!==0)throw Error('全景未恢复');
      if(document.documentElement.scrollWidth>innerWidth)throw Error('页面横向溢出');
    });
    // 手势结束后的独立单指点击仍可正常打开格位建造。
    const pad=await page.locator('[data-guardian-slot="0"]').boundingBox();
    const point={id:1,x:pad.x+pad.width/2,y:pad.y+pad.height/2};
    await touch('touchStart',[point]);await touch('touchEnd',[]);
    if (!await page.locator('.guardian-build-panel').isVisible()) throw Error('缩放后单指建造失效');
    await page.getByRole('button',{name:'关闭建造面板'}).click();
    views.push({width,height,full:before.zoom,enlarged,smaller,settingsStep:current});
  }
  // 放大后离开守护女神，默认视角恢复；森林、高塔、远征均无设置入口和缩放手势。
  await page.evaluate(()=>{const a=window.pinchReview;a.renderer.camera.setZoomStep(3);a.renderer.draw();});
  const fixedModes=[];
  for(const mode of [null,'tower','rogue']){
    await page.evaluate(mode=>{
      const a=window.pinchReview,g=a.game;if(g.realm)g.leaveRealm();g.state='playing';
      if(mode){
        g.enterRealm(mode);
        if(mode==='rogue'){g.rollRealmEquipment('weapon');g.rollRealmEquipment('vehicle');g.rollRealmEquipment('turret');g.readyRealm();}
        if(g.realm.phase==='choice')g.chooseRealmBlessing(g.realm.offers[0]);
        g.realm.warning=999;
      }
      g.player.invincible=999;document.querySelectorAll('dialog[open]').forEach(d=>d.close());
      a.renderer.draw();a.refresh();
    },mode);
    const baseline=await page.evaluate(async()=>{
      const a=window.pinchReview,r=a.renderer,g=a.game;
      const {CombatCamera}=await import('/src/rendering/camera.js');
      const {sniperGuide}=await import('/src/combat/aim.js');
      const guide=['funnel','drone'].includes(g.weapon().controller)?{kind:'funnel'}:sniperGuide(g);
      const normal=new CombatCamera().update(g.player,r.width,r.height,guide,g.time).zoom;
      if(r.view.zoom!==normal)throw Error('普通场景没有恢复原版正常倍率');
      return r.view.zoom;
    });
    await page.locator('#settings-button').click();
    if(await page.locator('.camera-controls').isVisible())throw Error('普通场景仍显示视角设置');
    await page.locator('#close-settings').click();
    const start={id:1,x:30,y:250},moved={...start,x:65},other={id:2,x:130,y:250};
    await touch('touchStart',[start]);await touch('touchMove',[moved]);
    await touch('touchStart',[moved,other]);await touch('touchMove',[moved,{...other,x:195}]);
    await page.evaluate(baseline=>{
      const a=window.pinchReview;
      if(a.renderer.camera.zoomStep!==0||a.renderer.view.zoom!==baseline)throw Error('普通场景视角变化');
      if(window.pinchVector.x<=0||document.querySelector('#joystick').hidden)throw Error('第二指打断普通场景移动');
    },baseline);
    await touch('touchEnd',[moved]);await touch('touchEnd',[]);
    fixedModes.push(mode||'forest');
  }
  // 回到守护女神恢复普通地图基础视野，设置入口重新出现。
  await page.evaluate(()=>{
    const a=window.pinchReview,g=a.game;g.leaveRealm();g.state='playing';g.enterRealm('guardian');
    a.renderer.draw();a.refresh();if(a.renderer.view.zoom!==(a.renderer.width<500?.85:1.05))throw Error('再次进入未恢复默认视野');
  });
  await page.locator('#settings-button').click();
  if(!await page.locator('.camera-controls').isVisible())throw Error('守护女神缺少视角设置');
  await page.locator('#close-settings').click();
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await cdp.detach();
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:['guardian-battlefield-overview','guardian-world-build-hit-targets'],views,fixedModes,errors};
}
