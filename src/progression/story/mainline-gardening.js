// 邻里园艺委托只记录接取后的真实操作；候选进度随农活或购种事务一起保存。
import {currentMainlineTask} from '../../config/mainline.js';

// 存档只接纳已注册的委托和有界计数，地块编号不依赖数组下标。
export function validateGardeningLesson(raw){
 const taskId=typeof raw?.taskId==='string'?raw.taskId:null;
 const task=currentMainlineTask({currentId:taskId,completed:[]});
 const valid=task?.id===taskId&&!!task.gardening;
 const count=key=>valid&&Number.isSafeInteger(raw?.[key])?Math.max(0,Math.min(10000,raw[key])):0;
 return {taskId:valid?taskId:null,seedDrops:count('seedDrops'),purchased:count('purchased'),planted:count('planted'),watered:count('watered'),harvested:count('harvested'),plotId:valid&&Number.isSafeInteger(raw?.plotId)&&raw.plotId>=0&&raw.plotId<=1e7?raw.plotId:null};
}

// 开始新委托时清空上一项体验，重复加载当前委托保留实际进度。
export function beginGardeningLesson(progress){
 const task=currentMainlineTask(progress.mainline);
 if(task?.gardening&&progress.mainline.gardening?.taskId!==task.id)progress.mainline.gardening=validateGardeningLesson({taskId:task.id});
}

// 所有来源通过相同的任务、阶段和品种门槛，旧库存及其他任务不能代做。
export function activeGardeningLesson(progress,kind,crop){
 const task=currentMainlineTask(progress.mainline),run=progress.mainline;
 return run?.phase==='doing'&&task?.gardening?.kind===kind&&task.gardening.crop===crop&&run.gardening?.taskId===task.id?run.gardening:null;
}

// 只在已通过正式校验的候选进度上记录，持久化失败会一同回滚。
export function recordGardeningAction(progress,action,{crop,plot,count=1}={}){
 // 收获指引接受所有作物，但只累计本任务接取后的成功收割，随金币一起保存。
 const task=currentMainlineTask(progress.mainline);
 if(action==='harvest'&&task?.goal.harvestFor&&progress.mainline.phase==='doing'){
  beginGardeningLesson(progress);progress.mainline.gardening.harvested=Math.min(10000,progress.mainline.gardening.harvested+1);
 }
 const bought=activeGardeningLesson(progress,'purchase',crop);
 if(action==='purchase'&&bought)bought.purchased=Math.min(10000,bought.purchased+count);
 const grow=activeGardeningLesson(progress,'grow',crop);if(!grow||grow.harvested)return;
 if(action==='plant'&&grow.plotId===null){grow.plotId=plot;grow.planted=1;grow.watered=0;}
 if(grow.plotId!==plot)return;
 if(action==='water'&&grow.planted)grow.watered=1;
 if(action==='harvest'){
  if(grow.watered)grow.harvested=1;
  // 未浇水就收割仍正常结算收入，委托可重新种一茬，不会卡在已收空的田。
  else {grow.plotId=null;grow.planted=0;grow.watered=0;}
 }
}
