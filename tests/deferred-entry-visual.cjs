// 检查延后进入的正式首屏在桌面、手机和昼夜环境中均完整显示。
async (page) => {
  if(new URL(page.url()).port!=='4276')throw Error('仅允许隔离端口');
  const result=[];
  for(const size of [{width:1280,height:800,name:'desktop'},{width:390,height:844,name:'mobile'}]){
    await page.setViewportSize({width:size.width,height:size.height});
    for(const night of [false,true]){
      await page.evaluate(async night=>{
        entryApp.destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
        const {freshProgress}=await import('/src/progression/progress.js'),{createApplication}=await import('/src/app/create-app.js');
        const p=freshProgress();p.living.position={x:635,y:700};p.living.calendar={day:1,elapsed:night?1100000:400000};
        localStorage.setItem('forest-patrol-v1',JSON.stringify(p));window.entryApp=createApplication();
        entryApp.game.update=()=>{};
      },night);
      await page.locator('#start').click();await page.waitForFunction(()=>entryApp.menu.page==='game');
      await page.waitForTimeout(150);
      const state=await page.evaluate(()=>({time:entryApp.environment.time,trees:entryApp.game.trees.length,tiles:entryApp.renderer.ground.tiles.size}));
      if(state.time!==(night?'night':'day')||!state.tiles||!state.trees)throw Error('昼夜地图首屏未完成');
      await page.screenshot({path:`output/playwright/deferred-entry/entered-${size.name}-${state.time}.png`});result.push({size:size.name,...state});
    }
  }
  return result;
}
