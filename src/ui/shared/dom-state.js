// 重复写入hidden也会使祖先:has选择器失效；显隐未变化时不触发整片HUD样式重算。
export function setHidden(node,value){
 const hidden=value==='until-found'?'until-found':Boolean(value);
 if(node.hidden!==hidden)node.hidden=hidden;
 // 保留赋值表达式的返回值，兼容已有连续赋值和条件分支。
 return value;
}

// 纯文字标签复用原文本节点；数字变化不拆建子树，避免祖先 :has() 每帧失效。
export function setText(node,value){
 const text=value==null?'':String(value);
 if(node.textContent!==text){
  if(node.childNodes.length===1&&node.firstChild.nodeType===3)node.firstChild.data=text;
  else node.textContent=text;
 }
 return value;
}
