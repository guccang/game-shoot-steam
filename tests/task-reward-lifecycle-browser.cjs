// 使用原生弹窗和正式奖励组件，固定“定时任务先于关闭事件”的浏览器合法时序。
async page=>{
 return await page.evaluate(async()=>{
  const {createDialogs}=await import('/src/ui/dialogs.js'),{createTaskReward}=await import('/src/ui/task-reward.js');
  const frame=document.createElement('iframe');document.body.append(frame);
  const root=frame.contentDocument,win=frame.contentWindow,scheduled=[];
  // 只控制奖励入队的零延迟任务；关闭事件、画布和按钮均使用浏览器实现。
  const host={performance:win.performance,setTimeout:callback=>{scheduled.push(callback);return callback;},clearTimeout:callback=>{const i=scheduled.indexOf(callback);if(i>=0)scheduled.splice(i,1);},setInterval:win.setInterval.bind(win),clearInterval:win.clearInterval.bind(win)};
  const game={state:'playing',progress:{},pause(){this.state=this.state==='playing'?'paused':'playing';}};
  const dialogs=createDialogs({game,root,resetInput:()=>{},onChange:()=>{}});
  const rewards=createTaskReward({game,root,host,dialogs,input:{reset(){}},onChange:()=>{},isActive:()=>true});
  const node=root.getElementById('task-reward-dialog'),checks=[];
  // 模拟新奖励在旧弹窗关闭回调之前到达，不允许重开同一节点。
  try{
   for(let round=1;round<=3;round++){
    rewards.enqueue({title:'前一份奖励'});scheduled.shift()();
    const closed=new Promise(resolve=>node.addEventListener('close',resolve,{once:true}));
    root.getElementById('task-reward-close').click();
    rewards.enqueue({title:'后一份奖励'});
    while(scheduled.length)scheduled.shift()();
    if(node.open)throw Error('旧关闭事件尚未完成就打开了下一份奖励');
    await closed;while(scheduled.length)scheduled.shift()();
    if(!node.open||root.getElementById('task-reward-title').textContent!=='后一份奖励')throw Error('接续奖励丢失');
    const nextClosed=new Promise(resolve=>node.addEventListener('close',resolve,{once:true}));
    root.getElementById('task-reward-close').click();await nextClosed;
    if(game.state!=='playing')throw Error('奖励关闭后遗留暂停状态');
    checks.push({round,state:game.state});
   }
   return checks;
  }finally{rewards.dispose();dialogs.dispose();frame.remove();}
 });
}
