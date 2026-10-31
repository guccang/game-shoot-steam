// 真实镜头下检查方格点击命中、触摸建造和原生下拉键盘行为，防止 HUD 遮挡造成误操作。
async page => {
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离验收端口');
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    if(g.realm)g.leaveRealm();g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);
    // 展示夹具独立于上一项验收的森林死亡或暂停状态。
    g.state='playing';g.player.hp=g.maxHp();
    if(!g.enterRealm('guardian'))throw Error('守护展示夹具进入失败');g.realm.realmCoins=2000;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());a.refresh();
  });
  const results=[];
  for(const [width,height]of [[1280,900],[1280,720],[390,844],[360,640],[320,568]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.renderer.resize();a.renderer.draw();a.refresh();});
    await page.locator('[data-guardian-open]').click();
    await page.locator('[data-guardian-category="vehicle"]').click();
    await page.locator('[data-guardian-equipment="vehicle:0"]').click();
    // 主场景镜头跟随猫猫逐格移动；每格进入操作区后检查中心与内侧四角实际命中。
    const hits=[];
    for(let slot=0;slot<8;slot++){
      await page.evaluate(async slot=>{
        const a=(await import('/src/main.js')).application;
        const {guardianPads}=await import('/src/config/guardian.js');
        const p=guardianPads(a.game.realm.arena)[slot];
        a.game.player.x=p.x;a.game.player.y=p.y+90;a.renderer.draw();a.refresh();
      },slot);
      await page.waitForTimeout(60);
      hits.push(await page.locator(`[data-guardian-slot="${slot}"]`).evaluate(b=>{
        const r=b.getBoundingClientRect(),hit=[[.5,.5],[.15,.15],[.85,.15],[.15,.85],[.85,.85]].every(([x,y])=>document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)===b);
        return {slot:b.dataset.guardianSlot,hit,width:r.width,height:r.height};
      }));
    }
    if(hits.some(h=>!h.hit||h.width<44||h.height<44))throw Error(`${width}×${height} 方格不可点：${JSON.stringify(hits)}`);
    await page.screenshot({path:`output/playwright/guardian/build-${width}-${height}.png`});
    results.push({width,height,hits});
    await page.locator('[data-guardian-close]').click();
    // 收起后的入口与波间按钮不能超出最小屏幕，也不能互相覆盖。
    for(const phase of ['build','choice']){
      await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.realm.phase=phase;a.refresh();},phase);
      const fits=await page.locator('.guardian-command-bar').evaluate(bar=>{
        const r=bar.getBoundingClientRect();
        return [...bar.querySelectorAll('button,b,small')].every(b=>{const q=b.getBoundingClientRect();return q.left>=r.left&&q.right<=r.right&&b.scrollWidth<=b.clientWidth;});
      });
      if(!fits)throw Error(`${width}×${height} ${phase} 状态条溢出`);
    }
    await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.realm.phase='build';a.refresh();});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-guardian-open]').click();
  await page.locator('[data-guardian-equipment="vehicle:0"]').click();
  await page.locator('#guardian-weapon').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');
  if(await page.locator('#guardian-weapon').inputValue()!=='1')throw Error('原生炮塔下拉的方向键被移动输入吞掉');
  // Chromium 的真实触摸事件通过浏览器输入链产生 click，不直接调用游戏放置方法。
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const rect=await page.locator('[data-guardian-slot="7"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width/2,y:rect.y+rect.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.locator('.guardian-build-panel').waitFor({state:'hidden'});
  await page.evaluate(async()=>{const r=(await import('/src/main.js')).application.game.realm;
    if(r.defenses.length!==1||r.defenses[0].slot!==7||r.defenses[0].weaponIndex!==1||r.realmCoins!==1900)throw Error('真实触摸放置或所选车载武器未生效');
  });
  await cdp.detach();
  return {designCriterion:'guardian-world-build-hit-targets',results,touch:'通过'};
}
