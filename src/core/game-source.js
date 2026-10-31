// 表现快照与正式游戏共享业务身份；弱引用映射不写入存档、不保留已释放的画面。
const sources=new WeakMap();

// 登记插值快照的来源，导航意图和抵达判断统一回到正式游戏。
export function bindGameSource(view,game){sources.set(view,gameSource(game));}

// 普通游戏直接返回自身，只有明确登记的表现对象才能解析到业务来源。
export function gameSource(game){return sources.get(game)||game;}
