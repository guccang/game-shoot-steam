// 房门仅通过站定一秒离开，不再注册透明点击出口。
export function createRoomExit(){
 // 保留组件生命周期供房间界面统一调用。
 function render(){}
 // 没有独立节点或监听需要回收。
 function dispose(){}
 return {render,dispose};
}
