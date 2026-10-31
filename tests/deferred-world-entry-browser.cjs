// 延后建图浏览器验收：只使用隔离端口，覆盖点击、续游、失败和销毁边界。
async (page) => {
  if(new URL(page.url()).port!=='4276')throw Error('仅允许隔离端口 4276');
  const errors=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
  // 卸载后再准备存档，避免读写用户的正式游玩环境。
  async function mount(raw=null,mode='normal'){
    await page.evaluate(async({raw,mode})=>{
      (window.entryApp||(await import('/src/main.js')).application).destroy();
      for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
      localStorage.clear();localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');if(raw!==null)localStorage.setItem('forest-patrol-v1',typeof raw==='string'?raw:JSON.stringify(raw));
      const {createApplication}=await import('/src/app/create-app.js');
      window.entryApp=createApplication({getStorage:()=>{
        if(mode==='denied')throw Error('blocked');
        return {getItem:key=>localStorage.getItem(key),removeItem:key=>localStorage.removeItem(key),setItem:(key,value)=>{if(mode==='quota'&&key==='forest-patrol-v1')throw Error('quota');localStorage.setItem(key,value);}};
      }});
    },{raw,mode});
  }
  // 断言正式运行状态，同时保存可复核的中文检查名称。
  async function check(name,fn){if(!await page.evaluate(fn))throw Error(name);checks.push(name);}
  // 等待的是用户点击后的就绪信号，首页不应自行启动预热。
  async function enter(){await page.locator('#start').click();await page.waitForFunction(()=>entryApp.menu.page==='game');await page.evaluate(()=>entryApp.ready);}
  await page.setViewportSize({width:1280,height:800});await mount();
  await check('首页按钮可用但树林、地图缓存、导航预热均未创建',()=>entryApp.game.worldPending&&entryApp.game.trees.length===0&&entryApp.renderer.ground.tiles.size===0&&entryApp.navigationWarmup.slices===0&&!document.getElementById('start').disabled);
  await page.screenshot({path:'output/playwright/deferred-entry/title-desktop.png'});
  await page.locator('#title-settings').click();await page.locator('#settings-done').click();
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  await check('首页设置、等待与缩放不会生成地图或写成长档',()=>entryApp.game.trees.length===0&&entryApp.renderer.ground.tiles.size===0&&entryApp.game.time===0&&!localStorage.getItem('forest-patrol-v1'));
  await page.screenshot({path:'output/playwright/deferred-entry/title-mobile.png'});
  // 同步点击能够在首个建图帧前观察加载反馈，连续点击只创建一轮。
  await page.evaluate(()=>{const g=entryApp.game,initialize=g.initializeWorld.bind(g);window.entryBuilds=0;g.initializeWorld=()=>{if(g.worldPending)entryBuilds++;return initialize();};document.getElementById('start').click();entryApp.menu.enter();});
  await check('点击后显示过场并禁止重复进入',()=>!document.getElementById('start-loading').hidden&&getComputedStyle(document.getElementById('start')).visibility==='hidden'&&document.getElementById('start').disabled&&document.getElementById('start').textContent==='开始游戏'&&document.getElementById('start').getAttribute('aria-busy')==='true'&&entryApp.menu.page==='title');
  await page.screenshot({path:'output/playwright/deferred-entry/loading-mobile.png'});
  await page.waitForFunction(()=>entryApp.menu.page==='game');
  await check('准备好地图后才进入并启动入职与保存',()=>!entryApp.game.worldPending&&entryApp.game.trees.length>0&&entryApp.renderer.ground.tiles.size>0&&entryBuilds===1&&!!entryApp.game.arrivalScene&&!!localStorage.getItem('forest-patrol-v1'));
  await page.screenshot({path:'output/playwright/deferred-entry/entered-mobile.png'});
  await page.evaluate(()=>{entryApp.game.pause();window.entryTrees=entryApp.game.trees;window.entryPlayer=entryApp.game.player;entryApp.menu.home();});
  await enter();await check('返回首页再继续复用地图与玩家对象',()=>entryBuilds===1&&entryApp.game.trees===entryTrees&&entryApp.game.player===entryPlayer);
  await page.evaluate(()=>entryApp.menu.home());await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
  await enter();
  await check('进入过游戏后也能确认清档重新入职',()=>!!entryApp.game.arrivalPending&&entryApp.game.time<2&&!!entryApp.game.arrivalScene);
  const save=await page.evaluate(async()=>{
    const {Game}=await import('/src/core/game.js'),{freshProgress}=await import('/src/progression/progress.js'),{capturePatrol}=await import('/src/core/patrol-session.js');
    const g=new Game(freshProgress());g.state='playing';g.wave=7;g.waveGroupStart=6;g.bossWave=10;g.player.hp=33;g.progress.coins=4321;g.progress.patrol=capturePatrol(g);return g.progress;
  });
  await mount(save);await check('存档首页保留开始入口且未创建战场',()=>entryApp.game.trees.length===0&&entryApp.game.worldPending&&document.getElementById('start').textContent==='开始游戏');
  await enter();await check('点击继续保留当前存档波次和成长',()=>entryApp.game.wave===7&&entryApp.game.progress.coins===4321&&entryApp.game.player.hp>=33);
  for(const kind of ['story','realm']){
    const special=await page.evaluate(async kind=>{
      const {Game}=await import('/src/core/game.js'),{freshProgress}=await import('/src/progression/progress.js');const g=new Game(freshProgress());
      if(kind==='story'){g.enterStory('sunleaf-01','sunleaf-post');g.syncStory();}else{g.enterRealm('rogue');const {syncRealm}=await import('/src/core/realm-manager.js');syncRealm(g);}return g.progress;
    },kind);
    await mount(special);await check(kind+' 存档首页不恢复场景或抢开面板',()=>entryApp.game.trees.length===0&&!entryApp.game.story&&!entryApp.game.realm&&!document.querySelector('dialog[open]'));
    await enter();await check(kind+' 点击后恢复对应玩法',()=>!!entryApp.game.story||!!entryApp.game.realm);
  }
  await mount(save);await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();await enter();
  await check('未进入旧地图即可新开入职',()=>entryApp.game.mapId==='forest'&&entryApp.game.progress.coins===0&&!!entryApp.game.arrivalScene);
  await mount('{broken');await check('损坏存档继续禁用并保留原数据',()=>document.getElementById('start').disabled&&entryApp.game.trees.length===0&&localStorage.getItem('forest-patrol-v1')==='{broken');
  await mount(save,'quota');await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
  await check('清档写入失败不生成地图不关闭确认',()=>entryApp.game.worldPending&&entryApp.game.trees.length===0&&document.getElementById('settings-dialog').open&&!document.getElementById('reset-error').hidden);
  await mount(null,'denied');await enter();await check('无存储权限可点击后临时进入',()=>entryApp.menu.page==='game'&&!localStorage.getItem('forest-patrol-v1'));
  await mount();await page.evaluate(()=>{entryApp.game.initializeWorld=()=>{throw Error('验收注入建图失败');};document.getElementById('start').click();});
  await page.waitForFunction(()=>document.getElementById('title-save-warning').textContent.includes('失败'));
  await check('建图异常保留首页提示且不写成长存档',()=>entryApp.menu.page==='title'&&document.getElementById('start').disabled&&!localStorage.getItem('forest-patrol-v1'));
  await mount();
  await page.evaluate(()=>{document.getElementById('start').click();entryApp.destroy();});await page.waitForTimeout(150);
  await check('点击后立即卸载会取消建图且不覆盖存档',()=>entryApp.game.worldPending&&entryApp.game.trees.length===0&&!localStorage.getItem('forest-patrol-v1'));
  if(await page.evaluate(()=>entryApp.ready)!==false)throw Error('卸载没有释放就绪等待');
  await mount();if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,checks,errors};
}
