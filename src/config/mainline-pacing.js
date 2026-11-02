// 主线只保留认路、首次巡护与六封战役来信；其他稳定 ID 继续用于自选体验的进度记录。
export const CAMPAIGN_TASK_IDS=Object.freeze(['first-map','first-patrol','first-letter','river-letter','road-trial','mechanical-letter','flight-trial','last-letter']);
// 每个阶段收尾都归还自由探索权，不以冷却时间阻挡继续剧情。
export function isCampaignTask(task){return !!task&&CAMPAIGN_TASK_IDS.includes(task.id);}
