// 英文动态文案验收：真实点击进入剧情、秘境和消防，复核两种屏幕尺寸。
async (page) => {
  if(new URL(page.url()).port!=='4198')throw Error('Use isolated port 4198');
  const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4198/?lang=en-US');
  await page.evaluate(async()=>{const {application:a}=await import('/src/main.js');await a.ready;
    if(a.game.story)a.game.leaveStory();if(a.game.realm)a.game.leaveRealm();if(a.game.fireRescue)a.game.dismissFireRescue();a.menu.home();});
  await page.locator('#start').click();
  // 使用实际折叠菜单，保持桌面与触屏入口一致。
  async function menu(selector){if(!await page.locator(selector).isVisible())await page.locator('#field-menu-toggle').click();await page.locator(selector).click();}
  // 两种尺寸检查可见文案及弹窗的横向排版，并保留正式画面。
  async function capture(name,selector='body'){
    for(const width of [1280,390]){
      await page.setViewportSize({width,height:width===1280?900:844});await page.waitForTimeout(100);
      const node=page.locator(selector);if(!await node.isVisible())throw Error(name+' hidden');
      const info=await node.evaluate(n=>({text:n.innerText,overflow:n.tagName==='DIALOG'&&n.scrollWidth>n.clientWidth+2}));
      if(/\p{Script=Han}|\{p\d+\}|\{companion\}/u.test(info.text)||info.overflow)throw Error(name+JSON.stringify(info));
      await page.screenshot({path:`output/playwright/en-${width}-${name}.png`});checks.push(`${width}-${name}`);
    }
  }
  await menu('#story-button');await page.locator('[data-story-command="enter"]').click();
  await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-pause').click();
  await capture('dialogue','#story-speech');
  if(!['Chestnut','Snowball','Mint'].includes(await page.locator('#story-speech-speaker').textContent()))throw Error('Unexpected translated story actor');
  await page.locator('#story-speech-skip').click();await capture('story-loadout','#story-dialog');
  await page.locator('[data-story-loadout="frost-guard"]').click();await page.locator('[data-story-command="start"]').click();
  await capture('story-mission');await menu('#story-button');await page.locator('[data-story-command="leave"]').click();
  for(const mode of ['rogue','tower','guardian','football']){
    await menu('#realm-button');await page.locator(`[data-enter-realm="${mode}"]`).click();
    if(mode==='rogue'){
      await capture('expedition-loadout','#realm-dialog');
      for(const kind of ['weapon','vehicle','turret'])await page.locator(`[data-realm-roll="${kind}"]`).click();
      await page.locator('[data-realm-ready]').click();await capture('blessings','#realm-dialog');
      await page.locator('[data-realm-blessing]').first().click();
    }
    if(mode==='football'){
      await capture('soccer-selection','#realm-dialog');await page.locator('[data-football-start]').click();
    }
    await capture(`${mode}-field`);
    await menu('#realm-button');await capture(`${mode}-status`,'#realm-dialog');
    await page.locator('[data-realm-exit]').click();
  }
  if(await page.locator('#fire-notice [data-fire-open]').isVisible()){await page.locator('#fire-notice [data-fire-open]').click();}else{if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#realm-button').click();await page.locator('[data-enter-realm="fire"]').click();}await page.locator('[data-fire-accept]').click();await capture('fire-dispatch');
  if(await page.locator('#fire-notice [data-fire-open]').isVisible()){await page.locator('#fire-notice [data-fire-open]').click();}else{if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#realm-button').click();await page.locator('[data-enter-realm="fire"]').click();}await capture('fire-mission','#fire-dialog');await page.locator('[data-fire-close]').first().click();
  if(errors.length)throw Error(errors.join('\n'));
  return {checks,errors};
}
