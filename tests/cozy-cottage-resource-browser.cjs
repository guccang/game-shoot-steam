// 隔离页面拦截必需图片，验证加载失败有明确提示且不绘制旧小屋。
async page=>{
  const failure=await page.context().newPage();
  try{
    await failure.route('**/assets/cozy-cottage/cottage.png',route=>route.abort());
    await failure.goto(new URL('/',page.url()).href);
    const status=failure.locator('#title-startup-error');await status.waitFor({state:'visible'});
    const text=await status.innerText();if(!text.trim())throw Error('缺失资源没有可见错误');
    const state=await failure.evaluate(async()=>({asset:(await import('/src/rendering/cozy-cottage.js')).cozyCottageStatus(),canvas:!!document.querySelector('canvas')?.width}));
    if(state.asset.ready)throw Error('资源失败却通过验收');return {visibleError:text,asset:state.asset};
  }finally{await failure.close();}
}
