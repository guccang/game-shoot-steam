// 旧入口兼容：引导与任务共用一份内容，不再分文件维护任务 ID。
import content from './content/mainline.json' with {type:'json'};
export const MAINLINE_GUIDES=Object.fromEntries(content.tasks.map(task=>[task.id,task.guide]));
