// 延迟入口模块，检查启动前后以及播放器被浏览器限制时的真实首页。
async(page)=>{
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离端口4187');
  const context=await page.context().browser().newContext({viewport:{width:390,height:844}}),p=await context.newPage();
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await p.route('**/src/main.js',async route=>{await gate;await route.continue();});
  // 只限制自动播放，不替换DOM、样式或应用模块。
  await p.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('验收限制自动播放','NotAllowedError'));};});
  // 采集按钮实际位置，模块未就绪也应当显示同一个入口。
  async function sample(){return p.evaluate(()=>['start'].map(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect(),s=getComputedStyle(n);return {id,text:n.textContent,x:r.x,y:r.y,width:r.width,height:r.height,color:s.color,background:s.backgroundColor};}));}
  try{
    await p.goto('http://localhost:4187/',{waitUntil:'commit'});await p.locator('#start').waitFor({state:'visible'});
    await p.waitForFunction(()=>getComputedStyle(document.getElementById('title-menu')).display==='flex'&&getComputedStyle(document.getElementById('start')).backgroundColor==='rgb(49, 92, 67)');
    const before=await sample();await p.screenshot({path:'output/playwright/stable-title-start/startup-pending.png'});release();
    // 开始按钮已提前可点；等待正式模块接管及媒体就绪后再检查受限播放入口。
    await p.evaluate(async()=>{await import('/src/main.js');});await p.locator('#title-video-play').waitFor({state:'visible'});const after=await sample();
    await p.screenshot({path:'output/playwright/stable-title-start/startup-ready.png'});
    if(JSON.stringify(before)!==JSON.stringify(after))throw Error('启动布局变化 '+JSON.stringify({before,after}));
    if(!await p.locator('#title-video-play').isVisible())throw Error('自动播放受限缺少显式播放入口');
    return {passed:true,before,after};
  }finally{release();await context.close();}
}
