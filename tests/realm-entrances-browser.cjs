// 隔离浏览器验收真实地图点击、门牌键盘操作、原菜单入口和森林现场恢复。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('只允许隔离端口');
  const errors=[]; page.on('pageerror',error=>errors.push(String(error)));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    (await import('/src/main.js')).application.destroy();
    const {freshProgress}=await import('/src/progression/progress.js');
    localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));
    localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));
  });
  await page.reload(); await page.locator('#start').click();
  // 调整到建筑门前，仍通过正式镜头投影与原生指针链命中建筑。
  async function position(mode, weapon=0, mirror=false) {
    return page.evaluate(async({mode,weapon,mirror})=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      const entry=(await import('/src/world/realm-entrances.js')).REALM_ENTRANCES.find(e=>e.mode===mode);
      g.player.x=entry.x+(mirror?3600:0);g.player.y=entry.y+100+(mirror?-2800:0);
      g.player.hp=g.maxHp();g.progress.weapon=weapon;g.progress.weapons[weapon]=Math.max(1,g.progress.weapons[weapon]);
      g.enemies=[];g.spawnTimer=1000;g.wave=7;g.kills=42;g.state='playing';
      a.renderer.camera.time=null;a.renderer.draw();a.refresh();
      const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();
      return {x:r.left+(g.player.x-v.x)*v.zoom,y:r.top+(g.player.y-150-v.y)*v.zoom};
    },{mode,weapon,mirror});
  }
  // 退出通过原面板按钮，核对恢复到门前且森林波次没有被覆盖。
  async function leave(mode) {
    const data=await page.evaluate(async()=>{
      const g=(await import('/src/main.js')).application.game;
      return {mode:g.realm?.mode,phase:g.realm?.phase};
    });
    if(data.mode!==mode)throw Error('入口模式不匹配：'+JSON.stringify(data));
    if(data.phase==='loadout') {
      await page.locator('[data-realm-roll="weapon"]').click();
      await page.locator('[data-realm-roll="vehicle"]').click();
  await page.locator('[data-realm-roll="turret"]').click();
      await page.locator('[data-realm-ready]').click();
      data.phase='choice';
    }
    // 守护建筑先进入布防，开始第一波后再核对退出与森林恢复。
    if(data.phase==='build') await page.locator('[data-realm-next]').click();
    if(data.phase==='choice') {
      await page.keyboard.press('Escape');
      if(!await page.locator('#realm-dialog').isVisible())throw Error('肉鸽必选祝福被跳过');
      await page.locator('[data-realm-blessing]').first().click();
    }
    if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
    await page.locator('#realm-button').click();
    await page.locator('[data-realm-exit]').click();
    const restored=await page.evaluate(async()=>{
      const g=(await import('/src/main.js')).application.game;
      return {mode:g.realm,state:g.state,wave:g.wave,kills:g.kills,x:g.player.x,y:g.player.y};
    });
    if(restored.mode||restored.state!=='paused'||restored.wave!==7||restored.kills!==42)throw Error('森林现场恢复失败');
    await page.locator('#resume').click();
    return restored;
  }
  const positions=[];
  for(const mode of ['rogue','tower','guardian']) {
    const point=await position(mode);
    await page.waitForTimeout(120);
    await page.screenshot({path:`output/playwright/realm-entrances/${mode}-day.png`});
    // 从建筑上拖动再回到原点不能视为点击，避免移动时意外进入。
    await page.mouse.move(point.x,point.y);await page.mouse.down();
    await page.mouse.move(point.x+35,point.y,{steps:3});await page.mouse.move(point.x,point.y,{steps:3});await page.mouse.up();
    if(await page.evaluate(async()=>!!(await import('/src/main.js')).application.game.realm))throw Error('拖动误入秘境');
    const click=await position(mode);
    await page.mouse.click(click.x,click.y);
    positions.push(await leave(mode));
    // 同一玩法继续从原 UI 卡片进入，入口与交互文案保持不变。
    if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
    await page.locator('#realm-button').click();
    await page.locator(`[data-enter-realm="${mode}"]`).click();
    await leave(mode);
  }
  // 广角镜头及跨周期坐标仍命中同一建筑。
  const sniper=await page.evaluate(async()=>(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.id==='sniper'));
  if(sniper<0)throw Error('没有狙击镜头');
  const wide=await position('tower',sniper,true);await page.mouse.click(wide.x,wide.y);await leave('tower');
  await position('guardian');
  const plaque=page.locator('[data-world-realm="guardian"]');
  await plaque.focus();await page.keyboard.press('Enter');
  await page.reload();
  if(!await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    return g.realm?.mode==='guardian' && g.realm.phase==='build' && g.state==='realm';
  }))throw Error('建筑进入的秘境刷新未恢复');
  await leave('guardian');
  // 手机不同宽度、昼夜同屏检查，包含角色、怪物、载具和地形。
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [320,390,580]) {
    await page.setViewportSize({width,height:960});
    for(const mode of ['rogue','tower','guardian']) for(const time of ['day','night']) {
      await position(mode);
      await page.evaluate(async(time)=>{
        const a=(await import('/src/main.js')).application,g=a.game;
        a.environment.time=time;a.environment.weather='sun';
        g.summonVehicle();g.spawnEnemy(0,0,{x:g.player.x-100,y:g.player.y+70});
        a.renderer.draw();a.refresh();
      },time);
      await page.waitForTimeout(100);
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面横向溢出');
      await page.screenshot({path:`output/playwright/realm-entrances/${mode}-${time}-${width}.png`});
    }
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {modes:3,worldClicks:4,existingMenuEntries:3,keyboardEntry:true,reloadCheckpoint:true,forestRestores:positions,errors};
}
