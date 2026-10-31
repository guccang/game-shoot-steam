// 建造目录使用真实鼠标与触摸拖动，并验证普通和输入法状态下的 PC 移动。
async page => {
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离验收端口');
  const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
  const cdp=await page.context().newCDPSession(page);
  await page.setViewportSize({width:740,height:413});await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;window.inputReview=a;
    const update=g.update.bind(g);g.update=(dt,vector)=>{window.actualInput=vector;update(dt,vector);};
    if(g.realm)g.leaveRealm();g.state='playing';g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);
    g.enterRealm('guardian');g.continueRealm();g.realm.warning=999;g.realm.realmCoins=3000;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    a.renderer.resize();a.renderer.draw();a.refresh();
    if(!await(await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('角色图集缺失');
  });
  // 等合并触摸事件交给正式循环，再观察输入与滚动状态。
  async function frames(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function touch(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:4,radiusY:4,force:1}))});await frames();}
  for(const [width,height] of [[740,413],[390,844]]){
    await page.setViewportSize({width,height});await frames();
    // 缩小全景中的触摸区域可重叠，用真实坐标验证最近格位仲裁。
    const pad=await page.locator('[data-guardian-slot="0"]').boundingBox();
    await page.mouse.click(pad.x+pad.width/2,pad.y+pad.height/2);
    const panel=page.locator('.guardian-build-panel'),list=page.locator('.guardian-catalog');
    const rect=await list.boundingBox(), y=rect.y+20, x=rect.x+Math.min(160,rect.width-15);
    // 在卡片上鼠标拖动，跨过卡片间隙也不能打开摇杆或误选装备。
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-100,y,{steps:8});
    await page.evaluate(()=>{const a=window.inputReview;a.game.realm.realmCoins++;a.refresh();});
    const mouseScroll=await list.evaluate(el=>el.scrollLeft);
    if(mouseScroll<70)throw Error('鼠标拖动未滚动目录');
    await page.mouse.up();await frames();
    await page.evaluate(()=>{if(!document.querySelector('#joystick').hidden||window.inputReview.game.realm.defenses.length)throw Error('目录拖动误移动或建造');});
    if(!await panel.isVisible())throw Error('鼠标拖动误选装备并关闭目录');
    if(await list.evaluate(el=>el.scrollLeft)<70)throw Error('战斗数值刷新重置目录滚动');
    // 面板文字区域同样不能当作战场拖动。
    const head=await page.locator('.guardian-build-head b').boundingBox();
    await page.mouse.move(head.x+5,head.y+5);await page.mouse.down();await page.mouse.move(head.x+55,head.y+5,{steps:5});
    if(!await page.locator('#joystick').evaluate(el=>el.hidden))throw Error('面板文字触发摇杆');
    await page.mouse.up();
    // 中文输入法会把 key 改为 Process；四个物理键位必须仍进入正式移动循环。
    for(const [key,code,expected] of [['w','KeyW',{x:0,y:-1}],['a','KeyA',{x:-1,y:0}],['s','KeyS',{x:0,y:1}],['d','KeyD',{x:1,y:0}]]){
      await page.keyboard.down(key);await frames();
      await page.evaluate(v=>{if(window.actualInput.x!==v.x||window.actualInput.y!==v.y)throw Error('普通 WASD 无效');},expected);
      await page.keyboard.up(key);
      await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',code,key:'Process',windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});await frames();
      await page.evaluate(v=>{if(window.actualInput.x!==v.x||window.actualInput.y!==v.y)throw Error('输入法 WASD 无效');},expected);
      await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',code,key:'Unidentified'});await frames();
      await page.evaluate(()=>{if(window.actualInput.x||window.actualInput.y)throw Error('抬键未停止');});
    }
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await list.evaluate(el=>el.scrollLeft=0);
    const first={id:1,x,y};
    await touch('touchStart',[first]);
    await touch('touchMove',[{...first,x:x-40}]);await touch('touchMove',[{...first,x:x-110}]);
    const touchScroll=await list.evaluate(el=>el.scrollLeft);
    if(touchScroll<80)throw Error('触摸拖动未滚动目录');
    await touch('touchEnd',[]);
    if(!await panel.isVisible())throw Error('触摸拖动误选装备');
    // 面板第二指不能参与战场缩放，取消后列表和战场均能继续操作。
    const zoom=await page.evaluate(()=>window.inputReview.renderer.camera.zoomStep);
    await touch('touchStart',[first]);await touch('touchStart',[first,{id:2,x:x-40,y}]);
    await touch('touchMove',[first,{id:2,x:x-90,y}]);await touch('touchCancel',[]);
    if(await page.evaluate(()=>window.inputReview.renderer.camera.zoomStep)!==zoom)throw Error('面板双指触发战场缩放');
    await list.evaluate(el=>el.scrollLeft=0);
    // 独立的单指点按仍可部署，不被上一轮拖动的 click 屏蔽影响。
    const card=await page.locator('[data-guardian-equipment="weapon:0"]').boundingBox();
    const tap={id:1,x:card.x+card.width/2,y:card.y+card.height/2};
    await touch('touchStart',[tap]);await touch('touchEnd',[]);
    await page.evaluate(()=>{const g=window.inputReview.game;if(g.realm.defenses.length!==1)throw Error('拖动后点按部署失效');g.guardianDefense('remove',0);window.inputReview.refresh();});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
    results.push({width,height,mouseScroll,touchScroll,wasd:true,imeWasd:true});
  }
  await cdp.detach();if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:['guardian-live-build','guardian-world-build-hit-targets'],results,errors};
}
