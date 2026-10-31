// 全帧检查局部造型、脚步像素和缓存，并录制正式绘制器的走停与持枪演示。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  await page.reload();
  const checks = await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const {catSprites}=await import('/src/rendering/cat-animation.js');
    const {catHeadLandmarks}=await import('/src/rendering/cat-breed-shapes.js');
    const {recolorCatFrame}=await import('/src/rendering/cat-coats.js');
    const {HEROES}=await import('/src/config/heroes.js');
    if(!await catSprites.load())throw Error('连续帧素材缺失');
    const raw=document.createElement('canvas');raw.width=raw.height=160;
    const c=raw.getContext('2d',{willReadFrequently:true}), silhouettes=[], results=[];
    for(const breed of HEROES){
      const h=catSprites.manifest.heroes[breed.sprite], image=catSprites.images[breed.sprite];
      let lowestTip=160, bodyFrames=0;
      for(let frame=0;frame<h.frameCount;frame++){
        c.clearRect(0,0,160,160);c.drawImage(image,frame%8*160,Math.floor(frame/8)*160,160,160,0,0,160,160);
        const source=c.getImageData(0,0,160,160).data, head=catHeadLandmarks(source,160);
        const expected=source.slice();if(breed.coat)recolorCatFrame(expected,160,breed.coat);
        const shaped=catSprites.coats.get(image,h,frame,breed), actual=shaped.getContext('2d').getImageData(0,0,160,160).data;
        // 最下面二十行完全来自同一个视频帧，不能用静态脚或整体缩放冒充连续迈步。
        for(let i=140*160*4;i<actual.length;i++)if(Math.abs(actual[i]-expected[i])>1)throw Error('脚步像素被造型覆盖：'+breed.id+':'+frame);
        for(let x=0;x<160;x++)if(actual[x*4+3])throw Error('耳尖被图集边界裁切');
        let top=0;while(top<160&&!actual.subarray(top*640,(top+1)*640).some((v,i)=>i%4===3&&v>100))top++;
        lowestTip=Math.min(lowestTip,top);
        if(head.neck<85||head.neck>115)throw Error('颈线脱离原帧');
        if(frame===0)silhouettes.push(Array.from(actual, (v,i)=>i%4===3&&v>100?1:0).join(''));
        bodyFrames++;
      }
      results.push({id:breed.id,frames:bodyFrames,topMargin:lowestTip});
    }
    if(new Set(silhouettes).size!==6)throw Error('六品种轮廓仍然重复');
    if(catSprites.stats().bytes>20*1024*1024||catSprites.coats.frames.size>48)throw Error('衍生帧缓存超出预算');
    return {results,stats:catSprites.stats(),designCriterion:'去掉毛色仍有六种轮廓；耳尖不裁切、每张源帧的脚步保持原样'};
  });
  await page.setViewportSize({width:900,height:560});
  await page.evaluate(async()=>{
    const {drawCat}=await import('/src/rendering/characters.js');
    const {HEROES}=await import('/src/config/heroes.js');
    const {createCatMotion,updateCatMotion}=await import('/src/core/cat-motion.js');
    const {createRecoil,triggerRecoil,updateRecoil}=await import('/src/combat/recoil.js');
    const canvas=document.createElement('canvas');canvas.id='shape-motion-review';canvas.width=900;canvas.height=560;
    canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:900px;height:560px';document.body.append(canvas);
    const strip=document.createElement('canvas');strip.id='breed-motion-strip';strip.width=1440;strip.height=420;
    strip.style.cssText='position:fixed;inset:0;z-index:99998;width:1440px;height:420px';document.body.append(strip);
    const s=strip.getContext('2d');s.fillStyle='#f7f4df';s.fillRect(0,0,1440,420);
    const c=canvas.getContext('2d'), motion=HEROES.map(()=>createCatMotion()), recoil=HEROES.map(()=>createRecoil());
    // 每次从正式动画时钟前进一步，连续展示待机、移动、停止与枪口转向。
    window.drawBreedMotion=frame=>{
      const time=frame/24, moving=frame>=24&&frame<84;
      c.fillStyle='#f7f4df';c.fillRect(0,0,900,560);
      c.fillStyle='#365748';c.font='16px sans-serif';c.textAlign='left';c.fillText(moving?'移动 · 小手独立瞄准':'待机 · 保留呼吸和眨眼',24,28);
      for(let hero=0;hero<6;hero++){
        updateCatMotion(motion[hero],1/24,moving?150:0,moving);
        if(frame%18===hero*2)triggerRecoil(recoil[hero],0);updateRecoil(recoil[hero],0,1/24);
        const x=hero%3*300+150,y=Math.floor(hero/3)*260+205;
        drawCat(c,x,y,hero,Math.sin(time*1.6)*1.2,2.4,moving?time*12:0,0,recoil[hero],1,null,0,false,false,motion[hero]);
        c.fillStyle='#365748';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText(HEROES[hero].name,x,y+43);
      }
      const column=[0,24,36,48,84,90,102,119].indexOf(frame);
      if(column>=0)for(let row=0;row<2;row++){
        s.drawImage(canvas,row*300+40,290,220,220,column*180,row*210,180,180);
        s.fillStyle='#365748';s.font='14px sans-serif';s.fillText(`${(frame/24).toFixed(2)}s`,column*180+65,row*210+200);
      }
    };
  });
  const download=page.waitForEvent('download');
  await page.evaluate(async()=>{
    const canvas=document.getElementById('shape-motion-review'),stream=canvas.captureStream(0);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2200000}),chunks=[];
    recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
    for(let frame=0;frame<120;frame++){window.drawBreedMotion(frame);stream.getVideoTracks()[0].requestFrame();await new Promise(resolve=>setTimeout(resolve,1000/24));}
    recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download='cat-breed-motion.webm';a.click();
  });
  await(await download).saveAs('output/playwright/cat-breeds/breed-motion.webm');
  await page.locator('#shape-motion-review').screenshot({path:'output/playwright/cat-breeds/shape-motion.png'});
  await page.locator('#shape-motion-review').evaluate(el=>el.remove());
  await page.setViewportSize({width:1440,height:420});
  await page.locator('#breed-motion-strip').screenshot({path:'output/playwright/cat-breeds/motion-strip.png'});
  await page.locator('#breed-motion-strip').evaluate(el=>el.remove());
  return checks;
}
