// 统一观察主画布和离屏画布；只记录代际与尺寸，不强引用画布或修改浏览器原型。
const watched=new WeakSet(),seenEvents=new WeakSet();
let revision=0,lost=0,restored=0,last=null;

// 同一事件可能经过文档捕获和画布监听，只记录一次；已释放的一像素缓存不再触发重建。
export function recordCanvasContextEvent(event){
 const canvas=event.target;
 if(seenEvents.has(event)||!canvas||canvas.width<=1||canvas.height<=1)return;
 seenEvents.add(event);revision++;
 if(event.type==='contextlost')lost++;else restored++;
 last={type:event.type,name:canvas.id||'离屏画布',width:canvas.width,height:canvas.height,trusted:!!event.isTrusted};
}
// 不阻止默认恢复行为，监听器随画布一起回收，避免缓存淘汰后仍持有大位图。
export function watchRenderCanvas(canvas){
 if(canvas?.addEventListener&&!watched.has(canvas)){
  watched.add(canvas);
  canvas.addEventListener('contextlost',recordCanvasContextEvent);
  canvas.addEventListener('contextrestored',recordCanvasContextEvent);
 }
 return canvas;
}
// DOM外的HTMLCanvas也必须注册；参数允许演练场使用自己的文档。
export function createRenderCanvas(root=document){return watchRenderCanvas(root.createElement('canvas'));}
// 读取代际不遍历画布、不读回像素，可用于每帧或每次缓存命中的检查。
export function canvasRecoveryRevision(){return revision;}
// 诊断同时包含离屏事件，不能仅以主画布已恢复推断全部图集正常。
export function canvasRecoveryStats(){return {revision,lost,restored,last:last?{...last}:null};}
