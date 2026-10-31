// 隔离端口验收：分类、置顶、折叠改装、解锁持久化和存储失败回滚。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('只允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.destroy();
    const {freshProgress}=await import('/src/game.js');const p=freshProgress();
    p.coins=1000;p.wood=500;p.weapons[0]=4;p.mastery[0]=40;p.mods[0]=1;
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  });
  await page.reload();await page.locator('#start').click();
  await page.locator('#settings-button').click();await page.locator('#debug-toggle').click();
  await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    g.magazines[0].ammo=3;g.magazines[0].remaining=.8;
    window.arsenalBefore={progress:JSON.stringify(g.progress),magazines:JSON.stringify(g.magazines),player:JSON.stringify(g.player)};
    window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('test quota');};
  });
  await page.locator('#unlock-weapons').click();
  if(!(await page.locator('#unlock-feedback').innerText()).includes('失败'))throw Error('失败提示缺失');
  await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    if(JSON.stringify(g.progress)!==arsenalBefore.progress)throw Error('存储失败改变了成长');
    Storage.prototype.setItem=realSet;
  });
  await page.locator('#unlock-weapons').click();
  if(!await page.locator('#unlock-weapons').isDisabled())throw Error('重复解锁未禁用');
  await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game,p=g.progress,b=JSON.parse(arsenalBefore.progress);
    if(p.weapons.some(n=>n<1)||p.weapons[0]!==4||p.mastery[0]!==40||p.mods[0]!==1)throw Error('解锁覆盖成长');
    if(p.coins!==b.coins||p.wood!==b.wood||p.weapon!==b.weapon||p.bosses!==b.bosses)throw Error('解锁改变装备或资源');
    if(JSON.stringify(g.magazines)!==arsenalBefore.magazines||JSON.stringify(g.player)!==arsenalBefore.player)throw Error('解锁改变战斗');
    if(JSON.stringify(p)!==localStorage.getItem('forest-patrol-v1'))throw Error('未保存');
  });
  await page.screenshot({path:'output/playwright/arsenal-settings-390.png'});
  await page.locator('#close-settings').click();await page.locator('#weapons-button').click();
  for(const category of ['standard','heavy','elemental','automated','all']){
    await page.locator(`[data-category="${category}"]`).click();
    const ids=await page.locator('#inventory [data-portrait]').evaluateAll(nodes=>nodes.map(n=>+n.dataset.portrait));
    if(ids[0]!==0||new Set(ids).size!==ids.length)throw Error('置顶去重失败');
    const expected=category==='all'?14:category==='standard'?3:category==='heavy'?5:category==='elemental'?6:3;
    if(ids.length!==expected)throw Error('分类数量错误 '+category+':'+ids.length);
  }
  await page.locator('[data-category="heavy"]').click();
  await page.locator('[data-action="equip"][data-index="9"]').click();
  if(await page.locator('#inventory [data-portrait]').first().getAttribute('data-portrait')!=='9')throw Error('换枪未置顶');
  await page.locator('[data-category="standard"]').click();
  if(await page.locator('#inventory [data-portrait]').first().getAttribute('data-portrait')!=='9')throw Error('跨分类装备丢失');
  await page.locator('[data-weapon-details="0"] summary').click();
  await page.locator('[data-mod="2"][data-index="0"]').click();
  if(await page.locator('[data-mod="2"][data-index="0"]').getAttribute('aria-pressed')!=='true')throw Error('折叠改装失效');
  await page.locator('[data-category="automated"]').click();await page.locator('[data-action="equip"][data-index="12"]').click();
  await page.locator('[data-funnel-config]').click();
  if(!await page.locator('#funnel-dialog').isVisible())throw Error('浮游炮配置无法打开');
  await page.locator('#close-funnel').click();
  for(const width of [320,390,580]){
    await page.setViewportSize({width,height:width===320?568:844});
    await page.locator('[data-category="automated"]').click();
    await page.locator('#camp-dialog').evaluate(d=>d.scrollTop=0);
    const size=await page.locator('#camp-dialog').evaluate(d=>({scroll:d.scrollWidth,width:d.clientWidth}));
    if(size.scroll>size.width+1)throw Error('横向溢出 '+width);
    await page.screenshot({path:`output/playwright/arsenal-categories-${width}.png`});
  }
  await page.reload();await page.locator('#weapons-button').click();
  if(await page.locator('#inventory [data-portrait]').first().getAttribute('data-portrait')!=='12')throw Error('刷新装备未置顶');
  await page.locator('#close-camp').click();await page.locator('#settings-button').click();await page.locator('#debug-toggle').click();
  if(!await page.locator('#unlock-weapons').isDisabled())throw Error('刷新丢失解锁');
  await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
  await page.locator('#settings-button').click();await page.locator('#debug-toggle').click();
  if(await page.locator('#unlock-weapons').isDisabled())throw Error('重置后无法再次解锁');
  await page.locator('#close-settings').click();
  if(errors.length)throw Error(errors.join('\n'));
  return {unlock:true,storageFailureAtomic:true,save:true,categories:5,pinned:true,mods:true,funnel:true,widths:[320,390,580],reset:true,errors};
}
