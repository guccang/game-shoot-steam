// 滑翔比决定每下降一米的水平航程。速度为世界单位/秒，转向速率为弧度/秒。
export const GLIDERS = {
 basic: {name:'林间三角翼',price:0,ratio:6,speed:72,turn:1.2},
 swift: {name:'雨燕滑翔伞',price:480,ratio:9,speed:90,turn:1.6},
 voyager: {name:'信天翁远航伞',price:960,ratio:12,speed:84,turn:0.9},
};
// 只恢复正式型号，旧档自动获得基础翼。
export function gliderLoadout(raw){
 const owned=Object.keys(GLIDERS).filter(id=>id==='basic'||(Array.isArray(raw?.gliders)&&raw.gliders.includes(id)));
 return {gliders:owned,selectedGlider:owned.includes(raw?.selectedGlider)?raw.selectedGlider:'basic'};
}
