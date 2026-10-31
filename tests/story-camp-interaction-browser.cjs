// 真实回营绘制与头顶短按回归；布局检查期间冻结模拟，之后恢复正式交谈计时。
async original=>{
 const errors=[],results=[];
 for(const [chapter,stage,width,height,time,mounted] of [['sunleaf-01','Q80',390,844,'day',true],['sunleaf-02','END',320,568,'night',false]]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async({chapter,stage,time,mounted})=>{
    const a=window.a=(await import('/src/main.js')).application;await a.ready;
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.story.chapters['sunleaf-01'].completed=true;
    const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;
    const {storyPostForChapter,storyPostApproach}=await import('/src/core/story-posts.js'),{storyDefinition}=await import('/src/core/story-definition.js');Object.assign(g.player,storyPostApproach(storyPostForChapter(g,chapter)));
    if(!g.enterStory(chapter))throw Error('章节未进入');g.advanceStoryDialogue(true);g.chooseStoryLoadout(storyDefinition(g).loadouts[0].id);g.startStoryStage();
    Object.assign(g.story,{stageId:stage,phase:'active',dialogue:null,interacting:0,combat:null,trial:null});g.story.flags.silenced=true;g.story.readLines=g.story.readLines.filter(s=>s!=='ending');g.state='playing';g.enemies=[];g.boss=null;
    Object.assign(g.player,storyDefinition(g).world.sites.CAMP);if(!mounted)g.dismountVehicle();
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    window.originalUpdate=g.update;g.update=()=>{};a.refresh();
   },{chapter,stage,time,mounted});
   if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').tap();
   await page.locator('#story-interact').waitFor({state:'visible'});await page.waitForTimeout(200);
   await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));
   const geometry=await page.evaluate(async()=>{
    const g=a.game,{storyCast}=await import('/src/rendering/story-props.js'),{storyInteractionTarget}=await import('/src/core/story-interaction.js'),{FARM_SEED_SHOP}=await import('/src/config/farm.js');
    const actor=storyCast(g).find(p=>p.kind==='snow'),target=storyInteractionTarget(g),v=a.renderer.view,c=a.renderer.canvas.getBoundingClientRect(),button=document.getElementById('story-interact'),r=button.getBoundingClientRect(),cue=button.querySelector('.story-interact-cue').getBoundingClientRect();
    const x=c.left+(actor.x-v.x)*v.zoom,y=c.top+(actor.y-v.y)*v.zoom,headY=y-43*v.zoom;
    return {target,actor,button:{x:r.x,y:r.y,width:r.width,height:r.height},cueBottom:cue.bottom,x,y,headY,zoom:v.zoom,hit:document.elementFromPoint(x,headY)?.closest('#story-interact')===button,seedLeft:c.left+(FARM_SEED_SHOP.x-FARM_SEED_SHOP.width/2-v.x)*v.zoom};
   });
   if(!geometry.hit||Math.abs(geometry.button.x+geometry.button.width/2-geometry.x)>1||geometry.cueBottom>geometry.headY+5||geometry.x>=geometry.seedLeft)throw Error('头顶点击区错位 '+JSON.stringify(geometry));
   await page.touchscreen.tap(geometry.x,geometry.headY);await page.waitForFunction(()=>a.game.story.interacting>0);await page.waitForFunction(()=>document.querySelector('.story-interact-label').textContent==='操作中');
   await page.screenshot({path:`output/playwright/story-npc-interaction-anchor/${chapter}-${width}.png`});
   await page.evaluate(()=>{a.game.update=originalUpdate;});await page.waitForFunction(()=>a.game.story.dialogue==='ending');
   if(await page.locator('#story-interact').isVisible())throw Error('交谈时点击提示未隐藏');
   results.push({chapter,width,height,time,mounted,geometry,headTap:true,endingDialogue:true});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'story-camp-interaction-anchor',results,errors};
}
