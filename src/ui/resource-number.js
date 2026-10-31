import { RESOURCE_CAP } from '../config/resource-limits.js';
// 资源万位向下截取一位小数且省略末尾零，上限显示9999w；精确数量保留在资源提示中。
import { i18nText } from '../i18n/index.js';
// 数量阈值属于数值规则，缩写及数值位置由语言表控制。
function formatResource(value,threshold) {
  const amount=Math.min(RESOURCE_CAP,Math.max(0,Math.floor(Number(value)||0)));
  if(amount>=threshold)return i18nText('ui.resource.tenThousand',{p0:Math.floor(amount/1e3)/10});
  return String(amount);
}
// 材料追踪空间紧凑，保留一万起缩写的既有规则。
export function compactResource(value){return formatResource(value,1e4);}
// 顶部金币与木头最多显示五位整数，达到十万才切换万单位。
export function compactWalletResource(value){return formatResource(value,1e5);}
