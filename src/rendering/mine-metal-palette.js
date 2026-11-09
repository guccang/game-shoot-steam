// 只代理地下绘制的颜色写入，原地表画笔、场景与样式表完全独立。
const contexts=new WeakMap(),colors=new Map();
// 有限金属灰块面保留原图亮暗关系和透明度，深描边仍带少量森林绿。
export function mineMetalColor(value){
 if(typeof value!=='string')return value;
 if(colors.has(value))return colors.get(value);
 const match=/^#([\da-f]{3,8})$/i.exec(value);if(!match)return value;
 let hex=match[1];if(hex.length===3||hex.length===4)hex=[...hex].map(c=>c+c).join('');
 if(hex.length!==6&&hex.length!==8)return value;
 const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16),light=.2126*r+.7152*g+.0722*b;
 const mapped=(light<90?'#40534d':light<145?'#717e80':light<205?'#a0aaac':'#d1d9d6')+hex.slice(6);
 if(colors.size<256)colors.set(value,mapped);return mapped;
}
// 同一个Canvas只创建一个代理，方法绑定原生画笔；不建立纹理、逐帧滤镜或离屏画布。
export function mineMetalContext(context){
 if(contexts.has(context))return contexts.get(context);
 const methods=new Map(),proxy=new Proxy(context,{
  get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;if(!methods.has(key))methods.set(key,value.bind(target));return methods.get(key);},
  set(target,key,value){Reflect.set(target,key,key==='fillStyle'||key==='strokeStyle'?mineMetalColor(value):value,target);return true;},
 });
 contexts.set(context,proxy);return proxy;
}
