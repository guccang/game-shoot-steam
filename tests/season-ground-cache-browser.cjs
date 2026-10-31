// 正式浏览器中的缓存发布与像素对照；默认4175，可继承CLI隔离服务地址。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();});
  const result=await page.evaluate(async()=>{
   const {SeasonGroundCache}=await import('/src/rendering/season-ground-cache.js');
   const {GroundCache}=await import('/src/rendering/ground-cache.js');
   const {SeasonTransition,SEASON_FADE_DURATION}=await import('/src/world/season-transition.js');
   const view={x:670,y:280,w:240,h:240},cache=new SeasonGroundCache('forest','summer'),env={forestSeason:'summer',calendarActive:true,livingSeasonRemaining:300000};
   cache.update(env,view,0);const costs=[];
   // 本段验证像素与发布，不冒充真实RAF性能；每次推进仍经过正式分帧预算入口。
   function finish(){for(let n=0;n<4000&&(cache.current.work||cache.current.pending.length||cache.staged?.work||cache.staged?.pending.length);n++){
    const t=performance.now();cache.advance(2);costs.push(performance.now()-t);cache.prepare(view,1);
   }}
   finish();const old=cache.current,oldTile=[...old.tiles.values()][0],before=cache.stats();
   env.forestSeason='winter';cache.update(env,view,10);cache.advance(2);
   if(cache.current!==old||oldTile.day.width!==388||cache.commits)throw Error('预制提前清空或发布');
   // 未完成阶段取消后临时画布立即释放，当前纹理仍在。
   const cancelled=cache.staged;env.forestSeason='autumn';cache.update(env,view,11);
   if(cancelled.stats().bytes||cancelled.stats().pendingBytes)throw Error('取消未释放预制画布');
   finish();const ready=cache.stats(),commitStart=performance.now();cache.update(env,view,100);
   const commitMs=performance.now()-commitStart;if(cache.current===old||cache.source!==old)throw Error('双池未交换');
   const fade=new SeasonTransition('summer');fade.set('autumn',100);const baseline=new GroundCache();
   const canvas=document.createElement('canvas');canvas.width=240;canvas.height=240;const c=canvas.getContext('2d',{willReadFrequently:true}),pixels=[];
   // 三个时点和昼/夜/混合光照，逐字节核对原版同源渐变。
   function draw(pool,night){c.setTransform(1,0,0,1,-view.x,-view.y);pool.draw(c,view,night);return c.getImageData(0,0,240,240).data;}
   for(const progress of [0,.5,1]){
    const now=100+SEASON_FADE_DURATION*progress;cache.update(env,view,now);baseline.setSeason('autumn',fade.sample(now));
    for(const night of [0,.5,1]){
     const a=draw(baseline,night),b=draw(cache,night);let differences=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;
     pixels.push({progress,night,differences});if(differences)throw Error('季节像素不一致：'+JSON.stringify(pixels.at(-1)));
    }
   }
   // 再覆盖积雪出现与融雪，确保冬季目标和来源仍使用原版像素。
   for(const [index,target] of ['winter','spring'].entries()){
    const start=30000+index*30000;env.forestSeason=target;cache.update(env,view,start);finish();cache.update(env,view,start+1);fade.set(target,start+1);
    for(const progress of [0,.5,1]){
     const now=start+1+SEASON_FADE_DURATION*progress;cache.update(env,view,now);baseline.setSeason(target,fade.sample(now));
     for(const night of [0,.5,1]){const a=draw(baseline,night),b=draw(cache,night);let differences=0;
      for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;pixels.push({target,progress,night,differences});
      if(differences)throw Error('积雪或融雪像素变化：'+JSON.stringify(pixels.at(-1)));
     }
    }
   }
   const after=cache.stats();if(cache.source||after.seasonStaging.pools!==1||oldTile.day.width!==1)throw Error('渐变结束没有回收旧季节');
   if(after.syncMisses!==before.syncMisses)throw Error('已预制换季仍触发同步补建');
   cache.dispose();baseline.dispose();if(cache.stats().bytes||cache.stats().pendingBytes)throw Error('销毁泄漏像素');
   return {designCriterion:'season-cache-staging',commitMs,before,ready,after,pixels,maxSliceMs:Math.max(...costs)};
  });
  if(errors.length)throw Error(errors.join('\n'));return {...result,errors};
 }finally{await context.close();}
}
