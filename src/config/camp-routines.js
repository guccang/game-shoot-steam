// 营地日常只描述岗位、散步与闲聊，不含任务、奖励或自动追踪指令。
export const CAMP_ROUTINES={
 mint:{work:'sort',stroll:{x:475,y:550}},
 oak:{work:'repair',stroll:{x:220,y:685}},
 wheel:{work:'repair',stroll:{x:205,y:1080}},
 lumi:{work:'watch',stroll:{x:540,y:1350}},
};
// 两人到达相邻落脚点才开始说话；短句只谈营地生活。
export const CAMP_CHATS=[
 {ids:['oak','wheel'],at:{x:200,y:1130},lines:['这把小锤子总算不松了。','正好，借我敲敲车铃，听听响不响。']},
 {ids:['mint','lumi'],at:{x:520,y:980},lines:['今天的信纸闻起来有松木香。','我也闻到了，晚风把香味送到灯塔啦。']},
];
