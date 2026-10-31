// 接续map-open-browser的正式游戏实例，检查冷加载、失败恢复、动态位置及手机昼夜。
async page => {
  const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  // 用正式按钮打开/关闭，保留公共弹窗的暂停归属与触控响应。
  async function open(){if(!await page.locator('#map-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#map-button').click();}
  async function close(){await page.locator('#close-map').click();await page.waitForFunction(()=>a.game.state==='playing');}
  // 暂缓一张底图的网络响应：面板必须先出现且可立即关闭，之后自动显示完整底图。
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/assets/map-preview/forest-summer.png*',async route=>{await gate;await route.continue();});
  await page.evaluate(()=>a.renderer.ground.mapPreview.dispose());
  await open();await page.locator('#map-preview-loading').waitFor({state:'visible'});
  if(!await page.locator('#region-map').evaluate(c=>c.hidden))throw Error('冷加载显示了空地图');
  await page.screenshot({path:'output/playwright/map-open/loading-390.png'});await close();release();
  await page.waitForFunction(()=>a.renderer.ground.mapPreview.stats().count===1);await page.unroute('**/assets/map-preview/forest-summer.png*');
  await open();await page.locator('#region-map').waitFor({state:'visible'});checks.push('冷加载可关闭且完成后恢复');await close();
  // 缺图明确显示错误，不能静默回退；重新打开后仅重新请求一次。
  await page.route('**/assets/map-preview/forest-summer.png*',route=>route.fulfill({status:404,body:'缺图测试'}));
  await page.evaluate(()=>a.renderer.ground.mapPreview.dispose());await open();
  await page.waitForFunction(()=>document.getElementById('map-preview-loading').textContent.includes('加载失败'));
  await close();await page.unroute('**/assets/map-preview/forest-summer.png*');await open();await page.locator('#region-map').waitFor({state:'visible'});
  checks.push('缺图明确失败且重新打开可恢复');await close();
  // 位置标记仍按实时权威坐标绘制，没有烘焙在静态底图中。
  const positions=[];
  for(const [x,y] of [[4000,4000],[7000,6000]]){
    await page.evaluate(({x,y})=>{a.game.player.x=x;a.game.player.y=y;}, {x,y});await open();
    positions.push(await page.evaluate(async()=>{
      const {canonical,WORLD}=await import('/src/world/coordinates.js'),p=canonical(a.game.player);
      const c=document.getElementById('region-map').getContext('2d'),pixel=[...c.getImageData(Math.floor(p.x*720/WORLD.width),Math.floor(p.y*560/WORLD.height),1,1).data];
      return {x:p.x,y:p.y,pixel,builds:a.renderer.ground.mapPreview.stats().builds};
    }));await close();
  }
  if(positions.some(p=>p.pixel.join(',')!=='253,245,196,255')||positions[0].builds!==positions[1].builds)throw Error('位置标记没有实时刷新：'+JSON.stringify(positions));
  checks.push('玩家位置实时刷新且底图未重建');
  // 同屏保留猫、怪物与正式载具，确认地图UI和昼夜战场没有互相影响。
  await page.evaluate(()=>{
    // 静态同屏夹具冻结战斗，防止截图前怪物被击败；绘制仍走正式角色与载具入口。
    const g=a.game;g.update=()=>{};g.player.x=1300;g.player.y=1900;g.enemies=[];g.player.invincible=1e6;
    g.vehicle.active=true;
    for(const [x,y] of [[1360,1960],[1210,1960]]){const enemy=g.spawnEnemy(0,0,{x,y});enemy.speed=0;}
  });
  const views=[];
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await page.evaluate(async time=>{
      const e=a.environment;e.time=time;e.livingPreview=true;e.autoTime=false;e.weather='sun';
      a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
      a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
    },time);
    await open();await page.locator('#region-map').waitFor({state:'visible'});
    await page.locator('#region-map').scrollIntoViewIfNeeded();
    const view=await page.evaluate(async()=>({...(await import('/src/rendering/visual-review.js')).inspectMapPreview(a.renderer,document),
      overflow:document.documentElement.scrollWidth>innerWidth,map:document.getElementById('region-map').getBoundingClientRect().toJSON(),
      close:document.getElementById('close-map').getBoundingClientRect().toJSON()}));
    if(view.overflow||view.map.left<0||view.map.right>width||view.close.width<44||view.close.height<44)throw Error('手机地图布局不合格：'+JSON.stringify(view));
    views.push({width,time,...view});await page.screenshot({path:`output/playwright/map-open/${width}-${time}.png`});await close();
    await page.screenshot({path:`output/playwright/map-open/${width}-${time}-battle.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,positions,views,errors};
}
