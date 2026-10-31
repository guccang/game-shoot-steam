// 在隔离端口购买猫并进入章节，记录正式绘制器参数，覆盖换装备、恢复和昼夜显示。
async page => {
  if (new URL(page.url()).port !== '4280') throw Error('仅允许隔离端口4280');
  const errors = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  // 只在验收浏览器包装正式绘制函数；原函数和资源仍完整执行，不修改运行文件。
  await page.route('**/src/rendering/characters.js', async route => {
    const response = await route.fetch();
    let body = (await response.text()).replace('export function drawCat(', 'function originalDrawCat(')
      .replace('export function drawRiderWeapon(', 'function originalDrawRiderWeapon(');
    body += `
      // 记录一次正式画面中的身份与借用武器参数。
      export function drawCat(...args) {
        globalThis.__selectedCatTrace?.push({kind:'body',x:args[1],y:args[2],hero:args[3],weapon:args[7]});
        return originalDrawCat(...args);
      }
      // 记录直升机单独绘制的小手身份。
      export function drawRiderWeapon(...args) {
        globalThis.__selectedCatTrace?.push({kind:'hands',x:args[1].x,hero:args[2],weapon:args[3]});
        return originalDrawRiderWeapon(...args);
      }
    `;
    await route.fulfill({response, body});
  });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const p = (await import('/src/progression/progress.js')).freshProgress();
    p.mainline.completed = (await import('/src/config/mainline.js')).MAINLINE_IDS;
    p.mainline.phase = 'complete';
    localStorage.clear();
    localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
    localStorage.setItem('forest-patrol-gameplay-v1', JSON.stringify({pauseOnBlur:false}));
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => { await (await import('/src/main.js')).application.ready; });
  // 逐一走实际购买与任务入口；章节固定属性不能跟随高等级永久角色改变。
  results.push(await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    const {HEROES} = await import('/src/config/heroes.js');
    const {STORY_LOADOUTS} = await import('/src/config/story.js');
    const samples = [];
    g.progress.coins = g.progress.wood = 100000;
    g.arrivalScene = null;
    for (let hero = 0; hero < HEROES.length; hero++) {
      if (g.story) g.leaveStory();
      g.state = 'playing';
      if (!g.transact('heroes', hero, hero ? 'buy' : 'equip')) throw Error('购买失败');
      g.progress.heroes[hero] = 20;
      Object.assign(g.player, {x:970,y:790});
      if (!g.enterStory('sunleaf-01', 'sunleaf-post')) throw Error('进入章节失败');
      g.advanceStoryDialogue(true);
      for (const spec of STORY_LOADOUTS) {
        Object.assign(g.story, {stageId:'Q10',phase:'prepare',dialogue:null});
        if (!g.chooseStoryLoadout(spec.id)) throw Error('选择借用装备失败');
        g.startStoryStage();
        g.vehicle.active = false;
        g.state = 'paused';
        g.player.invincible = 0;
        for (const d of document.querySelectorAll('dialog[open]')) d.close();
        a.refresh();
        globalThis.__selectedCatTrace = [];
        a.renderer.draw();
        const calls = globalThis.__selectedCatTrace.filter(c => c.kind === 'body' && Math.abs(c.x-g.player.x)<.01);
        globalThis.__selectedCatTrace = null;
        const name = document.getElementById('player-name').textContent;
        if (!calls.length || calls.some(c => c.hero !== hero || c.weapon !== spec.weapon)) throw Error('身体身份或借用武器错误：'+JSON.stringify({hero,spec:spec.id,calls}));
        if (!name.includes(HEROES[hero].name) || g.maxHp() !== 120 || g.loadout.heroes[g.loadout.hero] !== 1) throw Error('名称或固定成长错误');
        const inspected = (await import('/src/rendering/visual-review.js')).inspectSelectedCat(g,document);
        samples.push({hero, loadout:spec.id, name, hp:g.maxHp(), calls, inspected});
      }
    }
    // 单独验证直升机驾驶小手，不改变正式章节配置表。
    const previous = g.vehicle, index = g.loadout.vehicleIndex;
    g.loadout.vehicleIndex = 5; g.vehicle = g.vehicles[5]; g.vehicle.active = true;
    globalThis.__selectedCatTrace = [];
    a.renderer.draw();
    const hands = globalThis.__selectedCatTrace.filter(c => c.kind === 'hands');
    globalThis.__selectedCatTrace = null;
    if (!hands.length || hands.some(c => c.hero !== g.progress.hero)) throw Error('驾驶小手变为默认猫');
    g.vehicle.active = false; g.vehicle = previous; g.loadout.vehicleIndex = index;
    g.syncStory(); a.save();
    return {samples, hands, selected:g.progress.hero};
  }));
  await page.reload();
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; await a.ready;
    if (!a.game.story || a.game.progress.hero !== 5) throw Error('章节恢复丢失已购角色');
    a.game.vehicle.active = false; a.game.state = 'paused';
    a.refresh(); globalThis.__selectedCatTrace = []; a.renderer.draw();
    const body = globalThis.__selectedCatTrace.filter(c => c.kind === 'body' && Math.abs(c.x-a.game.player.x)<.01);
    globalThis.__selectedCatTrace = null;
    if (!body.length || body.some(c => c.hero !== 5)) throw Error('恢复后绘制默认猫');
  });
  // 正式场景按手机与桌面昼夜取样；不增添或替换角色美术。
  for (const [width,height] of [[320,568],[390,844],[1280,900]]) {
    await page.setViewportSize({width,height});
    for (const time of ['day','night']) {
      await page.evaluate(async time => {
        const a = (await import('/src/main.js')).application, g = a.game;
        for (const d of document.querySelectorAll('dialog[open]')) d.close();
        Object.assign(g.story, {stageId:'Q20', phase:'active', dialogue:null, trial:null});
        Object.assign(g.player, {x:2550,y:2450,invincible:0});
        g.vehicle.active = false; g.state = 'playing'; g.attackTimer = 999; g.enemies = [];
        Object.assign(a.environment, {time,autoTime:false,weather:'sun',autoWeather:false});
        const phase = (await import('/src/config/living-world.js')).LIVING_PHASES.find(p => p.id === time);
        g.progress.living.calendar = {day:1,elapsed:phase.start+phase.duration/2};
        a.renderer.light = new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
        a.renderer.tone = new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-20000);
        a.refresh();
      }, time);
      await page.waitForTimeout(350);
      await page.screenshot({path:`output/playwright/selected-cat/${width}-${time}.png`});
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('页面横向溢出');
    }
  }
  results.push(await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.leaveStory(); a.refresh();
    if (a.game.progress.hero !== 5) throw Error('暂离章节丢失角色');
    return {leftStory:true,selected:a.game.progress.hero,name:document.getElementById('player-name').textContent};
  }));
  if (errors.length) throw Error(errors.join('\n'));
  return {designCriterion:'selected-cat-story-identity',results,errors};
}
