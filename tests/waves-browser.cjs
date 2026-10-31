// 浏览器验证清波界面、休整暂停、密集怪潮、死亡结算与回退三波重新出发。
async (page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // 仅修改隔离浏览器收到的模块响应以操作同一游戏实例，正式源码不暴露测试入口。
  await page.route('**/src/main.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nwindow.__waveTest={game:application.game,updateUI:application.refresh};'});});
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#start').click();
  if(!(await page.locator('#wave-label').innerText()).includes('第 1 波'))throw Error('缺少首波显示');
  await page.evaluate(()=>{
    const {game:g,updateUI}=window.__waveTest;g.player.invincible=999;g.attackTimer=999;
    while(g.waveSpawned<12)g.updateWaves(2);
    for(const e of g.enemies)g.hit(e,99999);
    g.updateWaves(.01);updateUI();
  });
  if(await page.locator('#quest-title').innerText()!=='第 1 波完成')throw Error('清波提示错误');
  await page.locator('#pause').click();const rest=await page.evaluate(()=>window.__waveTest.game.waveRest);
  await page.waitForTimeout(200);if(await page.evaluate(()=>window.__waveTest.game.waveRest)!==rest)throw Error('暂停未冻结休整');
  await page.locator('#resume').click();await page.waitForFunction(()=>window.__waveTest.game.wave===2,null,{timeout:6000});
  if(!(await page.locator('#wave-label').innerText()).includes('第 2 波'))await page.waitForFunction(()=>document.getElementById('wave-label').textContent.includes('第 2 波'));
  await page.evaluate(async()=>{
    const {waveDifficulty}=await import('/src/config/waves.js');const {game:g,updateUI}=window.__waveTest;
    while(g.wave<5){const d=waveDifficulty(g.wave);while(g.waveSpawned<d.total)g.updateWaves(d.interval);for(const e of g.enemies)if(e.hp>0)g.hit(e,99999);g.updateWaves(.01);g.updateWaves(3);}
    const d=waveDifficulty(g.wave);while(g.waveSpawned<d.total)g.updateWaves(d.interval);
    // 正常推进六秒，让怪潮进入视野；只关闭测试玩家伤害，保留追击和碰撞。
    g.player.invincible=999;g.attackTimer=999;for(let i=0;i<120;i++)g.update(.05);updateUI();
  });
  if(!(await page.locator('#quest-detail').innerText()).includes('2.36'))throw Error('成长倍率未显示');
  if(!(await page.locator('#quest-count').innerText()).endsWith('/ 28'))throw Error('第五波配额错误');
  await page.screenshot({path:'output/playwright/survival-wave-five.png'});
  await page.setViewportSize({width:320,height:568});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight))throw Error('手机界面溢出');
  const saved=await page.evaluate(()=>{const {game:g,updateUI}=window.__waveTest;g.player.invincible=0;g.hurt(999999);updateUI();return JSON.stringify({...g.progress,patrol:null});});
  if(!(await page.locator('#overlay-text').innerText()).includes('回到第 2 波'))throw Error('死亡结算波次错误');
  await page.screenshot({path:'output/playwright/survival-death-mobile.png'});
  await page.locator('#resume').click();
  const result=await page.evaluate(()=>({wave:window.__waveTest.game.wave,waveKills:window.__waveTest.game.waveKills,state:window.__waveTest.game.state,progress:JSON.stringify({...window.__waveTest.game.progress,patrol:null})}));
  if(result.wave!==2||result.waveKills!==0||result.state!=='playing'||result.progress!==saved)throw Error('重开波次或成长错误');
  await page.unroute('**/src/main.js');await page.reload();if(errors.length)throw Error(errors.join(';'));
  return {clearAndAdvance:true,pauseFreezesRest:true,waveFiveScaling:true,deathAndRestart:true,mobileOverflow:false,errors};
}
