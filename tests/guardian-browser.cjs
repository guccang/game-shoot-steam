// 在真实战场验证预设格建造、自动收起、重新打开、刷新与局内经济。
async page => {
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离验收端口');
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    (await import('/src/main.js')).application.destroy();
    const {freshProgress}=await import('/src/progression/progress.js');
    localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));
    localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));
  });
  await page.reload();await page.locator('#start').click();
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
  await page.locator('#realm-button').click();await page.locator('[data-enter-realm="guardian"]').click();
  if(await page.locator('.guardian-build-panel').isVisible())throw Error('未选择格位时不应遮挡战场');
  // 先点击空格再选武器，一步放置后立即收起详情。
  await page.locator('[data-guardian-slot="0"]').click();
  if(await page.locator('[data-guardian-equipment]').count()!==1)throw Error('新手武器越权');
  await page.locator('[data-guardian-equipment="weapon:0"]').click();
  if(await page.locator('.guardian-build-panel').isVisible())throw Error('放置武器后未收起面板');
  await page.evaluate(async()=>{const r=(await import('/src/main.js')).application.game.realm;if(r.realmCoins!==100||r.defenses.length!==1)throw Error('放置账目错误');});
  // 重新打开建造栏，载具仍可选择独立炮塔，再直接放在另一个预设格。
  await page.locator('[data-guardian-open]').click();await page.locator('[data-guardian-category="vehicle"]').click();
  await page.locator('[data-guardian-equipment="vehicle:0"]').click();
  if(await page.locator('#guardian-weapon option').count()!==1)throw Error('新手车载武器越权');
  const rect=await page.locator('[data-guardian-slot="2"]').boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width+25,rect.y);await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.up();
  await page.evaluate(async()=>{if((await import('/src/main.js')).application.game.realm.defenses.length!==1)throw Error('拖动误建');});
  await page.locator('[data-guardian-slot="2"]').click();
  if(await page.locator('.guardian-build-panel').isVisible())throw Error('放置载具后未收起面板');
  await page.screenshot({path:'output/playwright/guardian/build-mobile.png'});
  await page.locator('[data-guardian-slot="0"]').click();
  if(!await page.locator('[data-guardian-action="upgrade"]').isDisabled())throw Error('余额不足仍可升级');
  await page.getByRole('button',{name:'关闭格位详情',exact:true}).click();
  if(await page.locator('.guardian-build-panel').isVisible())throw Error('详情叉号没有关闭整个面板');
  await page.reload();
  await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;
    if(g.realm.phase!=='build'||g.realm.realmCoins!==0||g.realm.defenses.length!==2)throw Error('刷新丢失布防');g.random=()=>.45;
  });
  await page.locator('[data-realm-next]').click();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;
    for(let n=0;n<4000&&a.game.realm.phase==='combat';n++)a.game.update(.05);
    if(a.game.realm.phase!=='choice')throw Error('第一波没有自然完成');a.refresh();a.renderer.draw();
  });
  // 波间点击已放置格位查看、升级、回收；全部交易仍只改变秘境币。
  await page.locator('[data-guardian-slot="0"]').click();await page.locator('[data-guardian-action="upgrade"]').click();
  await page.reload();
  await page.evaluate(async()=>{const r=(await import('/src/main.js')).application.game.realm;if(r.realmCoins!==68||r.defenses[0].level!==2)throw Error('升级刷新失败');});
  await page.locator('[data-guardian-slot="0"]').click();await page.locator('[data-guardian-action="remove"]').click();
  if(await page.locator('.guardian-build-panel').isVisible())throw Error('回收后未收起');
  await page.locator('[data-guardian-open]').click();await page.locator('[data-guardian-equipment="weapon:0"]').click();
  await page.locator('[data-guardian-slot="0"]').focus();await page.keyboard.press('Enter');
  if(await page.locator('.guardian-build-panel').isVisible())throw Error('键盘放置未收起');
  await page.locator('[data-guardian-slot="0"]').click();await page.locator('[data-guardian-action="upgrade"]').click();
  await page.locator('[data-guardian-close]').click();await page.screenshot({path:'output/playwright/guardian/upgrade-mobile.png'});
  await page.locator('[data-guardian-wave]').click();await page.locator('[data-realm-blessing="mend"]').click();
  await page.reload();await page.locator('#resume').click();
  await page.locator('[data-guardian-slot="0"]').click();
  if(!await page.locator('[data-guardian-action="upgrade"]').isDisabled())throw Error('战斗中升级不应绕过检查点');
  await page.locator('[data-guardian-close]').click();
  if(await page.locator('.guardian-build-panel').isVisible())throw Error('战斗中关闭面板失败');
  if(!await page.locator('#realm-button').isVisible())await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
  await page.locator('#realm-button').click();await page.locator('[data-realm-exit]').click();
  await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;if(g.realm||g.progress.weapons[0]!==1)throw Error('部署等级带出秘境');});
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:['guardian-ui-economy','guardian-panel-dismiss'],errors,passed:true};
}
