import content from './content/mainline.json' with {type:'json'};
// 解锁引用稳定任务 ID，费用仍由经济表负责。
export const MAINLINE_GATES=content.gates;
// 主线继续提供体验引导，购买只检查资源与所有权。
export function mainlinePurchaseReason(){return '';}
