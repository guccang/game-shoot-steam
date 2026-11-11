// 页面、购物车和驾驶状态栏都展示车尾对应的实体模块。
import {seModuleSVG} from '../rendering/se-module-art.js';
// 图标旁的文字或上层按钮负责提供可访问名称。
export function seDeviceIcon(key){
 return '<span class="vehicle-mode-icon" data-mode="'+key+'" aria-hidden="true">'+seModuleSVG(key)+'</span>';
}
