// 只释放美术派生画布，不接收游戏对象、原始图片或角色视频图集。
export function releaseArtCache(value,seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
 if(typeof value.getContext==='function'){value.width=1;value.height=1;return;}
 if(value instanceof Map){for(const item of value.values())releaseArtCache(item,seen);value.clear();return;}
 for(const item of Object.values(value))releaseArtCache(item,seen);
}
