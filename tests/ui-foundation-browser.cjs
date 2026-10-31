// 手机专项验收：使用隔离触屏环境，检查共享底板、真实设置交互及昼夜同屏。
async page => {
  if (new URL(page.url()).port !== '4318') throw Error('仅限隔离验收端口 4318');
  const context = await page.context().browser().newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2});
  const p = await context.newPage(), errors = [], checks = [];
  p.on('pageerror', error => errors.push(error.message));
  // 边界检查取实际 DOM，不把样板中的演示文案作为游戏状态。
  async function inspect(id) {
    return p.evaluate(async id => (await import('/src/rendering/visual-review.js')).inspectUiFoundation(document,id), id);
  }
  try {
    await p.goto('http://localhost:4318/ui-foundation.html');
    await p.evaluate(() => document.fonts.ready);
    for (const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390]]) {
      await p.setViewportSize({width,height});
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`样板溢出 ${width}`);
      await p.screenshot({path:`output/playwright/ui-foundation/sample-${width}.png`,fullPage:true});
      await p.locator('#preview-go').tap();
      const compact = await inspect('preview-dialog');
      if (compact.overflow || compact.bodyOverflow || !compact.closeTarget) throw Error(`紧凑底板溢出 ${width}`);
      if (await p.evaluate(() => document.activeElement.id) !== 'confirm-cancel') throw Error('确认默认焦点未停在取消');
      await p.locator('#confirm-ok').tap();
      if (!(await p.locator('#preview-status').innerText()).includes('出发确认完成')) throw Error('确认操作无反馈');
      await p.locator('#preview-full').tap();
      const full = await inspect('preview-dialog');
      if (full.overflow || full.bodyOverflow) throw Error(`全屏底板溢出 ${width}`);
      const fullSize=await p.locator('#preview-dialog').boundingBox();
      if (Math.abs(fullSize.height-height)>1||Math.abs(fullSize.width-width)>1) throw Error('全屏尺寸错误');
      await p.screenshot({path:`output/playwright/ui-foundation/full-${width}.png`});
      await p.locator('#confirm-close').tap();
      checks.push({width,height,compact,full});
    }
    await p.setViewportSize({width:390,height:844});
    await p.locator('#preview-light').tap();
    await p.screenshot({path:'output/playwright/ui-foundation/sample-night-390.png',fullPage:true});
    await p.locator('#preview-danger').tap();
    await p.locator('#confirm-cancel').tap();
    await p.locator('#preview-go').focus();
    await p.keyboard.press('Tab');
    await p.keyboard.press('Shift+Tab');
    if (await p.locator('#preview-go').evaluate(node=>getComputedStyle(node).outlineStyle) === 'none') throw Error('键盘焦点缺失');
    await p.emulateMedia({reducedMotion:'reduce'});
    if (await p.locator('#preview-go').evaluate(node=>getComputedStyle(node).transitionDuration) !== '0s') throw Error('减少动态未生效');
    await p.emulateMedia({reducedMotion:'no-preference'});

    await p.goto('http://localhost:4318/');
    await p.waitForFunction(() => !document.getElementById('start').disabled);
    await p.evaluate(async () => {
      (await import('/src/main.js')).application.destroy();
      const progress=(await import('/src/progression/progress.js')).freshProgress();
      progress.arrival={version:2,phase:'complete',keys:true};
      progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
      progress.mainline.phase='complete';progress.living.position={x:1600,y:400};
      progress.vehicleHulls[0]=1;progress.vehicleIndex=0;
      localStorage.setItem('forest-patrol-v1',JSON.stringify(progress));
      localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
    });
    await p.reload();
    await p.waitForFunction(() => !document.getElementById('start').disabled);
    await p.locator('#title-settings').tap();
    await p.screenshot({path:'output/playwright/ui-foundation/title-settings-390.png'});
    await p.locator('#settings-done').tap();
    await p.locator('#start').tap();
    await p.evaluate(async () => {
      window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
      a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.vehicle.active=true;
      a.game.spawnEnemy(0,0,{x:a.game.player.x+130,y:a.game.player.y+55},{ambient:true});a.refresh();
    });
    for (const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390]]) for (const phase of ['day','night']) {
      // 原战场为竖版；横屏专项验证已打开底板在旋转后的排版，不扩大到 HUD 重排。
      if(width>height){await p.setViewportSize({width:390,height:844});await p.locator('#settings-button').tap();}
      await p.setViewportSize({width,height});
      await p.evaluate(async phase => {
        const e=a.environment;e.livingPreview=true;e.time=phase;e.weather='sun';e.autoWeather=false;
        a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
        a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);
        a.renderer.camera.time=null;a.renderer.draw();
      },phase);
      await p.screenshot({path:`output/playwright/ui-foundation/field-${width}-${phase}.png`});
      if(width<=height)await p.locator('#settings-button').tap();
      const result=await inspect('settings-dialog');
      if (result.overflow || result.bodyOverflow || !result.closeTarget || result.borderWidth!=='3px' || result.background!=='rgb(255, 246, 220)') throw Error(`设置底板错误 ${width}/${phase}: ${JSON.stringify(result)}`);
      const before=await p.locator('#pause-on-blur').isChecked();
      await p.locator('#pause-on-blur').setChecked(!before);
      if (await p.locator('#pause-on-blur').isChecked()===before) throw Error('真实设置开关不可用');
      await p.locator('#pause-on-blur').setChecked(before);
      await p.screenshot({path:`output/playwright/ui-foundation/settings-${width}-${phase}.png`});
      // 短屏滚到底部后，标题和返回按钮仍留在可见范围。
      await p.locator('.settings-scroll').evaluate(node=>node.scrollTop=node.scrollHeight);
      for (const id of ['close-settings','settings-done']) {
        const box=await p.locator(`#${id}`).boundingBox();
        if (!box || box.y<0 || box.y+box.height>height+1 || box.height<44) throw Error(`固定操作不可达 ${id}/${width}`);
      }
      await p.locator('#settings-done').tap();
      await p.waitForFunction(()=>!document.getElementById('settings-dialog').open);
      // 原生 close 事件异步恢复游戏，等待回调而非在 open 刚变化时抢读状态。
      await p.waitForFunction(()=>a.game.state!=='paused',null,{timeout:3000});
      checks.push({width,height,phase,...result});
    }
    await p.setViewportSize({width:390,height:844});
    await p.locator('#settings-button').tap();
    await p.locator('#help').tap();
    const help=await inspect('help-dialog');
    if(help.overflow||help.background!=='rgb(255, 246, 220)')throw Error('帮助底板未统一');
    await p.screenshot({path:'output/playwright/ui-foundation/help-390.png'});
    await p.locator('#help-ok').tap();
    await p.locator('#settings-done').tap();
    // 模拟宿主提供的刘海和底部安全区，确认原生居中不会侵入顶部区域。
    await p.evaluate(()=>{document.documentElement.style.setProperty('--ui-safe-top','44px');document.documentElement.style.setProperty('--ui-safe-bottom','34px');});
    await p.locator('#settings-button').tap();
    const safe=await p.locator('#settings-dialog').boundingBox();
    if(safe.y<44||safe.y+safe.height>810)throw Error('底板侵入手机安全区');
    await p.screenshot({path:'output/playwright/ui-foundation/safe-area-390.png'});
    await p.locator('#settings-done').tap();
    await p.evaluate(()=>{document.documentElement.style.removeProperty('--ui-safe-top');document.documentElement.style.removeProperty('--ui-safe-bottom');});
    // 奖励采用内部纸页，外层倒计时不叠第二层底板。
    await p.evaluate(()=>a.game.onEvent('task-reward',{title:'巡游物资',reward:{coins:60,wood:20}}));
    await p.locator('#task-reward-dialog').waitFor({state:'visible'});
    await p.locator('#task-reward-title').tap();
    const reward=await p.locator('.task-reward-panel').evaluate(node=>({background:getComputedStyle(node).backgroundColor,border:getComputedStyle(node).borderTopColor}));
    if(reward.background!=='rgb(255, 246, 220)'||reward.border!=='rgb(49, 92, 67)')throw Error('奖励内页未使用通用底板');
    await p.screenshot({path:'output/playwright/ui-foundation/reward-390.png'});
    await p.locator('#task-reward-close').tap();
    const surfaces=await p.evaluate(()=>Array.from(document.querySelectorAll('dialog')).map(node=>({id:node.id,background:getComputedStyle(node).backgroundColor,border:getComputedStyle(node).borderTopColor,radius:getComputedStyle(node).borderTopLeftRadius})));
    if(errors.length)throw Error(errors.join('\n'));
    if(surfaces.some(surface=>surface.id!=='task-reward-dialog'&&(surface.background!=='rgb(255, 246, 220)'||surface.border!=='rgb(49, 92, 67)')))throw Error('存在未统一的弹窗底板');
    return {designCriterion:'ui-foundation',checks,help,safe,reward,surfaces,errors,mobileOnly:true};
  } finally { await context.close(); }
}
