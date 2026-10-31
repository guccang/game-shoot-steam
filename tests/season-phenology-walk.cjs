// 夏季植被最茂盛时真实触控与绕树走位，验证树后透显、侧面通行和前方遮挡。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:'output/playwright/season-phenology/video',size:{width:390,height:844}}});
  const review=await context.newPage();const errors=[];review.on('pageerror',e=>errors.push(e.message));
  await review.goto('http://localhost:4174/');await review.locator('#start').click();
  // 真实触屏点击顶部两图，确认随机变化且不打开暂停面板。
  for(const kind of ['season','weather']) {
    const button=review.locator(`#${kind}-picture`),before=await button.getAttribute('aria-label');
    await button.tap();if(await button.getAttribute('aria-label')===before)throw Error('触屏随机切换未生效');
    if(await review.locator('#settings-dialog').isVisible())throw Error('图片误开设置');
  }
  await review.locator('#settings-button').tap();await review.locator('#environment-button').tap();
  await review.locator('[data-forest-season="summer"]').tap();await review.locator('button[data-weather="sun"]').tap();
  await review.locator('#auto-time').uncheck();await review.locator('#auto-weather').uncheck();
  await review.locator('#environment-ok').tap();await review.locator('#settings-done').tap();
  await review.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;window.review=a;
    const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('猫动画缺失');
    Object.assign(a.environment,{time:'day',weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
    const g=a.game;Object.assign(g.player,{x:940,y:1018,invincible:99});g.enemies=[];g.spawnTimer=999;g.attackTimer=999;
  });
  await review.waitForTimeout(450);await review.screenshot({path:'output/playwright/season-phenology/depth-back.png'});
  await review.keyboard.down('ArrowRight');
  try{await review.waitForFunction(()=>window.review.game.player.x>1040);}finally{await review.keyboard.up('ArrowRight');}
  await review.screenshot({path:'output/playwright/season-phenology/depth-side.png'});
  await review.keyboard.down('ArrowDown');
  try{await review.waitForFunction(()=>window.review.game.player.y>1120);}finally{await review.keyboard.up('ArrowDown');}
  await review.keyboard.down('ArrowLeft');
  try{await review.waitForFunction(()=>window.review.game.player.x<945);}finally{await review.keyboard.up('ArrowLeft');}
  await review.waitForFunction(()=>window.review.game.player.bodyAnimation.moveWeight<.1);
  await review.screenshot({path:'output/playwright/season-phenology/depth-front.png'});
  const motion=await review.evaluate(()=>({moveTime:window.review.game.player.bodyAnimation.moveTime,idleWeight:window.review.game.player.bodyAnimation.moveWeight}));
  if(motion.moveTime<=0)throw Error('移动动画未推进');
  const video=review.video();await context.close();
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:'season-open-space',video:await video.path(),motion,errors};
}
