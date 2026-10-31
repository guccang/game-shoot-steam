// 独立触屏上下文验证真实 touch 指针与小尺寸门牌，不影响用户存档。
async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const mobile=await context.newPage();
  try {
    await mobile.goto('http://localhost:4174/');await mobile.bringToFront();await mobile.locator('#start').tap();
    const point=await mobile.evaluate(async()=>{
      const a=(await import('/src/main.js')).application;
      a.game.player.x=1110;a.game.player.y=1010;a.renderer.draw();a.refresh();
      const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();
      return {x:r.left+(1110-v.x)*v.zoom,y:r.top+(860-v.y)*v.zoom};
    });
    await mobile.touchscreen.tap(point.x,point.y);
    if(!await mobile.evaluate(async()=>{const r=(await import('/src/main.js')).application.game.realm;return r?.mode==='rogue'&&r.phase==='loadout'&&r.loadout.weapon===null;})){
      await mobile.screenshot({path:'output/playwright/realm-entrances/touch-failed.png'});
      throw Error('触摸建筑未进入肉鸽 '+JSON.stringify(await mobile.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {state:a.game.state,realm:a.game.realm,view:a.renderer.view,player:{x:a.game.player.x,y:a.game.player.y}};})));
    }
    if(!await mobile.locator('#joystick').isHidden())throw Error('进入后摇杆未释放');
    await mobile.locator('[data-realm-exit]').tap();await mobile.locator('#resume').tap();
    await mobile.locator('[data-world-realm="rogue"]').tap();
    if(!await mobile.locator('[data-realm-roll="weapon"]').isVisible())throw Error('触摸门牌未进入肉鸽');
    return {touchBuilding:true,touchPlaque:true,joystickReleased:true};
  } finally {await context.close();}
}
