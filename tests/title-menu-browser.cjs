// 隔离端口验证首页、清档与特殊玩法恢复，使用正式应用和真实浏览器存储。
async (page) => {
  if(new URL(page.url()).port!=='4186')throw Error('仅允许本任务隔离端口');
  const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  // 每次卸载后再布置存档；故障只注入本应用的Storage适配器。
  async function mount(raw=null,mode='normal') {
    await page.evaluate(async({raw,mode})=>{
      (window.menuApp||(await import('/src/main.js')).application).destroy();localStorage.clear();localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');
      if(raw!==null)localStorage.setItem('forest-patrol-v1',typeof raw==='string'?raw:JSON.stringify(raw));
      const {createApplication}=await import('/src/app/create-app.js');
      const getStorage=()=>{if(mode==='denied')throw Error('blocked');return {getItem:k=>localStorage.getItem(k),removeItem:k=>localStorage.removeItem(k),setItem:(k,v)=>{if(mode==='quota'&&k==='forest-patrol-v1')throw Error('quota');localStorage.setItem(k,v);}};};
      window.menuApp=createApplication({getStorage});
    },{raw,mode});
  }
  // 所有断言直接读取正式状态，不通过另一个测试菜单实现。
  async function check(name,fn){if(!await page.evaluate(fn))throw Error(name);checks.push(name);}
  await mount();
  await check('未开始不创建成长存档',()=>localStorage.getItem('forest-patrol-v1')===null&&menuApp.menu.page==='title'&&document.getElementById('start').textContent==='开始游戏');
  await page.locator('#title-settings').click();await page.locator('#help').click();await page.locator('#help-ok').click();await page.locator('#settings-done').click();
  await check('首页设置与嵌套帮助不启动游戏',()=>menuApp.game.state==='ready'&&!localStorage.getItem('forest-patrol-v1'));
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');
  await check('开始后才创建存档',()=>menuApp.menu.page==='game'&&!!localStorage.getItem('forest-patrol-v1'));
  await page.evaluate(()=>{menuApp.game.progress.coins=4321;menuApp.game.wave=9;menuApp.game.player.hp=71;menuApp.game.pause();menuApp.refresh();});
  await page.locator('#overlay-settings').click();await page.locator('#settings-home').click();
  await check('返回菜单保留成长与现场',()=>menuApp.menu.page==='title'&&menuApp.game.progress.coins===4321&&menuApp.game.player.hp===71);
  const frozen=await page.evaluate(()=>({time:menuApp.game.time,wave:menuApp.game.wave,coins:menuApp.game.progress.coins,state:menuApp.game.state}));
  await page.evaluate(()=>{document.getElementById('title-name').tabIndex=-1;document.getElementById('title-name').focus();});
  await page.keyboard.press('Space');await page.keyboard.press('e');await page.waitForTimeout(250);
  const after=await page.evaluate(()=>({time:menuApp.game.time,wave:menuApp.game.wave,coins:menuApp.game.progress.coins,state:menuApp.game.state}));
  if(JSON.stringify(frozen)!==JSON.stringify(after))throw Error('菜单期间仍在推进游戏');checks.push('菜单冻结模拟和键盘');
  if(!await page.locator('#settings-dialog').isVisible())await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await check('清档默认焦点在取消',()=>document.activeElement.id==='cancel-reset');await page.keyboard.press('Escape');
  await check('取消不清档',()=>menuApp.game.progress.coins===4321);
  if(!await page.locator('#settings-dialog').isVisible())await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
  await check('确认清档回首页',()=>menuApp.menu.page==='title'&&menuApp.game.progress.coins===0);await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');
  const old=await page.evaluate(async()=>{const {freshProgress}=await import('/src/progression/progress.js');const p=freshProgress();p.coins=2468;delete p.patrol;return p;});
  await mount(old);await check('旧成长档可继续且未打开即重写',()=>menuApp.menu.saveStatus==='valid'&&menuApp.game.progress.coins===2468&&!JSON.parse(localStorage.getItem('forest-patrol-v1')).patrol);
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');await check('旧档继续保留成长',()=>menuApp.game.progress.coins===2468&&menuApp.game.state==='playing');
  await page.evaluate(()=>{menuApp.game.wave=9;menuApp.game.player.hp=0;menuApp.game.state='dead';menuApp.save();menuApp.refresh();});
  const dead=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));await mount(dead);await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');
  await check('死亡存档继续仍显示死亡页',()=>menuApp.game.state==='dead'&&!document.getElementById('overlay').hidden);
  await page.locator('#resume').click();await check('重新出发沿用死亡回退并保留成长',()=>menuApp.game.wave===6&&menuApp.game.progress.coins===2468);
  await mount('{broken');await check('损坏存档禁用继续并保留原文',()=>document.getElementById('start').disabled&&localStorage.getItem('forest-patrol-v1')==='{broken');
  await page.locator('#title-settings').click();await page.locator('#settings-done').click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  await check('设置与离页不覆盖损坏存档',()=>localStorage.getItem('forest-patrol-v1')==='{broken');
  await mount(old,'quota');if(!await page.locator('#settings-dialog').isVisible())await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
  await check('写入失败不清档不关确认',()=>menuApp.game.progress.coins===2468&&document.getElementById('settings-dialog').open&&!document.getElementById('reset-error').hidden);
  await page.locator('#cancel-reset').click();await page.locator('#settings-done').click();await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');await page.evaluate(()=>{menuApp.game.pause();menuApp.refresh();});await page.locator('#overlay-settings').click();await page.locator('#settings-home').click();
  await check('保存失败保留战场',()=>menuApp.menu.page==='game'&&menuApp.game.progress.coins===2468);
  await mount(null,'denied');await check('无存储权限明确提示临时游玩',()=>document.getElementById('start').textContent==='开始游戏'&&!document.getElementById('title-save-warning').hidden);
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');await check('临时游玩不写入成长',()=>menuApp.game.state==='playing'&&localStorage.getItem('forest-patrol-v1')===null);
  await mount();await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');
  // 强制选牌页不提供设置入口；直接调用正式保存生命周期验证选牌状态的序列化。
  await page.evaluate(()=>{menuApp.game.enterRealm('rogue');menuApp.refresh();});
  await page.evaluate(()=>menuApp.menu.home());
  const realm=await page.evaluate(()=>JSON.stringify(menuApp.game.realm));await page.waitForTimeout(300);
  if(await page.evaluate(()=>JSON.stringify(menuApp.game.realm))!==realm)throw Error('秘境菜单阶段仍推进');
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');await check('秘境必选面板原样恢复',()=>!!menuApp.game.realm&&document.getElementById('realm-dialog').open);checks.push('秘境菜单冻结');
  await page.evaluate(()=>{const g=menuApp.game;for(const kind of ['weapon','vehicle','turret'])g.rollRealmEquipment(kind);g.readyRealm();menuApp.refresh();});
  await page.evaluate(()=>menuApp.menu.home());
  await check('祝福选择在菜单中保留',()=>menuApp.game.realm.phase==='choice'&&menuApp.menu.page==='title');
  const realmSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));await mount(realmSave);
  await check('刷新后的秘境不抢开首页弹窗',()=>menuApp.menu.page==='title'&&!document.querySelector('dialog[open]'));
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');await check('继续存档恢复必选祝福',()=>menuApp.game.realm.phase==='choice'&&document.getElementById('realm-dialog').open);
  await mount();await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');
  await page.evaluate(()=>{const g=menuApp.game;g.enterRealm('guardian');g.realm.phase='rest';g.realm.restRemaining=12;g.state='realm';menuApp.refresh();});
  await page.locator('#realm-button').click();await page.locator('#close-realm').click();await page.keyboard.press('Escape');await page.locator('#overlay-settings').click();await page.locator('#settings-home').click();
  const rest=await page.evaluate(()=>menuApp.game.realm.restRemaining);await page.waitForTimeout(300);
  if(await page.evaluate(()=>menuApp.game.realm.restRemaining)!==rest)throw Error('休整在菜单倒计时');
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');await page.waitForTimeout(180);
  await check('守护休整继续后恢复倒计时',()=>menuApp.game.state==='realm'&&menuApp.game.realm.restRemaining<12);

  await mount();await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');
  await page.evaluate(()=>{menuApp.game.enterStory('sunleaf-01','sunleaf-post');menuApp.game.advanceStoryDialogue(true);menuApp.refresh();});
  await page.locator('#story-close').click();await page.locator('#settings-button').click();await page.locator('#settings-home').click();
  const story=await page.evaluate(()=>JSON.stringify(menuApp.game.story));await page.waitForTimeout(300);
  if(await page.evaluate(()=>JSON.stringify(menuApp.game.story))!==story)throw Error('剧情菜单阶段仍推进');
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');if(!await page.locator('#story-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();await check('剧情准备面板原样恢复',()=>!!menuApp.game.story&&document.getElementById('story-dialog').open);checks.push('剧情菜单冻结');
  await mount();await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');
  await page.evaluate(()=>{menuApp.game.enterStory('sunleaf-01','sunleaf-post');menuApp.refresh();menuApp.menu.home();});
  const dialogue=await page.evaluate(()=>({phase:menuApp.game.story.phase,line:menuApp.game.story.line,key:menuApp.game.story.dialogue}));
  await page.waitForTimeout(400);
  if(JSON.stringify(await page.evaluate(()=>({phase:menuApp.game.story.phase,line:menuApp.game.story.line,key:menuApp.game.story.dialogue})))!==JSON.stringify(dialogue))throw Error('对白在菜单继续推进');
  checks.push('剧情对白在菜单停止阅读计时');
  const storySave=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));await mount(storySave);
  await check('剧情存档刷新先停留首页',()=>menuApp.menu.page==='title'&&!!menuApp.game.story&&!document.querySelector('dialog[open]'));
  await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');await check('继续恢复剧情对白',()=>menuApp.menu.page==='game'&&!!menuApp.game.story.dialogue);
  await mount();
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,checks,errors};
}
