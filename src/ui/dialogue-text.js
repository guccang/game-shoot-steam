// 对话逐字显示只推进可见文字，不自动切句、接任务或发奖励。
export function createDialogueText(rate=30){
 let key=null,content='',letters=[],elapsed=0,count=0;
 // 同一句重复渲染不重播；新的对话实例即使文字相同也重新开始。
 function begin(nextKey,text){if(key===nextKey&&content===text)return false;key=nextKey;content=text;letters=Array.from(text);elapsed=0;count=0;return true;}
 // 背景页面由调用方停止计时，大帧间隔不追赶整段文字。
 function tick(dt){if(count===letters.length)return;elapsed+=Math.max(0,Math.min(.05,Number(dt)||0));count=Math.min(letters.length,Math.floor(elapsed*rate));}
 // 一次点击只补齐当前句，不同时跳到下一句。
 function reveal(){if(count===letters.length)return false;count=letters.length;elapsed=count/rate;return true;}
 // 关闭对话后清除进度，不能把上次的全文状态带到重新打开的页面。
 function reset(){key=null;content='';letters=[];elapsed=0;count=0;}
 return {begin,tick,reveal,reset,get text(){return letters.slice(0,count).join('');},get complete(){return count===letters.length;}};
}
