// 同机、同10敌人、同枪车与地形比较正式绘制器；后台持续五分钟，不把模拟时间当墙钟。
async(page)=>{
  if(new URL(page.url()).port!=='4217')throw Error('仅允许隔离端口');
  return page.evaluate(async()=>{
    const app=(await import('/src/main.js')).application;app.destroy();
    const root='/output/playwright/sunleaf/baseline';
    const {Game}=await import('/src/core/game.js'),{Renderer}=await import('/src/rendering/renderer.js');
    const {storyArtStats}=await import('/src/rendering/story-props.js');
    const BaseRenderer=(await import(root+'/src/rendering/renderer.js')).Renderer;
    const {catSprites}=await import('/src/rendering/cat-animation.js'),oldSprites=(await import(root+'/src/rendering/cat-animation.js')).catSprites;
    if(!await catSprites.load()||!await oldSprites.load())throw Error('真实角色图集缺失');
    const g=new Game(undefined,()=>.42);g.start();g.enterStory();g.advanceStoryDialogue(true);g.chooseStoryLoadout('frost-guard');
    Object.assign(g.story,{stageId:'Q50',phase:'prepare'});g.startStoryStage();
    for(let i=0;i<10;i++)g.spawnEnemy(0,0,{x:g.player.x-130+(i%5)*60,y:g.player.y-170+Math.floor(i/5)*70},{bossOwner:'fixture'});
    const env={time:'day',weather:'sun',forestSeason:'spring',autoTime:false,autoWeather:false};
    const pair=[BaseRenderer,Renderer].map(R=>{
      const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;
      const r=new R(canvas,g,env);r.width=390;r.height=844;r.dpr=1;return r;
    });
    for(let n=0;n<20;n++)for(const r of pair)r.draw();
    const result=window.sunleafPerformance={started:Date.now(),duration:300000,complete:false,samples:[[],[]],entities:[],cache:[],initial:pair.map(r=>r.diagnosticInfo()),errors:[]};
    let index=0;
    // 连续逐帧采样，不能用每400ms跳帧把初次猫帧处理错误放大为P95常态开销。
    const sample=()=>{
      try{
        // 两个版本共享实体和动作相位；任务更新以零步长独立采样，避免改变敌人数。
        g.time=g.previewTime=(Date.now()-result.started)/1000;
        g.player.bodyAnimation.idleTime=g.time;
        env.time=g.time%60<30?'day':'night';
        for(const i of index%2?[1,0]:[0,1]){const begin=performance.now();pair[i].draw();result.samples[i].push(performance.now()-begin);}
        if(index%600===0){result.entities.push(g.enemies.length);result.cache.push(pair[1].ground.stats());}
        index++;
        if(Date.now()-result.started>=result.duration){result.complete=true;result.elapsed=Date.now()-result.started;
          result.final=pair.map(r=>r.diagnosticInfo());result.art=storyArtStats();result.stats=result.samples.map(values=>{const t=[...values].sort((a,b)=>a-b);return {n:t.length,mean:t.reduce((a,b)=>a+b)/t.length,p95:t[Math.floor(t.length*.95)]};});
        }else result.timer=requestAnimationFrame(sample);
      }catch(e){result.errors.push(e.message);result.complete=true;}
    };result.timer=requestAnimationFrame(sample);
    return {started:true,duration:300000,enemies:g.enemies.length,css:[390,844],dpr:1};
  });
}
