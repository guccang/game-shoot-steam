// NPC对白铺满游戏区域底部，纸面样式与阅读操作沿用正式组件。
export function dockNpcDialogue(root,node){
 const frame=root.getElementById('game-frame'),rect=frame.getBoundingClientRect(),host=root.defaultView;
 const edge=Math.min(rect.bottom,host.innerHeight),fixed=node.tagName==='DIALOG';
 node.classList.add('npc-bottom-dialogue');
 node.style.setProperty('--npc-dialogue-left',(fixed?rect.left+rect.width/2:rect.width/2)+'px');
 node.style.setProperty('--npc-dialogue-bottom',(fixed?host.innerHeight-edge:rect.bottom-edge)+'px');
 node.style.setProperty('--npc-dialogue-width',rect.width+'px');
 node.style.setProperty('--npc-dialogue-height',Math.max(100,Math.min(rect.height*.46,edge-rect.top))+'px');
 node.dataset.placement='bottom';
}
