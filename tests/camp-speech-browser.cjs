// 原版与当前气泡在同一正式DOM中对照，检查移动投影、零重复变更和昼夜窄屏可读性。
async page=>{
 const result=await page.evaluate(async()=>{
  const {createCompactSpeech}=await import('/src/ui/compact-speech.js');
  const {createCompactSpeech:before}=await import('/output/playwright/camp-movement/compact-speech-before.js');
  const {beginSceneLayout,endSceneLayout}=await import('/src/ui/scene-layout.js');
  const r=a.renderer,v=r.view,actor={x:v.x+v.w/2+.1234567,y:v.y+v.h/2+100.87654321,name:'阿团'};
  const text='热饼留给晚归的人。',measure=[];
  for(const [label,create] of [['before',before],['after',createCompactSpeech]]){
   const bubble=create(document,'camp-speech-check');bubble.show(actor,text,r);
   const observer=new MutationObserver(()=>{});observer.observe(bubble.node,{attributes:true,childList:true,subtree:true});
   const start=performance.now();
   for(let i=0;i<40;i++){beginSceneLayout(r);bubble.show(actor,text,r);endSceneLayout(r);}
   measure.push({label,ms:(performance.now()-start)/40,mutations:observer.takeRecords().length});
   if(label==='after'){
    const left=parseFloat(bubble.node.style.left);actor.x+=10;bubble.show(actor,text,r);
    if(Math.abs(parseFloat(bubble.node.style.left)-left-10*v.zoom)>.05)throw Error('气泡没有跟随移动');
    actor.x+=10000;if(bubble.show(actor,text,r)||!bubble.node.hidden)throw Error('画外气泡未隐藏');actor.x-=10000;
    if(!bubble.show(actor,'新台词换行检查：今晚一起吃热饼。',r))throw Error('气泡重新入镜失败');
    const old=r.view;r.view=null;if(bubble.show(actor,text,r))throw Error('无镜头仍展示');r.view=old;
   }
   observer.disconnect();bubble.dispose();
  }
  if(measure[1].mutations!==0)throw Error('稳定气泡仍有重复DOM提交');
  return measure;
 });
 const views=[];
 for(const [width,height] of [[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   Object.assign(a.environment,{time,autoTime:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   const cook=a.game.livingActors.get('cook');Object.assign(a.game.player,{x:cook.x,y:cook.y-70});a.renderer.camera.time=null;
   a.game.encounterTimer=999;a.refresh();
  },time);
  await page.waitForTimeout(600);
  const state=await page.evaluate(async()=>{
   // 单独检查同一个正式组件的指定台词，隐藏同时自动轮播的气泡以免测试夹具叠出两个。
   document.getElementById('resident-chatter').style.visibility='hidden';
   window.campSpeech?.dispose();const {createCompactSpeech}=await import('/src/ui/compact-speech.js');window.campSpeech=createCompactSpeech(document,'camp-speech-check');
   const r=a.renderer,actor=a.game.livingActors.get('cook');
   const visible=campSpeech.show(actor,'热饼留给晚归的人。',r,{minTop:100,bottom:110});
   const rect=campSpeech.node.getBoundingClientRect();return {visible,left:rect.left,right:rect.right,bottom:rect.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight};
  });
  if(!state.visible||state.left<0||state.right>state.viewportWidth||state.bottom>state.viewportHeight)throw Error('气泡越界 '+JSON.stringify(state));
  await page.screenshot({path:`output/playwright/camp-movement/speech-${width}-${time}.png`});views.push({width,height,time,...state});
  await page.evaluate(()=>{campSpeech.dispose();document.getElementById('resident-chatter').style.removeProperty('visibility');});
 }
 return {measure:result,views};
}
