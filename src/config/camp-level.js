// 营地成长集中数值：按完整活动结算，实际耗时不参与经验发放。
export const CAMP_LEVELS = Object.freeze([
  {xp:0,percent:98},{xp:600,percent:95},{xp:1800,percent:90},
  {xp:3600,percent:85},{xp:7200,percent:80},{xp:10800,percent:75},
].map(Object.freeze));
export const CAMP_ACTIVITY_XP = Object.freeze({clearing:180,horde:210,realm:30,fire:50,football:30,living:60,mainline:30});
export const CAMP_BATCHES = Object.freeze({trees:Object.freeze({count:30,xp:10}),enemies:Object.freeze({count:30,xp:90})});
// 章节首次交付的标准预算；邻里委托统一使用活动表，游玩途中不重复计采集和击杀。
export const CAMP_STORY_XP = Object.freeze({'sunleaf-01':540,'sunleaf-02':240,'sunleaf-03':240,'sunleaf-04':180,'sunleaf-05':180,'sunleaf-06':300,'sunleaf-side-expedition':240,'sunleaf-side-guardian':240});
