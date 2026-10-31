// 旧入口兼容：操作目标来自任务步骤，空步骤保持原有空位。
import content from './content/mainline.json' with {type:'json'};
export const MAINLINE_OPERATIONS=Object.fromEntries(content.tasks.map(task=>[task.id,task.guide.steps.map(step=>step.operation??null)]));
