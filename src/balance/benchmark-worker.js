// 正式战斗基准在Worker内执行，不占用页面交互，也不依赖DOM或游戏存档。
// 先同步接收首条请求，再加载包含语言表的配置模块；异步失败仍回传给工作台。
self.onmessage=async event=>{
  try{const [{benchmarkGrowth},{validateEconomy}]=await Promise.all([import('./benchmark.js'),import('../config/economy.js')]);
    const {config,index,level}=event.data;self.postMessage({result:benchmarkGrowth(validateEconomy(config),index,level)});}
  catch(error){self.postMessage({error:error.message});}
};
