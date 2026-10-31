// 真实播放器三轮连续运行及媒体失败/减少动态/快速导航验收。
async(page)=>{
 if(new URL(page.url()).port!=='4186')throw Error('仅允许本任务隔离端口');
 await page.evaluate(async()=>{window.videoApp=window.visualApp||(await import('/src/main.js')).application;videoApp.menu.home();});
 await page.locator('#title-video').evaluate(async v=>{v.currentTime=0;await v.play();});
 const samples=[];let loops=0,last=0;
 // 同时采集角色、树冠、麦穗、水面和迎风围巾；解码计数不能代替核心布料动作。
 await page.evaluate(()=>{window.titleMotionReview={canvas:document.createElement('canvas'),previous:null};titleMotionReview.canvas.width=360;titleMotionReview.canvas.height=640;});
 // 用户选定源片3–6秒，首尾重叠0.25秒后循环为2.75秒；覆盖至少三轮。
 for(let i=0;i<48;i++){
  const sample=await page.locator('#title-video').evaluate(v=>{
   const state=titleMotionReview,ctx=state.canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0,360,640);
   const pixels=ctx.getImageData(0,0,360,640).data;let motion=null;
   if(state.previous){
    motion=[[125,240,235,325],[85,385,165,470],[5,55,155,150],[335,400,360,620],[130,268,170,288]].map(([left,top,right,bottom])=>{
     let changed=0,total=0;
     for(let y=top;y<bottom;y+=2)for(let x=left;x<right;x+=2){const offset=(y*360+x)*4;total++;if((Math.abs(pixels[offset]-state.previous[offset])+Math.abs(pixels[offset+1]-state.previous[offset+1])+Math.abs(pixels[offset+2]-state.previous[offset+2]))/3>4)changed++;}
     return changed/total;
    });
   }
   state.previous=pixels;
   return {time:v.currentTime,paused:v.paused,duration:v.duration,width:v.videoWidth,height:v.videoHeight,decoded:v.getVideoPlaybackQuality().totalVideoFrames,motion};
  });
  if(sample.paused||sample.duration!==2.75||sample.width!==720||sample.height!==1280)throw Error('运行视频规格或播放异常');
  if(sample.time<last-.5)loops++;last=sample.time;samples.push(sample);
  if(i%32===0)await page.screenshot({path:`output/playwright/video-loop-${i/32}.png`});
  if(i%8===0)await page.screenshot({path:`output/playwright/video-motion-${String(i/8).padStart(2,'0')}.png`});
  await page.waitForTimeout(250);
 }
 await page.evaluate(()=>{delete window.titleMotionReview;});
 if(loops<3||samples.at(-1).decoded-samples[0].decoded<200)throw Error('不足三轮真实解码');
 // 每秒均要看到局部运动；排除接缝和长采样间隔，避免一次姿态跳变掩盖静止区。
 const motionBySecond=Array.from({length:3},(_,second)=>{
  const selected=samples.filter((s,i)=>i>0&&Math.floor(s.time)===second&&s.time-samples[i-1].time>.1&&s.time-samples[i-1].time<.7&&s.motion);
  const values=selected.map(s=>Math.max(...s.motion));
  return {second,samples:values.length,average:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),scarfAverage:selected.reduce((sum,s)=>sum+s.motion[4],0)/Math.max(1,selected.length)};
 });
 if(motionBySecond.some(s=>!s.samples||s.average<.005))throw Error('存在整秒静止区：'+JSON.stringify(motionBySecond));
 if(motionBySecond.some(s=>s.scarfAverage<.005))throw Error('围巾缺少持续迎风动作：'+JSON.stringify(motionBySecond));
 await page.locator('#start').click();
 if(!await page.locator('#title-video').evaluate(v=>v.paused))throw Error('进入游戏视频未暂停');
 // 快速切换时迟到的play Promise不能重新播放战场背景或卡住首页。
 await page.evaluate(()=>{for(let i=0;i<6;i++){videoApp.menu.home();videoApp.menu.enter();}videoApp.menu.home();});await page.waitForTimeout(250);
 if(await page.locator('#title-video').evaluate(v=>v.paused))throw Error('快速返回后视频未恢复');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 if(!await page.locator('#title-video').evaluate(v=>v.paused&&v.hidden)||!await page.locator('#title-poster').isVisible())throw Error('减少动态未显示海报');
 await page.screenshot({path:'output/playwright/title-reduced-motion.png'});await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(150);
 // 模拟浏览器发送的可见性通知，核对与操作系统相同的事件入口。
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 if(!await page.locator('#title-video').evaluate(v=>v.paused))throw Error('后台视频未暂停');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(150);
 // 媒体404必须显示明确错误，并允许恢复同一文件；禁止静态海报掩盖失败。
 await page.route('**/assets/title/background.mp4',route=>route.fulfill({status:404,body:'missing'}));
 await page.locator('#title-video').evaluate(v=>v.load());await page.waitForFunction(()=>!!document.getElementById('title-video').error);
 if(!await page.locator('#title-video-status').textContent().then(t=>t.includes('失败')))throw Error('媒体失败未报告');
 await page.screenshot({path:'output/playwright/title-video-error.png'});await page.unroute('**/assets/title/background.mp4');await page.locator('#title-video-play').click();await page.waitForTimeout(250);
 // 使用真实播放接口的拒绝结果测试自动播放限制，解除后由实际点击恢复。
 await page.locator('#start').click();
 await page.evaluate(()=>{const v=document.getElementById('title-video');v.originalPlay=v.play;v.play=()=>Promise.reject(new DOMException('blocked','NotAllowedError'));videoApp.menu.home();});await page.waitForTimeout(100);
 if(!await page.locator('#title-video-play').isVisible())throw Error('自动播放被拒绝无入口');
 await page.evaluate(()=>{const v=document.getElementById('title-video');v.play=v.originalPlay;delete v.originalPlay;});await page.locator('#title-video-play').click();await page.waitForTimeout(200);
 if(await page.locator('#title-video').evaluate(v=>v.paused))throw Error('用户点击后未恢复视频');
 if(await page.locator('video').count()!==1)throw Error('重复媒体实例');
 return {passed:true,designCriterion:'title-background-video',loops,samples,motionBySecond,checks:['真实三轮解码','每秒局部画面持续变化','进入游戏暂停','快速导航恢复','减少动态海报','后台暂停','404显式错误与恢复','自动播放拒绝后点击恢复','单媒体实例']};
}
