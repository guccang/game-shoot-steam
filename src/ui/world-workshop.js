// 房屋只在门口站定进入，兼容主界面的组件调用但不建立点击热点。
export function createWorldWorkshop(){
 // 世界短按继续传给其他实际交互。
 function tap(){return false;}
 // 建筑画面由世界绘制器维护。
 function render(){}
 // 本组件没有额外资源。
 function dispose(){}
 return {tap,render,dispose};
}
