// 通过真实游戏更新打空弹夹，验证换弹图标、进度、暂停恢复及手机布局。
async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.locator('#start').click();
  const initial=await page.evaluate(async()=>{
    const {application:a}=await import('/src/main.js');a.destroy();const g=a.game;
    g.progress.weapon=0;g.reset();g.state='playing';g.random=()=>.5;
    g.trees=[];g.enemies=[];g.spawnTimer=999;g.attackTimer=0;
    g.addTree(1040,700,{hp:100000,maxHp:100000});
    let frames=0;while(g.magazines[0].remaining===0 && frames++<1000)g.update(1/120);
    if(g.magazines[0].ammo!==0||g.magazines[0].remaining!==1.2)throw Error('真实连射未进入换弹');
    window.reloadTest={a,g};a.refresh();a.renderer.draw();
    return {frames,ammo:document.querySelector('#magazine-hud .ring-count').textContent,time:document.getElementById('magazine-hud').getAttribute('aria-label')};
  });
  if(initial.ammo!=='0'||!initial.time.includes('装填剩余 1.2 秒'))throw Error('换弹提示缺失');
  await page.evaluate(()=>{const {a,g}=reloadTest;for(let i=0;i<60;i++)g.update(1/120,{x:0,y:1});a.refresh();a.renderer.draw();});
  if(await page.locator('#magazine-hud').getAttribute('aria-valuenow')!=='42')throw Error('装填进度错误');
  await page.screenshot({path:'output/playwright/magazine-reloading.png'});
  // 测试已释放动画与事件监听，用生产暂停方法精确冻结模拟时间。
  await page.evaluate(()=>{reloadTest.g.pause();reloadTest.a.refresh();});
  const frozen=await page.evaluate(()=>{const {a,g}=reloadTest;const left=g.magazines[0].remaining;for(let i=0;i<120;i++)g.update(1/120);a.refresh();return left===g.magazines[0].remaining;});
  if(!frozen)throw Error('暂停仍在装填');
  await page.evaluate(()=>{reloadTest.g.pause();reloadTest.a.refresh();});
  await page.evaluate(()=>{const {a,g}=reloadTest;for(let i=0;i<90;i++)g.update(1/120);a.refresh();a.renderer.draw();});
  if(await page.locator('#magazine-hud .ring-count').innerText()!=='11')throw Error('装填完成未恢复自动攻击');
  await page.screenshot({path:'output/playwright/magazine-ready.png'});
  const layouts=[];
  for(const size of [{width:320,height:568},{width:390,height:844},{width:1440,height:900}]){
    await page.setViewportSize(size);
    const result=await page.evaluate(()=>{
      const {a,g}=reloadTest;g.progress.weapons[9]=1;g.transact('weapons',9,'equip');a.refresh();a.renderer.resize();a.renderer.draw();
      const hud=document.querySelector('.bottom-info').getBoundingClientRect(),menu=document.querySelector('.field-menu').getBoundingClientRect(),joy=document.querySelector('.joystick').getBoundingClientRect();
      if(menu.bottom>hud.top||joy.right>hud.left||hud.bottom>innerHeight||document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)throw Error('弹夹UI与操作入口重叠或溢出');
      return {width:innerWidth,height:innerHeight,gap:Math.round(hud.top-menu.bottom)};
    });
    layouts.push(result);
    if(size.width===320)await page.screenshot({path:'output/playwright/magazine-320.png'});
  }
  await page.reload();
  await page.locator('#weapons-button').click();
  const text=await page.locator('#inventory').innerText();
  if(!text.includes('弹夹')||!text.includes('换弹'))throw Error('工坊缺少弹夹参数');
  if(errors.length)throw Error(errors.join(';'));
  return {initial,frozen,resumed:true,layouts,errors};
}
