// 批次在独立Worker内执行，失败回传说明，主界面可终止任务。
// 先同步登记消息入口，再等待语言与模型模块，避免非默认语言加载时丢失首条请求。
self.onmessage=async event=>{
  try{const [{runBatch},{validateEconomy}]=await Promise.all([import('./model.js'),import('../config/economy.js')]);
    const {config,scenario}=event.data;self.postMessage({report:runBatch(validateEconomy(config),scenario)});}
  catch(error){self.postMessage({error:error.message});}
};
